import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "sewain_access";
export const REFRESH_COOKIE = "sewain_refresh";

export const ACCESS_TOKEN_TTL_S = 15 * 60;
export const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60;

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  res.cookies.set(ACCESS_COOKIE, accessToken, { ...base, path: "/", maxAge: ACCESS_TOKEN_TTL_S });
  // Path "/" (not "/api/auth") so middleware can see that a session is
  // recoverable after the short-lived access cookie expires.
  res.cookies.set(REFRESH_COOKIE, refreshToken, { ...base, path: "/", maxAge: REFRESH_TOKEN_TTL_S });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { ...base, path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...base, path: "/", maxAge: 0 });
}
