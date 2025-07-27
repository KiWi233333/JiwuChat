// 本地缓存工具函数
const TRANSLATION_CACHE_KEY = "translation_cache";
export const TranslationPagePath = "/setting?dis=1#translation";

interface TranslationCache {
  [key: string]: TranslationVO;
}
const translationCache = useLocalStorage<TranslationCache>(TRANSLATION_CACHE_KEY, {}, {
  shallow: true,
  deep: false,
});

/**
 * 使用翻译 API 翻译文本，并缓存结果
 * @param {number} msgId - 消息 ID
 * @param {string} txt - 要翻译的文本
 * @param {string} token - Authorization token
 * @param {TranslationEnums} sourceLang - 源语言
 * @param {TranslationEnums} targetLang - 目标语言
 * @returns {Promise<>} - 返回翻译结果
 */
export async function useTranslateTxt(msgId: number | string, txt: string, token: string, sourceLang: TranslationEnums = "auto", targetLang?: TranslationEnums, stream?: boolean) {
  const setting = useSettingStore();
  const resultData = ref<TranslationVO | null>(null); // 翻译结果
  stream = stream === undefined ? setting.settingPage.translation.stream : stream;
  targetLang = targetLang || setting.settingPage.translation.targetLang || "zh";
  // 生成缓存 key（基于文本和目标语言）
  const cacheKey = `${msgId}-${targetLang}`;
  if (translationCache.value[cacheKey]?.status === "connecting") {
    console.warn("正在翻译，请勿重复请求");
    return;
  }

  if (setting.settingPage.translation?.value === undefined) {
    ElMessage.error("请先在设置页面开启翻译功能");
    navigateTo(TranslationPagePath);
    return resultData;
  }
  // 检查缓存是否存在且未过期（例如 24 小时有效期）
  const cached = translationCache.value[cacheKey];
  const now = Date.now();
  if (cached && now - cached.startTime < 24 * 60 * 60 * 1000) {
    resultData.value = cached;
    return resultData; // 直接返回缓存结果
  }

  // 开始
  const tool = setting.translationTool;
  resultData.value = {
    startTime: now,
    result: "",
    sourceLang,
    targetLang,
    tool,
    status: "connecting" as SSEStatus,
  };
  translationCache.value[cacheKey] = resultData.value;
  try {
    // 调用翻译 API
    if (stream) {
      streamTranslateTxt(msgId, txt, token, sourceLang, targetLang, now, resultData);
      return resultData;
    }
    else {
      const res = await syncTranslateTxt(msgId, txt, token, sourceLang, targetLang, now);
      resultData.value = res;
      return resultData; // 直接返回缓存结果
    }
  }
  catch (error) {
    console.error("翻译错误:", error);
    if (resultData.value) {
      resultData.value.status = "error";
      resultData.value.result = "翻译失败";
    }
    closeTranslation(msgId, targetLang);
    return resultData; // 直接返回 null
  }
}


// 使用 SSE 工具进行翻译
function streamTranslateTxt(msgId: number | string, txt: string, token: string, sourceLang: TranslationEnums, targetLang: TranslationEnums, now: number, resultData: Ref<TranslationVO | null>) {
  const setting = useSettingStore();
  const tool = setting.translationTool;
  if (!tool) {
    return ElMessage.error("请先选择翻译工具");
  }
  const cacheKey = `${msgId}-${targetLang}`;

  // 调用翻译 API
  const { data, sseStatus, cancel } = translateTextSSE({
    text: txt,
    sourceLang,
    targetLang,
    type: tool?.value,
  }, token, (error) => {
    if (error && resultData.value) {
      resultData.value.status = "error";
      resultData.value.result = "翻译失败";
      resultData.value.endTime = Date.now();
      closeTranslation(msgId, targetLang);
    }
  });
  // 监听数据变化
  const unwatchData = watch(data, (newText) => {
    if (newText) {
      resultData.value = {
        // startTime: now,
        ...resultData.value,
        result: newText,
        sourceLang,
        targetLang,
        tool,
        status: sseStatus.value,
      };
    }
  });

  // 监听加载完成
  const unwatchLoading = watch(sseStatus, (val) => {
    if (val === "done" && resultData.value) {
      resultData.value.status = "done";
      resultData.value.endTime = Date.now();
      // 缓存翻译结果
      translationCache.value[cacheKey] = resultData.value;
      // 翻译完成，确保缓存结果
      checkTranslationCacheSize();
      // 取消监听
      unwatchData?.();
      unwatchLoading?.();
    }
    else { // 清除
    }
  });

  // 返回控制器，可用于取消请求
  return { cancel, sseStatus };
}

async function syncTranslateTxt(msgId: number | string, txt: string, token: string, sourceLang: TranslationEnums = "auto", targetLang?: TranslationEnums, now = Date.now()): Promise<TranslationVO | null> {
  const setting = useSettingStore();
  const res = await translateText({
    text: txt,
    sourceLang,
    targetLang: targetLang || setting.settingPage.translation.targetLang || "zh",
    type: setting.settingPage.translation?.value, // 默认使用腾讯翻译
  }, token);

  if (res.code === StatusCode.SUCCESS) {
    const cacheKey = `${msgId}-${targetLang}`;
    // 缓存翻译结果
    const data = {
      ...res.data,
      startTime: now,
      endTime: Date.now(),
      status: "done" as SSEStatus,
    };
    translationCache.value[cacheKey] = data;
    checkTranslationCacheSize();
    return data; // 直接返回缓存结果
  }
  else {
    return null; // 返回原文作为 fallback
  }
}


// 删除消息翻译
export function closeTranslation(msgId: number | string, targetLang: TranslationEnums) {
  const cacheKey = `${msgId}-${targetLang}`;
  if (cacheKey in translationCache.value) {
    delete translationCache.value[cacheKey];
  }
  return true;
}

// 检查缓存大小，如果超过 200 条 删除最早的 50 条
function checkTranslationCacheSize() {
  const keyRaws = Object.keys(translationCache.value);
  if (keyRaws.length > 200) {
    const keys = keyRaws.sort((a, b) => {
      return translationCache.value[a] && translationCache.value[b] ? translationCache.value[a].startTime - translationCache.value[b].startTime : 0;
    }) as string[];
    for (let i = 0; i < 50; i++) {
      if (keys[i]) {
        delete translationCache.value[keys[i] || ""];
      }
    }
  }
  console.log("翻译缓存大小:", keyRaws.length);
  return true;
}


