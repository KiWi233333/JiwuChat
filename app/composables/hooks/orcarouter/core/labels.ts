/**
 * Display strings for the OrcaRouter surface.
 *
 * The project ships no i18n framework — UI copy is written inline — so this
 * module is the single seam where the OrcaRouter labels are defined, keyed for
 * a future catalog. English is canonical; every key must exist in every
 * catalog, which the parity test enforces.
 */

import { ORCA_DEFAULT_API_BASE, ORCA_DEFAULT_AUTH_BASE } from "./origins";

export const ORCA_LOCALES = ["en", "zh"] as const;
export type OrcaLocale = (typeof ORCA_LOCALES)[number];

export const ORCA_LABELS = {
  providerName: { en: "OrcaRouter", zh: "OrcaRouter" },
  providerGroup: { en: "AI gateway", zh: "AI 网关" },
  authMethodApiKey: { en: "OrcaRouter - API", zh: "OrcaRouter - API 密钥" },
  authMethodPkce: { en: "OrcaRouter - Auth", zh: "OrcaRouter - 账号授权" },
  apiKeyLabel: { en: "API key", zh: "API 密钥" },
  apiKeyPlaceholder: { en: "sk-orca-…", zh: "sk-orca-…" },
  apiKeyHint: {
    en: "Paste a key from your OrcaRouter console. Stored for this session only.",
    zh: "粘贴 OrcaRouter 控制台中的密钥，仅在本次会话内保存。",
  },
  apiKeySave: { en: "Use this key", zh: "使用该密钥" },
  apiKeyUpdate: { en: "Update key", zh: "更新密钥" },
  apiKeyClear: { en: "Remove key", zh: "清除密钥" },
  connectButton: { en: "Connect with OrcaRouter", zh: "使用 OrcaRouter 账号连接" },
  connectHint: {
    en: "Opens the OrcaRouter consent screen; no client secret or redirect URL to register.",
    zh: "打开 OrcaRouter 授权页，无需客户端密钥或预注册回调地址。",
  },
  copyLink: { en: "Copy authorization link", zh: "复制授权链接" },
  codeLabel: { en: "Authorization code", zh: "授权码" },
  codeSubmit: { en: "Submit code", zh: "提交授权码" },
  cancel: { en: "Cancel", zh: "取消" },
  refresh: { en: "Refresh model list", zh: "刷新模型列表" },
  modelLabel: { en: "Model", zh: "模型" },
  keyDashboard: { en: "OrcaRouter console", zh: "OrcaRouter 控制台" },
  inputTypesLabel: { en: "Input types", zh: "输入类型" },
  inputImage: { en: "Image", zh: "图片" },
  inputAudio: { en: "Audio", zh: "音频" },
} satisfies Record<string, Record<OrcaLocale, string>>;

export type OrcaLabelKey = keyof typeof ORCA_LABELS;

/** Resolve a label, falling back to canonical English for unknown locales. */
export function t(key: OrcaLabelKey, locale: OrcaLocale = "en"): string {
  const entry = ORCA_LABELS[key];
  return entry[locale] ?? entry.en;
}

/** Every key present in every locale — asserted by the parity test. */
export function labelParityReport(): { key: string; missing: OrcaLocale[] }[] {
  const problems: { key: string; missing: OrcaLocale[] }[] = [];
  for (const key of Object.keys(ORCA_LABELS) as OrcaLabelKey[]) {
    const entry = ORCA_LABELS[key] as Record<string, string | undefined>;
    const missing = ORCA_LOCALES.filter(locale => !entry[locale]);
    if (missing.length) {
      problems.push({ key, missing: missing as OrcaLocale[] });
    }
  }
  return problems;
}

/** Documented public origins, surfaced in the UI so they are auditable. */
export const ORCA_PUBLIC_ORIGINS = {
  auth: ORCA_DEFAULT_AUTH_BASE,
  api: ORCA_DEFAULT_API_BASE,
};
