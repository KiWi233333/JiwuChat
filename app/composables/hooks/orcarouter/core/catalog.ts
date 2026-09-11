/**
 * OrcaRouter model catalog: live discovery, capability filtering, and a
 * bounded verified fallback.
 *
 * The catalog is the only source of truth for which models a workspace can
 * call. Live discovery is authoritative when it succeeds; when it fails the
 * client keeps a small, hand-verified seed so a fresh install still shows a
 * usable list instead of an empty control.
 *
 * Responses are bounded in timeout, byte size and item count so a catalog
 * endpoint cannot consume unbounded memory or advertise routes this client
 * cannot speak.
 */

import type { OrcaOrigins } from "./origins";
import { orcaModelsUrl } from "./origins";

export type OrcaCapability = "chat" | "embedding" | "image" | "video" | "rerank";

export type OrcaInputModality = "text" | "image" | "audio" | "video" | "file";

/** Endpoint types this client knows how to speak. */
export const SUPPORTED_ENDPOINT_TYPES = [
  "openai",
  "anthropic",
  "gemini",
  "openai-response",
] as const;

/** Endpoint types that are never a text-chat target. */
export const NON_CHAT_ENDPOINT_TYPES = [
  "image-generation",
  "openai-video",
  "jina-rerank",
  "embeddings",
] as const;

export const MAX_CATALOG_BYTES = 2 * 1024 * 1024;
export const MAX_CATALOG_ITEMS = 2000;
export const CATALOG_TIMEOUT_MS = 10_000;

export interface OrcaModelInfo {
  id: string;
  name: string;
  /** Raw `supported_endpoint_types` as advertised. */
  endpointTypes: string[];
  /** Declared input modalities; empty means "not declared". */
  inputModalities: OrcaInputModality[];
  contextLength: number | null;
  reasoning: boolean;
  reasoningEfforts: string[];
}

export interface OrcaCatalog {
  models: OrcaModelInfo[];
  /** `live` when discovery succeeded, `fallback` when the verified seed is in use. */
  source: "live" | "fallback";
  /** Set when discovery failed, for the degraded badge. */
  degradedReason: string | null;
  fetchedAt: number;
}

/**
 * Verified fallback seed.
 *
 * Provenance: every id below was confirmed present in the live
 * `GET https://api.orcarouter.ai/v1/models` catalog, and the endpoint types and
 * input modalities mirror what that response declares. The `reasoningEfforts`
 * ladders are *not* published by the v1 catalog and are the values verified for
 * these models; they are retained here so enabling live discovery cannot
 * regress reasoning support. Nothing in this table is inferred from a model's
 * name.
 */
export const ORCA_FALLBACK_SEED: OrcaModelInfo[] = [
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    endpointTypes: ["openai", "openai-response"],
    inputModalities: ["text", "image", "file"],
    contextLength: 400_000,
    reasoning: true,
    reasoningEfforts: ["low", "medium", "high", "xhigh"],
  },
  {
    id: "anthropic/claude-opus-4.8",
    name: "Claude Opus 4.8",
    endpointTypes: ["openai", "anthropic", "openai-response"],
    inputModalities: ["text", "image", "file"],
    contextLength: 1_000_000,
    reasoning: true,
    reasoningEfforts: ["low", "medium", "high"],
  },
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    endpointTypes: ["openai", "gemini"],
    inputModalities: ["text", "image", "audio", "video", "file"],
    contextLength: 1_048_576,
    reasoning: true,
    reasoningEfforts: ["low", "medium", "high"],
  },
  {
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    endpointTypes: ["openai", "openai-response"],
    inputModalities: ["text"],
    contextLength: 1_048_576,
    reasoning: true,
    reasoningEfforts: ["low", "medium", "high"],
  },
  {
    id: "orcarouter/auto",
    name: "OrcaRouter Auto",
    endpointTypes: ["openai", "openai-response", "anthropic", "gemini"],
    // The live catalog declares no input modalities for the router's own alias,
    // so the text-only default keeps it out of multimodal selectors.
    inputModalities: ["text"],
    contextLength: 200_000,
    reasoning: false,
    reasoningEfforts: [],
  },
];

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Normalize one raw catalog record. Returns `null` for records this client
 * cannot route, so unsupported shapes never reach a selector.
 */
export function normalizeModel(raw: unknown): OrcaModelInfo | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) {
    return null;
  }

  const architecture = (record.architecture ?? {}) as Record<string, unknown>;
  const endpointTypes = asStringArray(record.supported_endpoint_types);

  const contextRaw = record.context_length ?? record.context_window ?? architecture.context_length;
  const contextLength = typeof contextRaw === "number" && Number.isFinite(contextRaw) && contextRaw > 0
    ? contextRaw
    : null;

  const supportedParams = asStringArray(record.supported_parameters ?? architecture.supported_parameters);
  const reasoning = supportedParams.includes("reasoning")
    || supportedParams.includes("include_reasoning")
    || record.reasoning === true;

  return {
    id,
    name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : id,
    endpointTypes,
    inputModalities: asStringArray(architecture.input_modalities) as OrcaInputModality[],
    contextLength,
    reasoning,
    // The v1 catalog does not publish an effort ladder; only a verified seed
    // entry may carry one, so live records advertise none.
    reasoningEfforts: [],
  };
}

/**
 * Parse a `/v1/models` payload into normalized records, dropping anything that
 * exceeds the item budget.
 */
export function parseCatalog(payload: unknown): OrcaModelInfo[] {
  const record = (payload ?? {}) as Record<string, unknown>;
  const list = Array.isArray(record.data)
    ? record.data
    : Array.isArray(payload)
      ? payload
      : [];

  const out: OrcaModelInfo[] = [];
  for (const item of list.slice(0, MAX_CATALOG_ITEMS)) {
    const model = normalizeModel(item);
    if (model) {
      out.push(model);
    }
  }
  return out;
}

function hasTextEndpoint(model: OrcaModelInfo): boolean {
  if (model.endpointTypes.some(type => (SUPPORTED_ENDPOINT_TYPES as readonly string[]).includes(type))) {
    return true;
  }
  // Records that declare no endpoint types at all cannot be routed, so they are
  // excluded rather than assumed compatible.
  return false;
}

function hasOnlyNonChatEndpoints(model: OrcaModelInfo): boolean {
  if (model.endpointTypes.length === 0) {
    return false;
  }
  return model.endpointTypes.every(type =>
    (NON_CHAT_ENDPOINT_TYPES as readonly string[]).includes(type),
  );
}

/**
 * Required non-text modalities for a multimodal chat selector. A model that
 * does not explicitly declare the modality is excluded — capability is never
 * inferred from a model's name.
 */
export type RequiredModalities = OrcaInputModality[];

export interface FilterOptions {
  capability: OrcaCapability;
  /** Non-text modalities the current entry point actually uploads. */
  requiredModalities?: RequiredModalities;
}

export function filterModels(models: OrcaModelInfo[], options: FilterOptions): OrcaModelInfo[] {
  const { capability, requiredModalities = [] } = options;

  return models.filter((model) => {
    switch (capability) {
      case "chat": {
        if (hasOnlyNonChatEndpoints(model) || !hasTextEndpoint(model)) {
          return false;
        }
        // Fail closed: an undeclared modality is not a match.
        return requiredModalities.every(
          modality => modality === "text" || model.inputModalities.includes(modality),
        );
      }
      case "embedding":
        return model.endpointTypes.includes("embeddings");
      case "image":
        return model.endpointTypes.includes("image-generation");
      case "video":
        return model.endpointTypes.includes("openai-video");
      case "rerank":
        return model.endpointTypes.includes("jina-rerank");
      default:
        return false;
    }
  });
}

/** Query string the discovery request must carry for a capability. */
export function capabilityQuery(capability: OrcaCapability): string {
  return `?capability=${capability}`;
}

export interface DiscoverOptions {
  origins: OrcaOrigins;
  apiKey: string;
  capability?: OrcaCapability;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

/**
 * Fetch the live catalog from the inference origin.
 *
 * The Bearer credential is attached here and nowhere near the UI layer; the
 * caller receives model metadata only.
 */
export async function discoverCatalog(options: DiscoverOptions): Promise<OrcaCatalog> {
  const {
    origins,
    apiKey,
    capability,
    fetchImpl = globalThis.fetch,
    timeoutMs = CATALOG_TIMEOUT_MS,
    now = () => Date.now(),
  } = options;

  if (!apiKey) {
    return {
      models: [...ORCA_FALLBACK_SEED],
      source: "fallback",
      degradedReason: "no-credential",
      fetchedAt: now(),
    };
  }
  if (typeof fetchImpl !== "function") {
    return {
      models: [...ORCA_FALLBACK_SEED],
      source: "fallback",
      degradedReason: "no-fetch",
      fetchedAt: now(),
    };
  }

  const url = `${orcaModelsUrl(origins)}${capability ? capabilityQuery(capability) : ""}`;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controller?.signal,
    });

    if (!response.ok) {
      return {
        models: [...ORCA_FALLBACK_SEED],
        source: "fallback",
        degradedReason: `http-${response.status}`,
        fetchedAt: now(),
      };
    }

    const text = await response.text();
    if (text.length > MAX_CATALOG_BYTES) {
      return {
        models: [...ORCA_FALLBACK_SEED],
        source: "fallback",
        degradedReason: "response-too-large",
        fetchedAt: now(),
      };
    }

    const models = parseCatalog(JSON.parse(text));
    if (models.length === 0) {
      return {
        models: [...ORCA_FALLBACK_SEED],
        source: "fallback",
        degradedReason: "empty-catalog",
        fetchedAt: now(),
      };
    }

    return { models, source: "live", degradedReason: null, fetchedAt: now() };
  }
  catch {
    return {
      models: [...ORCA_FALLBACK_SEED],
      source: "fallback",
      degradedReason: "network",
      fetchedAt: now(),
    };
  }
  finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * The parts of a catalog the status helpers need. Declared structurally so a
 * deeply-readonly reactive view of the catalog can be passed in unchanged.
 */
export interface CatalogView {
  readonly source: "live" | "fallback";
  readonly degradedReason: string | null;
}

/** How the selector should describe the current catalog. */
export function catalogStatusLabel(catalog: CatalogView): string | null {
  if (catalog.source === "live") {
    return null;
  }
  switch (catalog.degradedReason) {
    case "no-credential":
      return "Connect OrcaRouter to load the live model list.";
    case "http-401":
    case "http-403":
      return "OrcaRouter rejected the stored credential. Sign in again to refresh the model list.";
    case "http-429":
      return "OrcaRouter is rate limiting model discovery. Showing the last verified list.";
    default:
      return "Showing the built-in verified model list; live discovery is unavailable.";
  }
}

/**
 * Re-validate a previously selected model against the current catalog. A model
 * that is no longer compatible must be cleared, never silently kept.
 */
export function isModelStillCompatible(
  modelId: string,
  options: FilterOptions & { catalog: { readonly models: readonly OrcaModelInfo[] } },
): boolean {
  const { catalog, ...filter } = options;
  return filterModels([...catalog.models], filter).some(model => model.id === modelId);
}
