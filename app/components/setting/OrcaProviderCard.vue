<script lang="ts">
/**
 * OrcaRouter provider settings.
 *
 * Presents the two authentication choices side by side — a pasted API key and
 * "Connect with OrcaRouter" (OAuth 2.0 + PKCE) — and the live model selector
 * for the current input capability.
 *
 * The API key is masked in the DOM at all times and is never rendered back into
 * a readable field, never placed in a URL, a log, or an error message.
 */
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ORCA_PUBLIC_ORIGINS, t } from "~/composables/hooks/orcarouter/core/labels";
import OrcaModelSelect from "./OrcaModelSelect.vue";

export interface OrcaRouterCardProps {
  /** Capability the surrounding entry point sends requests with. */
  capability?: "chat" | "embedding" | "image" | "video" | "rerank"
  /** Non-text modalities this entry point actually uploads. */
  modalities?: Array<"text" | "image" | "audio" | "video" | "file">
  /** Render the model selector. Off for entry points that pass a fixed model. */
  showModelSelect?: boolean
  size?: "small" | "default" | "large"
}

const { capability = "chat", modalities = ["text"], showModelSelect = true } = defineProps<OrcaRouterCardProps>();

const orca = useOrcaRouter();
const modelRef = ref<InstanceType<typeof OrcaModelSelect> | null>(null);

const isApiKeyVisible = ref(false);

const statusText = computed(() => {
  if (orca.state.needsReauth) {
    return "The stored OrcaRouter credential was rejected. Connect again.";
  }
  if (orca.state.credential) {
    const method = orca.state.credential.authMethod === "pkce"
      ? t("authMethodPkce")
      : t("authMethodApiKey");
    return `${method} · ${orca.state.maskedKey}`;
  }
  return "Not connected";
});

const busy = computed(() =>
  orca.state.pkce.status === "pending" || orca.state.pkce.status === "exchanging",
);

const pkceActive = computed(() =>
  orca.state.pkce.status === "pending" || orca.state.pkce.status === "exchanging",
);

onMounted(() => {
  orca.bindPageHide();
  void orca.loadCatalog(capability as "chat");
});

// A real component unmount releases the login work without writing UI state.
onBeforeUnmount(() => {
  orca.dispose();
});

function onModalitiesChanged() {
  orca.setRequiredModalities(modalities as Array<"text" | "image" | "audio" | "video" | "file">);
}

defineExpose({
  statusText,
  busy,
  pkceActive,
  onModalitiesChanged,
  reloadCatalog: () => orca.loadCatalog(capability as "chat", true),
});
</script>

<template>
  <div class="setting-group orca-provider" data-testid="orca-provider-card">
    <label class="title">
      {{ t("providerName") }}
    </label>

    <div class="box orca-body">
      <div class="group orca-status flex-row-bt-c">
        <span class="orca-status-text" data-testid="orca-status">
          {{ statusText }}
        </span>
        <a
          class="orca-link"
          :href="`${ORCA_PUBLIC_ORIGINS.auth}/console/api-keys`"
          target="_blank"
          rel="noopener noreferrer"
        >{{ t("keyDashboard") }}</a>
      </div>

      <!-- Choice 1: paste an existing API key -->
      <div class="group orca-method" data-testid="orca-api-key-method">
        <div class="orca-method-title">
          {{ t("authMethodApiKey") }}
        </div>
        <div class="orca-method-row">
          <el-input
            :model-value="orca.state.apiKeyDraft"
            class="orca-input"
            data-testid="orca-api-key-input"
            :type="isApiKeyVisible ? 'text' : 'password'"
            :placeholder="t('apiKeyPlaceholder')"
            :show-password="false"
            autocomplete="off"
            spellcheck="false"
            @update:model-value="orca.setApiKeyDraft($event)"
            @keyup.enter="orca.saveApiKey()"
          />
          <button
            type="button"
            class="orca-visibility"
            :aria-label="isApiKeyVisible ? 'Hide API key' : 'Show API key'"
            :aria-pressed="isApiKeyVisible"
            data-testid="orca-api-key-visibility"
            @click="isApiKeyVisible = !isApiKeyVisible"
          >
            <i :class="isApiKeyVisible ? 'i-solar:eye-closed-linear' : 'i-solar:eye-linear'" />
          </button>
          <button
            type="button"
            class="orca-action btn-primary"
            data-testid="orca-api-key-save"
            @click="orca.saveApiKey()"
          >
            {{ orca.state.credential ? t("apiKeyUpdate") : t("apiKeySave") }}
          </button>
          <button
            v-if="orca.state.credential"
            type="button"
            class="orca-action orca-danger"
            data-testid="orca-api-key-clear"
            @click="orca.clearCredential()"
          >
            {{ t("apiKeyClear") }}
          </button>
        </div>
        <p class="orca-hint">
          {{ t("apiKeyHint") }}
        </p>
        <p v-if="orca.state.apiKeyError" class="orca-error" data-testid="orca-api-key-error">
          {{ orca.state.apiKeyError }}
        </p>
      </div>

      <!-- Choice 2: sign in with an OrcaRouter account (OAuth 2.0 + PKCE) -->
      <div class="group orca-method" data-testid="orca-pkce-method">
        <div class="orca-method-title">
          {{ t("authMethodPkce") }}
        </div>
        <div class="orca-method-row">
          <button
            type="button"
            class="orca-action btn-primary"
            data-testid="orca-connect-button"
            :disabled="busy"
            @click="orca.startPkce()"
          >
            {{ t("connectButton") }}
          </button>
          <button
            v-if="pkceActive"
            type="button"
            class="orca-action"
            data-testid="orca-connect-cancel"
            @click="orca.cancelPkce()"
          >
            {{ t("cancel") }}
          </button>
        </div>
        <p class="orca-hint">
          {{ t("connectHint") }}
        </p>

        <template v-if="pkceActive">
          <p v-if="orca.state.pkce.hint" class="orca-hint" data-testid="orca-pkce-hint">
            {{ orca.state.pkce.hint }}
          </p>
          <a
            v-if="orca.state.pkce.authorizeUrl"
            class="orca-link orca-auth-url"
            data-testid="orca-pkce-url"
            :href="orca.state.pkce.authorizeUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ orca.state.pkce.authorizeUrl }}</a>

          <div class="orca-method-row">
            <el-input
              :model-value="orca.state.pkceCode"
              class="orca-input"
              data-testid="orca-pkce-code-input"
              :placeholder="t('codeLabel')"
              autocomplete="off"
              spellcheck="false"
              @update:model-value="orca.setPkceCode($event)"
              @keyup.enter="orca.submitPkceCode()"
            />
            <button
              type="button"
              class="orca-action btn-primary"
              data-testid="orca-pkce-code-submit"
              :disabled="!orca.state.pkceCode"
              @click="orca.submitPkceCode()"
            >
              {{ t("codeSubmit") }}
            </button>
          </div>
        </template>

        <p v-if="orca.state.pkce.error" class="orca-error" data-testid="orca-pkce-error">
          {{ orca.state.pkce.error }}
        </p>
      </div>

      <!-- Live model catalog -->
      <div v-if="showModelSelect" class="group orca-method" data-testid="orca-model-method">
        <div class="orca-method-title">
          {{ t("modelLabel") }}
        </div>
        <OrcaModelSelect
          ref="modelRef"
          :capability="capability"
          :modalities="modalities"
        />
        <!-- The catalog state is reported once, by the selector itself; the card
             only surfaces the harder error case. -->
        <p v-if="orca.state.catalogError" class="orca-error" data-testid="orca-catalog-error">
          {{ orca.state.catalogError }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.orca-provider {
  .orca-body {
    --at-apply: "flex flex-col gap-3";
  }

  .orca-status-text {
    --at-apply: "text-small-color";
  }

  .orca-link {
    --at-apply: "text-small text-color underline cursor-pointer";
  }

  .orca-method {
    --at-apply: "flex flex-col gap-2 p-2 border-default rounded-md bg-color-2";
  }

  .orca-method-title {
    --at-apply: "text-small text-color";
  }

  .orca-method-row {
    --at-apply: "flex flex-row items-center gap-2 flex-wrap";
  }

  .orca-input {
    --at-apply: "flex-1 min-w-12rem";
  }

  .orca-action {
    --at-apply: "px-3 py-1 rounded-md text-small cursor-pointer transition-200";

    &:disabled {
      --at-apply: "opacity-50 cursor-not-allowed";
    }
  }

  .orca-danger {
    --at-apply: "btn-danger";
  }

  .orca-visibility {
    --at-apply: "px-2 py-1 rounded-md cursor-pointer bg-color-3";
  }

  .orca-hint {
    --at-apply: "text-mini text-small-color m-0";
  }

  .orca-error {
    --at-apply: "text-mini m-0";
    color: var(--el-color-danger);
  }

  .orca-auth-url {
    --at-apply: "text-mini break-all";
  }
}
</style>
