/**
 * Shared test harness: a tiny assertion runner plus fixture builders.
 *
 * These tests exercise the real adapter code paths — including a local fake
 * OrcaRouter auth server for the full authorize → exchange → persist sequence.
 * All credentials used here are obviously fake and generated in-process.
 */

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import http from "node:http";

export const results = { pass: 0, fail: 0, failures: [] };

export async function test(name, fn) {
  try {
    await fn();
    results.pass += 1;
    console.log(`  ok   ${name}`);
  }
  catch (error) {
    results.fail += 1;
    results.failures.push(`${name}: ${error?.message ?? error}`);
    console.log(`  FAIL ${name}\n       ${error?.message ?? error}`);
  }
}

export function summary() {
  console.log(`\n${results.pass} passed, ${results.fail} failed`);
  if (results.fail) {
    console.log("\nFailures:");
    for (const failure of results.failures) {
      console.log(` - ${failure}`);
    }
  }
  return results.fail === 0;
}

/** Deterministic fake credential, never a real key. */
export const FAKE_KEY = "sk-orca-testkey0000000000000000000000";
export const FAKE_CODE = "fake-auth-code-abc123";

/**
 * Minimal OrcaRouter-compatible fake auth server.
 *
 * Records every request so tests can assert which origin and path were used and
 * that the verifier only ever appeared in the exchange body.
 */
export async function startFakeAuthServer(options = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      requests.push({ method: req.method, url: req.url, headers: req.headers, body });

      if (req.url.startsWith("/auth")) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<p>consent</p>");
        return;
      }

      if (req.url === "/api/v1/auth/keys" && req.method === "POST") {
        const mode = options.exchange ?? "ok";
        if (mode === "denied") {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_grant" }));
          return;
        }
        if (mode === "bad_request") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_request" }));
          return;
        }
        if (mode === "rate_limited") {
          res.writeHead(429, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "too_many_requests" }));
          return;
        }
        if (mode === "server_error") {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end("{}");
          return;
        }
        if (mode === "malformed") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end("not json");
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          key: FAKE_KEY,
          user_id: "user-1",
          scope: options.scope ?? "api",
        }));
        return;
      }

      res.writeHead(404);
      res.end();
    });
  });

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

/** Fake inference-origin server for catalog and chat-completion assertions. */
export async function startFakeApiServer(options = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, headers: req.headers });
    if (req.url.startsWith("/v1/models")) {
      if (options.modelsStatus && options.modelsStatus !== 200) {
        res.writeHead(options.modelsStatus, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "nope" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: options.models ?? [] }));
      return;
    }
    if (req.url === "/v1/chat/completions" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "cmpl-1", choices: [{ message: { role: "assistant", content: "hi" } }] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

/** Assert that no failing value leaked into a serialized artifact. */
export function assertNoSecretLeak(artifact, secrets, label) {
  const text = typeof artifact === "string" ? artifact : JSON.stringify(artifact);
  for (const secret of secrets) {
    assert.ok(
      !text.includes(secret),
      `${label} leaked a secret value (${secret.slice(0, 8)}…)`,
    );
  }
}
