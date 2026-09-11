# OrcaRouter provider

JiwuChat can route AI requests through [OrcaRouter](https://www.orcarouter.ai),
an OpenAI-compatible AI gateway. OrcaRouter appears as a first-class named
provider with two authentication choices.

## Authentication

Both choices produce the same thing: a durable OrcaRouter API key that belongs
to the user. Nothing downstream can tell which one produced it.

| Choice      | Label in the UI     | Credential source                               |
| ----------- | ------------------- | ----------------------------------------------- |
| Paste a key | `OrcaRouter - API`  | An `sk-orca-…` key from the OrcaRouter console. |
| Sign in     | `OrcaRouter - Auth` | OAuth 2.0 + PKCE (Flow B, out-of-band code).    |

**Flow B** is used rather than a loopback redirect because the app ships as a
Tauri desktop build, a web SPA and a mobile app from one codebase, and
self-hosted deployments sit behind arbitrary hostnames and ports. Only the
desktop build can reliably listen on `127.0.0.1`, and the out-of-band flow needs
no pre-registered redirect URI. `code_challenge_method=S256` is mandatory for a
displayed code, and is sent for every flow.

The returned key is **not** a refresh token. There is no refresh grant: the key
is reused until the user revokes it from
`https://www.orcarouter.ai/console/authorized-apps`, at which point a `401` from
the relay marks the exact credential generation as needing reauthentication.
OrcaRouter caps PKCE key issuance at 10 per user per 24 hours, so the app never
re-authorizes on launch.

## Endpoints

Authentication and inference use different public origins. Neither is derived
from the other by swapping a hostname or appending `/v1`.

| Purpose                   | Default                                      |
| ------------------------- | -------------------------------------------- |
| Consent screen            | `https://www.orcarouter.ai/auth`             |
| Code exchange             | `https://www.orcarouter.ai/api/v1/auth/keys` |
| Inference + model catalog | `https://api.orcarouter.ai/v1`               |

Overrides, highest precedence first:

1. `ORCA_AUTH_BASE_URL` / `ORCA_API_BASE_URL` (explicit, per purpose)
2. `ORCA_BASE_URL` (shared self-hosted fallback)
3. the public defaults above

In the Nuxt app these are read from `VITE_ORCA_AUTH_BASE_URL`,
`VITE_ORCA_API_BASE_URL` and `VITE_ORCA_BASE_URL`. Remote origins must use
HTTPS; plain HTTP is accepted only for loopback addresses.

## Model catalog

The model list comes from `GET /v1/models` on the configured inference origin.
Live discovery is authoritative; when it fails the client keeps a small verified
fallback so a fresh install still shows a usable list, and the selector labels
the degraded state.

The option list is always the result of filtering the catalog — it is never a
free-text field and never a hand-written sample. Filters are per entry point:

| Entry point                        | Rule                                                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text chat                          | A text-capable endpoint type (`openai`, `anthropic`, `gemini`, `openai-response`), excluding `image-generation`, `openai-video`, `jina-rerank` and `embeddings`. |
| Image input                        | Text chat **and** `architecture.input_modalities` declares `image`. Undeclared modalities fail closed.                                                           |
| Audio input                        | Text chat **and** `input_modalities` declares `audio`.                                                                                                           |
| Embedding / image / video / rerank | Strict endpoint-type match only.                                                                                                                                 |

Changing the provider, the input types, or the task recomputes the list. A
selection that is no longer compatible is cleared with a prompt rather than
silently kept.

## Where the code lives

| Concern                             | File                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Origins, HTTPS policy               | `app/composables/hooks/orcarouter/core/origins.ts`                                                                     |
| PKCE primitives                     | `app/composables/hooks/orcarouter/core/pkce.ts`                                                                        |
| Credential seam, adapters           | `app/composables/hooks/orcarouter/core/credentials.ts`, `credential-store.ts`, `api-key-adapter.ts`, `pkce-adapter.ts` |
| Inference transport, `401` handling | `app/composables/hooks/orcarouter/core/transport.ts`                                                                   |
| Catalog, capability filters         | `app/composables/hooks/orcarouter/core/catalog.ts`                                                                     |
| Provider composable                 | `app/composables/hooks/orcarouter/useOrcaRouter.ts`                                                                    |
| Settings UI                         | `app/components/setting/OrcaProviderCard.vue`, `OrcaModelSelect.vue`                                                   |

## Tests

```bash
node tests/orcarouter/run.mjs          # unit and integration suites
node tests/orcarouter/live.mjs         # live catalog + inference (needs ORCAROUTER_API_KEY)
python3 tests/orcarouter/ui_evidence.py # real-browser UI evidence
```

## Provider evidence

- Inference and model list: OpenAI-compatible at
  `https://api.orcarouter.ai/v1`; `GET /v1/models?capability=chat` accepts a
  Bearer key.
- Authorization, exchange and revocation: the OAuth 2.0 + PKCE flow above, with
  app revocation at `https://www.orcarouter.ai/console/authorized-apps`.
- Terms and legal entity: <https://www.orcarouter.ai/terms>
- Routing and gateway documentation: <https://www.orcarouter.ai>
