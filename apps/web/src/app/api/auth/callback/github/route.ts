import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiRequest } from "@/server/api/http";
import { getAuthConfig } from "@/server/auth/config";
import {
  clearAuthCookie,
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  setAuthCookie,
  SESSION_TTL_SECONDS,
} from "@/server/auth/cookies";
import { oauthDenied, oauthRequestInvalid, oauthStateInvalid } from "@/server/auth/errors";
import { GitHubOAuthClient } from "@/server/auth/github";
import { validateOAuthState } from "@/server/auth/state";
import { AuthService } from "@/server/auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const response = await handleApiRequest(request, async (requestId) => {
    const config = getAuthConfig();
    const state = request.nextUrl.searchParams.get("state") ?? undefined;
    const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

    if (!validateOAuthState(stateCookie, state, config.sessionSecret)) {
      throw oauthStateInvalid();
    }

    if (request.nextUrl.searchParams.get("error")) throw oauthDenied();

    const code = request.nextUrl.searchParams.get("code")?.trim();
    if (!code) throw oauthRequestInvalid();

    const { getAuthRepository } = await import("@/server/auth/repository");
    const service = new AuthService({
      config,
      githubClient: new GitHubOAuthClient(config),
      repository: getAuthRepository(),
    });
    const result = await service.signInWithGitHubCode(code, requestId);
    const destination = result.isNewAccount || !result.user.onboardingComplete
      ? "/onboarding"
      : "/dashboard";
    const redirectUrl = new URL(destination, config.appUrl);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    setAuthCookie(
      redirectResponse,
      SESSION_COOKIE_NAME,
      result.rawSessionToken,
      result.expiresAt,
      SESSION_TTL_SECONDS,
      config.isProduction,
    );
    redirectResponse.headers.set("Cache-Control", "no-store");
    return redirectResponse;
  });

  if (response instanceof NextResponse) {
    clearAuthCookie(response, OAUTH_STATE_COOKIE_NAME, process.env.NODE_ENV === "production");
  }

  return response;
}
