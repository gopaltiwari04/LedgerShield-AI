import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session) {
      await prisma.auditEvent.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          userName: session.name,
          action: "USER_LOGOUT",
          resourceType: "USER",
          resourceId: session.userId,
        },
      });
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
