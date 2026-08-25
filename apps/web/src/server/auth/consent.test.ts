import { strict as assert } from "node:assert";
import test from "node:test";

import { ConsentService } from "./consent";
import { consentInvalid, DomainError } from "../domain/errors";
import type {
  ConsentDocumentAcceptance,
  ConsentCompletionRecord,
  ConsentRepository,
  LegalDocumentType,
} from "./types";

const userId = "consent-user";
const terms = { documentId: "terms-v1", version: "1.0.0" };
const privacy = { documentId: "privacy-v1", version: "1.0.0" };

test("valid consent atomically records both documents and activates the user", async () => {
  const repository = new FakeConsentRepository();
  const service = new ConsentService(repository);

  const result = await service.complete({
    userId,
    terms: { ...terms, accepted: true },
    privacy: { ...privacy, accepted: true },
  });

  assert.equal(repository.status, "ACTIVE");
  assert.equal(repository.consents.size, 2);
  assert.deepEqual(result, {
    status: "ACTIVE",
    consents: { terms, privacy },
  });
});

test("repeated consent submission is idempotent", async () => {
  const repository = new FakeConsentRepository();
  const service = new ConsentService(repository);
  const command = {
    userId,
    terms: { ...terms, accepted: true },
    privacy: { ...privacy, accepted: true },
  };

  await service.complete(command);
  await service.complete(command);

  assert.equal(repository.status, "ACTIVE");
  assert.equal(repository.consents.size, 2);
});

test("consent requires intentional acceptance and current published documents", async () => {
  const repository = new FakeConsentRepository();
  const service = new ConsentService(repository);

  await assert.rejects(
    service.complete({
      userId,
      terms: { ...terms, accepted: false },
      privacy: { ...privacy, accepted: true },
    }),
    (error: unknown) => error instanceof DomainError && error.code === "INVALID_INPUT",
  );

  repository.documents.PRIVACY_POLICY = null;
  await assert.rejects(
    service.complete({
      userId,
      terms: { ...terms, accepted: true },
      privacy: { ...privacy, accepted: true },
    }),
    (error: unknown) => error instanceof DomainError && error.code === "CONSENT_INVALID",
  );
  assert.equal(repository.status, "CONSENT_REQUIRED");
  assert.equal(repository.consents.size, 0);
});

test("unpublished and mismatched legal document versions are rejected", async () => {
  const unpublishedRepository = new FakeConsentRepository();
  unpublishedRepository.documents.PRIVACY_POLICY = {
    ...privacy,
    documentType: "PRIVACY_POLICY",
    published: false,
  };
  const unpublishedService = new ConsentService(unpublishedRepository);

  await assert.rejects(
    unpublishedService.complete({
      userId,
      terms: { ...terms, accepted: true },
      privacy: { ...privacy, accepted: true },
    }),
    (error: unknown) => error instanceof DomainError && error.code === "CONSENT_INVALID",
  );

  const mismatchedRepository = new FakeConsentRepository();
  const mismatchedService = new ConsentService(mismatchedRepository);
  await assert.rejects(
    mismatchedService.complete({
      userId,
      terms: { ...terms, accepted: true },
      privacy: { documentId: "privacy-v1", version: "9.9.9", accepted: true },
    }),
    (error: unknown) => error instanceof DomainError && error.code === "CONSENT_INVALID",
  );
});

type LegalDocumentFixture = ConsentDocumentAcceptance & {
  documentType: LegalDocumentType;
  published: boolean;
};

class FakeConsentRepository implements ConsentRepository {
  status: "ACTIVE" | "CONSENT_REQUIRED" = "CONSENT_REQUIRED";
  consents = new Map<string, ConsentDocumentAcceptance>();
  documents: Record<LegalDocumentType, LegalDocumentFixture | null> = {
    TERMS_OF_SERVICE: { ...terms, documentType: "TERMS_OF_SERVICE", published: true },
    PRIVACY_POLICY: { ...privacy, documentType: "PRIVACY_POLICY", published: true },
  };

  async completeConsent(
    requestedUserId: string,
    requestedTerms: ConsentDocumentAcceptance,
    requestedPrivacy: ConsentDocumentAcceptance,
  ): Promise<ConsentCompletionRecord> {
    if (requestedUserId !== userId) throw consentInvalid();
    const currentTerms = this.documents.TERMS_OF_SERVICE;
    const currentPrivacy = this.documents.PRIVACY_POLICY;
    if (!matches(currentTerms, requestedTerms) || !matches(currentPrivacy, requestedPrivacy)) {
      throw consentInvalid();
    }

    this.consents.set(`${requestedUserId}:${requestedTerms.documentId}`, requestedTerms);
    this.consents.set(`${requestedUserId}:${requestedPrivacy.documentId}`, requestedPrivacy);
    this.status = "ACTIVE";

    return {
      status: "ACTIVE",
      documents: [
        { ...requestedTerms, documentType: "TERMS_OF_SERVICE" },
        { ...requestedPrivacy, documentType: "PRIVACY_POLICY" },
      ],
    };
  }
}

function matches(
  current: LegalDocumentFixture | null,
  requested: ConsentDocumentAcceptance,
): boolean {
  return Boolean(
    current?.published &&
      current.documentId === requested.documentId &&
      current.version === requested.version,
  );
}
