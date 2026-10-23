import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        designation: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { name, department, designation } = body;

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name ? String(name).trim() : undefined,
        department: department !== undefined ? String(department).trim() : undefined,
        designation: designation !== undefined ? String(designation).trim() : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        designation: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        userName: session.name,
        action: "PROFILE_UPDATED",
        resourceType: "User",
        resourceId: session.userId,
        ipAddress: req.headers.get("x-forwarded-for") || "local",
      },
    });

    return NextResponse.json({ user: updated, message: "Profile updated successfully." });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
