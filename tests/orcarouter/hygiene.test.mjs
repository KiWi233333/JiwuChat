/**
 * Hygiene tests: no secret reaches a log, an error, or a snapshot; locale
 * catalogs stay at key parity.
 */

import assert from "node:assert/strict";
import { createCredentialStore } from "../../app/composables/hooks/orcarouter/core/credential-store.ts";
import { labelParityReport, ORCA_LABELS, ORCA_LOCALES, t } from "../../app/composables/hooks/orcarouter/core/labels.ts";
import { resolveOrcaOrigins } from "../../app/composables/hooks/orcarouter/core/origins.ts";
import { createPkceAdapter } from "../../app/composables/hooks/orcarouter/core/pkce-adapter.ts";
import { MemorySecretStore } from "../../app/composables/hooks/orcarouter/core/storage.ts";
import { FAKE_CODE, FAKE_KEY, startFakeAuthServer, test } from "./harness.mjs";

/** Capture everything written to the console for the duration of `fn`. */
async function captureConsole(fn) {
  const captured = [];
  const originals = {};
  for (const method of ["log", "info", "warn", "error", "debug"]) {
    originals[method] = console[method];
    console[method] = (...args) => {
      captured.push(args.map((a) => {
        try {
          return typeof a === "string" ? a : JSON.stringify(a);
        }
        catch {
          return String(a);
        }
      }).join(" "));
    };
  }
  try {
    await fn();
  }
  finally {
    for (const method of ["log", "info", "warn", "error", "debug"]) {
      console[method] = originals[method];
    }
  }
  return captured.join("\n");
}

export async function run() {
  await test("no verifier or key is written to the console during a full connect", async () => {
    const server = await startFakeAuthServer();
    try {
      const store = createCredentialStore({ backing: new MemorySecretStore() });
      const adapter = createPkceAdapter({
        credentials: store,
        origins: resolveOrcaOrigins({ ORCA_AUTH_BASE_URL: server.origin }),
      });

      let verifier = null;
      const output = await captureConsole(async () => {
        await adapter.start();
        // The verifier is only reachable through the request the adapter makes.
        const exchange = await adapter.submitCode(FAKE_CODE);
        assert.equal(exchange.apiKey, FAKE_KEY);
      });

      const sentVerifier = JSON.parse(
        server.requests.find(r => r.url === "/api/v1/auth/keys").body,
      ).code_verifier;
      verifier = sentVerifier;

      assert.ok(!output.includes(verifier), "the verifier was written to a log");
      assert.ok(!output.includes(FAKE_KEY), "the API key was written to a log");
      assert.ok(!output.includes(FAKE_CODE), "the authorization code was written to a log");
    }
    finally {
      await server.close();
    }
  });

  await test("no secret appears in a serialized view or error snapshot", async () => {
    const server = await startFakeAuthServer({ exchange: "denied" });
    try {
      const store = createCredentialStore({ backing: new MemorySecretStore() });
      const adapter = createPkceAdapter({
        credentials: store,
        origins: resolveOrcaOrigins({ ORCA_AUTH_BASE_URL: server.origin }),
      });
      await adapter.start();
      await adapter.submitCode(FAKE_CODE).catch(() => {});

      const view = JSON.stringify(adapter.view());
      assert.ok(!view.includes(FAKE_KEY), "the view snapshot leaked the key");
      assert.ok(!view.includes(FAKE_CODE), "the view snapshot leaked the code");

      const requests = JSON.stringify(server.requests.map(r => ({ url: r.url, headers: r.headers })));
      assert.ok(!requests.includes(FAKE_KEY), "a request header snapshot leaked the key");
    }
    finally {
      await server.close();
    }
  });

  await test("stored credential records are not placed in a URL", async () => {
    const server = await startFakeAuthServer();
    try {
      const store = createCredentialStore({ backing: new MemorySecretStore() });
      const adapter = createPkceAdapter({
        credentials: store,
        origins: resolveOrcaOrigins({ ORCA_AUTH_BASE_URL: server.origin }),
      });
      const started = await adapter.start();
      assert.ok(!started.authorizeUrl.includes(FAKE_KEY));
      await adapter.submitCode(FAKE_CODE);
      const url = new URL(started.authorizeUrl);
      assert.equal(url.searchParams.get("callback_url"), "oob");
      assert.ok(![...url.searchParams.values()].some(v => v.startsWith("sk-orca-")));
    }
    finally {
      await server.close();
    }
  });

  await test("every locale catalog is at key parity", () => {
    const problems = labelParityReport();
    assert.deepEqual(problems, [], `missing locale keys: ${JSON.stringify(problems)}`);
    for (const key of Object.keys(ORCA_LABELS)) {
      for (const locale of ORCA_LOCALES) {
        const value = t(key, locale);
        assert.equal(typeof value, "string");
        assert.ok(value.length > 0, `${key} is empty for ${locale}`);
      }
    }
    // An unknown locale falls back to canonical English.
    assert.equal(t("providerName", "fr"), "OrcaRouter");
  });

  await test("the two authentication choices have distinct labels", () => {
    assert.notEqual(ORCA_LABELS.authMethodApiKey.en, ORCA_LABELS.authMethodPkce.en);
    assert.match(ORCA_LABELS.authMethodApiKey.en, /API/);
    assert.match(ORCA_LABELS.authMethodPkce.en, /Auth/);
  });
}
