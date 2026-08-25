import "server-only";

import { getDatabase } from "../db/client";
import type { Database } from "../db/types";
import { queryCurrentLegalDocuments } from "./query";
import type { LegalDocumentRepository } from "./types";

export class PostgresLegalDocumentRepository implements LegalDocumentRepository {
  constructor(private readonly database: Database = getDatabase()) {}

  async getCurrentDocuments() {
    return queryCurrentLegalDocuments(this.database);
  }
}

export function getLegalDocumentRepository(): LegalDocumentRepository {
  return new PostgresLegalDocumentRepository(getDatabase());
}
