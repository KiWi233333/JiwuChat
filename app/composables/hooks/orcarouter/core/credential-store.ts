/**
 * The credential seam shared by both OrcaRouter authentication adapters.
 *
 * `createCredentialStore` is implemented once. The API-key adapter and the PKCE
 * adapter both call `adopt()` with the same record shape, and the provider,
 * transport and model discovery below read through `usable()` without knowing
 * where the credential came from.
 */

import type { CredentialStore, OrcaCredentialRecord } from "./credentials";
import type { SecretBackingStore } from "./storage";
import {

  isUsableRecord,

} from "./credentials";
import { getDefaultSecretStore } from "./storage";

export interface CredentialStoreOptions {
  backing?: SecretBackingStore;
  /** Injectable for tests. */
  now?: () => number;
}

export function createCredentialStore(options: CredentialStoreOptions = {}): CredentialStore {
  const backing = options.backing ?? getDefaultSecretStore();
  const now = options.now ?? (() => Date.now());

  function read(): OrcaCredentialRecord | null {
    const stored = backing.read();
    return isUsableRecord(stored) ? stored : null;
  }

  return {
    current(): OrcaCredentialRecord | null {
      return read();
    },

    usable(): OrcaCredentialRecord | null {
      const record = read();
      if (!record || record.status !== "ready" || !record.apiKey) {
        return null;
      }
      return record;
    },

    adopt(input: Omit<OrcaCredentialRecord, "generation" | "updatedAt" | "status">) {
      const previous = read();
      const record: OrcaCredentialRecord = {
        ...input,
        generation: (previous?.generation ?? 0) + 1,
        status: "ready",
        updatedAt: now(),
      };
      backing.write(record);
      return record;
    },

    clear() {
      backing.write(null);
    },

    /**
     * `401` handling. Only the exact generation that made the rejected request
     * may be marked: a late failure from an old request must never invalidate a
     * credential that has since been replaced by a successful re-login.
     */
    markRejected(generation: number): boolean {
      const record = read();
      if (!record) {
        return false;
      }
      if (record.generation !== generation) {
        return false;
      }
      if (record.status === "needsReauth") {
        return false;
      }
      backing.write({ ...record, status: "needsReauth", updatedAt: now() });
      return true;
    },

    generation(): number {
      return read()?.generation ?? 0;
    },
  };
}
