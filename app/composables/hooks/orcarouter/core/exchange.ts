/**
 * OrcaRouter credential API calls.
 *
 * Everything here talks to the auth origin only. Inference and model
 * discovery live in `transport.ts` and use the inference origin.
 */

import type { OrcaOrigins } from "./origins";
import type { OrcaScope } from "./pkce";
import { orcaExchangeUrl } from "./origins";
import { PKCE_CHALLENGE_METHOD, SUPPORTED_SCOPES } from "./pkce";

export type OrcaExchangeFailure
  = | "bad_request"
    | "denied"
    | "rate_limited"
    | "server_error"
    | "network"
    | "malformed_response";

export class OrcaExchangeError extends Error {
  readonly failure: OrcaExchangeFailure;
  readonly status: number | null;

  constructor(failure: OrcaExchangeFailure, message: string, status: number | null = null) {
    super(message);
    this.name = "OrcaExchangeError";
    this.failure = failure;
    this.status = status;
  }
}

export interface OrcaExchangeResult {
  /** The durable OrcaRouter API key. Never log this value. */
  key: string;
  /** The scope that was *granted*, which may be narrower than requested. */
  scope: string;
  userId: string | null;
}

export interface OrcaExchangeInput {
  origins: OrcaOrigins;
  code: string;
  verifier: string;
  fetchImpl?: typeof fetch;
}

/**
 * Human-readable, non-secret summary for a failed exchange. The response body
 * is never interpolated: it can echo request material back.
 */
export function describeExchangeFailure(error: unknown): string {
  if (!(error instanceof OrcaExchangeError)) {
    return "OrcaRouter authorization failed unexpectedly.";
  }
  switch (error.failure) {
    case "bad_request":
      return "OrcaRouter rejected the request (400). The code challenge method changed between authorize and exchange — start the login again.";
    case "denied":
      return "The authorization code is unknown, expired, already used, or does not match this attempt. Start the login again.";
    case "rate_limited":
      return "OrcaRouter is rate limiting key issuance (429). Wait for the current window to reset before signing in again.";
    case "server_error":
      return "OrcaRouter had a server error. Try again shortly.";
    case "network":
      return "Could not reach OrcaRouter. Check the network connection and try again.";
    default:
      return "OrcaRouter returned an unexpected response. Start the login again.";
  }
}

function classify(status: number): OrcaExchangeFailure {
  if (status === 400) {
    return "bad_request";
  }
  if (status === 403) {
    return "denied";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status >= 500) {
    return "server_error";
  }
  return "malformed_response";
}

/**
 * Redeem an authorization code. The response carries a durable API key — not
 * an access/refresh token pair — so nothing here schedules a refresh.
 *
 * Form encoding is accepted by the endpoint as well (RFC 6749 §2.3.1); JSON is
 * used because every runtime here speaks it natively.
 */
export async function exchangeCodeForKey(input: OrcaExchangeInput): Promise<OrcaExchangeResult> {
  const { origins, code, verifier } = input;
  const doFetch = input.fetchImpl ?? globalThis.fetch;

  if (!code) {
    throw new OrcaExchangeError("denied", "no authorization code was provided");
  }
  if (!verifier) {
    throw new OrcaExchangeError("denied", "the PKCE verifier is missing for this attempt");
  }
  if (typeof doFetch !== "function") {
    throw new OrcaExchangeError("network", "no fetch implementation is available");
  }

  let response: Response;
  try {
    response = await doFetch(orcaExchangeUrl(origins), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        code_challenge_method: PKCE_CHALLENGE_METHOD,
      }),
    });
  }
  catch {
    // Deliberately drop the cause: a transport error message may embed the URL
    // or the request body.
    throw new OrcaExchangeError("network", "could not reach the OrcaRouter auth origin");
  }

  if (!response.ok) {
    throw new OrcaExchangeError(
      classify(response.status),
      `OrcaRouter exchange failed with status ${response.status}`,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  }
  catch {
    throw new OrcaExchangeError("malformed_response", "OrcaRouter returned a non-JSON response");
  }

  const record = (payload ?? {}) as Record<string, unknown>;
  const key = typeof record.key === "string" ? record.key : "";
  const scope = typeof record.scope === "string" ? record.scope : "";

  if (!key) {
    throw new OrcaExchangeError("malformed_response", "OrcaRouter returned no key");
  }

  return {
    key,
    scope,
    userId: typeof record.user_id === "string" ? record.user_id : null,
  };
}

/**
 * Interpret the granted scope. A client that asked for a wider grant and
 * received a narrower one must say so instead of assuming it holds the wider
 * one.
 */
export function describeGrantedScope(scope: string): { usable: boolean; warning: string | null } {
  if (SUPPORTED_SCOPES.includes(scope as OrcaScope)) {
    return { usable: true, warning: null };
  }
  if (!scope) {
    return {
      usable: false,
      warning: "OrcaRouter did not report which scope was granted, so this credential cannot be used.",
    };
  }
  return {
    usable: false,
    warning: `OrcaRouter granted the "${scope}" scope, which this integration cannot use.`,
  };
}
