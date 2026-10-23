import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";

const SESSION_COOKIE_NAME = "ledgershield_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "default-dev-secret-key-change-in-production-min-32-chars";
  return new TextEncoder().encode(secret.padEnd(32, "!"));
}

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/health",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, next internals, and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    // If it's an API request, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }
    // Web page: redirect to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, getSecretKey());
    return NextResponse.next();
  } catch {
    // Invalid / expired token
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Session expired or invalid. Please log in again." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
