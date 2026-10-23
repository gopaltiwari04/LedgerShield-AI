import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      prisma.auditEvent.create({
        data: {
          organizationId: session.organizationId,
          userId: user.id,
          userName: user.name,
          action: "PASSWORD_CHANGED",
          resourceType: "User",
          resourceId: user.id,
          ipAddress: req.headers.get("x-forwarded-for") || "local",
        },
      }),
    ]);

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
