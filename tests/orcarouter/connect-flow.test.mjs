/**
 * Connect-flow lifecycle tests: the full authorize → exchange → persist path
 * through the real PKCE adapter against a local fake auth server, plus
 * cancellation, supersession, and terminal 401 handling.
 */

import assert from "node:assert/strict";
import { createApiKeyAdapter } from "../../app/composables/hooks/orcarouter/core/api-key-adapter.ts";
import {
  catalogStatusLabel,
  discoverCatalog,
} from "../../app/composables/hooks/orcarouter/core/catalog.ts";
import { createCredentialStore } from "../../app/composables/hooks/orcarouter/core/credential-store.ts";
import { resolveOrcaOrigins } from "../../app/composables/hooks/orcarouter/core/origins.ts";
import { createPkceAdapter } from "../../app/composables/hooks/orcarouter/core/pkce-adapter.ts";
import { MemorySecretStore } from "../../app/composables/hooks/orcarouter/core/storage.ts";
import { createChatCompletion, orcaFetch } from "../../app/composables/hooks/orcarouter/core/transport.ts";
import { FAKE_CODE, FAKE_KEY, startFakeApiServer, startFakeAuthServer, test } from "./harness.mjs";

function freshStore() {
  let tick = 0;
  return createCredentialStore({ backing: new MemorySecretStore(), now: () => (tick += 1) });
}

async function withAuthServer(options, fn) {
  const server = await startFakeAuthServer(options);
  try {
    return await fn(server);
  }
  finally {
    await server.close();
  }
}

function adapterFor(server, store, extra = {}) {
  return createPkceAdapter({
    credentials: store,
    origins: resolveOrcaOrigins({
      ORCA_AUTH_BASE_URL: server.origin,
      ORCA_API_BASE_URL: "https://api.orcarouter.ai/v1",
    }),
    fetchImpl: globalThis.fetch,
    ...extra,
  });
}

export async function run() {
  await test("full connect: authorize → exchange → persist", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);

      const started = await adapter.start();
      assert.equal(started.status, "pending");
      assert.ok(started.authorizeUrl.includes(`${server.origin}/auth`));

      const record = await adapter.submitCode(FAKE_CODE);
      assert.equal(record.authMethod, "pkce");
      assert.equal(record.apiKey, FAKE_KEY);
      assert.equal(record.scope, "api");
      assert.equal(record.userId, "user-1");
      assert.equal(store.usable().apiKey, FAKE_KEY);
      assert.equal(adapter.view().status, "done");
    });
  });

  await test("the authorize URL never carries the verifier; the exchange body does", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const opened = [];
      const adapter = adapterFor(server, store, { openBrowser: url => opened.push(url) });
      const started = await adapter.start();
      await adapter.submitCode(FAKE_CODE);

      assert.equal(opened.length, 1, "the consent URL was not handed to the browser");
      assert.equal(opened[0], started.authorizeUrl);

      const exchange = server.requests.find(r => r.url === "/api/v1/auth/keys");
      const verifier = JSON.parse(exchange.body).code_verifier;
      assert.ok(verifier && verifier.length >= 43);

      const startedUrl = new URL(started.authorizeUrl);
      assert.ok(
        !started.authorizeUrl.includes(verifier),
        "the verifier appeared in the authorize URL",
      );
      assert.equal(startedUrl.searchParams.get("code_challenge_method"), "S256");
      assert.ok(startedUrl.searchParams.get("code_challenge").length > 0);
      // The verifier is not derivable from anything on the URL either.
      assert.notEqual(startedUrl.searchParams.get("code_challenge"), verifier);
    });
  });

  await test("a browser that refuses to open still leaves a copyable link", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store, {
        openBrowser: () => {
          throw new Error("no browser available");
        },
      });
      const started = await adapter.start();
      assert.equal(started.status, "pending");
      assert.ok(started.authorizeUrl, "the link must remain available for manual copy");
      assert.match(started.hint, /Open the authorization link/);
      await adapter.submitCode(FAKE_CODE);
      assert.equal(store.usable().apiKey, FAKE_KEY);
    });
  });

  await test("every attempt uses a fresh verifier and state", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);
      const seen = new Set();

      for (let i = 0; i < 4; i++) {
        const started = await adapter.start();
        const url = new URL(started.authorizeUrl);
        const state = url.searchParams.get("state");
        assert.ok(!seen.has(state), "state was reused across attempts");
        seen.add(state);
        await adapter.submitCode(FAKE_CODE);
      }
    });
  });

  await test("cancellation releases the attempt and blocks a stale code", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);

      await adapter.start();
      assert.equal(adapter.view().status, "pending");
      adapter.cancel();
      assert.equal(adapter.view().status, "cancelled");
      assert.equal(adapter.view().hint, null);
      assert.equal(adapter.view().authorizeUrl, null);

      await assert.rejects(() => adapter.submitCode(FAKE_CODE), /cancelled/);
      assert.equal(store.current(), null);
    });
  });

  await test("a second login can start after a cancel, without remounting", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);

      await adapter.start();
      const firstUrl = adapter.view().authorizeUrl;
      adapter.cancel();

      const second = await adapter.start();
      assert.equal(second.status, "pending");
      assert.notEqual(second.authorizeUrl, firstUrl, "the second attempt reused the first URL");
      assert.ok(second.authorizeUrl);

      const record = await adapter.submitCode(FAKE_CODE);
      assert.equal(record.apiKey, FAKE_KEY);
    });
  });

  await test("a superseded attempt cannot overwrite a newer login", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);

      const first = await adapter.start();
      // Start a second attempt without cancelling: this supersedes the first.
      const second = await adapter.start();
      assert.ok(second.attemptId > first.attemptId);

      const secondRecord = await adapter.submitCode(FAKE_CODE);
      assert.equal(secondRecord.apiKey, FAKE_KEY);
      const generationAfterSecond = store.generation();

      // A late failure belonging to the first attempt must not invalidate the
      // credential the second attempt just installed.
      assert.equal(store.markRejected(generationAfterSecond - 1), false);
      assert.equal(store.usable().apiKey, FAKE_KEY);
      assert.equal(store.current().status, "ready");
    });
  });

  await test("denial, 400, 429 and 5xx end safely with an actionable message", async () => {
    for (const mode of ["denied", "bad_request", "rate_limited", "server_error", "malformed"]) {
      await withAuthServer({ exchange: mode }, async (server) => {
        const store = freshStore();
        const adapter = adapterFor(server, store);
        await adapter.start();

        await assert.rejects(() => adapter.submitCode(FAKE_CODE), (error) => {
          assert.ok(error.message.length > 0);
          assert.ok(!error.message.includes("fake-verifier"), "the error echoed the verifier");
          return true;
        });

        assert.equal(adapter.view().status, "error");
        assert.ok(adapter.view().error, "the view must carry a user-actionable message");
        assert.equal(store.current(), null, "a failed exchange must not store a credential");
      });
    }
  });

  await test("an unusable granted scope is refused rather than assumed", async () => {
    await withAuthServer({ scope: "connector" }, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);
      await adapter.start();
      await assert.rejects(() => adapter.submitCode(FAKE_CODE), /connector/);
      assert.equal(store.current(), null);
      assert.equal(adapter.view().status, "error");
    });
  });

  await test("an empty code is rejected without starting an exchange", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);
      await adapter.start();
      await assert.rejects(() => adapter.submitCode("   "), /Enter the code/);
      assert.equal(server.requests.filter(r => r.url === "/api/v1/auth/keys").length, 0);
    });
  });

  await test("a network failure ends the attempt without hanging", async () => {
    const store = freshStore();
    const adapter = createPkceAdapter({
      credentials: store,
      origins: resolveOrcaOrigins({ ORCA_AUTH_BASE_URL: "http://127.0.0.1:1" }),
    });
    await adapter.start();
    await assert.rejects(() => adapter.submitCode(FAKE_CODE), /Could not reach OrcaRouter/);
    assert.equal(adapter.view().status, "error");
  });

  await test("pagehide-style abrupt cancel clears busy state synchronously", async () => {
    await withAuthServer({}, async (server) => {
      const store = freshStore();
      const adapter = adapterFor(server, store);
      await adapter.start();
      assert.equal(adapter.view().status, "pending");

      // What the pagehide handler does: synchronously release, no await.
      adapter.cancel();

      assert.equal(adapter.view().status, "cancelled");
      assert.equal(adapter.view().hint, null);
      assert.equal(adapter.view().authorizeUrl, null);

      // A second login can start without remounting.
      const again = await adapter.start();
      assert.equal(again.status, "pending");
      await adapter.submitCode(FAKE_CODE);
      assert.equal(store.usable().apiKey, FAKE_KEY);
    });
  });

  await test("both adapters produce the same credential shape", async () => {
    await withAuthServer({}, async (server) => {
      const pkceStore = freshStore();
      const pkceAdapter = adapterFor(server, pkceStore);
      await pkceAdapter.start();
      const pkceRecord = await pkceAdapter.submitCode(FAKE_CODE);

      const keyStore = freshStore();
      const keyAdapter = createApiKeyAdapter({ credentials: keyStore, readKey: () => FAKE_KEY });
      const keyRecord = keyAdapter.adoptKey(FAKE_KEY);

      assert.deepEqual(Object.keys(pkceRecord).sort(), Object.keys(keyRecord).sort());
      assert.equal(pkceRecord.apiKey, keyRecord.apiKey);
      assert.equal(pkceRecord.scope, keyRecord.scope);
      assert.equal(pkceRecord.status, keyRecord.status);
      // Only the informational provenance differs.
      assert.equal(pkceRecord.authMethod, "pkce");
      assert.equal(keyRecord.authMethod, "api-key");
    });
  });

  await test("downstream transport behaves identically for either adapter", async () => {
    const api = await startFakeApiServer({ models: [] });
    try {
      const origins = resolveOrcaOrigins({ ORCA_API_BASE_URL: `${api.origin}/v1` });

      const results = [];
      for (const method of ["api-key", "pkce"]) {
        const store = freshStore();
        if (method === "api-key") {
          createApiKeyAdapter({ credentials: store, readKey: () => FAKE_KEY }).adoptKey(FAKE_KEY);
        }
        else {
          store.adopt({ apiKey: FAKE_KEY, authMethod: "pkce", scope: "api", userId: "u1" });
        }

        const catalog = await discoverCatalog({ origins, apiKey: store.usable().apiKey });
        const completion = await createChatCompletion(
          { origins, credentials: store },
          { model: "openai/gpt-5.5", messages: [{ role: "user", content: "hi" }] },
        );
        results.push({ status: catalog.degradedReason, completion });
      }

      assert.deepEqual(results[0], results[1], "the credential source changed downstream behaviour");
      assert.ok(api.requests.every(r => r.headers.authorization === `Bearer ${FAKE_KEY}`));
    }
    finally {
      await api.close();
    }
  });

  await test("a revoked key is terminal: 401 marks the generation, no refresh attempt", async () => {
    const api = await startFakeApiServer({ models: [], modelsStatus: 401 });
    try {
      const store = freshStore();
      createApiKeyAdapter({ credentials: store, readKey: () => FAKE_KEY }).adoptKey(FAKE_KEY);
      const generation = store.generation();

      const origins = resolveOrcaOrigins({ ORCA_API_BASE_URL: `${api.origin}/v1` });
      await assert.rejects(
        () => orcaFetch({ origins, credentials: store }, "/models", { method: "GET" }),
        (error) => {
          assert.equal(error.failure, "needs_reauth");
          assert.equal(error.status, 401);
          return true;
        },
      );

      assert.equal(store.current().status, "needsReauth");
      assert.equal(store.usable(), null, "a rejected credential must stay unusable");
      assert.ok(store.current().apiKey, "the secret is retained, not silently deleted");
      assert.equal(store.markRejected(generation), false, "already marked");

      // Exactly one request: no retry loop, no refresh grant.
      assert.equal(api.requests.length, 1);
      // The catalog falls back and says so rather than pretending to be live.
      const catalog = await discoverCatalog({ origins, apiKey: "fake" });
      assert.equal(catalog.source, "fallback");
    }
    finally {
      await api.close();
    }
  });

  await test("a stale 401 cannot poison a newly reauthorized credential", async () => {
    const store = freshStore();
    const keyAdapter = createApiKeyAdapter({ credentials: store, readKey: () => FAKE_KEY });
    keyAdapter.adoptKey(FAKE_KEY);
    const staleGeneration = store.generation();

    // The user reconnects successfully; the credential is replaced.
    keyAdapter.adoptKey(`${FAKE_KEY}z`);
    const freshGeneration = store.generation();

    // A late 401 from the old request arrives now.
    assert.equal(store.markRejected(staleGeneration), false);
    assert.equal(store.current().status, "ready");
    assert.equal(store.usable().apiKey, `${FAKE_KEY}z`);
    assert.equal(store.generation(), freshGeneration);
  });

  await test("the credential seam is the only credential input downstream", async () => {
    const api = await startFakeApiServer({ models: [] });
    try {
      const store = freshStore();
      const origins = resolveOrcaOrigins({ ORCA_API_BASE_URL: `${api.origin}/v1` });

      // No credential at all: the transport refuses before any request.
      await assert.rejects(
        () => orcaFetch({ origins, credentials: store }, "/models", { method: "GET" }),
        /not connected|needs reauthentication/,
      );
      assert.equal(api.requests.length, 0);

      createApiKeyAdapter({ credentials: store, readKey: () => FAKE_KEY }).adoptKey(FAKE_KEY);
      await orcaFetch({ origins, credentials: store }, "/models", { method: "GET" });
      assert.equal(api.requests.length, 1);
    }
    finally {
      await api.close();
    }
  });

  await test("the catalog is fetched from the inference origin, never the auth origin", async () => {
    const auth = await startFakeAuthServer();
    const api = await startFakeApiServer({ models: [] });
    try {
      const store = freshStore();
      createApiKeyAdapter({ credentials: store, readKey: () => FAKE_KEY }).adoptKey(FAKE_KEY);
      const origins = resolveOrcaOrigins({
        ORCA_AUTH_BASE_URL: auth.origin,
        ORCA_API_BASE_URL: `${api.origin}/v1`,
      });

      await discoverCatalog({ origins, apiKey: FAKE_KEY });
      assert.equal(auth.requests.length, 0, "model discovery hit the auth origin");
      assert.ok(api.requests.length >= 1);
      assert.equal(catalogStatusLabel({ models: [], source: "live", degradedReason: null, fetchedAt: 0 }), null);
    }
    finally {
      await auth.close();
      await api.close();
    }
  });
}
