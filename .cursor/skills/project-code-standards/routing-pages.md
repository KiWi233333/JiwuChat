# 路由与页面规范

## 文件路由（Nuxt）

- 路由由 **`app/pages/`** 目录结构决定，无需手写路由表。
- 文件与目录名即路径：`pages/index/user/safe.vue` → `/index/user/safe`；`pages/login.vue` → `/login`。
- 动态路由：`pages/extend/[type].vue` → `/extend/:type`；`pages/[...all].vue` 为 catch-all。

## definePageMeta

- 在页面组件内用 **`definePageMeta`** 设置布局、中间件等。

```ts
definePageMeta({
  layout: "default", // 使用 layouts/default.vue
  layout: false, // 不使用布局（如 demo/测试页）
});
```

- 常用：需要整页无侧栏/无壳时设 `layout: false`；否则用项目默认 layout。

## 目录约定

- **pages/** 下按功能分子目录（如 `index/`、`msg/`、`extend/`），与业务模块对应。
- 与路由无关的演示/测试页可放在 `pages/demo/` 或 `pages/test/`，并设 `layout: false`。

## 与组件的配合

- 页面只负责路由级布局与数据入口；具体 UI 拆成 `components/` 下组件，通过 composables 或 store 取数。
