import { strict as assert } from "node:assert";
import test from "node:test";

import { DomainError } from "../domain/errors";
import { LegalDocumentService } from "./service";
import type { LegalDocumentMetadata, LegalDocumentRepository } from "./types";

const terms: LegalDocumentMetadata = {
  documentId: "terms-v1",
  version: "1.0.0",
  contentUrl: "https://example.test/terms-v1",
  documentType: "TERMS_OF_SERVICE",
};
const privacy: LegalDocumentMetadata = {
  documentId: "privacy-v1",
  version: "1.0.0",
  contentUrl: "https://example.test/privacy-v1",
  documentType: "PRIVACY_POLICY",
};

test("returns metadata for both current legal documents", async () => {
  const service = new LegalDocumentService(new FakeLegalDocumentRepository([privacy, terms]));

  assert.deepEqual(await service.getCurrentDocuments(), [terms, privacy]);
});

test("returns a safe unavailable error when either current document is absent", async () => {
  for (const documents of [[terms], [privacy]]) {
    const service = new LegalDocumentService(new FakeLegalDocumentRepository(documents));

    await assert.rejects(
      service.getCurrentDocuments(),
      (error: unknown) =>
        error instanceof DomainError &&
        error.code === "LEGAL_DOCUMENTS_UNAVAILABLE" &&
        error.status === 503 &&
        error.message === "The required legal documents are temporarily unavailable.",
    );
  }
});

class FakeLegalDocumentRepository implements LegalDocumentRepository {
  constructor(private readonly documents: LegalDocumentMetadata[]) {}

  async getCurrentDocuments(): Promise<LegalDocumentMetadata[]> {
    return this.documents;
  }
}
