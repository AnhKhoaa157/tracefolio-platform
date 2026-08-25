import type { NextRequest } from "next/server";

import type { CurrentLegalDocumentsResponse } from "@/contracts/legal";
import { handleApiRequest, jsonResponse } from "@/server/api/http";
import { LegalDocumentService } from "@/server/legal/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRequest(request, async () => {
    const { getLegalDocumentRepository } = await import("@/server/legal/repository");
    const documents = await new LegalDocumentService(getLegalDocumentRepository()).getCurrentDocuments();
    const response: CurrentLegalDocumentsResponse = { documents };

    return jsonResponse(response);
  });
}
