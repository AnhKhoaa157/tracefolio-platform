import type { NextResponse } from "next/server";

export const OAUTH_STATE_COOKIE_NAME = "tracefolio_oauth_state";
export const SESSION_COOKIE_NAME = "tracefolio_session";
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface TracefolioCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  expires: Date;
  maxAge: number;
}

export function getAuthCookieOptions(
  expiresAt: Date,
  maxAge: number,
  secure: boolean,
): TracefolioCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires: expiresAt,
    maxAge,
  };
}

export function setAuthCookie(
  response: NextResponse,
  name: string,
  value: string,
  expiresAt: Date,
  maxAge: number,
  secure: boolean,
): void {
  response.cookies.set(name, value, getAuthCookieOptions(expiresAt, maxAge, secure));
}

export function clearAuthCookie(response: NextResponse, name: string, secure: boolean): void {
  response.cookies.set(
    name,
    "",
    getAuthCookieOptions(new Date(0), 0, secure),
  );
}
