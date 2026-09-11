/**
 * PKCE protocol tests: verifier/challenge derivation, authorize URL shape,
 * origin separation, and rejection handling.
 */

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomBytes } from "node:crypto";
import { describeGrantedScope, exchangeCodeForKey, OrcaExchangeError } from "../../app/composables/hooks/orcarouter/core/exchange.ts";
import {
  joinOrigin,
  ORCA_DEFAULT_API_BASE,
  ORCA_DEFAULT_AUTH_BASE,
  orcaExchangeUrl,
  orcaModelsUrl,
  resolveOrcaOrigins,
} from "../../app/composables/hooks/orcarouter/core/origins.ts";
import {
  assertStateMatches,
  base64UrlEncode,
  buildAuthorizeUrl,
  createPkceAttempt,
  deriveChallenge,
  isAcceptableCallbackUrl,
  safeEqual,
} from "../../app/composables/hooks/orcarouter/core/pkce.ts";
import { FAKE_CODE, FAKE_KEY, startFakeAuthServer, test } from "./harness.mjs";

const b64url = bytes => Buffer.from(bytes).toString("base64url");

function referenceChallenge(verifier) {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export async function run() {
  await test("challenge is unpadded base64url(sha256(verifier))", async () => {
    const verifier = b64url(randomBytes(32));
    const challenge = await deriveChallenge(verifier);
    assert.equal(challenge, referenceChallenge(verifier));
    assert.ok(!challenge.includes("="), "challenge must be unpadded");
    assert.ok(!challenge.includes("+") && !challenge.includes("/"), "challenge must be base64url");
  });

  await test("base64UrlEncode strips padding and uses the url alphabet", () => {
    const encoded = base64UrlEncode(Uint8Array.from([251, 255, 254]));
    assert.ok(!encoded.includes("="));
    assert.equal(encoded, Buffer.from([251, 255, 254]).toString("base64url"));
  });

  await test("every attempt gets a fresh verifier and state", async () => {
    const seen = new Set();
    for (let i = 0; i < 32; i++) {
      const attempt = await createPkceAttempt();
      assert.equal(attempt.challengeMethod, "S256");
      assert.notEqual(attempt.verifier, attempt.state);
      assert.ok(!seen.has(attempt.verifier), "verifier was reused");
      seen.add(attempt.verifier);
      assert.equal(attempt.challenge, referenceChallenge(attempt.verifier));
    }
  });

  await test("verifier is never derived from a guessable input", async () => {
    const a = await createPkceAttempt();
    const b = await createPkceAttempt();
    assert.ok(a.verifier.length >= 43, "verifier must have enough entropy for S256");
    assert.notEqual(a.state, b.state);
  });

  await test("authorize URL carries the challenge, never the verifier", async () => {
    const origins = resolveOrcaOrigins({});
    const attempt = await createPkceAttempt();
    const url = buildAuthorizeUrl({
      origins,
      attempt,
      appName: "JiwuChat",
      callbackUrl: "oob",
      scope: "api",
    });

    const parsed = new URL(url);
    assert.equal(parsed.origin, ORCA_DEFAULT_AUTH_BASE);
    assert.equal(parsed.pathname, "/auth");
    assert.equal(parsed.searchParams.get("callback_url"), "oob");
    assert.equal(parsed.searchParams.get("code_challenge"), attempt.challenge);
    assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
    assert.equal(parsed.searchParams.get("state"), attempt.state);
    assert.equal(parsed.searchParams.get("app_name"), "JiwuChat");
    assert.ok(!url.includes(attempt.verifier), "verifier leaked into the authorize URL");
  });

  await test("authorize URL refuses non-S256 and out-of-scope requests", async () => {
    const origins = resolveOrcaOrigins({});
    const attempt = await createPkceAttempt();
    assert.throws(
      () => buildAuthorizeUrl({
        origins,
        attempt: { ...attempt, challengeMethod: "plain" },
        appName: "JiwuChat",
        callbackUrl: "oob",
      }),
      /only S256 is supported/,
    );
    assert.throws(
      () => buildAuthorizeUrl({
        origins,
        attempt,
        appName: "JiwuChat",
        callbackUrl: "oob",
        scope: "connector",
      }),
      /unsupported scope/,
    );
  });

  await test("callback_url policy: https anywhere, http loopback only", () => {
    assert.ok(isAcceptableCallbackUrl("http://127.0.0.1:51733/cb"));
    assert.ok(isAcceptableCallbackUrl("http://localhost:3000/cb"));
    assert.ok(isAcceptableCallbackUrl("https://app.example.com:8443/cb"));
    assert.ok(!isAcceptableCallbackUrl("http://evil.example.com/cb"));
    assert.ok(!isAcceptableCallbackUrl("http://user:pass@127.0.0.1/cb"));
    assert.ok(!isAcceptableCallbackUrl("https://app.example.com/cb#frag"));
    assert.ok(!isAcceptableCallbackUrl("not a url"));
  });

  await test("state comparison is constant-time and exact", () => {
    const state = b64url(randomBytes(16));
    assert.ok(safeEqual(state, state));
    assert.ok(!safeEqual(state, `${state}x`));
    assert.ok(!safeEqual(state, null));
    assert.throws(() => assertStateMatches(state, "other"), /state mismatch/);
    assert.throws(() => assertStateMatches(state, null), /state mismatch/);
    assertStateMatches(state, state);
  });

  await test("auth and inference origins are separate and not derived from each other", () => {
    const origins = resolveOrcaOrigins({});
    assert.equal(origins.authBase, ORCA_DEFAULT_AUTH_BASE);
    assert.equal(origins.apiBase, ORCA_DEFAULT_API_BASE);

    const exchange = orcaExchangeUrl(origins);
    assert.equal(exchange, "https://www.orcarouter.ai/api/v1/auth/keys");
    assert.ok(!exchange.includes("api.orcarouter.ai"), "exchange used the inference origin");
    // The single most common integration mistake.
    assert.ok(!exchange.includes("/v1/auth/keys") || exchange.includes("/api/v1/auth/keys"));

    const models = orcaModelsUrl(origins);
    assert.equal(models, "https://api.orcarouter.ai/v1/models");
    assert.ok(!models.includes("www.orcarouter.ai"), "model discovery used the auth origin");
    // `/v1` must not be appended twice.
    assert.ok(!models.includes("/v1/v1/"));
  });

  await test("explicit overrides win, shared fallback applies, remote origins require https", () => {
    const overridden = resolveOrcaOrigins({
      ORCA_AUTH_BASE_URL: "https://auth.internal.example",
      ORCA_API_BASE_URL: "https://relay.internal.example/v1",
    });
    assert.equal(overridden.authBase, "https://auth.internal.example");
    assert.equal(overridden.apiBase, "https://relay.internal.example/v1");

    const shared = resolveOrcaOrigins({ ORCA_BASE_URL: "https://orca.self-hosted.example" });
    assert.equal(shared.authBase, "https://orca.self-hosted.example");
    assert.equal(shared.apiBase, "https://orca.self-hosted.example");

    const explicitWins = resolveOrcaOrigins({
      ORCA_BASE_URL: "https://shared.example",
      ORCA_API_BASE_URL: "https://api.example/v1",
    });
    assert.equal(explicitWins.authBase, "https://shared.example");
    assert.equal(explicitWins.apiBase, "https://api.example/v1");

    assert.throws(() => resolveOrcaOrigins({ ORCA_BASE_URL: "http://orca.example" }), /must use HTTPS/);
    // Loopback HTTP stays available for local development.
    assert.equal(
      resolveOrcaOrigins({ ORCA_BASE_URL: "http://127.0.0.1:8080" }).apiBase,
      "http://127.0.0.1:8080",
    );
    assert.throws(() => resolveOrcaOrigins({ ORCA_BASE_URL: "https://user:pass@x.example" }), /userinfo/);
    assert.equal(joinOrigin("https://a.example/", "/v1/models"), "https://a.example/v1/models");
  });

  await test("exchange posts to the auth origin with the verifier in the body only", async () => {
    const server = await startFakeAuthServer();
    try {
      const origins = resolveOrcaOrigins({ ORCA_AUTH_BASE_URL: server.origin, ORCA_API_BASE_URL: "https://api.orcarouter.ai/v1" });
      const attempt = await createPkceAttempt();
      const result = await exchangeCodeForKey({
        origins,
        code: FAKE_CODE,
        verifier: attempt.verifier,
      });

      assert.equal(result.key, FAKE_KEY);
      assert.equal(result.scope, "api");
      assert.equal(result.userId, "user-1");

      const exchange = server.requests.find(r => r.url === "/api/v1/auth/keys");
      assert.ok(exchange, "exchange request never reached the auth origin");
      const body = JSON.parse(exchange.body);
      assert.equal(body.code_verifier, attempt.verifier);
      assert.equal(body.code_challenge_method, "S256");
      // The verifier must not be in the query string or any header.
      assert.ok(!exchange.url.includes(attempt.verifier));
      assert.ok(!JSON.stringify(exchange.headers).includes(attempt.verifier));
    }
    finally {
      await server.close();
    }
  });

  await test("exchange failures are classified without leaking the response body", async () => {
    for (const [mode, expected] of [
      ["denied", "denied"],
      ["bad_request", "bad_request"],
      ["rate_limited", "rate_limited"],
      ["server_error", "server_error"],
      ["malformed", "malformed_response"],
    ]) {
      const server = await startFakeAuthServer({ exchange: mode });
      try {
        const origins = resolveOrcaOrigins({ ORCA_AUTH_BASE_URL: server.origin });
        await assert.rejects(
          () => exchangeCodeForKey({ origins, code: FAKE_CODE, verifier: "fake-verifier-value" }),
          (error) => {
            assert.ok(error instanceof OrcaExchangeError);
            assert.equal(error.failure, expected);
            assert.ok(!error.message.includes("fake-verifier-value"));
            return true;
          },
        );
      }
      finally {
        await server.close();
      }
    }
  });

  await test("a network failure is reported without echoing the request", async () => {
    const origins = resolveOrcaOrigins({
      ORCA_AUTH_BASE_URL: "http://127.0.0.1:1",
      ORCA_API_BASE_URL: "https://api.orcarouter.ai/v1",
    });
    await assert.rejects(
      () => exchangeCodeForKey({ origins, code: FAKE_CODE, verifier: "fake-verifier-value" }),
      (error) => {
        assert.equal(error.failure, "network");
        assert.ok(!error.message.includes("fake-verifier-value"));
        assert.ok(!error.message.includes("127.0.0.1"));
        return true;
      },
    );
  });

  await test("a granted scope narrower than requested is reported, not assumed", () => {
    assert.deepEqual(describeGrantedScope("api"), { usable: true, warning: null });
    const narrow = describeGrantedScope("connector");
    assert.equal(narrow.usable, false);
    assert.match(narrow.warning, /connector/);
    assert.equal(describeGrantedScope("").usable, false);
  });
}
