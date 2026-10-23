import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, handleAuthError } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, EmailService } from "@/lib/email/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const members = await prisma.organizationMembership.findMany({
      where: { organizationId: session.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        department: m.user.department,
        designation: m.user.designation,
        role: m.role,
        approvalLimit: m.approvalLimit,
        joinedAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["ADMIN", "FINANCE_MANAGER"]);

    const body = await req.json();
    const { email, name, role, department, designation, approvalLimit } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: name ? name.trim() : cleanEmail.split("@")[0],
          department: department || "Finance",
          designation: designation || role,
        },
      });
    }

    // Check if membership already exists in this org
    const existingMembership = await prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: session.organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a member of this organization." },
        { status: 409 }
      );
    }

    const membership = await prisma.organizationMembership.create({
      data: {
        organizationId: session.organizationId,
        userId: user.id,
        role,
        approvalLimit: approvalLimit !== undefined ? Number(approvalLimit) : 50000.0,
      },
    });

    // Create single-use invitation record and dispatch transactional email
    const { rawToken, tokenHash } = generateSecureToken();
    await prisma.organizationInvitation.create({
      data: {
        organizationId: session.organizationId,
        email: cleanEmail,
        role,
        approvalLimit: approvalLimit !== undefined ? Number(approvalLimit) : 50000.0,
        tokenHash,
        invitedById: session.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
    await EmailService.sendInvitationEmail(cleanEmail, session.organizationName, role, rawToken, origin);

    // Audit Event
    await prisma.auditEvent.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        userName: session.name,
        action: "MEMBER_INVITED",
        resourceType: "ORGANIZATION_MEMBERSHIP",
        resourceId: membership.id,
        detailsJson: JSON.stringify({ email: user.email, role, invitedBy: session.email }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} added with role ${role}.`,
      membership: {
        id: membership.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
      },
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
