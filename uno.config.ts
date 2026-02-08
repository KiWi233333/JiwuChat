import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

// @unocss-include
export default defineConfig({
  shortcuts: [
    ["card-default", "bg-white dark:bg-dark-5 rounded"],
    ["card-bg-color", "bg-white dark:bg-dark-5"],
    ["form-bg-color", "bg-white  dark:bg-[#1b1b1b]"],
    ["card-bg-color-2", "bg-[#f2f2f2]  dark:bg-[#1b1b1b]"],
    ["input-bg-color", "bg-[#f2f2f2] dark:bg-dark-8"],
    ["card-default-br", "bg-[#ffffff93] dark:(bg-dark-5 bg-op-60) rounded backdrop-blur-12px backdrop-saturate-180"],
    ["card-default-br-2", "bg-white bg-op-90 dark:(bg-dark-5 bg-op-90) rounded backdrop-blur-8px backdrop-saturate-180"],
    ["blur-card", "backdrop-blur-4 bg-[#75757528] rounded"],
    ["card-rounded-df", " rounded"],
    ["btn-default", "border-0 cursor-pointer rounded-4px hover:text-theme-primary transition-200 text-white"],
    ["btn-primary-bg", " cursor-pointer rounded-4px hover:bg-theme-primary  hover:text-white"],
    // 颜色
    ["bg-color", "bg-white dark:bg-dark-5"],
    ["bg-color-2", "bg-[#f2f2f2]  dark:bg-[#111111]"], // 次要背景色
    ["bg-color-3", "bg-[#f2f2f2]  dark:bg-dark-9"],
    ["bg-color-br", "bg-[#ffffff93] dark:(bg-dark-5 bg-op-60) backdrop-blur-12px"],
    ["bg-color-df", "bg-[#f2f2f2]  dark:bg-dark-9"],
    ["bg-menu-color", "bg-[#f6f6f6]  dark:bg-dark-8"],
    ["bg-color-second", "bg-light-5 dark:bg-dark"],
    ["bg-skeleton", "bg-gray-1 dark:bg-[#1f1f1f]"],
    // 渐变背景
    // 1. 底部到顶部
    ["bg-color-linear-up", "bg-gradient-to-b from-white to-transparent dark:from-dark-5 dark:to-transparent"],
    ["bg-color-linear-down", "bg-gradient-to-t from-white to-transparent dark:from-dark-5 dark:to-transparent"],
    // dialog颜色
    ["dialog-bg-color", "bg-white dark:bg-dark-9"],
    ["bg-color-inverse", "bg-dark-500 bg-op-10 transition-colors dark:bg-light-900 dark:bg-op-20"],
    // 文本颜色
    ["text-color", "text-black dark:text-white"],
    ["text-secondary", "text-[#717171] dark:text-coolGray-300"],
    ["text-default", "text-1em text-black dark:text-white"],
    ["text-mini", "text-dark-50 dark:text-[#979898] text-xs"],
    ["text-mini-50", "text-xs text-[#717171] dark:text-[#979898]"],
    ["text-color-primary", "text-theme-primary"],
    ["text-color-info", "text-theme-info"],
    ["text-color-success", "text-theme-success"],
    ["text-small", "text-dark-50 dark:text-[#979898] text-sm"],
    ["text-small-50", "text-sm text-dark-50 dark:text-[#717171]"],
    ["text-small-color", "text-dark-50 dark:text-[#979898]"],
    // 边框
    // ["wind-border-default", "border-1px border-solid border-gray-300 dark:border-dark-300"],
    ["wind-border-default", "border-1px border-solid border-gray-200 dark:border-dark-300"],
    ["border-default", "border-1px border-solid border-gray-200 dark:border-dark-300"],
    ["border-default-r", "border-solid border-gray-200 border-0 border-r-1px  dark:border-dark-300"],
    ["border-default-l", "border-solid border-gray-200 border-0 border-l-1px  dark:border-dark-300"],
    ["border-default-t", "border-solid border-gray-200 border-0 border-t-1px  dark:border-dark-300"],
    ["border-default-b", "border-solid border-gray-200 border-0 border-b-1px  dark:border-dark-300"],
    ["border-default-2", "border-1px border-solid border-[rgba(100,_100,_100,_0.1)]  dark:border-[rgba(73,_73,_73,_0.2)]"],
    ["border-default-2-r", "border-r-(1px #7e7e7e0e solid) dark:border-dark-300 border-opacity-5"],
    ["border-default-2-l", "border-l-(1px #7e7e7e0e solid) dark:border-dark-300 border-opacity-5"],
    ["border-default-2-t", "border-t-(1px #7e7e7e0e solid) dark:border-dark-300 border-opacity-5"],
    ["border-default-2-b", "border-b-(1px #7e7e7e0e solid) dark:border-dark-300 border-opacity-5"],
    ["border-default-3", "border-1px border-solid border-[rgba(100,_100,_100,_0.1)]  dark:border-[rgba(73,_73,_73,_0.2)]"],
    ["border-default-3-r", "border-r-(1px #7e7e7e0e solid) dark:border-dark-600 border-opacity-2"],
    ["border-default-3-l", "border-l-(1px #7e7e7e0e solid) dark:border-dark-600 border-opacity-2"],
    ["border-default-3-t", "border-t-(1px #7e7e7e0e solid) dark:border-dark-600 border-opacity-2"],
    ["border-default-3-b", "border-b-(1px #7e7e7e0e solid) dark:border-dark-600 border-opacity-2"],
    ["border-default-dashed", "hover:shadow-sm border-2px  border-default border-dashed"],
    ["border-default-sm", "border-1px border-solid border-gray-200 dark:border-dark-500"],
    ["border-default-hover", "transition-200 border-1px border-solid border-[rgba(22,_22,_22,_0.1)]  dark:border-[rgba(73,_73,_73,_0.2)] hover:(border-gray-200 dark:border-dark-100)"],
    ["border-default-2-hover", "transition-200 border-1px border-solid border-[rgba(20,_20,_20,_0.05)]  dark:border-[rgba(76,_76,_76,_0.1)] hover:(border-gray-200 dark:border-dark-100)"],
    ["border-default-dashed", "border-2px  border-default border-dashed"],
    ["border-default-dashed-hover", "transition-200 hover:border-solid hover:border-theme-primary  border-default-dashed"],
    // 布局
    ["flex-row-c-c", "flex flex-row flex-justify-center flex-items-center"],
    ["flex-row-bt-c", "flex flex-row flex-justify-between flex-items-center"],
    ["layout-default", "mx-a sm:px-2rem py-4 w-94vw md:w-1400px"],
    ["layout-default-md", "mx-a sm:px-2rem py-4 w-94vw md:w-1400px"],
    ["layout-default-xm", "mx-a sm:px-2rem py-4 w-94vw md:w-1200px"],
    ["layout-default-se", "mx-a sm:px-2rem py-4 w-94vw md:w-1000px"],
    ["absolute-center", "absolute left-1/2 -translate-x-1/2"],
    ["absolute-center-center", "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"],
    ["absolute-center-x", "absolute left-1/2 -translate-x-1/2"],

    // element风格按钮，rounded 规范值采用 rounded, rounded-md, rounded-lg 等
    ["btn-info", "transition-200 cursor-pointer hover:text-theme-info"],
    ["btn-success", "transition-200 cursor-pointer hover:text-theme-success"],
    ["btn-primary", "transition-200 cursor-pointer hover:text-theme-primary"],
    ["btn-danger", "transition-200 cursor-pointer hover:text-theme-danger"],
    ["btn-warning", "transition-200 cursor-pointer hover:text-theme-warning"],
    ["btn-info-border", "transition-200 cursor-pointer rounded hover:(text-theme-info border-theme-info)"],
    ["btn-success-border", "transition-200 cursor-pointer rounded hover:(text-theme-success border-theme-success)"],
    ["btn-primary-border", "transition-200 cursor-pointer rounded hover:(text-theme-primary border-theme-primary)"],
    ["btn-danger-border", "transition-200 cursor-pointer rounded hover:(text-theme-danger border-theme-danger)"],
    ["btn-warning-border", "transition-200 cursor-pointer rounded hover:(text-theme-warning border-theme-warning)"],
    ["btn-default-text", "transition-200 cursor-pointer rounded hover:(text-black dark:text-white)"],
    ["btn-info-text", "transition-200 cursor-pointer rounded hover:text-theme-info"],
    ["btn-success-text", "transition-200 cursor-pointer rounded hover:text-theme-success"],
    ["btn-primary-text", "transition-200 cursor-pointer rounded hover:text-theme-primary"],
    ["btn-danger-text", "transition-200 cursor-pointer rounded hover:text-theme-danger"],
    ["btn-warning-text", "transition-200 cursor-pointer rounded hover:text-theme-warning"],
    ["btn-info-bg", "transition-200 cursor-pointer rounded hover:(text-white bg-theme-info)"],
    ["btn-success-bg", "transition-200 cursor-pointer rounded hover:(text-white bg-theme-success)"],
    ["btn-primary-bg", "transition-200 cursor-pointer rounded hover:(text-white bg-theme-primary)"],
    ["btn-danger-bg", "transition-200 cursor-pointer rounded hover:(text-white bg-theme-danger)"],
    ["btn-warning-bg", "transition-200 cursor-pointer rounded hover:(text-white bg-theme-warning)"],
    ["group-btn-info", "transition-200 cursor-pointer rounded group-hover:text-theme-info"],
    ["group-btn-success", "transition-200 cursor-pointer rounded group-hover:text-theme-success"],
    ["group-btn-primary", "transition-200 cursor-pointer rounded group-hover:text-theme-primary"],
    ["group-btn-danger", "transition-200 cursor-pointer rounded group-hover:text-theme-danger"],
    ["group-btn-warning", "transition-200 cursor-pointer rounded group-hover:text-theme-warning"],
    ["btn-light-bg", "transition-200 cursor-pointer rounded hover:(text-white bg-[var(--el-color-light)])"],
  ],
  rules: [
    // color: info success primary danger warning
    // 文字
    [/^el-color-(\w*)$/, ([_, color]) => ({ color: `var(--el-color-${color})` })],
    [/^el-bg-(\w*)$/, ([_, color]) => ({ "background-color": `var(--el-color-${color})` })],
    // 将 rounded 系列改为数组形式
    ["rounded", { "border-radius": "8px" }],
    ["rounded-none", { "border-radius": "0" }],
    ["rounded-xs", { "border-radius": "4px" }],
    ["rounded-sm", { "border-radius": "8px" }],
  ],
  theme: {
    colors: {
      theme: {
        primary: "var(--el-color-primary)",
        danger: "var(--el-color-danger)",
        error: "var(--el-color-error)",
        warning: "var(--el-color-warning)",
        info: "var(--el-color-info)",
        success: "var(--el-color-success)",
      }, // class="text-very-cool"
      tip: {
        main: "var(--el-color-primary)", // class="--el-color-primary"
        green: "hsla(var(--hue, 217), 78%, 51%)", // class="bg-brand-primary"
      },
    },
  },
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
      collections: {
        carbon: () =>
          import("@iconify-json/carbon").then(i => i.icons as any),
        solar: () =>
          import("@iconify-json/solar").then(i => i.icons as any),
        tabler: () =>
          import("@iconify-json/tabler").then(i => i.icons as any),
        ri: () =>
          import("@iconify-json/ri").then(i => i.icons as any),
      },
    }),
    presetTypography(),
    presetWebFonts({}),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
});
