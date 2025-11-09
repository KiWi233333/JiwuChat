// 打包分包插件解决潜在循环依赖
// import { prismjsPlugin } from "vite-plugin-prismjs";
// import { pwa } from "./config/pwa";
import { codeInspectorPlugin } from "code-inspector-plugin";
import { appDescription, appKeywords, appTitle } from "./app/constants/index";
import * as packageJson from "./package.json";
import "dayjs/locale/zh-cn";

const platform = process.env.TAURI_PLATFORM;
const isMobile = !!/android|ios/.exec(platform || "");
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const isSSR = process.env.NUXT_PUBLIC_SPA;
const mode = process.env.NUXT_PUBLIC_NODE_ENV as "development" | "production" | "test";
const version = packageJson?.version;
// 打印
console.log(`mode:${mode} api_url:${BASE_URL} SSR:${isSSR} platform: ${platform}`);
export default defineNuxtConfig({
  ssr: false,
  router: {
    options: {
      scrollBehaviorType: "smooth",
    },
  },
  ignore: ["src-tauri"],
  future: {
    compatibilityVersion: 4,
    typescriptBundlerResolution: true, // https://nuxtjs.org.cn/docs/guide/going-further/features#typescriptbundlerresolution
  },
  runtimeConfig: {
    public: {
      baseUrl: BASE_URL,
      mode,
      version,
      isMobile,
    },
  },
  build: {
    transpile: ["popperjs/core", "resize-detector"],
    analyze: {
      analyzerMode: "static", // 或其他配置
      reportFilename: "report.html",
    },
  },
  // spa情况下loading状态 web端使用 "./app/spa-loading-template.html"，桌面端使用 "./app/desktop-loading-template.html"
  spaLoadingTemplate: "./spa-loading-template.html",
  // 模块
  modules: [
    // 工具
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
    // UI
    "@element-plus/nuxt",
    "@formkit/auto-animate/nuxt",
    "@unocss/nuxt", // 基础
    "@pinia/nuxt", // 状态管理
    "pinia-plugin-persistedstate/nuxt",
    "@nuxt/eslint",
  ],
  srcDir: "app/",
  unocss: {
    warn: false,
  },
  app: {
    // pageTransition: { name: "page", mode: "out-in" },
    // layoutTransition: { name: "layout", mode: "out-in" },
    head: {
      title: appTitle,
      viewport: "width=device-width,initial-scale=1",
      // 网站头部信息
      link: [
        { rel: "icon", href: "/logo.png", sizes: "any" },
        { rel: "apple-touch-icon", href: "/logo.png" },
      ],
      // 网站meta
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
        { name: "description", content: appDescription },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: appTitle },
        { name: "format-detection", content: "telephone=no" },
        { name: "msapplication-TileColor", content: "#ffffff" },
        { name: "theme-color", content: "#5324ff" },
        { name: "robots", content: "index,follow" },
        { name: "author", content: "Kiwi2333" },
        { name: "keywords", content: appKeywords },
        { charset: "utf-8" },
        { "http-equiv": "X-UA-Compatible", "content": "IE=edge" },
        // Open Graph
        { property: "og:title", content: appTitle },
        { property: "og:description", content: appDescription },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "/logo.png" },
        { property: "og:url", content: "https://jiwuchat.top" },
        { property: "og:site_name", content: appTitle },
        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: appTitle },
        { name: "twitter:description", content: appDescription },
        { name: "twitter:image", content: "/logo.png" },
      ],
    },
  },

  // https://blog.csdn.net/weixin_42553583/article/details/131372309
  experimental: {
    // https://nuxt.com.cn/docs/guide/going-further/experimental-features#inlinerouterules
    inlineRouteRules: true,
    payloadExtraction: false,
    renderJsonPayloads: true, //
    emitRouteChunkError: false, // https://nuxt.com.cn/docs/getting-started/error-handling#js-chunk-%E9%94%99%E8%AF%AF
    // viewTransition: true, // 支持View Transition API Chorme111 https://blog.csdn.net/weixin_42553583/article/details/130474259
    crossOriginPrefetch: true, // 使用 Speculation Rules API 启用跨源预取。
    // watcher: "parcel", // 使用 Parcel 作为文件监视器。
    // // treeshakeClientOnly: true, // 仅客户端打包时启用 treeshaking。
    // noVueServer: true, // 禁用 Vue Server Renderer。
  },
  routeRules: {
    "/": { prerender: true },
    "/login": { prerender: true },
    "/setting": { prerender: true },
    "/user/safe": { prerender: true },
    "/friend": { prerender: true },
    "/ai": { prerender: true },
  },

  // 自动导入
  imports: {
    dirs: [
      // Scan top-level modules
      "composables/**",
      "types/**",
    ],
  },

  // css

  css: [
    "@/assets/styles/init.scss",
    "@/assets/styles/index.scss",
    "@/assets/styles/animate.scss",
    "@/assets/styles/element-ui.scss",
  ],
  nitro: {
    devProxy: {
      host: "127.0.0.1",
    },
  },
  // alias: {
  //   "~": "/<srcDir>",
  //   "@": "/<srcDir>",
  //   "~~": "/<rootDir>",
  //   "@@": "/<rootDir>",
  //   "assets": "/<srcDir>/assets",
  //   "public": "/<srcDir>/public",
  // },
  colorMode: {
    classSuffix: "",
  },
  // 3、elementPlus
  elementPlus: {
    icon: "ElIcon",
    importStyle: "scss",
    themes: ["dark"],
    defaultLocale: "zh-cn",
  },
  // pwa,
  devServer: {
    host: process.env.TAURI_DEV_HOST || "localhost",
    port: 3000,
  },
  // nuxt开发者工具
  devtools: {
    enabled: false,
  },
  // hooks: {
  //   "vite:extend": function ({ config }) {
  //     if (config.server && config.server.hmr && config.server.hmr !== true) {
  //       config.server.hmr.protocol = "ws";
  //       config.server.hmr.host = "192.168.31.14";
  //       config.server.hmr.port = 3000;
  //     }
  //   },
  // },
  // vite
  vite: {
    // 为 Tauri 命令输出提供更好的支持
    clearScreen: false,
    // 启用环境变量 其他环境变量可以在如下网页中获知：https://v2.tauri.app/reference/environment-variables/
    envPrefix: ["VITE_", "TAURI_"],
    plugins: [
      codeInspectorPlugin({
        bundler: "vite",
      }),
    ],
    server: {
      // Tauri 工作于固定端口，如果端口不可用则报错
      strictPort: true,
      hmr: process.env.TAURI_DEV_HOST
        ? {
            protocol: "ws",
            host: process.env.TAURI_DEV_HOST,
            port: 3000,
          }
        : undefined,
      watch: {
        // 告诉 Vite 忽略监听 `src-tauri` 目录
        ignored: ["**/src-tauri/**", "**/node_modules/**", "**/dist/**", "**/.git/**", "**/.nuxt/**", "**/public/**", "**/.output/**"],
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api", "global-builtin"],
          // WARNING: additionalData 只应该包含：变量、mixins、函数等不会生成实际 CSS 代码的内容（其他不应该放入）
          additionalData: `
          @use "@/assets/styles/element/index.scss" as element;
          @use "@/assets/styles/element/dark.scss" as dark;
          @use "@/assets/styles/var.scss" as *;
          `,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000, // chunk 大小警告的限制(kb)
      // minify: "terser", // 使用 esbuild 进行代码压缩
      // cssCodeSplit: true, // 是否将 CSS 代码拆分为单独的文件
      // cssMinify: false, // 压缩 CSS 代码
      commonjsOptions: {},
      target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",

      rolldownOptions: {
        output: {
          // 使用新版 advancedChunks API 进行手动分包
          advancedChunks: {
            // 全局配置
            minSize: 20 * 1024, // 20KB 最小包大小
            maxSize: 500 * 1024, // 500KB 最大包大小
            minModuleSize: 20 * 1024, // 20KB 最小模块大小
            maxModuleSize: 500 * 1024, // 500KB 最大模块大小
            minShareCount: 1, // 至少被1个入口引用
            includeDependenciesRecursively: true, // 递归包含依赖
            // groups: [
            //   {
            //     name: "element-plus",
            //     test: /node_modules[\\/]element-plus[\\/]/,
            //     priority: 15,
            //     minSize: 50 * 1024, // Element Plus 较大，设置更大的最小尺寸
            //   },
            //   {
            //     name: "vue-ecosystem",
            //     test: /node_modules[\\/](@vue|vue|@vueuse|pinia|nuxt)[\\/]/,
            //     priority: 12,
            //     minSize: 30 * 1024,
            //   },
            //   {
            //     name: "tauri-plugins",
            //     test: /node_modules[\\/]@tauri-apps[\\/]/,
            //     priority: 10,
            //     minSize: 10 * 1024,
            //   },
            //   {
            //     name: "markdown-editor",
            //     test: /node_modules[\\/](md-editor-v3|markdown-it)[\\/]/,
            //     priority: 9,
            //     minSize: 30 * 1024,
            //   },
            //   {
            //     name: "graphics",
            //     test: /node_modules[\\/]ogl[\\/]/,
            //     priority: 8,
            //     minSize: 20 * 1024,
            //   },
            //   {
            //     name: "utilities",
            //     test: /node_modules[\\/](lodash|@iconify|@formkit)[\\/]/,
            //     priority: 7,
            //     minSize: 15 * 1024,
            //   },
            //   {
            //     name: "icons",
            //     test: /node_modules[\\/]@iconify-json[\\/]/,
            //     priority: 6,
            //     minSize: 10 * 1024,
            //     maxSize: 100 * 1024, // 图标包不要太大
            //   },
            //   {
            //     name: "upload-storage",
            //     test: /node_modules[\\/](qiniu-js|streamsaver)[\\/]/,
            //     priority: 5,
            //     minSize: 15 * 1024,
            //   },
            //   {
            //     name: "dev-tools",
            //     test: /node_modules[\\/](@nuxt[\\/]devtools|@nuxt[\\/]eslint|eslint|@antfu)[\\/]/,
            //     priority: 4,
            //   },
            //   {
            //     name: "vendor",
            //     test: /node_modules[\\/]/,
            //     priority: 1,
            //     minSize: 30 * 1024, // 其他第三方库的最小尺寸
            //     maxSize: 200 * 1024, // 防止vendor包过大
            //   },
            // ],
          },
        },
      },
    },
  },
  typescript: {
    typeCheck: true,
  },
  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: false,
      },
    },
  },
  compatibilityDate: "2024-08-14",
});
