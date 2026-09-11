/**
 * Authentication adapter 1 of 2: an existing OrcaRouter API key.
 *
 * A user who already holds an `sk-orca-…` key pastes it here. This adapter
 * produces the exact same credential record as the PKCE adapter, so nothing
 * downstream — provider, transport, model discovery — can tell the two apart.
 */

import type { CredentialAdapter, CredentialStore, OrcaCredentialRecord } from "./credentials";
import { looksLikeOrcaKey, maskKey, normalizeKeyInput } from "./credentials";

export class OrcaApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrcaApiKeyError";
  }
}

export interface ApiKeyAdapterOptions {
  credentials: CredentialStore;
  /** Read lazily so the component can bind it to an input field. */
  readKey: () => string;
  /** Scope reported for a manually supplied key. */
  scope?: string;
}

/**
 * Format check for the entry form. Returns `null` when the value is
 * acceptable, or a message to show the user.
 */
export function validateApiKeyInput(candidate: string): string | null {
  const value = normalizeKeyInput(candidate);
  if (!value) {
    return "Enter your OrcaRouter API key.";
  }
  if (!looksLikeOrcaKey(value)) {
    return "That does not look like an OrcaRouter key. Keys start with \"sk-orca-\".";
  }
  return null;
}

/** Display helper. The full key is never returned. */
export function describeStoredKey(record: OrcaCredentialRecord | null): string {
  if (!record) {
    return "No key stored";
  }
  return maskKey(record.apiKey);
}

export function createApiKeyAdapter(options: ApiKeyAdapterOptions): CredentialAdapter & {
  adoptKey: (candidate: string) => OrcaCredentialRecord;
} {
  const { credentials, readKey, scope = "api" } = options;

  function adoptKey(candidate: string): OrcaCredentialRecord {
    const value = normalizeKeyInput(candidate);
    const problem = validateApiKeyInput(value);
    if (problem) {
      throw new OrcaApiKeyError(problem);
    }
    // Validity is established by the first real request, not by a paid probe.
    return credentials.adopt({ apiKey: value, authMethod: "api-key", scope, userId: null });
  }

  return {
    id: "api-key",
    async acquire() {
      return adoptKey(readKey());
    },
    adoptKey,
    // Nothing asynchronous is started by this adapter, so there is nothing to
    // release; present to satisfy the shared adapter shape.
    cancel() {},
  };
}
