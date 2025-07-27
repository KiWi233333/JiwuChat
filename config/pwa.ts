// @ts-expect-error
import type { ModuleOptions } from "@vite-pwa/nuxt";
import { appDescription, appName } from "../app/constants/index";

// https://vite-pwa-org.netlify.app/frameworks/nuxt
// https://www.jianshu.com/p/0a07bd528e08
const scope = "/";
export const pwa: ModuleOptions = {
  registerType: "autoUpdate",
  scope,
  base: scope,
  includeAssets: ["logo.png"],
  // https://developer.mozilla.org/zh-CN/docs/Web/Manifest#lang
  manifest: {
    id: scope,
    background_color: "#fff",
    display: "standalone",
    name: appName,
    short_name: appName,
    start_url: scope,
    description: appDescription,
    theme_color: "#5d33f6",
    icons: [
      {
        src: "/logo.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=jiwuquan.hackerweb",
      },
    ],
  },
  workbox: {
    globPatterns: ["**\/*.{js,css,html,woff,woff2,ttf}"],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5m
    runtimeCaching: [
      // {
      //   urlPattern: "/^(https|http)://*.kiwi233.top/font/* /i",
      //   handler: "CacheFirst",
      //   options: {
      //     cacheName: "jiwuquan-fonts-cache",
      //     expiration: {
      //       maxEntries: 10,
      //       maxAgeSeconds: 60 * 60 * 24 * 31, // <== 365 days
      //     },
      //     cacheableResponse: {
      //       statuses: [0, 200],
      //     },
      //   },
      // },
    ],
  },
  registerWebManifestInRouteRules: true,
  writePlugin: true,
  devOptions: {
    enabled: true,
  },
};
