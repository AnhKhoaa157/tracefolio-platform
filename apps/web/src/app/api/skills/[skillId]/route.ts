import type { NextRequest } from "next/server";

import type { UpdateSkillRequest } from "@/contracts/portfolio";
import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId(request);
    const { skillId } = await params;
    const body = (await readJsonObject(request)) as unknown as UpdateSkillRequest;
    const skill = await getTracefolioService().updateSkill({ ...body, userId, skillId, requestId });
    return jsonResponse({ skill });
  });
}
