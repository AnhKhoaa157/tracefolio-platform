import type { NextRequest } from "next/server";

import type { UpdateAchievementRequest } from "@/contracts/portfolio";
import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ achievementId: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId();
    const { achievementId } = await params;
    const body = (await readJsonObject(request)) as unknown as UpdateAchievementRequest;
    const achievement = await getTracefolioService().updateAchievement({
      ...body,
      userId,
      achievementId,
      requestId,
    });
    return jsonResponse({ achievement });
  });
}
