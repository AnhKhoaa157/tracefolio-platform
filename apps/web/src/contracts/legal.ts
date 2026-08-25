export const legalDocumentTypes = ["TERMS_OF_SERVICE", "PRIVACY_POLICY"] as const;

export type LegalDocumentType = (typeof legalDocumentTypes)[number];

export interface LegalDocumentMetadata {
  documentId: string;
  version: string;
  contentUrl: string;
  documentType: LegalDocumentType;
}

export interface CurrentLegalDocumentsResponse {
  documents: LegalDocumentMetadata[];
}
