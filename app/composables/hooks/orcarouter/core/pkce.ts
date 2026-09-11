/**
 * PKCE (RFC 7636) primitives for the OrcaRouter connect flow.
 *
 * Rules enforced here:
 *  - a fresh verifier and state for every attempt, from a cryptographic RNG;
 *  - `code_challenge_method` is always S256, in every flow — a user can always
 *    ask the consent screen to show a code, which puts it in human hands;
 *  - the challenge is unpadded base64url(sha256(verifier));
 *  - the verifier never leaves this process except in the exchange body, and
 *    never appears in a URL.
 */

import type { OrcaOrigins } from "./origins";
import { orcaAuthorizeUrl } from "./origins";

export const PKCE_CHALLENGE_METHOD = "S256";
export const PKCE_VERIFIER_BYTES = 32;
export const PKCE_STATE_BYTES = 16;
export const DEFAULT_SCOPE = "api";

/** Scopes this client is able to use. Anything else is refused up front. */
export const SUPPORTED_SCOPES = ["api"] as const;
export type OrcaScope = (typeof SUPPORTED_SCOPES)[number];

export class OrcaPkceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrcaPkceError";
  }
}

/** Unpadded base64url, the only encoding PKCE accepts for these values. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = typeof btoa === "function"
    ? btoa(binary)
    : base64FromBytesFallback(bytes);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Standard-library base64 for runtimes without `btoa`. Kept dependency-free —
 * SHA-256 and base64url come from the platform, not from a new package.
 */
function base64FromBytesFallback(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += alphabet[b0 >> 2];
    out += alphabet[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? "=" : alphabet[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? "=" : alphabet[b2 & 63];
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const webcrypto = globalThis.crypto;
  if (!webcrypto?.getRandomValues) {
    throw new OrcaPkceError("a cryptographic RNG is required to start the connect flow");
  }
  webcrypto.getRandomValues(out);
  return out;
}

/** SHA-256 of the ASCII verifier, unpadded base64url. */
export async function deriveChallenge(verifier: string): Promise<string> {
  if (!verifier || typeof verifier !== "string") {
    throw new OrcaPkceError("verifier is required");
  }
  const webcrypto = globalThis.crypto;
  if (!webcrypto?.subtle) {
    throw new OrcaPkceError("WebCrypto SubtleCrypto is required to derive the challenge");
  }
  const digest = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export interface PkceAttempt {
  /** Never log, print, or place in a URL. */
  verifier: string;
  /** Safe to put on the authorize URL. */
  challenge: string;
  /** CSRF token echoed back by the consent screen. */
  state: string;
  challengeMethod: typeof PKCE_CHALLENGE_METHOD;
}

/** Build a fresh attempt. Called once per authorization, never reused. */
export async function createPkceAttempt(): Promise<PkceAttempt> {
  const verifier = base64UrlEncode(randomBytes(PKCE_VERIFIER_BYTES));
  const state = base64UrlEncode(randomBytes(PKCE_STATE_BYTES));
  const challenge = await deriveChallenge(verifier);
  return { verifier, challenge, state, challengeMethod: PKCE_CHALLENGE_METHOD };
}

export interface AuthorizeUrlInput {
  origins: OrcaOrigins;
  attempt: PkceAttempt;
  appName: string;
  /** `oob` for the out-of-band flow, or a concrete callback URL. */
  callbackUrl: string;
  scope?: OrcaScope;
  loginHint?: string;
  workspaceHint?: string;
  /** `consent` forces re-approval. */
  prompt?: string;
}

/**
 * Build the consent-screen URL. Only the challenge and state are placed here;
 * the verifier is deliberately absent.
 */
export function buildAuthorizeUrl(input: AuthorizeUrlInput): string {
  const { origins, attempt, appName, callbackUrl, scope = DEFAULT_SCOPE } = input;

  if (attempt.challengeMethod !== PKCE_CHALLENGE_METHOD) {
    throw new OrcaPkceError("only S256 is supported");
  }
  if (!SUPPORTED_SCOPES.includes(scope)) {
    throw new OrcaPkceError(`unsupported scope: ${scope}`);
  }
  if (callbackUrl !== "oob" && !isAcceptableCallbackUrl(callbackUrl)) {
    throw new OrcaPkceError(`unacceptable callback_url: ${callbackUrl}`);
  }
  if (/user:pass@|#/.test(callbackUrl)) {
    throw new OrcaPkceError("callback_url must not contain userinfo or a fragment");
  }

  const url = new URL(orcaAuthorizeUrl(origins));
  url.searchParams.set("callback_url", callbackUrl);
  url.searchParams.set("code_challenge", attempt.challenge);
  url.searchParams.set("code_challenge_method", attempt.challengeMethod);
  url.searchParams.set("state", attempt.state);
  url.searchParams.set("app_name", appName);
  url.searchParams.set("scope", scope);
  if (input.loginHint) {
    url.searchParams.set("login_hint", input.loginHint);
  }
  if (input.workspaceHint) {
    url.searchParams.set("workspace_hint", input.workspaceHint);
  }
  if (input.prompt) {
    url.searchParams.set("prompt", input.prompt);
  }

  // Defence in depth: the verifier must never reach the authorize URL.
  if (url.toString().includes(attempt.verifier)) {
    throw new OrcaPkceError("refusing to build an authorize URL containing the verifier");
  }

  return url.toString();
}

/** `https://` any host/port, or `http://` loopback only. */
export function isAcceptableCallbackUrl(candidate: string): boolean {
  let url: URL;
  try {
    url = new URL(candidate);
  }
  catch {
    return false;
  }
  if (url.username || url.password || url.hash) {
    return false;
  }
  if (url.protocol === "https:") {
    return true;
  }
  if (url.protocol === "http:") {
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  }
  return false;
}

/**
 * Constant-time string comparison, used for the `state` check. Length is
 * compared first so the loop below is always over equal-length inputs.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validate the `state` echoed back by the consent screen. A mismatch ends the
 * attempt; it must never be treated as a warning.
 */
export function assertStateMatches(expected: string, received: string | null | undefined): void {
  if (!safeEqual(expected, received)) {
    throw new OrcaPkceError("state mismatch: the authorization response is not for this attempt");
  }
}
