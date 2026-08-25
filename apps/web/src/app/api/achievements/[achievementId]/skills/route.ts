import type { NextRequest } from "next/server";

import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";
import { requireIdentifier } from "@/server/domain/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ achievementId: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId();
    const { achievementId } = await params;
    const body = await readJsonObject(request);
    const achievement = await getTracefolioService().attachSkillToAchievement({
      userId,
      achievementId,
      skillId: requireIdentifier(body.skillId, "skill id"),
      requestId,
    });
    return jsonResponse({ achievement });
  });
}
