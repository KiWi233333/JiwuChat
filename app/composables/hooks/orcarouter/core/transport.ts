/**
 * OrcaRouter inference transport.
 *
 * OpenAI-compatible wire format against the inference origin. The credential
 * arrives through the shared seam and is attached here and only here.
 *
 * A `401` from the relay is terminal: it marks the exact credential generation
 * that made the request as needing reauthentication. It never triggers a
 * refresh — a PKCE-issued OrcaRouter key is durable and cannot be refreshed.
 */

import type { CredentialStore } from "./credentials";
import type { OrcaOrigins } from "./origins";
import { joinOrigin, ORCA_MODELS_PATH } from "./origins";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

export interface ChatCompletionInput {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  reasoningEffort?: string;
}

export type TransportFailure
  = | "needs_reauth"
    | "rate_limited"
    | "bad_request"
    | "server_error"
    | "network";

export class OrcaTransportError extends Error {
  readonly failure: TransportFailure;
  readonly status: number | null;

  constructor(failure: TransportFailure, message: string, status: number | null = null) {
    super(message);
    this.name = "OrcaTransportError";
    this.failure = failure;
    this.status = status;
  }
}

export interface TransportOptions {
  origins: OrcaOrigins;
  credentials: CredentialStore;
  fetchImpl?: typeof fetch;
}

/**
 * Attach the current credential generation and handle a terminal `401` by
 * marking only that generation.
 */
export async function orcaFetch(
  options: TransportOptions,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const { origins, credentials, fetchImpl = globalThis.fetch } = options;

  const credential = credentials.usable();
  if (!credential) {
    throw new OrcaTransportError(
      "needs_reauth",
      "OrcaRouter is not connected, or the stored credential needs reauthentication.",
    );
  }

  const generation = credential.generation;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${credential.apiKey}`);
  headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetchImpl(joinOrigin(origins.apiBase, path), { ...init, headers });
  }
  catch {
    throw new OrcaTransportError("network", "Could not reach the OrcaRouter inference endpoint.");
  }

  if (response.status === 401) {
    // Terminal. Do not retry, do not refresh.
    credentials.markRejected(generation);
    throw new OrcaTransportError(
      "needs_reauth",
      "OrcaRouter rejected the stored credential. Sign in again to continue.",
      401,
    );
  }
  if (response.status === 429) {
    throw new OrcaTransportError("rate_limited", "OrcaRouter is rate limiting requests.", 429);
  }
  if (response.status === 400) {
    throw new OrcaTransportError("bad_request", "OrcaRouter rejected the request.", 400);
  }
  if (response.status >= 500) {
    throw new OrcaTransportError("server_error", "OrcaRouter had a server error.", response.status);
  }

  return response;
}

export function chatCompletionsPath(): string {
  return "/chat/completions";
}


/** Send a non-streaming chat completion through the OrcaRouter provider. */
export async function createChatCompletion(
  options: TransportOptions,
  input: ChatCompletionInput,
): Promise<unknown> {
  const response = await orcaFetch(options, chatCompletionsPath(), {
    method: "POST",
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
      ...(input.maxTokens === undefined ? {} : { max_tokens: input.maxTokens }),
      ...(input.stream === undefined ? {} : { stream: input.stream }),
      ...(input.reasoningEffort === undefined ? {} : { reasoning_effort: input.reasoningEffort }),
    }),
  });

  return response.json();
}

/**
 * Fetch the model catalog through the same credential seam.
 *
 * Kept here (rather than in `catalog.ts`) so the request path that the UI
 * evidence exercises is the same one the provider uses.
 */
export async function fetchModelCatalog(
  options: TransportOptions,
  capability?: string,
): Promise<unknown> {
  const query = capability ? `?capability=${encodeURIComponent(capability)}` : "";
  const response = await orcaFetch(options, `${ORCA_MODELS_PATH}${query}`, { method: "GET" });
  return response.json();
}
