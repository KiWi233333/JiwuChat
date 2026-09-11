/**
 * Local test fixture server for automated UI evidence.
 *
 * Serves two things over plain HTTP on loopback:
 *   1. The OrcaRouter auth origin surface used by the PKCE adapter's authorize
 *      and exchange endpoints.
 *   2. An inference-origin `/v1/models` catalog, so the model selector is driven
 *      by a real discovery response rather than a hand-written list.
 *
 * It also proxies the real `GET https://api.orcarouter.ai/v1/models?capability=chat`
 * so the evidence run can prove the live catalog was the source. The API key is
 * read from the environment, kept in this process, and never sent to the browser.
 *
 * Usage: ORCAROUTER_API_KEY=… node tests/orcarouter/fixture-server.mjs
 */

import { Buffer } from "node:buffer";
import http from "node:http";

const PORT = Number(process.env.ORCA_FIXTURE_PORT ?? 4319);
const REAL_API = "https://api.orcarouter.ai/v1/models";

/**
 * Small, deliberately mixed catalog. It is only used when the live catalog
 * cannot be reached, and it is shaped so the filters have something to remove:
 * a text-only chat model, an image-input chat model, and three non-chat
 * models.
 */
const FIXTURE_CATALOG = [
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    supported_endpoint_types: ["openai", "openai-response"],
    architecture: { input_modalities: ["text", "image", "file"] },
    context_length: 400000,
    supported_parameters: ["reasoning"],
  },
  {
    id: "anthropic/claude-opus-4.8",
    name: "Claude Opus 4.8",
    supported_endpoint_types: ["anthropic", "openai"],
    architecture: { input_modalities: ["text", "image", "file"] },
    context_length: 1000000,
  },
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    supported_endpoint_types: ["gemini", "openai"],
    architecture: { input_modalities: ["text", "image", "audio", "video", "file"] },
    context_length: 1048576,
  },
  {
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    supported_endpoint_types: ["openai"],
    architecture: { input_modalities: ["text"] },
    context_length: 1048576,
  },
  {
    id: "orcarouter/auto",
    name: "OrcaRouter Auto",
    supported_endpoint_types: ["openai", "anthropic", "gemini"],
    architecture: { input_modalities: [] },
    context_length: 200000,
  },
  {
    id: "example/embedding-1",
    name: "Embedding 1",
    supported_endpoint_types: ["embeddings"],
    architecture: { input_modalities: ["text"] },
  },
  {
    id: "example/image-gen-1",
    name: "Image Generator",
    supported_endpoint_types: ["image-generation"],
    architecture: { input_modalities: ["text"] },
  },
  {
    id: "example/rerank-1",
    name: "Rerank 1",
    supported_endpoint_types: ["jina-rerank"],
    architecture: { input_modalities: ["text"] },
  },
];

const TEXT_ENDPOINTS = ["openai", "anthropic", "gemini", "openai-response"];
const state = {
  catalogSource: "fixture",
  catalogCount: FIXTURE_CATALOG.length,
  chatCount: 0,
  imageCount: 0,
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(html);
}

/**
 * Verify the configured key against the real catalog endpoint. Returns the
 * parsed records, or `null` when the live catalog is unreachable.
 */
async function fetchLiveCatalog(apiKey) {
  if (!apiKey) {
    return null;
  }
  try {
    const response = await fetch(`${REAL_API}?capability=chat`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.error(`[fixture] live catalog returned ${response.status}; using the fixture`);
      return null;
    }
    const payload = await response.json();
    const data = Array.isArray(payload?.data) ? payload.data : [];
    if (data.length === 0) {
      return null;
    }
    return data;
  }
  catch (error) {
    console.error(`[fixture] live catalog unreachable (${error.message}); using the fixture`);
    return null;
  }
}

async function main() {
  const apiKey = process.env.ORCAROUTER_API_KEY ?? "";
  const liveData = await fetchLiveCatalog(apiKey);

  if (liveData) {
    state.catalogSource = "live";
    state.catalogCount = liveData.length;
  }

  const CATALOG = liveData ?? FIXTURE_CATALOG;

  /**
   * Counts the UI assertions compare against. Both are derived from the same
   * payload the browser receives, using the provider's own filter rules:
   * a chat model must declare a text-capable endpoint type, and an image-capable
   * chat model must additionally declare `image` in `input_modalities`.
   */
  const endpointTypes = model =>
    (Array.isArray(model?.supported_endpoint_types) ? model.supported_endpoint_types : []);
  const modalities = model =>
    (Array.isArray(model?.architecture?.input_modalities) ? model.architecture.input_modalities : []);
  const isChat = model => endpointTypes(model).some(type => TEXT_ENDPOINTS.includes(type));

  state.chatCount = CATALOG.filter(isChat).length;
  state.imageCount = CATALOG.filter(model => isChat(model) && modalities(model).includes("image")).length;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      });
      res.end();
      return;
    }

    // Inference origin: the model catalog. No credential is attached for a GET
    // from the browser; the key stays in this process.
    if (url.pathname === "/v1/models") {
      sendJson(res, 200, { object: "list", data: CATALOG });
      return;
    }

    if (url.pathname === "/__fixture/meta") {
      sendJson(res, 200, state);
      return;
    }

    // Auth origin: the consent screen the user would land on.
    if (url.pathname === "/auth") {
      const appName = url.searchParams.get("app_name") ?? "an application";
      sendHtml(res, 200, `<!doctype html><html><head><title>OrcaRouter consent (test fixture)</title></head>
  <body><h1>Authorize ${appName}</h1>
  <p>Test fixture consent screen. Scope requested: ${url.searchParams.get("scope") ?? "api"}</p>
  <p>Code challenge method: ${url.searchParams.get("code_challenge_method") ?? "(none)"}</p>
  <p>No credentials are displayed here.</p></body></html>`);
      return;
    }

    // Auth origin: code exchange. Recognises one fixture code.
    if (url.pathname === "/api/v1/auth/keys" && req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      let parsed = {};
      try {
        parsed = JSON.parse(raw);
      }
      catch {
        parsed = Object.fromEntries(new URLSearchParams(raw));
      }
      if (!parsed.code_verifier || parsed.code_challenge_method !== "S256") {
        sendJson(res, 400, { error: "invalid_request" });
        return;
      }
      sendJson(res, 200, {
        key: "sk-orca-fixture-not-a-real-key-000000",
        user_id: "fixture-user",
        scope: "api",
      });
      return;
    }

    // The app bootstraps its session and polls unrelated endpoints. Answer them
    // realistically so the settings page is reachable and a stray 404 does not
    // mask a real failure. None of this touches OrcaRouter.
    if (url.pathname === "/user/info") {
      sendJson(res, 200, {
        code: 20000,
        message: "操作成功",
        data: {
          id: "fixture-user",
          userId: "fixture-user",
          nickName: "Test User",
          username: "fixture",
          email: "",
          phone: "",
          avatar: "",
          status: 1,
        },
      });
      return;
    }

    if (url.pathname.startsWith("/chat/") || url.pathname.startsWith("/res/")) {
      sendJson(res, 200, { code: 20000, message: "ok", data: [] });
      return;
    }

    sendJson(res, 200, { code: 20000, message: "ok", data: null });
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[fixture] listening on http://127.0.0.1:${PORT}`);
    console.log(`[fixture] catalog source: ${state.catalogSource} (${state.catalogCount} models, ${state.chatCount} text-chat, ${state.imageCount} image-capable)`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
