import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password confirmation is required to deactivate account." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      }),
      prisma.auditEvent.create({
        data: {
          organizationId: session.organizationId,
          userId: user.id,
          userName: user.name,
          action: "ACCOUNT_DEACTIVATED",
          resourceType: "User",
          resourceId: user.id,
          ipAddress: req.headers.get("x-forwarded-for") || "local",
        },
      }),
    ]);

    const res = NextResponse.json({ message: "Your account has been deactivated." });
    // Invalidate session cookie
    res.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return res;
  } catch (error: any) {
    return handleAuthError(error);
  }
}
