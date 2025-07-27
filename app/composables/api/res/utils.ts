/**
 * 获取翻译工具列表
 * @param token Authorization token
 * @returns Result<TranslationToolVO>
 */
export function getTranslationToolList(token: string) {
  return useHttp.get<Result<TranslationToolVO[]>>("/res/utils/translation/list", {
  }, {
    headers: { Authorization: token },
  });
}

/**
 * 翻译文本
 * @param dto 翻译请求参数
 * @param token Authorization token
 * @returns Result<TranslationVO>
 */
export function translateText(dto: TranslationDTO, token: string) {
  return useHttp.post<Result<TranslationVO>>("/res/utils/translation", {
    ...dto,
  }, {
    headers: { Authorization: token },
  });
}

/**
 * 翻译文本（SSE方式）
 * @param dto 翻译请求参数
 * @param token Authorization token
 * @returns SseResponseHandler 包含数据、加载状态和错误信息的处理器
 */
export function translateTextSSE(dto: TranslationDTO, token: string, onError?: (error: any) => void) {
  return useSseRequest<string>({
    url: "/res/utils/translation/sse",
    method: "POST",
    body: dto,
    headers: {
      Authorization: token,
    },
    onError,
  });
}

// 接口参数和返回值的类型定义
export interface TranslationDTO {
  /**
   * 待翻译文本
   */
  text: string;
  /**
   * 源语言
   */
  sourceLang: TranslationEnums;
  /**
   * 目标语言
   */
  targetLang: TranslationEnums;
  /**
   * 翻译类型 1 腾讯 2 ai
   */
  type: number;
}

// 'auto' | 'zh' | 'zh_TW' | 'en' | 'ja' | 'ko' | 'fr' | 'es' | 'it' | 'de' | 'tr' | 'ru' | 'pt' | 'vi' | 'id' | 'th' | 'ms' | 'ar' | 'hi'
export type TranslationEnums = "auto" | "zh" | "zh_TW" | "en" | "ja" | "ko" | "fr" | "es" | "it" | "de" | "tr" | "ru" | "pt" | "vi" | "id" | "th" | "ms" | "ar" | "hi";
export const translationLangList = Object.freeze([
  // {
  //   label: "自动",
  //   value: "auto",
  // },
  {
    label: "中文",
    value: "zh",
  },
  {
    label: "中文（繁体）",
    value: "zh_TW",
  },
  {
    label: "英语",
    value: "en",
  },
  {
    label: "日语",
    value: "ja",
  },
  {
    label: "韩语",
    value: "ko",
  },
  {
    label: "法语",
    value: "fr",
  },
  {
    label: "西班牙语",
    value: "es",
  },
  {
    label: "意大利语",
    value: "it",
  },
  {
    label: "德语",
    value: "de",
  },
  {
    label: "土耳其语",
    value: "tr",
  },
  {
    label: "俄语",
    value: "ru",
  },
  {
    label: "葡萄牙语",
    value: "pt",
  },
  {
    label: "越南语",
    value: "vi",
  },
  {
    label: "印度尼西亚语",
    value: "id",
  },
  {
    label: "泰语",
    value: "th",
  },
  {
    label: "马来语",
    value: "ms",
  },
  {
    label: "阿拉伯语",
    value: "ar",
  },
  {
    label: "印地语",
    value: "hi",
  },
]);
export const translationLangMap = Object.freeze(new Map<TranslationEnums | undefined, string>(translationLangList.map(item => [item.value as TranslationEnums, item.label])));


/**
 * 翻译工具VO
 */
export interface TranslationToolVO {
  /**
   * 翻译工具名称
   */
  label: string;
  /**
   * 翻译工具值
   */
  value: number;
}

/**
 * 翻译结果VO
 */
export interface TranslationVO {
  /**
   * 翻译结果
   */
  result: string;
  /**
   * 源语言
   */
  sourceLang: TranslationEnums;
  /**
   * 目标语言
   */
  targetLang: TranslationEnums;

  tool?: TranslationToolVO;

  status: SSEStatus;

  [key: string]: any;
}

export type SSEStatus = "connecting" | "done" | "error" | "cancelled" | "";
export const SSEStatusMap = Object.freeze(new Map<SSEStatus, string>([
  ["connecting", "连接中"],
  ["done", "完成"],
  ["error", "错误"],
  ["cancelled", "已取消"],
  ["", ""],
]));

/**
 * SSE返回类型（简化和必要的部分）
 */
export interface SseEmitterUTF8 {
  /**
   * 超时时间
   */
  timeout?: number | null;
  /**
   * 是否完成
   */
  complete: boolean;
  /**
   * 发送是否失败
   */
  sendFailed: boolean;
  /**
   * 错误信息
   */
  failure?: Throwable | null;
}

/**
 * 异常信息
 */
export interface Throwable {
  detailMessage: string;
  cause?: Throwable | null;
  stackTrace: StackTraceElement[];
  suppressedExceptions: Throwable[];
}

/**
 * 堆栈跟踪元素
 */
export interface StackTraceElement {
  declaringClass: string;
  methodName: string;
  fileName: string;
  lineNumber: number;
}
