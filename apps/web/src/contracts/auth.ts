export interface AuthSessionUser {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface AuthSessionResponse {
  user: AuthSessionUser;
  onboardingComplete: boolean;
}

export interface ConsentDocumentAcceptance {
  documentId: string;
  version: string;
  accepted: boolean;
}

export interface CompleteConsentRequest {
  terms: ConsentDocumentAcceptance;
  privacy: ConsentDocumentAcceptance;
}

export interface ConsentDocumentResponse {
  documentId: string;
  version: string;
}

export interface ConsentCompletionResponse {
  user: {
    status: "ACTIVE";
  };
  consents: {
    terms: ConsentDocumentResponse;
    privacy: ConsentDocumentResponse;
  };
}
