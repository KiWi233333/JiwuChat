/**
 * Session-scoped backing store for the OrcaRouter credential.
 *
 * The project persists non-secret preferences through `useLocalStorage`, which
 * is the right mechanism for configuration but not for a bearer credential:
 * it is readable by any same-origin script and survives in plaintext on disk.
 * Credentials therefore live in memory for the lifetime of the app session,
 * which is what the existing user-token handling effectively does at rest, and
 * no second secret store is introduced.
 *
 * The interface is deliberately tiny so a host that already owns an OS-keychain
 * bridge can back it with that instead.
 */

import type { OrcaCredentialRecord } from "./credentials";
import { isUsableRecord } from "./credentials";

export interface SecretBackingStore {
  read: () => OrcaCredentialRecord | null;
  write: (record: OrcaCredentialRecord | null) => void;
}

function clone(record: OrcaCredentialRecord | null): OrcaCredentialRecord | null {
  return record ? { ...record } : null;
}

/**
 * Default store: in-memory only. Survives component unmounts and route changes
 * for as long as the app session lives, and is gone on reload — which is the
 * safe default for a bearer key and avoids persisting it in plaintext.
 */
export class MemorySecretStore implements SecretBackingStore {
  private record: OrcaCredentialRecord | null = null;

  read(): OrcaCredentialRecord | null {
    return clone(this.record);
  }

  write(record: OrcaCredentialRecord | null): void {
    this.record = clone(record);
  }
}

/**
 * Store backed by a `useLocalStorage` ref. Provided for hosts that decide their
 * existing encrypted/session-scoped persistence is appropriate; it is not used
 * by default.
 */
export class RefSecretStore implements SecretBackingStore {
  constructor(private readonly ref: { value: OrcaCredentialRecord | null }) {}

  read(): OrcaCredentialRecord | null {
    const value = this.ref.value;
    return isUsableRecord(value) ? clone(value) : null;
  }

  write(record: OrcaCredentialRecord | null): void {
    this.ref.value = clone(record);
  }
}

/** A process-wide default so every composable instance shares one credential. */
let defaultStore: SecretBackingStore | null = null;

export function getDefaultSecretStore(): SecretBackingStore {
  if (!defaultStore) {
    defaultStore = new MemorySecretStore();
  }
  return defaultStore;
}

export function setDefaultSecretStore(store: SecretBackingStore): void {
  defaultStore = store;
}

