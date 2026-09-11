/**
 * Live verification through the provider code path.
 *
 * Reads the credential from the environment only. Nothing here prints the key,
 * and the credential is never written to a file.
 *
 * Usage: node tests/orcarouter/live.mjs
 */

import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    "~": new URL("../../app", import.meta.url).pathname,
    "@": new URL("../../app", import.meta.url).pathname,
  },
});

async function main() {
  const { discoverCatalog, filterModels, catalogStatusLabel } = await jiti.import("../../app/composables/hooks/orcarouter/core/catalog.ts");
  const { createCredentialStore } = await jiti.import("../../app/composables/hooks/orcarouter/core/credential-store.ts");
  const { MemorySecretStore } = await jiti.import("../../app/composables/hooks/orcarouter/core/storage.ts");
  const { resolveOrcaOrigins, orcaModelsUrl, ORCA_DEFAULT_API_BASE, ORCA_DEFAULT_AUTH_BASE } = await jiti.import("../../app/composables/hooks/orcarouter/core/origins.ts");
  const { createChatCompletion } = await jiti.import("../../app/composables/hooks/orcarouter/core/transport.ts");
  const { createApiKeyAdapter } = await jiti.import("../../app/composables/hooks/orcarouter/core/api-key-adapter.ts");

  const apiKey = process.env.ORCAROUTER_API_KEY ?? "";
  if (!apiKey) {
    console.error("ORCAROUTER_API_KEY is not set; skipping live verification.");
    process.exit(2);
  }

  // The provider resolves its own origins; no test overrides are applied here.
  const origins = resolveOrcaOrigins({});
  console.log("auth origin      :", origins.authBase);
  console.log("inference origin :", origins.apiBase);
  console.log("catalog URL      :", `${orcaModelsUrl(origins)}?capability=chat`);
  console.log("public defaults  :", ORCA_DEFAULT_AUTH_BASE, "/", ORCA_DEFAULT_API_BASE);

  // The credential enters through the API-key adapter, exactly as the UI does.
  const store = createCredentialStore({ backing: new MemorySecretStore() });
  const adapter = createApiKeyAdapter({ credentials: store, readKey: () => apiKey });
  const record = adapter.adoptKey(apiKey);
  console.log("credential       : masked", record.authMethod, "generation", record.generation);

  const chatCatalog = await discoverCatalog({ origins, apiKey: store.usable().apiKey, capability: "chat" });
  console.log("\nchat catalog     : source =", chatCatalog.source, "degraded =", chatCatalog.degradedReason);
  console.log("chat models      :", chatCatalog.models.length);
  if (catalogStatusLabel(chatCatalog)) {
    console.log("catalog notice   :", catalogStatusLabel(chatCatalog));
  }

  const textModels = filterModels(chatCatalog.models, { capability: "chat" });
  console.log("text-capable     :", textModels.length);
  console.log("sample ids       :", textModels.slice(0, 5).map(m => m.id).join(", "));

  const imageModels = filterModels(chatCatalog.models, {
    capability: "chat",
    requiredModalities: ["text", "image"],
  });
  console.log("image-input chat :", imageModels.length);
  const withImageEndpoint = imageModels.filter(m => m.endpointTypes.length > 0);
  console.log("  with endpoints :", withImageEndpoint.length);

  // Prove the filter is doing work rather than passing everything through.
  const excluded = chatCatalog.models.length - textModels.length;
  console.log("excluded by filter (non-chat endpoint types):", excluded);

  // Multimodal selector options must never contain a model that lacks image input.
  const leak = imageModels.filter(m => !m.inputModalities.includes("image"));
  console.log("modality filter leaks:", leak.length);

  if (chatCatalog.source !== "live") {
    console.error("\nLive discovery did not succeed; refusing to claim a live result.");
    process.exit(1);
  }

  // One real inference request through the provider path.
  const pick = textModels.find(m => m.id === process.env.ORCA_LIVE_MODEL) ?? textModels[0];
  if (pick) {
    console.log("\ninference model  :", pick.id);
    try {
      const completion = await createChatCompletion(
        { origins, credentials: store },
        { model: pick.id, messages: [{ role: "user", content: "Reply with the single word: ok" }], maxTokens: 16 },
      );
      const text = completion?.choices?.[0]?.message?.content ?? "";
      console.log("inference result :", text ? "received a completion" : JSON.stringify(completion).slice(0, 200));
      console.log("inference id     :", completion?.id ?? "(none)");
    }
    catch (error) {
      console.error("inference error  :", error.message);
    }
  }

  console.log("\nlive verification complete");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
