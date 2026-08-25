import type { NextRequest } from "next/server";

import type { ChangeUsernameRequest } from "@/contracts/portfolio";
import { handleApiRequest, jsonResponse, readJsonObject } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId(request);
    const body = (await readJsonObject(request)) as unknown as ChangeUsernameRequest;
    const profile = await getTracefolioService().changeUsername({ ...body, userId, requestId });
    return jsonResponse({ profile });
  });
}
