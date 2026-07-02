import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

const PUBLIC_PAGES = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"]);

/**
 * Edge gate: verifies JWT signature/expiry only. Database-backed checks
 * (token_version, org scoping) live in the route handlers via getSessionUser.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken && (await verifyAccessToken(accessToken))) {
    return NextResponse.next();
  }

  // Expired/missing access token but a valid refresh token: let the page
  // load — the client rotates the session via /api/auth/refresh on mount.
  // API routes get no such grace; they re-check the session themselves.
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  const canRefresh = !!refreshToken && !!(await verifyRefreshToken(refreshToken));

  if (pathname.startsWith("/api")) {
    if (canRefresh) {
      return NextResponse.json({ error: "Access token expired", code: "TOKEN_EXPIRED" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (canRefresh) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next.js internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
