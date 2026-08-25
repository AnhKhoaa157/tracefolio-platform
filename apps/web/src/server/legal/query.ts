import type { DatabaseQuery } from "../db/types";
import type { LegalDocumentMetadata } from "./types";
import { isLegalDocumentType } from "./types";

export const currentLegalDocumentsQuery = `
  WITH current_documents AS (
    SELECT DISTINCT ON (document_type)
      id AS document_id,
      version,
      content_url,
      document_type
    FROM legal_documents
    WHERE document_type IN ('TERMS_OF_SERVICE', 'PRIVACY_POLICY')
      AND published_at <= now()
    ORDER BY document_type, published_at DESC, created_at DESC, id DESC
  )
  SELECT document_id, version, content_url, document_type
  FROM current_documents
  ORDER BY document_type ASC
`;

interface LegalDocumentRow {
  document_id: string;
  version: string;
  content_url: string;
  document_type: string;
}

export async function queryCurrentLegalDocuments(
  connection: DatabaseQuery,
): Promise<LegalDocumentMetadata[]> {
  const result = await connection.query<LegalDocumentRow>(currentLegalDocumentsQuery);

  return result.rows.flatMap((row) => {
    if (!isLegalDocumentType(row.document_type)) return [];

    return [
      {
        documentId: row.document_id,
        version: row.version,
        contentUrl: row.content_url,
        documentType: row.document_type,
      },
    ];
  });
}
