import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/email/service";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
    }

    const tokenHash = hashToken(token.trim());

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation link." }, { status: 400 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been accepted." },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation link has expired. Please ask your administrator to send a new invitation." },
        { status: 400 }
      );
    }

    // Find or create user for this email
    let user = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (!user) {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "A password of at least 8 characters is required to set up your account." },
          { status: 400 }
        );
      }
      const passwordHash = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          email: invitation.email.toLowerCase(),
          name: name ? name.trim() : invitation.email.split("@")[0],
          passwordHash,
          isActive: true,
          isEmailVerified: true,
        },
      });
    }

    // Create or update membership
    const membership = await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
        approvalLimit: invitation.approvalLimit,
      },
      create: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
        approvalLimit: invitation.approvalLimit,
      },
    });

    // Mark invitation accepted
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    // Generate authenticated session
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: invitation.organization.id,
      organizationName: invitation.organization.name,
      role: membership.role as any,
      approvalLimit: membership.approvalLimit,
    });

    const res = NextResponse.json({
      success: true,
      message: `Welcome to ${invitation.organization.name}!`,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        role: membership.role,
      },
    });

    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Failed to accept invitation." }, { status: 500 });
  }
}
