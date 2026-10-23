import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "../types";

export const SESSION_COOKIE_NAME = "ledgershield_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  approvalLimit: number;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "default-dev-secret-key-change-in-production-min-32-chars";
  return new TextEncoder().encode(secret.padEnd(32, "!"));
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      organizationId: payload.organizationId as string,
      organizationName: payload.organizationName as string,
      role: payload.role as UserRole,
      approvalLimit: Number(payload.approvalLimit || 0),
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies session from NextRequest or Server Component cookies.
 */
export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (req) {
    // 1. Check HTTP-only cookie
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    // 2. Check Authorization Bearer header if cookie is missing
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    // Server component / Server action context
    const cookieStore = cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Enforces authenticated session; returns SessionPayload or throws/returns 401 response.
 */
export async function requireAuth(req?: NextRequest): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session) {
    throw new AuthError("Unauthorized: Authentication required to access this resource.", 401);
  }
  return session;
}

/**
 * Enforces role-based permissions; returns 403 if unauthorized.
 */
export function requireRole(session: SessionPayload, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError(
      `Forbidden: Your role (${session.role}) does not have permission to perform this action.`,
      403
    );
  }
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error("Unhandled API error:", error);
  const msg = error instanceof Error ? error.message : "Internal Server Error";
  return NextResponse.json({ error: msg }, { status: 500 });
}
