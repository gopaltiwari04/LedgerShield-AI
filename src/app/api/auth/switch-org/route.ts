import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createSessionToken, SESSION_COOKIE_NAME, handleAuthError } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { targetOrganizationId } = body;

    if (!targetOrganizationId) {
      return NextResponse.json({ error: "Target organization ID is required." }, { status: 400 });
    }

    // Verify user is a member of the target organization
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrganizationId,
          userId: session.userId,
        },
      },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied: You are not an authorized member of this organization." },
        { status: 403 }
      );
    }

    const token = await createSessionToken({
      userId: session.userId,
      email: session.email,
      name: session.name,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role as any,
      approvalLimit: membership.approvalLimit,
    });

    const response = NextResponse.json({
      success: true,
      activeOrganization: {
        id: membership.organization.id,
        name: membership.organization.name,
        currency: membership.organization.currency,
      },
      role: membership.role,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return handleAuthError(error);
  }
}
