import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiRequest } from "@/server/api/http";
import { clearSessionCookie } from "@/server/auth/session";
import { revokeCurrentSession } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    await revokeCurrentSession(request);
    const response = NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
    clearSessionCookie(response, process.env.NODE_ENV === "production");
    return response;
  });
}
