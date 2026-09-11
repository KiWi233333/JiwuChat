/**
 * OrcaRouter origin resolution.
 *
 * Authentication and inference live on two different public origins. The
 * inference origin must never be derived from the auth origin (or the other
 * way around) by swapping a hostname or blindly appending `/v1`.
 *
 * Precedence, highest first:
 *   1. explicit per-purpose override  (`ORCA_AUTH_BASE_URL` / `ORCA_API_BASE_URL`)
 *   2. shared self-hosted fallback    (`ORCA_BASE_URL`)
 *   3. public defaults
 */

export const ORCA_DEFAULT_AUTH_BASE = "https://www.orcarouter.ai";
export const ORCA_DEFAULT_API_BASE = "https://api.orcarouter.ai/v1";

/** Auth endpoint paths, always relative to the auth origin. */
export const ORCA_AUTH_PATH = "/auth";
export const ORCA_EXCHANGE_PATH = "/api/v1/auth/keys";
export const ORCA_DEVICE_CODE_PATH = "/api/v1/auth/device/code";
export const ORCA_DEVICE_TOKEN_PATH = "/api/v1/auth/device/token";

/**
 * Inference path for model discovery, relative to the API origin. The API
 * origin already carries the `/v1` suffix, so this must not repeat it.
 */
export const ORCA_MODELS_PATH = "/models";

export interface OrcaOriginEnv {
  ORCA_BASE_URL?: string;
  ORCA_AUTH_BASE_URL?: string;
  ORCA_API_BASE_URL?: string;
}

export interface OrcaOrigins {
  authBase: string;
  apiBase: string;
}

export class OrcaOriginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrcaOriginError";
  }
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

/**
 * Normalize a configured origin and enforce the transport policy:
 * HTTPS is mandatory for remote origins, plain HTTP is tolerated only for
 * loopback development addresses.
 */
export function normalizeOrigin(raw: string, label: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    throw new OrcaOriginError(`${label} is empty`);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  }
  catch {
    throw new OrcaOriginError(`${label} is not a valid absolute URL`);
  }

  if (url.username || url.password) {
    throw new OrcaOriginError(`${label} must not contain userinfo`);
  }
  if (url.hash) {
    throw new OrcaOriginError(`${label} must not contain a fragment`);
  }
  if (url.search) {
    throw new OrcaOriginError(`${label} must not contain a query string`);
  }

  const secure = url.protocol === "https:";
  const loopbackHttp = url.protocol === "http:" && isLoopbackHost(url.hostname);
  if (!secure && !loopbackHttp) {
    throw new OrcaOriginError(
      `${label} must use HTTPS (HTTP is allowed only for loopback addresses)`,
    );
  }

  // Drop any trailing slash so path joins stay predictable.
  return url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, ""));
}

/**
 * Resolve the auth and inference origins from environment-style config.
 * An explicit override always wins over the shared fallback.
 */
export function resolveOrcaOrigins(env: OrcaOriginEnv = {}): OrcaOrigins {
  const shared = env.ORCA_BASE_URL ? normalizeOrigin(env.ORCA_BASE_URL, "ORCA_BASE_URL") : undefined;

  const authRaw = env.ORCA_AUTH_BASE_URL ?? shared ?? ORCA_DEFAULT_AUTH_BASE;
  const apiRaw = env.ORCA_API_BASE_URL ?? shared ?? ORCA_DEFAULT_API_BASE;

  return {
    authBase: normalizeOrigin(authRaw, "ORCA_AUTH_BASE_URL"),
    apiBase: normalizeOrigin(apiRaw, "ORCA_API_BASE_URL"),
  };
}

/** Join a path onto an origin without duplicating slashes. */
export function joinOrigin(origin: string, path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/+$/, "")}${suffix}`;
}

/** Exchange endpoint used by the PKCE flow — never on the inference origin. */
export function orcaExchangeUrl(origins: OrcaOrigins): string {
  return joinOrigin(origins.authBase, ORCA_EXCHANGE_PATH);
}

/** Consent screen URL that the user opens in a browser. */
export function orcaAuthorizeUrl(origins: OrcaOrigins): string {
  return joinOrigin(origins.authBase, ORCA_AUTH_PATH);
}

/** Model catalog URL — always on the inference origin. */
export function orcaModelsUrl(origins: OrcaOrigins): string {
  return joinOrigin(origins.apiBase, ORCA_MODELS_PATH);
}

/** Guard used by tests and by the transport to reject a mis-derived origin. */
export function assertDistinctPurposes(origins: OrcaOrigins): void {
  if (orcaExchangeUrl(origins).includes("/v1/auth/keys") && origins.authBase === origins.apiBase) {
    // A single shared self-hosted origin is legitimate; a relay-derived one is not.
    return;
  }
  if (origins.authBase.includes("api.orcarouter.ai") && !origins.apiBase.includes("api.orcarouter.ai")) {
    throw new OrcaOriginError("auth origin must not be derived from the inference origin");
  }
}
