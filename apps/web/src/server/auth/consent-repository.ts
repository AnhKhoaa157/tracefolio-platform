import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabase } from "../db/client";
import type { Database, DatabaseQuery } from "../db/types";
import { consentInvalid, forbidden, notFound } from "../domain/errors";
import type {
  ConsentDocumentAcceptance,
  ConsentCompletionRecord,
  ConsentRepository,
  LegalDocumentType,
} from "./types";

interface UserStatusRow {
  status: "ACTIVE" | "CONSENT_REQUIRED" | "PENDING_DELETION" | "SUSPENDED";
}

interface LegalDocumentRow {
  id: string;
  document_type: LegalDocumentType;
  version: string;
}

export class PostgresConsentRepository implements ConsentRepository {
  constructor(private readonly database: Database = getDatabase()) {}

  async completeConsent(
    userId: string,
    terms: ConsentDocumentAcceptance,
    privacy: ConsentDocumentAcceptance,
  ): Promise<ConsentCompletionRecord> {
    return this.database.transaction(async (connection) => {
      const userResult = await connection.query<UserStatusRow>(
        "SELECT status FROM users WHERE id = $1 FOR UPDATE",
        [userId],
      );
      const user = userResult.rows[0];

      if (!user) throw notFound("The account was not found.");
      if (user.status !== "ACTIVE" && user.status !== "CONSENT_REQUIRED") {
        throw forbidden("This account cannot complete legal consent.");
      }

      const termsDocument = await findCurrentDocument(connection, "TERMS_OF_SERVICE");
      const privacyDocument = await findCurrentDocument(connection, "PRIVACY_POLICY");
      assertCurrentDocument(termsDocument, terms, "Terms of Service");
      assertCurrentDocument(privacyDocument, privacy, "Privacy Policy");

      await insertConsent(connection, userId, terms.documentId);
      await insertConsent(connection, userId, privacy.documentId);

      if (user.status === "CONSENT_REQUIRED") {
        await connection.query(
          "UPDATE users SET status = 'ACTIVE' WHERE id = $1 AND status = 'CONSENT_REQUIRED'",
          [userId],
        );
      }

      return {
        status: "ACTIVE",
        documents: [
          { documentType: "TERMS_OF_SERVICE", documentId: terms.documentId, version: terms.version },
          { documentType: "PRIVACY_POLICY", documentId: privacy.documentId, version: privacy.version },
        ],
      };
    });
  }
}

export function getConsentRepository(): ConsentRepository {
  return new PostgresConsentRepository(getDatabase());
}

async function findCurrentDocument(
  connection: DatabaseQuery,
  documentType: LegalDocumentType,
): Promise<LegalDocumentRow | null> {
  const result = await connection.query<LegalDocumentRow>(
    `
      SELECT id, document_type, version
      FROM legal_documents
      WHERE document_type = $1 AND published_at <= now()
      ORDER BY published_at DESC, created_at DESC, id DESC
      LIMIT 1
    `,
    [documentType],
  );

  return result.rows[0] ?? null;
}

function assertCurrentDocument(
  current: LegalDocumentRow | null,
  requested: ConsentDocumentAcceptance,
  label: string,
): asserts current is LegalDocumentRow {
  if (!current || current.id !== requested.documentId || current.version !== requested.version) {
    throw consentInvalid(`${label} document is missing, unpublished, or not current.`);
  }
}

async function insertConsent(
  connection: DatabaseQuery,
  userId: string,
  documentId: string,
): Promise<void> {
  await connection.query(
    `
      INSERT INTO legal_consents (id, user_id, document_id, accepted_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id, document_id) DO NOTHING
    `,
    [randomUUID(), userId, documentId],
  );
}
