import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, EmailService } from "@/lib/email/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Timing-attack safe generic response
    if (user && user.isActive) {
      const { rawToken, tokenHash } = generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
      await EmailService.sendPasswordResetEmail(normalizedEmail, rawToken, origin);

      await prisma.auditEvent.create({
        data: {
          organizationId: (await prisma.organizationMembership.findFirst({ where: { userId: user.id } }))?.organizationId || "SYSTEM",
          userId: user.id,
          userName: user.name,
          action: "PASSWORD_RESET_REQUESTED",
          resourceType: "User",
          resourceId: user.id,
          ipAddress: req.headers.get("x-forwarded-for") || "local",
        },
      });
    }

    return NextResponse.json({
      message: "If an active account exists with this email address, a password reset link has been dispatched.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process password reset request." }, { status: 500 });
  }
}
