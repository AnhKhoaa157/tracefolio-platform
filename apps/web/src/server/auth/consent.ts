import { invalidInput } from "../domain/errors";
import { isRecord, requireIdentifier, requireText, requireUserId } from "../domain/validation";
import type {
  ConsentDocumentAcceptance,
  ConsentRepository,
  LegalDocumentType,
} from "./types";

export interface CompleteConsentCommand {
  userId: string;
  terms: unknown;
  privacy: unknown;
}

export interface ConsentCompletionResult {
  status: "ACTIVE";
  consents: {
    terms: ConsentDocumentAcceptance;
    privacy: ConsentDocumentAcceptance;
  };
}

export class ConsentService {
  constructor(private readonly repository: ConsentRepository) {}

  async complete(command: CompleteConsentCommand): Promise<ConsentCompletionResult> {
    const userId = requireUserId(command.userId);
    const terms = normalizeAcceptance(command.terms, "Terms of Service");
    const privacy = normalizeAcceptance(command.privacy, "Privacy Policy");
    const result = await this.repository.completeConsent(userId, terms, privacy);

    return {
      status: result.status,
      consents: {
        terms: pickDocument(result.documents, "TERMS_OF_SERVICE", terms),
        privacy: pickDocument(result.documents, "PRIVACY_POLICY", privacy),
      },
    };
  }
}

function normalizeAcceptance(value: unknown, label: string): ConsentDocumentAcceptance {
  if (!isRecord(value)) throw invalidInput(`${label} acceptance is required.`);
  if (value.accepted !== true) {
    throw invalidInput(`${label} must be explicitly accepted.`);
  }

  return {
    documentId: requireIdentifier(value.documentId, `${label} document id`),
    version: requireText(value.version, `${label} document version`, 128),
  };
}

function pickDocument(
  documents: Array<ConsentDocumentAcceptance & { documentType: LegalDocumentType }>,
  documentType: LegalDocumentType,
  fallback: ConsentDocumentAcceptance,
): ConsentDocumentAcceptance {
  const document = documents.find((candidate) => candidate.documentType === documentType);
  return document ? { documentId: document.documentId, version: document.version } : fallback;
}
