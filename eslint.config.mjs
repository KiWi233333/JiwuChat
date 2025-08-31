import antfu from "@antfu/eslint-config";
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  antfu({
    type: "app",
    typescript: true,
    unocss: true,
    vue: {
      vueVersion: 3,
    },
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
      semicolons: false,
      overrides: {
        "style/member-delimiter-style": "off", // 成员分隔符风格
        "no-restricted-globals": "off", // 禁止使用特定的全局变量
        "node/handle-callback-err": "off", // 处理回调错误
        "vue/no-multiple-template-root": "off", // 禁止多个根元素
        "vue/no-side-effects-in-computed-properties": "off", // 禁止在计算属性中使用副作用
        "vue/no-mutating-props": "off", // 禁止修改props
        "vue/return-in-computed-property": "off", // 禁止在计算属性中使用return语句
        "regexp/no-unused-capturing-group": "off", // 禁止未使用的捕获组
        "format/prettier": "off", // 格式化
        "style/no-tabs": "off", // 禁止使用制表符
        "prefer-promise-reject-errors": "off",
        "ts/prefer-literal-enum-member": "off", // 禁止使用数字字面量枚举成员
      },
    },
    jsonc: true,
    yaml: true,
    ignores: [
      "src-tauri/**",
      "dist/**",
      ".output/**",
    ],
    // 格式化
    formatters: {
      html: true,
      css: true,
      markdown: true,
    },
    rules: {
      // vue
      "vue/no-mutating-props": "off", // 禁止修改props
      "vue/no-side-effects-in-computed-properties": "off", // 禁止在计算属性中使用副作用
      "vue/return-in-computed-property": "off", // 禁止在计算属性中使用return语句
      "vue/multi-word-component-names": "off",
      // base
      "no-case-declarations": "off", // 禁止在case子句中声明变量
      "node/prefer-global/process": "off", // 禁止使用process全局变量
      "unused-imports/no-unused-vars": "off", // 禁止未使用的变量
      "no-console": "off", // 禁止console
      "style/no-multiple-empty-lines": ["warn", { max: 2, maxBOF: 1 }], // 空行
      "semi": ["error", "always"], // 结尾;
      "no-trailing-spaces": "error", // 禁止行尾空白
      "@stylistic/js/no-multiple-empty-lines": "off", // 禁止多余空行
      // ts
      "@typescript-eslint/ban-ts-comment": "off", // 禁止使用// @ts-ignore
    },
  }),
);
