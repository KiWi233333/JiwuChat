/**
 * 主题自定义管理
 * 基于 Element Plus 主题系统和 VueUse 的 useCssVar
 * 性能优化版本：使用缓存和 lazy evaluation
 */
import { useCssVar, useDebounceFn } from "@vueuse/core";

export interface ThemeColorValue {
  base: string
  light?: string // 浅色模式下的颜色
  dark?: string // 深色模式下的颜色
}

export interface ThemeColors {
  primary: ThemeColorValue
  success: ThemeColorValue
  warning: ThemeColorValue
  danger: ThemeColorValue
  error: ThemeColorValue
  info: ThemeColorValue
}

export interface ThemeConfig {
  colors: ThemeColors
  name?: string // 主题名称
  key?: string // 主题唯一标识
  preview?: string // 主题预览图或渐变背景
}

// 颜色类型常量
const COLOR_TYPES = ["primary", "success", "warning", "danger", "error", "info"] as const;
type ColorType = typeof COLOR_TYPES[number];

// 颜色变体级别常量
const LIGHT_VARIANTS = [3, 5, 7, 8, 9] as const;

// RGB 颜色缓存
const colorCache = new Map<string, { r: number; g: number; b: number }>();

// 预设主题配置常量
const PRESET_THEMES: ThemeConfig[] = [
  {
    name: "极物紫",
    key: "classic-blue",
    colors: {
      primary: { base: "#5d33f6", light: "#5d33f6", dark: "#5324ff" },
      success: { base: "#67c23a", light: "#67c23a", dark: "#56c220" },
      warning: { base: "#ffbf11", light: "#ffbf11", dark: "#ffbf11" },
      danger: { base: "#ff4545", light: "#ff4545", dark: "#fd4848" },
      error: { base: "#ff2323", light: "#ff2323", dark: "#ff2424" },
      info: { base: "#10cf80", light: "#10cf80", dark: "#11e08a" },
    },
    preview: "linear-gradient(135deg, #5d33f6 0%, #4f46e5 100%)",
  },
  {
    name: "墨韵雅致",
    key: "ink-elegance",
    colors: {
      primary: { base: "#2563eb", light: "#2563eb", dark: "#3b82f6" },
      success: { base: "#059669", light: "#059669", dark: "#10b981" },
      warning: { base: "#ea580c", light: "#ea580c", dark: "#fb923c" },
      danger: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      error: { base: "#b91c1c", light: "#b91c1c", dark: "#dc2626" },
      info: { base: "#0369a1", light: "#0369a1", dark: "#0ea5e9" },
    },
    preview: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  },
  {
    name: "极简黑白",
    key: "shadcn-minimal",
    colors: {
      primary: { base: "#0a0a0a", light: "#0a0a0a", dark: "#010101" },
      success: { base: "#16a34a", light: "#16a34a", dark: "#22c55e" },
      warning: { base: "#ca8a04", light: "#ca8a04", dark: "#eab308" },
      danger: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      error: { base: "#b91c1c", light: "#b91c1c", dark: "#dc2626" },
      info: { base: "#65a30d", light: "#65a30d", dark: "#84cc16" },
    },
    preview: "linear-gradient(135deg, #0a0a0a 0%, #404040 50%, #fafafa 100%)",
  },
  {
    name: "玫瑰晨曦",
    key: "rose-dawn",
    colors: {
      primary: { base: "#e11d48", light: "#e11d48", dark: "#f43f5e" },
      success: { base: "#059669", light: "#059669", dark: "#10b981" },
      warning: { base: "#f59e0b", light: "#f59e0b", dark: "#fbbf24" },
      danger: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      error: { base: "#be123c", light: "#be123c", dark: "#e11d48" },
      info: { base: "#be185d", light: "#be185d", dark: "#ec4899" },
    },
    preview: "linear-gradient(135deg, #e11d48 0%, #be123c 50%, #f43f5e 100%)",
  },
  {
    name: "琥珀暖阳",
    key: "amber-warmth",
    colors: {
      primary: { base: "#f59e0b", light: "#f59e0b", dark: "#fbbf24" },
      success: { base: "#65a30d", light: "#65a30d", dark: "#84cc16" },
      warning: { base: "#ea580c", light: "#ea580c", dark: "#f97316" },
      danger: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      error: { base: "#c2410c", light: "#c2410c", dark: "#ea580c" },
      info: { base: "#ca8a04", light: "#ca8a04", dark: "#eab308" },
    },
    preview: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #fbbf24 100%)",
  },
];

const STORY_THEMES: ThemeConfig[] = [
  {
    name: "翠竹清韵",
    key: "emerald-bamboo",
    colors: {
      primary: { base: "#10b981", light: "#10b981", dark: "#34d399" },
      success: { base: "#059669", light: "#059669", dark: "#10b981" },
      warning: { base: "#f59e0b", light: "#f59e0b", dark: "#fbbf24" },
      danger: { base: "#ef4444", light: "#ef4444", dark: "#f87171" },
      error: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      info: { base: "#0d9488", light: "#0d9488", dark: "#14b8a6" },
    },
    preview: "linear-gradient(135deg, #10b981 0%, #059669 50%, #14b8a6 100%)",
  },
  {
    name: "紫藤花语",
    key: "wisteria-purple",
    colors: {
      primary: { base: "#8b5cf6", light: "#8b5cf6", dark: "#a78bfa" },
      success: { base: "#10b981", light: "#10b981", dark: "#34d399" },
      warning: { base: "#f59e0b", light: "#f59e0b", dark: "#fbbf24" },
      danger: { base: "#ef4444", light: "#ef4444", dark: "#f87171" },
      error: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      info: { base: "#a855f7", light: "#a855f7", dark: "#c084fc" },
    },
    preview: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #a78bfa 100%)",
  },
  {
    name: "春草新绿",
    key: "spring-verdant",
    colors: {
      primary: { base: "#84cc16", light: "#84cc16", dark: "#a3e635" },
      success: { base: "#65a30d", light: "#65a30d", dark: "#84cc16" },
      warning: { base: "#eab308", light: "#eab308", dark: "#facc15" },
      danger: { base: "#ef4444", light: "#ef4444", dark: "#f87171" },
      error: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      info: { base: "#16a34a", light: "#16a34a", dark: "#22c55e" },
    },
    preview: "linear-gradient(135deg, #84cc16 0%, #65a30d 50%, #a3e635 100%)",
  },
  {
    name: "夕阳橘辉",
    key: "sunset-orange",
    colors: {
      primary: { base: "#f97316", light: "#f97316", dark: "#fb923c" },
      success: { base: "#10b981", light: "#10b981", dark: "#34d399" },
      warning: { base: "#ea580c", light: "#ea580c", dark: "#f97316" },
      danger: { base: "#ef4444", light: "#ef4444", dark: "#f87171" },
      error: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      info: { base: "#f59e0b", light: "#f59e0b", dark: "#fbbf24" },
    },
    preview: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #fb923c 100%)",
  },
  {
    name: "青石古韵",
    key: "ancient-slate",
    colors: {
      primary: { base: "#64748b", light: "#64748b", dark: "#94a3b8" },
      success: { base: "#10b981", light: "#10b981", dark: "#34d399" },
      warning: { base: "#f59e0b", light: "#f59e0b", dark: "#fbbf24" },
      danger: { base: "#ef4444", light: "#ef4444", dark: "#f87171" },
      error: { base: "#dc2626", light: "#dc2626", dark: "#ef4444" },
      info: { base: "#475569", light: "#475569", dark: "#64748b" },
    },
    preview: "linear-gradient(135deg, #64748b 0%, #475569 50%, #94a3b8 100%)",
  },
];

/**
 * 主题自定义管理 Hook
 *
 * 性能优化特性：
 * - ✅ 使用 Proxy 懒加载 CSS 变量
 * - ✅ RGB 颜色值缓存，避免重复计算
 * - ✅ 批量颜色变体生成
 * - ✅ 防抖处理主题更新
 * - ✅ 单例模式避免重复初始化
 *
 * @returns 主题自定义相关的工具和方法
 */
export function useThemeCustomization() {
  const setting = useSettingStore();
  const colorMode = useColorMode();

  // Lazy initialization of CSS variables
  const elementPlusVars = (() => {
    const vars: Record<string, any> = {};

    // 使用 Proxy 进行懒加载
    return new Proxy(vars, {
      get(target, prop: string) {
        if (!(prop in target)) {
          // 动态创建 CSS 变量引用
          if (prop.includes("Light") || prop.includes("Dark")) {
            target[prop] = useCssVar(`--el-color-${prop.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "")}`);
          }
          else {
            target[prop] = useCssVar(`--el-color-${prop}`);
          }
        }
        return target[prop];
      },
    });
  })();

  // 自定义 CSS 变量
  const customVars = {
    themeAccent: useCssVar("--jiwu-theme-accent"),
    themeSurface: useCssVar("--jiwu-theme-surface"),
    themeBackground: useCssVar("--jiwu-theme-background"),
  };

  // 优化后的颜色工具函数
  const colorUtils = (() => {
    // 颜色转换工具
    const colorConverter = {
      // 带缓存的 hex 转 RGB
      hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        if (colorCache.has(hex)) {
          return colorCache.get(hex)!;
        }

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result)
          return null;

        const rgb = {
          r: Number.parseInt(result[1] || "", 16),
          g: Number.parseInt(result[2] || "", 16),
          b: Number.parseInt(result[3] || "", 16),
        };

        colorCache.set(hex, rgb);
        return rgb;
      },

      rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        if (max === min) {
          return { h: 0, s: 0, l }; // achromatic
        }

        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h = 0;
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;

        return { h, s, l };
      },

      hslToHex(h: number, s: number, l: number): string {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0)
            t += 1;
          if (t > 1)
            t -= 1;
          if (t < 1 / 6)
            return p + (q - p) * 6 * t;
          if (t < 1 / 2)
            return q;
          if (t < 2 / 3)
            return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        let r, g, b;
        if (s === 0) {
          r = g = b = l; // achromatic
        }
        else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1 / 3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1 / 3);
        }

        const toHex = (c: number) => {
          const hex = Math.round(c * 255).toString(16);
          return hex.length === 1 ? `0${hex}` : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      },
    };

    // 颜色调整策略配置
    const colorAdjustmentConfig: Record<ColorType, { hueShift: number; saturationBoost: number; lightnessShift: number }> = {
      primary: { hueShift: 0, saturationBoost: 0.1, lightnessShift: 0.15 },
      success: { hueShift: 0, saturationBoost: 0.15, lightnessShift: 0.2 },
      warning: { hueShift: 0, saturationBoost: 0.1, lightnessShift: 0 },
      danger: { hueShift: 0, saturationBoost: 0.05, lightnessShift: 0.1 },
      error: { hueShift: 0, saturationBoost: 0.05, lightnessShift: 0.1 },
      info: { hueShift: 0, saturationBoost: 0.1, lightnessShift: 0.15 },
    };

    return {
      ...colorConverter,

      // 优化的智能深色模式颜色生成
      generateSmartDarkColor(lightColor: string, colorType: ColorType): string {
        const rgb = this.hexToRgb(lightColor);
        if (!rgb)
          return lightColor;

        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        const config = colorAdjustmentConfig[colorType];

        const adjustedSaturation = Math.min(hsl.s + config.saturationBoost, 1);
        const adjustedLightness = hsl.l < 0.3
          ? Math.min(hsl.l + config.lightnessShift + 0.2, 0.7)
          : hsl.l > 0.7
            ? Math.max(hsl.l - 0.3, 0.4)
            : Math.min(hsl.l + config.lightnessShift, 0.7);

        return this.hslToHex(hsl.h, adjustedSaturation, adjustedLightness);
      },

      // 优化的颜色变体生成（批量生成）
      generateColorVariants(baseColor: string, isDark: boolean = false) {
        const rgb = this.hexToRgb(baseColor);
        if (!rgb) {
          const fallback = { light3: baseColor, light5: baseColor, light7: baseColor, light8: baseColor, light9: baseColor };
          return fallback;
        }

        const mixTarget = isDark ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
        const variants: Record<string, string> = {};

        // 批量生成变体
        for (const variant of LIGHT_VARIANTS) {
          const ratio = variant / 10;
          variants[`light${variant}`] = this.mixColorWithBase(rgb, mixTarget, ratio);
        }

        return variants;
      },

      // 优化的颜色混合
      mixColorWithBase(color: { r: number; g: number; b: number }, mixColor: { r: number; g: number; b: number }, ratio: number): string {
        const newR = Math.round(color.r + (mixColor.r - color.r) * ratio);
        const newG = Math.round(color.g + (mixColor.g - color.g) * ratio);
        const newB = Math.round(color.b + (mixColor.b - color.b) * ratio);

        const toHex = (c: number) => {
          const hex = Math.max(0, Math.min(255, c)).toString(16);
          return hex.length === 1 ? `0${hex}` : hex;
        };

        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
      },

      // 简化的颜色亮度调整
      adjustLightness(color: string, amount: number): string {
        const rgb = this.hexToRgb(color);
        if (!rgb)
          return color;

        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        const newLightness = Math.max(0, Math.min(1, hsl.l + amount));

        return this.hslToHex(hsl.h, hsl.s, newLightness);
      },

      // 判断颜色是否为深色（优化版）
      isColorDark(color: string): boolean {
        const rgb = this.hexToRgb(color);
        if (!rgb)
          return false;
        // 使用更精确的感知亮度公式
        return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) < 128;
      },
    };
  })(); // 优化后的应用主题配置函数
  function apply(config: ThemeConfig) {
    const { colors } = config;
    const isDark = colorMode.value === "dark";

    // 获取当前色彩模式下的颜色值
    const getColorValue = (colorConfig: ThemeColorValue): string => {
      return isDark
        ? (colorConfig.dark || colorConfig.base)
        : (colorConfig.light || colorConfig.base);
    };

    // 批量应用颜色配置
    COLOR_TYPES.forEach((colorType) => {
      const colorValue = colors[colorType];
      const currentColor = getColorValue(colorValue);
      const variants = colorUtils.generateColorVariants(currentColor, isDark);

      // 动态设置基础颜色
      (elementPlusVars as any)[colorType].value = currentColor;

      // 批量设置变体颜色
      LIGHT_VARIANTS.forEach((variant) => {
        const variantKey = `${colorType}Light-${variant}`;
        if ((elementPlusVars as any)[variantKey]) {
          (elementPlusVars as any)[variantKey].value = variants[`light${variant}`];
        }
      });

      // 特殊处理 primary 的 dark2 变体
      if (colorType === "primary") {
        const primaryDark2Key = "primaryDark2";
        if ((elementPlusVars as any)[primaryDark2Key]) {
          (elementPlusVars as any)[primaryDark2Key].value = isDark
            ? colorUtils.adjustLightness(currentColor, 0.2)
            : colorUtils.adjustLightness(currentColor, -0.2);
        }
      }
    });

    // 保存当前主题配置到设置中
    setting.settingPage.customThemeConfig = config;
  }

  // 使用常量定义的预设主题
  const presetThemes = ref<ThemeConfig[]>(PRESET_THEMES);
  const defaultTheme = ref(PRESET_THEMES[0]);
  const storyThemes = ref<ThemeConfig[]>(STORY_THEMES);

  // 获取当前主题配置
  const getCurrentThemeConfig = computed(() => setting.settingPage.customThemeConfig || defaultTheme.value);
  // 重置为默认主题
  function reset() {
    if (!defaultTheme.value) {
      return false;
    }
    apply(defaultTheme.value);
    return true;
  }

  // 从设置中恢复主题
  function restore() {
    if (setting.settingPage.customThemeConfig) {
      apply(setting.settingPage.customThemeConfig);
    }
  } // 防抖应用主题，避免频繁更新
  const debouncedApply = useDebounceFn(apply, 100);

  // 优化的监听器
  const startWatchers = () => {
    // 监听主题配置变化（深度监听，防抖处理）
    watch(
      () => setting.settingPage.customThemeConfig,
      (newConfig) => {
        if (newConfig) {
          debouncedApply(newConfig);
        }
      },
      { deep: true },
    );
    // 监听深色模式切换
    watch(
      () => colorMode.value,
      () => {
        const currentConfig = setting.settingPage.customThemeConfig || defaultTheme.value;
        if (currentConfig) {
          debouncedApply(currentConfig);
        }
      },
    );
  };

  // 清理函数
  const cleanup = () => {
    colorCache.clear();
  };

  // 初始化
  onMounted(() => {
    restore();
  });

  // 卸载时清理
  onUnmounted(() => {
    cleanup();
  });
  return {
    // 工具
    elementPlusVars,
    customVars,
    colorUtils,
    startWatchers,
    // 预设主题
    presetThemes,
    defaultTheme,
    storyThemes,
    // 当前主题配置
    getCurrentThemeConfig,
    // 主题操作
    apply,
    reset,
    restore,
    // 清理函数
    cleanup,
    // 缓存统计（用于调试）
    getCacheStats: () => ({
      cacheSize: colorCache.size,
      cachedColors: Array.from(colorCache.keys()),
    }),
  };
}

// 优化的初始化函数 - 使用单例模式避免重复初始化
let themeCustomizationInstance: ReturnType<typeof useThemeCustomization> | null = null;

export function initThemeCustomization() {
  // 避免重复初始化
  if (themeCustomizationInstance) {
    return themeCustomizationInstance;
  }

  const setting = useSettingStore();
  themeCustomizationInstance = useThemeCustomization();

  // 初始化时应用当前主题配置
  const customThemeConfig = setting.settingPage.customThemeConfig;
  if (customThemeConfig) {
    themeCustomizationInstance.apply(customThemeConfig);
  }
  else {
    themeCustomizationInstance.reset();
  }

  return themeCustomizationInstance;
}
