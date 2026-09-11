/**
 * Model catalog tests: capability filtering, multimodal fail-closed behaviour,
 * degraded fallback, and metadata preservation.
 */

import assert from "node:assert/strict";
import {
  catalogStatusLabel,
  discoverCatalog,
  filterModels,
  isModelStillCompatible,
  ORCA_FALLBACK_SEED,
  parseCatalog,
} from "../../app/composables/hooks/orcarouter/core/catalog.ts";
import { resolveOrcaOrigins } from "../../app/composables/hooks/orcarouter/core/origins.ts";
import { startFakeApiServer, test } from "./harness.mjs";

/** Fixture: one record per capability shape the selector must handle. */
const FIXTURE = [
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    supported_endpoint_types: ["openai", "openai-response"],
    architecture: { input_modalities: ["text", "image"] },
    context_length: 400000,
    supported_parameters: ["reasoning"],
  },
  {
    id: "text/only-model",
    name: "Text Only",
    supported_endpoint_types: ["openai"],
    architecture: { input_modalities: ["text"] },
    context_length: 32000,
  },
  {
    id: "anthropic/claude-opus-4.8",
    name: "Claude Opus 4.8",
    supported_endpoint_types: ["anthropic"],
    architecture: { input_modalities: ["text", "image"] },
    context_length: 200000,
  },
  {
    id: "audio/chat-model",
    name: "Audio Chat",
    supported_endpoint_types: ["openai"],
    architecture: { input_modalities: ["text", "audio"] },
    context_length: 128000,
  },
  {
    id: "vendor/embed-1",
    name: "Embed 1",
    supported_endpoint_types: ["embeddings"],
    architecture: { input_modalities: ["text"] },
  },
  {
    id: "vendor/image-gen-1",
    name: "Image Gen 1",
    supported_endpoint_types: ["image-generation"],
    architecture: { input_modalities: ["text"] },
  },
  {
    id: "vendor/video-1",
    name: "Video 1",
    supported_endpoint_types: ["openai-video"],
    architecture: { input_modalities: ["text"] },
  },
  {
    id: "vendor/rerank-1",
    name: "Rerank 1",
    supported_endpoint_types: ["jina-rerank"],
    architecture: { input_modalities: ["text"] },
  },
  {
    id: "vendor/undeclared-endpoints",
    name: "Undeclared",
    architecture: { input_modalities: ["text"] },
  },
];

const ids = models => models.map(m => m.id);

export async function run() {
  await test("parsing drops records without an id and bounds the item count", () => {
    const parsed = parseCatalog({ data: [...FIXTURE, { name: "no id" }, null, "junk"] });
    assert.equal(parsed.length, FIXTURE.length);
    assert.ok(parsed.every(m => typeof m.id === "string" && m.id.length > 0));
  });

  await test("text chat options contain only text-capable chat endpoints", () => {
    const models = parseCatalog({ data: FIXTURE });
    const chat = filterModels(models, { capability: "chat" });
    const chatIds = ids(chat);

    assert.ok(chatIds.includes("openai/gpt-5.5"));
    assert.ok(chatIds.includes("anthropic/claude-opus-4.8"));
    assert.ok(!chatIds.includes("vendor/embed-1"), "embedding model leaked into chat");
    assert.ok(!chatIds.includes("vendor/image-gen-1"), "image-generation model leaked into chat");
    assert.ok(!chatIds.includes("vendor/video-1"), "video model leaked into chat");
    assert.ok(!chatIds.includes("vendor/rerank-1"), "rerank model leaked into chat");
    assert.ok(!chatIds.includes("vendor/undeclared-endpoints"), "unroutable record leaked into chat");
  });

  await test("adding an image attachment removes models that do not declare image input", () => {
    const models = parseCatalog({ data: FIXTURE });
    const textOnly = ids(filterModels(models, { capability: "chat" }));
    const withImage = ids(filterModels(models, {
      capability: "chat",
      requiredModalities: ["text", "image"],
    }));

    assert.ok(textOnly.includes("text/only-model"));
    assert.ok(!withImage.includes("text/only-model"), "text-only model survived the image filter");
    assert.ok(!withImage.includes("audio/chat-model"), "audio-only model survived the image filter");
    assert.deepEqual(withImage.sort(), ["anthropic/claude-opus-4.8", "openai/gpt-5.5"]);
  });

  await test("multimodal filtering fails closed on undeclared modalities", () => {
    const models = parseCatalog({
      data: [{
        id: "vendor/no-architecture",
        supported_endpoint_types: ["openai"],
      }],
    });
    assert.equal(filterModels(models, { capability: "chat" }).length, 1);
    assert.equal(
      filterModels(models, { capability: "chat", requiredModalities: ["text", "image"] }).length,
      0,
      "a model with no declared modalities must not be treated as image-capable",
    );
  });

  await test("audio attachment filters to audio-declaring chat models", () => {
    const models = parseCatalog({ data: FIXTURE });
    const withAudio = ids(filterModels(models, {
      capability: "chat",
      requiredModalities: ["text", "audio"],
    }));
    assert.deepEqual(withAudio, ["audio/chat-model"]);
  });

  await test("embedding, image, video and rerank select their own endpoint types", () => {
    const models = parseCatalog({ data: FIXTURE });
    assert.deepEqual(ids(filterModels(models, { capability: "embedding" })), ["vendor/embed-1"]);
    assert.deepEqual(ids(filterModels(models, { capability: "image" })), ["vendor/image-gen-1"]);
    assert.deepEqual(ids(filterModels(models, { capability: "video" })), ["vendor/video-1"]);
    assert.deepEqual(ids(filterModels(models, { capability: "rerank" })), ["vendor/rerank-1"]);
  });

  await test("capability is never inferred from the model name", () => {
    const models = parseCatalog({
      data: [
        { id: "openai/dall-e-image-generator", supported_endpoint_types: ["openai"], architecture: { input_modalities: ["text"] } },
        { id: "vendor/embedding-lookalike", supported_endpoint_types: ["openai"], architecture: { input_modalities: ["text"] } },
      ],
    });
    // Both are chat-routable by their declared endpoint type despite the names.
    assert.equal(filterModels(models, { capability: "chat" }).length, 2);
    // And neither is an embedding or image model, because the catalog does not say so.
    assert.equal(filterModels(models, { capability: "embedding" }).length, 0);
    assert.equal(filterModels(models, { capability: "image" }).length, 0);
  });

  await test("a model that is no longer compatible is detected for clearing", () => {
    const catalog = { models: parseCatalog({ data: FIXTURE }), source: "live", degradedReason: null, fetchedAt: 0 };
    assert.equal(isModelStillCompatible("text/only-model", { catalog, capability: "chat" }), true);
    assert.equal(
      isModelStillCompatible("text/only-model", { catalog, capability: "chat", requiredModalities: ["text", "image"] }),
      false,
      "an incompatible selection must be reported so it can be cleared",
    );
  });

  await test("live discovery is authoritative and requests the capability query", async () => {
    const server = await startFakeApiServer({ models: FIXTURE });
    try {
      const origins = resolveOrcaOrigins({ ORCA_API_BASE_URL: `${server.origin}/v1` });
      const catalog = await discoverCatalog({ origins, apiKey: "fake", capability: "chat" });

      assert.equal(catalog.source, "live");
      assert.equal(catalog.models.length, FIXTURE.length);
      const request = server.requests[0];
      assert.equal(request.url, "/v1/models?capability=chat");
      assert.equal(request.headers.authorization, "Bearer fake");
    }
    finally {
      await server.close();
    }
  });

  await test("discovery failures fall back to the verified seed, never to free text", async () => {
    const cases = [
      [{ modelsStatus: 401 }, "http-401"],
      [{ modelsStatus: 429 }, "http-429"],
      [{ models: [] }, "empty-catalog"],
    ];

    for (const [options, reason] of cases) {
      const server = await startFakeApiServer(options);
      try {
        const origins = resolveOrcaOrigins({ ORCA_API_BASE_URL: `${server.origin}/v1` });
        const catalog = await discoverCatalog({ origins, apiKey: "fake" });
        assert.equal(catalog.source, "fallback");
        assert.equal(catalog.degradedReason, reason);
        assert.equal(catalog.models.length, ORCA_FALLBACK_SEED.length);
        assert.ok(catalogStatusLabel(catalog), "a degraded catalog must be labelled in the UI");
      }
      finally {
        await server.close();
      }
    }
  });

  await test("a missing credential degrades without issuing a request", async () => {
    const server = await startFakeApiServer({ models: FIXTURE });
    try {
      const origins = resolveOrcaOrigins({ ORCA_API_BASE_URL: `${server.origin}/v1` });
      const catalog = await discoverCatalog({ origins, apiKey: "" });
      assert.equal(catalog.source, "fallback");
      assert.equal(server.requests.length, 0, "no request may be made without a credential");
    }
    finally {
      await server.close();
    }
  });

  await test("fallback seed is filtered by the same rules and keeps its metadata", () => {
    const chat = filterModels(ORCA_FALLBACK_SEED, { capability: "chat" });
    assert.equal(chat.length, ORCA_FALLBACK_SEED.length);
    assert.equal(filterModels(ORCA_FALLBACK_SEED, { capability: "embedding" }).length, 0);

    const gpt = ORCA_FALLBACK_SEED.find(m => m.id === "openai/gpt-5.5");
    assert.ok(gpt, "the verified GPT-5.5 seed entry is missing");
    assert.deepEqual(gpt.reasoningEfforts, ["low", "medium", "high", "xhigh"]);
    assert.equal(gpt.reasoning, true);
    assert.ok(gpt.contextLength > 0);
    assert.ok(gpt.inputModalities.includes("image"));

    const imageChat = filterModels(ORCA_FALLBACK_SEED, {
      capability: "chat",
      requiredModalities: ["text", "image"],
    });
    assert.ok(!ids(imageChat).includes("deepseek/deepseek-v4-pro"));
    assert.ok(ids(imageChat).includes("openai/gpt-5.5"));
  });

  await test("live results are never mixed with the seed", async () => {
    const server = await startFakeApiServer({ models: FIXTURE });
    try {
      const origins = resolveOrcaOrigins({ ORCA_API_BASE_URL: `${server.origin}/v1` });
      const catalog = await discoverCatalog({ origins, apiKey: "fake" });
      for (const seedModel of ORCA_FALLBACK_SEED) {
        if (!FIXTURE.some(f => f.id === seedModel.id)) {
          assert.ok(!ids(catalog.models).includes(seedModel.id), `seed model ${seedModel.id} leaked into a live catalog`);
        }
      }
    }
    finally {
      await server.close();
    }
  });

  await test("parseCatalog tolerates a bare array and unknown fields", () => {
    const parsed = parseCatalog(FIXTURE);
    assert.equal(parsed.length, FIXTURE.length);
    assert.equal(parsed[0].reasoning, true);
    assert.equal(parsed[1].reasoning, false);
  });
}
