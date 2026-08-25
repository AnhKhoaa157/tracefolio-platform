import type { NextRequest } from "next/server";

import { handleApiRequest, jsonResponse } from "@/server/api/http";
import { requireAuthenticatedUserId } from "@/server/auth/session";
import { getTracefolioService } from "@/server/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async (requestId) => {
    const userId = await requireAuthenticatedUserId(request);
    await getTracefolioService().unpublishPortfolio({ userId, requestId });
    return jsonResponse({ ok: true });
  });
}
