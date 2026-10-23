import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// In-memory rate limiting map: key -> { count: number, firstAttemptTime: number }
const loginAttemptMap = new Map<string, { count: number; firstAttemptTime: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, organizationId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const ip = req.headers.get("x-forwarded-for") || "local";
    const throttleKey = `${ip}_${cleanEmail}`;

    // Check throttle
    const now = Date.now();
    const attempts = loginAttemptMap.get(throttleKey);
    if (attempts) {
      if (now - attempts.firstAttemptTime < LOCKOUT_WINDOW_MS) {
        if (attempts.count >= MAX_ATTEMPTS) {
          const waitMinutes = Math.ceil((LOCKOUT_WINDOW_MS - (now - attempts.firstAttemptTime)) / 60000);
          return NextResponse.json(
            { error: `Too many failed login attempts. Please wait ${waitMinutes} minute(s) before trying again.` },
            { status: 429 }
          );
        }
      } else {
        // Reset window
        loginAttemptMap.delete(throttleKey);
      }
    }

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      // Record failed attempt
      recordFailedAttempt(throttleKey);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(throttleKey);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Reset throttle on successful password match
    loginAttemptMap.delete(throttleKey);

    if (user.memberships.length === 0) {
      return NextResponse.json(
        { error: "No organization membership found for this account. Please register a company." },
        { status: 403 }
      );
    }

    // Select active membership
    let activeMembership = user.memberships[0];
    if (organizationId) {
      const selected = user.memberships.find((m) => m.organizationId === organizationId);
      if (selected) {
        activeMembership = selected;
      }
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: activeMembership.organizationId,
      organizationName: activeMembership.organization.name,
      role: activeMembership.role as any,
      approvalLimit: activeMembership.approvalLimit,
    });

    // Audit log
    await prisma.auditEvent.create({
      data: {
        organizationId: activeMembership.organizationId,
        userId: user.id,
        userName: user.name,
        action: "USER_LOGIN",
        resourceType: "USER",
        resourceId: user.id,
        ipAddress: ip,
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        designation: user.designation,
      },
      activeOrganization: {
        id: activeMembership.organization.id,
        name: activeMembership.organization.name,
        currency: activeMembership.organization.currency,
        gstin: activeMembership.organization.gstin,
      },
      role: activeMembership.role,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
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
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}

function recordFailedAttempt(key: string) {
  const current = loginAttemptMap.get(key);
  if (!current) {
    loginAttemptMap.set(key, { count: 1, firstAttemptTime: Date.now() });
  } else {
    current.count += 1;
  }
}
