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
    ["card-default", "bg-white dark:bg-dark-5 rounded-1.5"],
    ["card-bg-color", "bg-white dark:bg-dark-5"],
    ["form-bg-color", "bg-white  dark:bg-[#1b1b1b]"],
    ["card-bg-color-2", "bg-[#f2f2f2]  dark:bg-[#1b1b1b]"],
    ["input-bg-color", "bg-[#f2f2f2] dark:bg-dark-8"],
    ["card-default-br", "bg-[#ffffff93] dark:(bg-dark-5 bg-op-60) rounded-1.5 backdrop-blur-12px backdrop-saturate-180"],
    ["card-default-br-2", "bg-white bg-op-90 dark:(bg-dark-5 bg-op-90) rounded-1.5 backdrop-blur-8px backdrop-saturate-180"],
    ["blur-card", "backdrop-blur-4 bg-[#75757528] rounded-1.5"],
    ["card-rounded-df", " rounded-1.5"],
    ["btn-default", "border-0 cursor-pointer rounded-4px hover:text-[var(--el-color-primary)] transition-200 text-white"],
    ["btn-primary-bg", " cursor-pointer rounded-4px hover:bg-[var(--el-color-primary)]  hover:text-white"],
    // 颜色
    ["bg-color", "bg-white dark:bg-dark-5"],
    ["bg-color-2", "bg-[#f2f2f2]  dark:bg-[#111111]"], // 次要背景色
    ["bg-color-3", "bg-[#f2f2f2]  dark:bg-dark-9"],
    ["bg-color-br", "bg-[#ffffff93] dark:(bg-dark-5 bg-op-60) backdrop-blur-12px"],
    ["bg-color-df", "bg-[#f2f2f2]  dark:bg-dark-9"],
    ["bg-menu-color", "bg-[#f6f6f6]  dark:bg-dark-8"],
    ["bg-color-second", "bg-light-5 dark:bg-dark"],
    ["bg-skeleton", "bg-gray-1 dark:bg-[#1f1f1f]"],
    // dialog颜色
    ["dialog-bg-color", "bg-white dark:bg-dark-9"],
    // 文本颜色
    ["text-color", "text-black dark:text-white"],
    ["text-default", "text-1em text-black dark:text-white"],
    ["text-mini", "text-dark-50 dark:text-[#979898] text-xs"],
    ["text-mini-50", "text-xs text-[#717171] dark:text-[#979898]"],
    ["text-color-primary", "text-[var(--el-color-primary)]"],
    ["text-color-info", "text-[var(--el-color-info)]"],
    ["text-color-success", "text-[var(--el-color-success)]"],
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
    ["border-default-dashed-hover", "transition-200 hover:border-solid hover:border-[var(--el-color-primary)]  border-default-dashed"],
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

    // element风格按钮
    ["btn-info", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-info)]"],
    ["btn-success", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-success)]"],
    ["btn-primary", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-primary)]"],
    ["btn-danger", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-danger)]"],
    ["btn-warning", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-warning)]"],
    ["btn-info-border", "transition-200 cursor-pointer rounded-4px hover:(text-theme-info border-theme-info)"],
    ["btn-success-border", "transition-200 cursor-pointer rounded-4px hover:(text-theme-success border-theme-success)"],
    ["btn-primary-border", "transition-200 cursor-pointer rounded-4px hover:(text-theme-primary border-theme-primary)"],
    ["btn-danger-border", "transition-200 cursor-pointer rounded-4px hover:(text-theme-danger border-theme-danger)"],
    ["btn-warning-border", "transition-200 cursor-pointer rounded-4px hover:(text-theme-warning border-theme-warning)"],
    ["btn-info-text", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-info)]"],
    ["btn-success-text", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-success)]"],
    ["btn-primary-text", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-primary)]"],
    ["btn-danger-text", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-danger)]"],
    ["btn-warning-text", "transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-warning)]"],
    ["btn-info-bg", "transition-200 cursor-pointer rounded-4px hover:(text-white bg-[var(--el-color-info)])"],
    ["btn-success-bg", "transition-200 cursor-pointer rounded-4px hover:(text-white bg-[var(--el-color-success)])"],
    ["btn-primary-bg", "transition-200 cursor-pointer rounded-4px hover:(text-white bg-[var(--el-color-primary)])"],
    ["btn-danger-bg", "transition-200 cursor-pointer rounded-4px hover:(text-white bg-[var(--el-color-danger)])"],
    ["btn-warning-bg", "transition-200 cursor-pointer rounded-4px hover:(text-white bg-[var(--el-color-warning)])"],
    ["group-btn-info", "transition-200 cursor-pointer rounded-4px group-hover:text-[var(--el-color-info)]"],
    ["group-btn-success", "transition-200 cursor-pointer rounded-4px group-hover:text-[var(--el-color-success)]"],
    ["group-btn-primary", "transition-200 cursor-pointer rounded-4px group-hover:text-[var(--el-color-primary)]"],
    ["group-btn-danger", "transition-200 cursor-pointer rounded-4px group-hover:text-[var(--el-color-danger)]"],
    ["group-btn-warning", "transition-200 cursor-pointer rounded-4px group-hover:text-[var(--el-color-warning)]"],
    ["btn-light-bg", "transition-200 cursor-pointer rounded-4px hover:(text-white bg-[var(--el-color-light)])"],
  ],
  rules: [
    // color: info success primary danger warning
    // 文字
    [/^el-color-(\w*)$/, ([_, color]) => ({ color: `var(--el-color-${color})` })],
    [/^el-bg-(\w*)$/, ([_, color]) => ({ "background-color": `var(--el-color-${color})` })],
    // 文字按钮
    // [/^btn-(\w*)$/, ([_, color]) => ({
    //   "--at-apply": `transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-${color})]`,
    // })],
    // [/^btn-(\w*)-text$/, ([_, color]) => ({
    //   "--at-apply": `transition-200 cursor-pointer rounded-4px hover:text-[var(--el-color-${color})]`,
    // })],
    // // 文字背景按钮
    // [/^btn-(\w*)-bg$/, ([_, color]) => ({
    //   "--at-apply": `transition-200 cursor-pointer rounded-4px hover:(text-white bg-[var(--el-color-${color})]) `,
    // })],
    // // 文字按钮组
    // [/^group-btn-(\w*)$/, ([_, color]) => ({
    //   "--at-apply": `transition-200 cursor-pointer rounded-4px group-hover:text-[var(--el-color-${color})]`,
    // })],
  ],
  theme: {
    // ...
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
