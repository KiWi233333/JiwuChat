/**
 * OrcaRouter credential persistence.
 *
 * Reuses the project's existing secret mechanism: the same `useLocalStorage`
 * wrapper the app already uses for the API endpoints and the user token. No
 * new secret store is introduced for OrcaRouter.
 *
 * The stored record is shared by both authentication adapters: a pasted API
 * key and a PKCE-issued key produce the exact same record shape, and nothing
 * downstream can tell which adapter produced it.
 */

export type OrcaAuthMethod = "api-key" | "pkce";

/** Why a credential stopped being usable. */
export type OrcaCredentialStatus = "ready" | "needsReauth";

export interface OrcaCredentialRecord {
  /** The durable OrcaRouter key. Never log, never render unmasked. */
  apiKey: string;
  /** Which adapter produced the record. Informational only. */
  authMethod: OrcaAuthMethod;
  /** Scope as *granted* by OrcaRouter, not as requested. */
  scope: string;
  userId: string | null;
  /** Monotonic per-write counter used to keep late failures generation-safe. */
  generation: number;
  status: OrcaCredentialStatus;
  updatedAt: number;
}

export const ORCA_CREDENTIAL_STORAGE_KEY = "orcarouter:credential";

/** Narrow shape check — a corrupted or hand-edited record must not be trusted. */
export function isUsableRecord(value: unknown): value is OrcaCredentialRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.apiKey === "string"
    && record.apiKey.length > 0
    && typeof record.generation === "number"
    && Number.isInteger(record.generation)
    && (record.status === "ready" || record.status === "needsReauth");
}

/**
 * Mask a key for display. Only the prefix identifies the credential type, so
 * the tail is replaced with a fixed-width run of dots. The full key is never
 * returned by this function.
 */
export function maskKey(key: string | null | undefined): string {
  if (!key) {
    return "";
  }
  const prefixMatch = /^(sk-orca-[a-z0-9]{0,4})/i.exec(key);
  const prefix = prefixMatch ? prefixMatch[1] : key.slice(0, 4);
  return `${prefix}${"•".repeat(8)}`;
}

/**
 * Lightweight format check only. An `sk-orca-` prefix is not proof that a
 * credential is valid; the first real request establishes validity.
 */
export function looksLikeOrcaKey(candidate: string): boolean {
  return /^sk-orca-[\w.-]{8,}$/.test(String(candidate ?? "").trim());
}

export function normalizeKeyInput(candidate: string): string {
  return String(candidate ?? "").trim();
}

/** The minimal surface every authentication adapter must satisfy. */
export interface CredentialAdapter {
  readonly id: OrcaAuthMethod;
  /** Obtain a credential and persist it. Resolves to the stored record. */
  acquire: () => Promise<OrcaCredentialRecord>;
  /** Cancel any in-flight work this adapter started. */
  cancel: () => void;
}

/**
 * The single seam the provider uses. Neither the transport nor model discovery
 * knows which adapter produced the current credential.
 */
export interface CredentialStore {
  /** A credential that can be used right now, or `null`. */
  current: () => OrcaCredentialRecord | null;
  /**
   * The credential to attach to a new request. Returns `null` while the
   * credential is awaiting reauthentication.
   */
  usable: () => OrcaCredentialRecord | null;
  /** Replace the credential with one produced by an adapter. */
  adopt: (record: Omit<OrcaCredentialRecord, "generation" | "updatedAt" | "status">) => OrcaCredentialRecord;
  /** Remove the credential (explicit user sign-out). */
  clear: () => void;
  /**
   * An inference request carrying `generation` was rejected with 401.
   * Marks exactly that generation as needing reauthentication and returns
   * whether the transition applied.
   */
  markRejected: (generation: number) => boolean;
  /** Generation currently in the store. */
  generation: () => number;
}
