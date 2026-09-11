/**
 * OrcaRouter provider composable.
 *
 * This is the one place that binds the credential seam, the two authentication
 * adapters, the inference transport and the model catalog together. Neither the
 * transport nor the catalog knows which adapter produced the credential.
 *
 * Cancellation is complete: every terminal path — success, denial, exchange
 * error, timeout, explicit cancel, switching authentication method, closing the
 * panel, unmount, and `pagehide` — releases the login state.
 */

import type { OrcaCapability, OrcaCatalog, OrcaInputModality, OrcaModelInfo } from "./core/catalog";
import type { OrcaCredentialRecord } from "./core/credentials";
import type { OrcaOriginEnv } from "./core/origins";
import type { PkceSessionView } from "./core/pkce-adapter";
import { createApiKeyAdapter, validateApiKeyInput } from "./core/api-key-adapter";
import {
  catalogStatusLabel,
  discoverCatalog,
  filterModels,
  isModelStillCompatible,
  ORCA_FALLBACK_SEED,
} from "./core/catalog";
import { createCredentialStore } from "./core/credential-store";
import { maskKey, normalizeKeyInput } from "./core/credentials";
import { resolveOrcaOrigins } from "./core/origins";
import { createPkceAdapter } from "./core/pkce-adapter";

export const ORCA_APP_NAME = "JiwuChat";

export interface OrcaState {
  credential: OrcaCredentialRecord | null;
  /** Masked form safe to render. */
  maskedKey: string;
  needsReauth: boolean;
  catalog: OrcaCatalog | null;
  catalogLoading: boolean;
  catalogError: string | null;
  catalogNotice: string | null;
  apiKeyDraft: string;
  apiKeyError: string | null;
  apiKeySaved: boolean;
  pkce: PkceSessionView;
  pkceCode: string;
  selectedModel: string | null;
  requiredModalities: OrcaInputModality[];
}

/** Module-scope so every component shares one provider instance. */
const state = reactive<OrcaState>({
  credential: null,
  maskedKey: "",
  needsReauth: false,
  catalog: null,
  catalogLoading: false,
  catalogError: null,
  catalogNotice: null,
  apiKeyDraft: "",
  apiKeyError: null,
  apiKeySaved: false,
  pkce: {
    attemptId: 0,
    status: "idle",
    authorizeUrl: null,
    hint: null,
    error: null,
    scopeWarning: null,
  },
  pkceCode: "",
  selectedModel: null,
  requiredModalities: [],
});

const origins = resolveOrcaOrigins(orcaEnvFromBuild());

function orcaEnvFromBuild(): OrcaOriginEnv {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    ORCA_BASE_URL: env.VITE_ORCA_BASE_URL,
    ORCA_AUTH_BASE_URL: env.VITE_ORCA_AUTH_BASE_URL,
    ORCA_API_BASE_URL: env.VITE_ORCA_API_BASE_URL,
  };
}

const credentials = createCredentialStore();

const apiKeyAdapter = createApiKeyAdapter({
  credentials,
  readKey: () => state.apiKeyDraft,
});

const pkceAdapter = createPkceAdapter({
  credentials,
  origins,
  appName: ORCA_APP_NAME,
  onSessionChange: (view) => {
    state.pkce = view;
  },
});

let pageHideBound = false;

function syncCredential() {
  const record = credentials.current();
  state.credential = record;
  state.maskedKey = maskKey(record?.apiKey ?? "");
  state.needsReauth = record?.status === "needsReauth";
}

/** Adopt a record produced by either adapter and refresh derived state. */
function adoptFromAdapter(record: OrcaCredentialRecord) {
  syncCredential();
  void record;
}

function resetDependentState() {
  state.selectedModel = null;
  state.catalog = null;
  state.catalogNotice = null;
  state.catalogError = null;
}

/**
 * Model options for the current entry point. Recomputed whenever the catalog,
 * the capability or the required modalities change.
 */
const modelOptions = computed<OrcaModelInfo[]>(() => {
  const catalog = state.catalog;
  if (!catalog) {
    return [];
  }
  return filterModels(catalog.models, {
    capability: "chat",
    requiredModalities: state.requiredModalities,
  });
});

const textModelOptions = computed<OrcaModelInfo[]>(() =>
  filterModels(state.catalog?.models ?? [], { capability: "chat" }),
);

function optionsFor(capability: OrcaCapability, required: OrcaInputModality[] = []): OrcaModelInfo[] {
  return filterModels(state.catalog?.models ?? [], { capability, requiredModalities: required });
}

export function useOrcaRouter() {
  /**
   * Load the model catalog. The Bearer key is attached in `discoverCatalog`,
   * never in the UI: the caller receives model metadata only.
   */
  async function loadCatalog(capability: OrcaCapability = "chat", force = false): Promise<OrcaCatalog> {
    if (state.catalogLoading) {
      return state.catalog!;
    }
    if (state.catalog && !force) {
      return state.catalog;
    }

    state.catalogLoading = true;
    state.catalogError = null;

    const record = credentials.usable();
    const catalog = await discoverCatalog({
      origins,
      apiKey: record?.apiKey ?? "",
      capability,
    });

    state.catalog = catalog;
    state.catalogNotice = catalogStatusLabel(catalog);
    state.catalogLoading = false;

    if (!record) {
      state.catalogError = null;
    }

    // A previously selected model that is no longer compatible must be cleared
    // rather than silently kept.
    pruneSelectedModel();
    return catalog;
  }

  function pruneSelectedModel() {
    if (!state.selectedModel || !state.catalog) {
      return;
    }
    const stillCompatible = isModelStillCompatible(state.selectedModel, {
      catalog: state.catalog,
      capability: "chat",
      requiredModalities: state.requiredModalities,
    });
    if (!stillCompatible) {
      state.selectedModel = null;
      state.catalogError = null;
      state.catalogNotice = "The previously selected model is not available for the current input. Choose another one.";
    }
  }

  /** Update the modalities the current entry point uploads. */
  function setRequiredModalities(modalities: OrcaInputModality[]) {
    const next = [...new Set(modalities)];
    const changed = next.length !== state.requiredModalities.length
      || next.some((m, i) => m !== state.requiredModalities[i]);
    if (!changed) {
      return;
    }
    state.requiredModalities = next;
    pruneSelectedModel();
  }

  function selectModel(modelId: string | null) {
    state.selectedModel = modelId;
  }

  // ---------- Authentication adapter 1: API key ----------

  function saveApiKey(): boolean {
    const problem = validateApiKeyInput(state.apiKeyDraft);
    if (problem) {
      state.apiKeyError = problem;
      return false;
    }
    state.apiKeyError = null;
    const record = apiKeyAdapter.adoptKey(state.apiKeyDraft);
    adoptFromAdapter(record);
    state.apiKeyDraft = "";
    state.apiKeySaved = true;
    resetDependentState();
    // The first real request establishes validity; the catalog fetch is that
    // request and it is not a paid inference call.
    void loadCatalog("chat", true);
    return true;
  }

  /** Explicit user sign-out for the stored credential. */
  function clearCredential() {
    credentials.clear();
    state.apiKeyDraft = "";
    state.apiKeySaved = false;
    state.pkceCode = "";
    syncCredential();
    resetDependentState();
  }

  // ---------- Authentication adapter 2: OAuth 2.0 + PKCE ----------

  async function startPkce(overrides?: { loginHint?: string; prompt?: string }) {
    state.apiKeyError = null;
    const view = await pkceAdapter.start(overrides);
    state.pkce = view;
    return view;
  }

  async function submitPkceCode(): Promise<boolean> {
    try {
      const record = await pkceAdapter.submitCode(state.pkceCode);
      adoptFromAdapter(record);
      state.pkceCode = "";
      resetDependentState();
      await loadCatalog("chat", true);
      return true;
    }
    catch {
      // The adapter already published a user-actionable message on the view.
      state.pkce = pkceAdapter.view();
      return false;
    }
  }

  /** Release the login state from any terminal path. */
  function cancelPkce() {
    pkceAdapter.cancel();
    state.pkce = pkceAdapter.view();
    state.pkceCode = "";
  }

  /**
   * `pagehide` handler. Browsers may restore the page from the back-forward
   * cache, in which case a generation-guarded `finally` correctly refuses to
   * mutate state and would leave the panel permanently busy. Busy/hint state is
   * therefore cleared synchronously here, before the server-side work is
   * cancelled. Flow B owns no server-side task, so releasing the in-flight
   * exchange and invalidating the generation is the whole job.
   */
  function handlePageHide() {
    if (state.pkce.status === "pending" || state.pkce.status === "exchanging") {
      cancelPkce();
    }
  }

  /**
   * Unmount cleanup: cancel the work without writing component state.
   */
  function dispose() {
    pkceAdapter.cancel();
  }

  function bindPageHide() {
    if (pageHideBound || typeof window === "undefined") {
      return;
    }
    pageHideBound = true;
    window.addEventListener("pagehide", handlePageHide);
  }

  // ---------- Inference ----------

  /**
   * Record a terminal `401` for the exact credential generation that made the
   * rejected request. A late failure from a superseded generation is ignored.
   */
  function markRejected(generation: number): boolean {
    const applied = credentials.markRejected(generation);
    syncCredential();
    return applied;
  }

  /**
   * Draft inputs are written through explicit setters rather than `v-model` on
   * the state object, which is exposed read-only so no component can mutate
   * provider state directly.
   */
  function setApiKeyDraft(value: string) {
    state.apiKeyDraft = value;
    state.apiKeyError = null;
  }

  function setPkceCode(value: string) {
    state.pkceCode = value;
  }

  return {
    state: readonly(state),
    origins,
    credentials,
    setApiKeyDraft,
    setPkceCode,
    // authentication
    saveApiKey,
    clearCredential,
    startPkce,
    submitPkceCode,
    cancelPkce,
    handlePageHide,
    dispose,
    bindPageHide,
    // models
    loadCatalog,
    setRequiredModalities,
    selectModel,
    pruneSelectedModel,
    optionsFor,
    modelOptions,
    textModelOptions,
    markRejected,
    fallbackSeed: ORCA_FALLBACK_SEED,
    normalizeKeyInput,
  };
}
