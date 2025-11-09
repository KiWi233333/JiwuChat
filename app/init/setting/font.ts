/**
 * 初始化字体风格和字体大小
 */
export async function initFontAndFamily() {
  const setting = useSettingStore();

  const fontFamily = setting.settingPage.fontFamily.value;
  document.documentElement?.style.setProperty("--font-family", fontFamily);

  // 1. 设置字体大小
  watch(() => setting.settingPage.fontSize.value, (val) => {
    document.documentElement?.style.setProperty("--font-size", `${val}px`);
  }, {
    immediate: true,
  });

  // 2. 监听字体风格
  if (!setting.settingPage.fontFamily.list.length) {
    setting.settingPage.fontFamily.list = DEFAULT_FONT_FAMILY_LIST;
  }

  // 动态加载网络字体
  async function loadWebFont(fontItem: typeof DEFAULT_FONT_FAMILY_LIST[0]) {
    if (!fontItem.url || !document.fonts)
      return;

    try {
      const fontFace = new FontFace(
        fontItem.value,
        `url(${fontItem.url}) format("woff2")`,
        { weight: String(fontItem.baseFontWeight || 400) },
      );

      await fontFace.load();
      document.fonts.add(fontFace);
    }
    catch (error) {
      console.warn(`字体加载失败: ${fontItem.name}`, error);
    }
  }

  // 初始化一次
  loadFont(setting.settingPage.fontFamily.value).catch(console.error);

  async function loadFont(fontValue: string) {
    // 从默认字体列表中查找对应的字体配置
    const fontItem = DEFAULT_FONT_FAMILY_LIST.find(item => item.value === fontValue);

    // 如果是网络字体,先加载
    if (fontItem?.url) {
      await loadWebFont(fontItem);
    }
    // 如果 fontValue 是一个有效的字体名称,则将其作为首选字体,否则回退到系统默认字体
    const fontStack = `${fontValue}`;
    document.documentElement.style.setProperty("--font-family", fontStack);
  }

  // 监听字体变化并应用到根元素
  watch(
    () => setting.settingPage.fontFamily.value,
    async (fontValue) => {
      if (fontValue) {
        const loading = document
          ? ElLoading.service({
              fullscreen: true,
              text: "加载中...",
              background: "transparent",
              spinner: defaultLoadingIcon,
            })
          : null;
        await loadFont(fontValue);
        setTimeout(() => {
          loading?.close();
        }, 300);
      }
    },
  );
}
