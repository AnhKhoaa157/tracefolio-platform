export type AuthFailureCode =
  | "AUTH_CONFIGURATION"
  | "AUTH_ACCOUNT_UNAVAILABLE"
  | "AUTH_PROVISIONING_FAILED"
  | "OAUTH_REQUEST_INVALID"
  | "OAUTH_STATE_INVALID"
  | "OAUTH_DENIED"
  | "OAUTH_EXCHANGE_FAILED"
  | "OAUTH_IDENTITY_INVALID";

export class AuthFailure extends Error {
  readonly code: AuthFailureCode;
  readonly status: number;

  constructor(code: AuthFailureCode, message: string, status: number) {
    super(message);
    this.name = "AuthFailure";
    this.code = code;
    this.status = status;
  }
}

export function authConfiguration(): AuthFailure {
  return new AuthFailure(
    "AUTH_CONFIGURATION",
    "Authentication is temporarily unavailable.",
    503,
  );
}

export function authAccountUnavailable(): AuthFailure {
  return new AuthFailure(
    "AUTH_ACCOUNT_UNAVAILABLE",
    "This account cannot sign in.",
    403,
  );
}

export function authProvisioningFailed(): AuthFailure {
  return new AuthFailure(
    "AUTH_PROVISIONING_FAILED",
    "The account could not be created.",
    503,
  );
}

export function oauthRequestInvalid(): AuthFailure {
  return new AuthFailure(
    "OAUTH_REQUEST_INVALID",
    "The OAuth callback request is invalid.",
    400,
  );
}

export function oauthStateInvalid(): AuthFailure {
  return new AuthFailure(
    "OAUTH_STATE_INVALID",
    "The OAuth request is invalid or expired.",
    400,
  );
}

export function oauthDenied(): AuthFailure {
  return new AuthFailure(
    "OAUTH_DENIED",
    "GitHub authorization was denied.",
    400,
  );
}

export function oauthExchangeFailed(): AuthFailure {
  return new AuthFailure(
    "OAUTH_EXCHANGE_FAILED",
    "GitHub authorization could not be completed.",
    502,
  );
}

export function oauthIdentityInvalid(): AuthFailure {
  return new AuthFailure(
    "OAUTH_IDENTITY_INVALID",
    "GitHub identity could not be verified.",
    502,
  );
}
