import { NextResponse } from "next/server";

import { checkDatabaseHealth } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const databaseHealthy = await checkDatabaseHealth();

  return NextResponse.json({
    service: "tracefolio-web",
    status: databaseHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
  }, {
    status: databaseHealthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
