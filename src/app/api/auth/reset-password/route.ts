import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/email/service";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Password reset token is required." }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token.trim());

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired password reset link." }, { status: 400 });
    }

    if (record.usedAt) {
      return NextResponse.json(
        { error: "This password reset token has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "This password reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (!record.user.isActive) {
      return NextResponse.json({ error: "This account has been deactivated." }, { status: 403 });
    }

    const passwordHash = await hashPassword(newPassword);

    // Atomically update user password and mark token used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.auditEvent.create({
        data: {
          organizationId: (await prisma.organizationMembership.findFirst({ where: { userId: record.userId } }))?.organizationId || "SYSTEM",
          userId: record.userId,
          userName: record.user.name,
          action: "PASSWORD_RESET_COMPLETED",
          resourceType: "User",
          resourceId: record.userId,
          ipAddress: req.headers.get("x-forwarded-for") || "local",
        },
      }),
    ]);

    return NextResponse.json({
      message: "Your password has been reset successfully. You may now log in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
