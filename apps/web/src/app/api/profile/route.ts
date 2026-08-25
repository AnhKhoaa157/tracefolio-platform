import type { NextRequest } from "next/server";

import type { CreateProfileRequest, UpdateProfileRequest } from "@/contracts/portfolio";
import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    const userId = await requireAuthenticatedUserId(request);
    return jsonResponse({ profile: await getTracefolioService().getProfile(userId) });
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId(request);
    const body = (await readJsonObject(request)) as unknown as CreateProfileRequest;
    const profile = await getTracefolioService().createProfile({ ...body, userId, requestId });
    return jsonResponse({ profile }, 201);
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId(request);
    const body = (await readJsonObject(request)) as unknown as UpdateProfileRequest;
    const profile = await getTracefolioService().updateProfile({ ...body, userId, requestId });
    return jsonResponse({ profile });
  });
}
