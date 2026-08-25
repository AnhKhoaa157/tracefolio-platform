import type { NextRequest } from "next/server";

import type { CreateAchievementRequest } from "@/contracts/portfolio";
import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    const userId = await requireAuthenticatedUserId(request);
    return jsonResponse({ achievements: await getTracefolioService().listAchievements(userId) });
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId(request);
    const body = (await readJsonObject(request)) as unknown as CreateAchievementRequest;
    const achievement = await getTracefolioService().createAchievement({
      ...body,
      userId,
      requestId,
    });
    return jsonResponse({ achievement }, 201);
  });
}
