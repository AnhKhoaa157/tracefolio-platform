import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiRequest } from "@/server/api/http";
import { getAuthConfig } from "@/server/auth/config";
import {
  getAuthCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_SECONDS,
} from "@/server/auth/cookies";
import { getGitHubAuthorizationUrl } from "@/server/auth/github";
import { createOAuthState } from "@/server/auth/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    const config = getAuthConfig();
    const challenge = createOAuthState(config.sessionSecret);
    const response = NextResponse.redirect(getGitHubAuthorizationUrl(config, challenge.state));

    response.cookies.set(
      OAUTH_STATE_COOKIE_NAME,
      challenge.cookieValue,
      getAuthCookieOptions(challenge.expiresAt, OAUTH_STATE_TTL_SECONDS, config.isProduction),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  });
}
