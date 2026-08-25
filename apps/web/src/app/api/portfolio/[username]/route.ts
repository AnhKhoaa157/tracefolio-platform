import type { NextRequest } from "next/server";

import { handleApiRequest, jsonResponse } from "@/server/api/http";
import { getTracefolioService } from "@/server/domain";
import { notFound } from "@/server/domain/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const { username } = await params;
    const portfolio = await getTracefolioService().getPublicPortfolio(username);
    if (!portfolio) throw notFound("The public portfolio was not found.");
    return jsonResponse({ portfolio });
  });
}
