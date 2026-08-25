import type { LegalDocumentMetadata, LegalDocumentType } from "@/contracts/legal";

export type { LegalDocumentMetadata, LegalDocumentType } from "@/contracts/legal";

export interface LegalDocumentRepository {
  getCurrentDocuments(): Promise<LegalDocumentMetadata[]>;
}

export function isLegalDocumentType(value: string): value is LegalDocumentType {
  return value === "TERMS_OF_SERVICE" || value === "PRIVACY_POLICY";
}
