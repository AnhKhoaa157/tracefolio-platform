import type { NextRequest } from "next/server";

import type { CreateSkillRequest } from "@/contracts/portfolio";
import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    const userId = await requireAuthenticatedUserId();
    return jsonResponse({ skills: await getTracefolioService().listSkills(userId) });
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId();
    const body = (await readJsonObject(request)) as unknown as CreateSkillRequest;
    const skill = await getTracefolioService().createSkill({ ...body, userId, requestId });
    return jsonResponse({ skill }, 201);
  });
}
