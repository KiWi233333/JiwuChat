/**
 * Authentication adapter 2 of 2: "Connect with OrcaRouter" (OAuth 2.0 + PKCE).
 *
 * Flow B — out-of-band code — is used rather than Flow A (loopback redirect).
 * JiwuChat ships as a Tauri desktop app, a web SPA and a mobile app from one
 * codebase, and self-hosted deployments sit behind arbitrary hostnames and
 * ports. Only the desktop build can reliably listen on `127.0.0.1`, so a
 * loopback listener would be dead code on two of three targets and would need a
 * different flow per platform. Flow B behaves identically on all of them and
 * needs no pre-registered redirect URI, which is what the out-of-band flow
 * exists for. `code_challenge_method=S256` is mandatory there, and this
 * adapter sends S256 unconditionally anyway.
 *
 * Everything asynchronous carries the attempt generation with it: a response
 * that belongs to a superseded attempt must never write a credential or change
 * UI state. Cancellation is therefore complete, not merely guarded.
 */

import type { CredentialAdapter, CredentialStore, OrcaCredentialRecord } from "./credentials";
import type { OrcaOriginEnv, OrcaOrigins } from "./origins";
import type { OrcaScope, PkceAttempt } from "./pkce";
import { describeExchangeFailure, describeGrantedScope, exchangeCodeForKey } from "./exchange";
import { resolveOrcaOrigins } from "./origins";
import {
  assertStateMatches,
  buildAuthorizeUrl,
  createPkceAttempt,
  DEFAULT_SCOPE,


} from "./pkce";

export type PkceSessionStatus = "idle" | "pending" | "exchanging" | "done" | "error" | "cancelled";

export interface PkceSessionView {
  attemptId: number;
  status: PkceSessionStatus;
  authorizeUrl: string | null;
  /** Non-secret hint for the user, e.g. "waiting for the code". */
  hint: string | null;
  error: string | null;
  /** Scope granted by OrcaRouter, when it differs from the requested scope. */
  scopeWarning: string | null;
}

export interface PkceAdapterOptions {
  credentials: CredentialStore;
  env?: OrcaOriginEnv;
  origins?: OrcaOrigins;
  appName?: string;
  scope?: OrcaScope;
  fetchImpl?: typeof fetch;
  /** Injectable for tests. */
  now?: () => number;
  /**
   * Hands the authorization URL to the user. The browser is optional: the URL
   * is always also exposed on the session view so it can be copied manually.
   */
  openBrowser?: (url: string) => void | Promise<void>;
  onSessionChange?: (view: PkceSessionView) => void;
}

export interface PkceStartOverrides {
  loginHint?: string;
  workspaceHint?: string;
  prompt?: string;
}

export interface PkceAdapter extends CredentialAdapter {
  /** Current session snapshot. */
  view: () => PkceSessionView;
  /** Begin a new authorization; supersedes any in-flight attempt. */
  start: (overrides?: PkceStartOverrides) => Promise<PkceSessionView>;
  /** Deliver the code shown by the consent screen and exchange it. */
  submitCode: (code: string) => Promise<OrcaCredentialRecord>;
  /** Release the current attempt. Safe to call at any time, from any path. */
  cancel: () => void;
}

const IDLE_VIEW: PkceSessionView = {
  attemptId: 0,
  status: "idle",
  authorizeUrl: null,
  hint: null,
  error: null,
  scopeWarning: null,
};

export function createPkceAdapter(options: PkceAdapterOptions): PkceAdapter {
  const {
    credentials,
    env = {},
    appName = "JiwuChat",
    scope = DEFAULT_SCOPE as OrcaScope,
    fetchImpl = globalThis.fetch,
    openBrowser,
  } = options;

  const origins = options.origins ?? resolveOrcaOrigins(env);

  let attemptId = 0;
  let current: { id: number; attempt: PkceAttempt } | null = null;
  let view: PkceSessionView = { ...IDLE_VIEW };
  let activeExchange: AbortController | null = null;
  let pendingResolver: {
    id: number;
    resolve: (record: OrcaCredentialRecord) => void;
    reject: (error: Error) => void;
  } | null = null;

  function settlePending(id: number, outcome: { ok: OrcaCredentialRecord } | { error: Error }) {
    const pending = pendingResolver;
    if (!pending || pending.id !== id) {
      return;
    }
    pendingResolver = null;
    if ("ok" in outcome) {
      pending.resolve(outcome.ok);
    }
    else {
      pending.reject(outcome.error);
    }
  }

  function publish(next: Partial<PkceSessionView>) {
    view = { ...view, ...next };
    options.onSessionChange?.({ ...view });
  }

  /**
   * True when `id` is still the newest attempt. `cancel()` bumps the counter,
   * so everything already in flight becomes stale at once.
   */
  function isCurrent(id: number): boolean {
    return id === attemptId;
  }

  /** Synchronous state release — the whole point of `cancel()`. */
  function releaseAll() {
    activeExchange?.abort();
    activeExchange = null;
    current = null;
    settlePending(pendingResolver?.id ?? -1, { error: new Error("The OrcaRouter sign-in was cancelled.") });
  }

  /**
   * Release the current attempt from any terminal path: an explicit Cancel
   * button, switching authentication method, closing the panel, unmount, or
   * `pagehide`. There is no server-side task to notify in Flow B, so releasing
   * the exchange request and invalidating the generation is the whole job.
   */
  function cancel(): void {
    // Bump the generation first so an in-flight response observes a stale id
    // and refuses to mutate the credential or the view.
    attemptId += 1;
    releaseAll();
    publish({
      attemptId,
      status: "cancelled",
      authorizeUrl: null,
      hint: null,
      error: null,
    });
  }

  async function start(overrides: PkceStartOverrides = {}): Promise<PkceSessionView> {
    // Supersede whatever came before, synchronously and completely.
    attemptId += 1;
    const id = attemptId;
    releaseAll();

    publish({
      attemptId: id,
      status: "pending",
      authorizeUrl: null,
      hint: "Preparing OrcaRouter sign-in…",
      error: null,
      scopeWarning: null,
    });

    let attempt: PkceAttempt;
    try {
      attempt = await createPkceAttempt();
    }
    catch {
      if (isCurrent(id)) {
        publish({ status: "error", hint: null, error: "Could not start a secure OrcaRouter sign-in on this device." });
      }
      return { ...view };
    }

    // A newer attempt started while the RNG was running: drop this one.
    if (!isCurrent(id)) {
      return { ...view };
    }

    const authorizeUrl = buildAuthorizeUrl({
      origins,
      attempt,
      appName,
      // Flow B. The literal `oob` asks for out-of-band delivery explicitly.
      callbackUrl: "oob",
      scope,
      loginHint: overrides.loginHint,
      workspaceHint: overrides.workspaceHint,
      prompt: overrides.prompt,
    });

    current = { id, attempt };
    publish({
      status: "pending",
      authorizeUrl,
      hint: "Authorize in your browser, then paste the code back here.",
    });

    try {
      await openBrowser?.(authorizeUrl);
    }
    catch {
      // A browser that refuses to open is not fatal: the URL is on the view so
      // the user can copy it.
      if (isCurrent(id)) {
        publish({ hint: "Open the authorization link below, then paste the code back here." });
      }
    }

    return { ...view };
  }

  async function submitCode(code: string): Promise<OrcaCredentialRecord> {
    const pending = current;
    if (!pending) {
      // Distinguish "nothing started" from "the user cancelled" — the two need
      // different messages.
      throw new Error(
        view.status === "cancelled"
          ? "That OrcaRouter authorization was cancelled. Start it again."
          : "No OrcaRouter authorization is in progress.",
      );
    }
    const id = pending.id;
    if (!isCurrent(id)) {
      throw new Error("That OrcaRouter authorization was cancelled. Start it again.");
    }

    const trimmed = String(code ?? "").trim();
    if (!trimmed) {
      const message = "Enter the code shown on the OrcaRouter consent screen.";
      publish({ status: "pending", error: message });
      throw new Error(message);
    }

    activeExchange?.abort();
    activeExchange = new AbortController();
    const controller = activeExchange;

    publish({ status: "exchanging", hint: "Exchanging the code for an OrcaRouter key…", error: null });

    let result;
    try {
      result = await exchangeCodeForKey({
        origins,
        code: trimmed,
        // The verifier never leaves this process except here.
        verifier: pending.attempt.verifier,
        fetchImpl,
      });
    }
    catch (error) {
      if (!isCurrent(id)) {
        // Stale failure: it must not touch the credential or the current UI.
        throw error;
      }
      const message = describeExchangeFailure(error);
      publish({ status: "error", hint: null, error: message });
      settlePending(id, { error: new Error(message) });
      throw new Error(message);
    }
    finally {
      if (activeExchange === controller) {
        activeExchange = null;
      }
    }

    if (!isCurrent(id)) {
      // A newer login completed while this one was in flight.
      throw new Error("A newer OrcaRouter sign-in replaced this attempt.");
    }

    const granted = describeGrantedScope(result.scope);
    if (!granted.usable) {
      publish({ status: "error", hint: null, error: granted.warning });
      throw new Error(granted.warning ?? "OrcaRouter granted an unusable scope.");
    }

    current = null;
    const record = credentials.adopt({
      apiKey: result.key,
      authMethod: "pkce",
      scope: result.scope,
      userId: result.userId,
    });

    publish({
      status: "done",
      hint: null,
      error: null,
      authorizeUrl: null,
      scopeWarning: granted.warning,
    });

    return record;
  }

  return {
    id: "pkce",
    /**
     * Programmatic form: start the flow, then resolve once a code arrives
     * through `submitCode()`. The interactive UI drives `start()` and
     * `submitCode()` directly and never awaits this.
     */
    async acquire() {
      const started = await start();
      if (started.status === "error") {
        throw new Error(started.error ?? "Could not start the OrcaRouter sign-in.");
      }
      const id = started.attemptId;
      return new Promise<OrcaCredentialRecord>((resolve, reject) => {
        pendingResolver = { id, resolve, reject };
      });
    },
    start,
    submitCode,
    cancel,
    view() {
      return { ...view };
    },
  };
}

/** Generate a fresh state and compare it in constant time. */
export function verifyCallbackState(expected: string, received: string | null | undefined): boolean {
  try {
    assertStateMatches(expected, received);
    return true;
  }
  catch {
    return false;
  }
}
