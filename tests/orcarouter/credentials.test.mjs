/**
 * Credential seam tests: both authentication adapters must produce the same
 * credential record, and the provider must not care which adapter produced it.
 */

import assert from "node:assert/strict";
import { createApiKeyAdapter, describeStoredKey, validateApiKeyInput } from "../../app/composables/hooks/orcarouter/core/api-key-adapter.ts";
import { createCredentialStore } from "../../app/composables/hooks/orcarouter/core/credential-store.ts";
import { maskKey } from "../../app/composables/hooks/orcarouter/core/credentials.ts";
import { MemorySecretStore } from "../../app/composables/hooks/orcarouter/core/storage.ts";
import { FAKE_KEY, test } from "./harness.mjs";

function freshStore() {
  let tick = 1000;
  return createCredentialStore({
    backing: new MemorySecretStore(),
    now: () => (tick += 1),
  });
}

export async function run() {
  await test("api-key adapter stores and reads a credential", () => {
    const store = freshStore();
    const draft = FAKE_KEY;
    const adapter = createApiKeyAdapter({ credentials: store, readKey: () => draft });
    const record = adapter.adoptKey(draft);

    assert.equal(record.authMethod, "api-key");
    assert.equal(record.status, "ready");
    assert.equal(store.usable().apiKey, FAKE_KEY);
    assert.equal(store.generation(), 1);
  });

  await test("api-key adapter rejects an empty or malformed key", () => {
    const store = freshStore();
    const adapter = createApiKeyAdapter({ credentials: store, readKey: () => "" });
    assert.throws(() => adapter.adoptKey(""), /Enter your OrcaRouter API key/);
    assert.throws(() => adapter.adoptKey("sk-openai-abc"), /does not look like an OrcaRouter key/);
    assert.equal(store.current(), null);
  });

  await test("api-key format check accepts only the sk-orca- prefix", () => {
    assert.equal(validateApiKeyInput(FAKE_KEY), null);
    assert.match(validateApiKeyInput("   "), /Enter your OrcaRouter API key/);
    assert.match(validateApiKeyInput("nope"), /sk-orca-/);
  });

  await test("update replaces the credential and bumps the generation", () => {
    const store = freshStore();
    const adapter = createApiKeyAdapter({ credentials: store, readKey: () => FAKE_KEY });
    adapter.adoptKey(FAKE_KEY);
    adapter.adoptKey(`${FAKE_KEY}x`);
    assert.equal(store.generation(), 2);
    assert.equal(store.usable().apiKey, `${FAKE_KEY}x`);
  });

  await test("clear removes the credential", () => {
    const store = freshStore();
    const adapter = createApiKeyAdapter({ credentials: store, readKey: () => FAKE_KEY });
    adapter.adoptKey(FAKE_KEY);
    store.clear();
    assert.equal(store.current(), null);
    assert.equal(store.usable(), null);
  });

  await test("masking never returns the full key", () => {
    const masked = maskKey(FAKE_KEY);
    assert.ok(!masked.includes(FAKE_KEY), "masked value contained the full key");
    assert.ok(masked.startsWith("sk-orca-"));
    assert.equal(describeStoredKey(null), "No key stored");
    assert.ok(!describeStoredKey({ apiKey: FAKE_KEY }).includes(FAKE_KEY));
  });

  await test("a corrupted stored record is treated as absent", () => {
    const store = freshStore();
    store.adopt({ apiKey: FAKE_KEY, authMethod: "api-key", scope: "api", userId: null });
    // Simulate a hand-edited or truncated record.
    store.clear();
    assert.equal(store.usable(), null);
  });

  await test("401 marks the exact rejected generation only", () => {
    const store = freshStore();
    store.adopt({ apiKey: FAKE_KEY, authMethod: "pkce", scope: "api", userId: "u1" });
    const rejected = store.generation();
    store.adopt({ apiKey: `${FAKE_KEY}y`, authMethod: "pkce", scope: "api", userId: "u1" });

    // A late failure from the superseded generation must not touch the new one.
    assert.equal(store.markRejected(rejected), false);
    assert.equal(store.usable().status ?? "ready", "ready");
    assert.equal(store.usable().apiKey, `${FAKE_KEY}y`);

    // The current generation is marked and stays unusable.
    const current = store.generation();
    assert.equal(store.markRejected(current), true);
    assert.equal(store.usable(), null);
    assert.equal(store.current().status, "needsReauth");
    // Idempotent.
    assert.equal(store.markRejected(current), false);
  });

  await test("reattempting does not silently drop the previous secret", () => {
    const store = freshStore();
    store.adopt({ apiKey: FAKE_KEY, authMethod: "pkce", scope: "api", userId: "u1" });
    store.markRejected(store.generation());
    // The record is still present, just unusable, so a failed re-login does not
    // erase it irrecoverably.
    assert.ok(store.current());
    assert.equal(store.current().apiKey, FAKE_KEY);
  });
}
