import { strict as assert } from "node:assert";
import test from "node:test";

import type { QueryResult, QueryResultRow } from "pg";

import { currentLegalDocumentsQuery, queryCurrentLegalDocuments } from "./query";
import type { DatabaseQuery } from "../db/types";

test("current legal document query only selects the latest published document per type", async () => {
  let executedQuery = "";
  const connection: DatabaseQuery = {
    query: async <Row extends QueryResultRow = QueryResultRow>(text: string) => {
      executedQuery = text;
      return {
        command: "SELECT",
        rowCount: 2,
        oid: 0,
        fields: [],
        rows: [
          {
            document_id: "terms-v2",
            version: "2.0.0",
            content_url: "https://example.test/terms-v2",
            document_type: "TERMS_OF_SERVICE",
          },
          {
            document_id: "privacy-v1",
            version: "1.0.0",
            content_url: "https://example.test/privacy-v1",
            document_type: "PRIVACY_POLICY",
          },
        ],
      } as unknown as QueryResult<Row>;
    },
  };

  const documents = await queryCurrentLegalDocuments(connection);

  assert.equal(executedQuery, currentLegalDocumentsQuery);
  assert.match(executedQuery, /published_at <= now\(\)/);
  assert.match(executedQuery, /DISTINCT ON \(document_type\)/);
  assert.deepEqual(documents, [
    {
      documentId: "terms-v2",
      version: "2.0.0",
      contentUrl: "https://example.test/terms-v2",
      documentType: "TERMS_OF_SERVICE",
    },
    {
      documentId: "privacy-v1",
      version: "1.0.0",
      contentUrl: "https://example.test/privacy-v1",
      documentType: "PRIVACY_POLICY",
    },
  ]);
});
