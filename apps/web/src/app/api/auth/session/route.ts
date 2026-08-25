import type { NextRequest } from "next/server";

import type { AuthSessionResponse } from "@/contracts/auth";
import { handleApiRequest, jsonResponse } from "@/server/api/http";
import { getAuthenticatedUser } from "@/server/auth/session";
import { DomainError } from "@/server/domain/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new DomainError("UNAUTHENTICATED", "Authentication is required.", 401);
    }

    const body: AuthSessionResponse = {
      user: {
        id: user.userId,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      onboardingComplete: user.onboardingComplete,
    };

    return jsonResponse(body);
  });
}
