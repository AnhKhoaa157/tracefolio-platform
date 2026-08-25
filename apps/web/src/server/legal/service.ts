import { legalDocumentsUnavailable } from "../domain/errors";
import { legalDocumentTypes } from "@/contracts/legal";
import type { LegalDocumentMetadata, LegalDocumentRepository } from "./types";

export class LegalDocumentService {
  constructor(private readonly repository: LegalDocumentRepository) {}

  async getCurrentDocuments(): Promise<LegalDocumentMetadata[]> {
    const documents = await this.repository.getCurrentDocuments();
    const hasBothCurrentDocuments =
      documents.length === legalDocumentTypes.length &&
      legalDocumentTypes.every((documentType) =>
        documents.some((document) => document.documentType === documentType),
      );

    if (!hasBothCurrentDocuments) throw legalDocumentsUnavailable();

    return legalDocumentTypes.map(
      (documentType) => documents.find((document) => document.documentType === documentType)!,
    );
  }
}
