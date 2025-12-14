# OAuth 绑定功能 - 前端改动说明

## 方案 B：后端识别 `action` 参数区分登录/注册和绑定

---

## 概述

当用户已登录，在设置页面点击「绑定第三方账号」时：
1. 前端构建回调 URI，携带 `action=bind` 参数
2. 调用 `getAuthorizeUrl` 获取授权 URL
3. 用户在第三方平台授权
4. **后端识别 `action=bind`**，直接完成绑定，返回 `bindSuccess=true` 或错误信息
5. 前端处理回调结果，显示绑定成功/失败提示

---

## 文件改动

### 1. `app/components/user/safe/UpdateCards.vue`

#### 1.1 导入依赖（已完成）

```typescript
import type { OAuthPlatformCode, OAuthPlatformVO, UserOAuthVO } from "~/composables/api/user/oauth";
import type { OAuthCallbackPayload } from "~/composables/hooks/oauth/useDeepLink";
import {
  getAuthorizeUrl,
  getBindList,
  getOAuthPlatforms,
  unbindOAuth,
} from "~/composables/api/user/oauth";
import { useOAuthDeepLink } from "~/composables/hooks/oauth/useDeepLink";
```

> **注意**：方案 B 下，前端不再需要调用 `bindOAuth` API，可以移除该导入。

#### 1.2 回调 URI 构建（已完成）

```typescript
// 构建绑定回调 URI
function buildBindRedirectUri(platform: OAuthPlatformCode): string {
  const baseUrl = window.location.origin;
  const isDesktop = setting.isDesktop;

  if (isDesktop) {
    // 桌面端使用深度链接
    return `jiwuchat://oauth/callback?platform=${platform}&action=bind`;
  }
  // Web 端回调到当前页面
  return `${baseUrl}/user/safe?platform=${platform}&action=bind`;
}
```

#### 1.3 回调处理逻辑（需要简化）

**当前实现**有调用 `bindOAuth` 的代码，方案 B 下应该移除：

```typescript
// 处理绑定回调结果
async function handleBindCallback(data: {
  platform?: string;
  action?: string;
  error?: string;
  errorCode?: string;
  message?: string;
  bindSuccess?: boolean | string;
}) {
  const platform = data.platform as OAuthPlatformCode;

  // 处理错误
  if (data.error || data.errorCode) {
    const errorMessages: Record<string, string> = {
      OAUTH_ACCOUNT_ALREADY_BOUND: `该 ${platform} 账号已被其他用户绑定`,
      OAUTH_PLATFORM_ALREADY_BOUND: `您已绑定过 ${platform}，如需更换请先解绑`,
      TOKEN_EXPIRED: "登录已过期，请重新登录后再绑定",
      TOKEN_INVALID: "登录状态无效，请重新登录",
      USER_NOT_FOUND: "用户不存在",
    };
    const msg = errorMessages[data.errorCode || ""] 
      || (data.message ? decodeURIComponent(data.message) : "绑定失败");
    ElMessage.error(msg);
    bindingPlatform.value = null;
    return;
  }

  // 绑定成功（后端直接返回）
  if (data.bindSuccess === true || data.bindSuccess === "true") {
    ElMessage.success("绑定成功");
    bindingPlatform.value = null;
    await loadOAuthData();
    await reloadUserInfo();
    return;
  }

  // 未知情况
  ElMessage.error("绑定失败，请稍后重试");
  bindingPlatform.value = null;
}
```

#### 1.4 需要移除的代码

方案 B 下，后端会直接完成绑定，前端**不需要**以下逻辑：

```typescript
// ❌ 移除：前端不再调用 bindOAuth API
if (data.code && platform) {
  try {
    const redirectUri = buildBindRedirectUri(platform);
    const res = await bindOAuth(platform, data.code, redirectUri);
    // ...
  }
  // ...
}

// ❌ 移除：needBind 只用于登录场景
if (data.needBind === true || data.needBind === "true") {
  ElMessage.error("该第三方账号尚未注册，请先使用该账号登录注册");
  // ...
}
```

---

### 2. `app/composables/hooks/oauth/useDeepLink.ts`

#### 2.1 OAuthCallbackPayload 接口

方案 B 下，`code` 字段**不需要**（后端已处理），但保留也不影响：

```typescript
export interface OAuthCallbackPayload {
  platform: OAuthPlatformCode | null;
  action: OAuthAction | null;
  // code?: string;  // 方案 B 下不需要
  needBind?: boolean;
  token?: string;
  oauthKey?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  bindSuccess?: boolean;  // 绑定成功
  error?: string;
  errorCode?: string;     // 错误码
  message?: string;       // 错误消息
  raw_url: string;
}
```

---

### 3. `app/composables/api/user/oauth.ts`

方案 B 下，`bindOAuth` API **可以保留但不会被调用**（绑定由后端在回调时完成）。

如果要完全移除：

```typescript
// ❌ 可选：移除 bindOAuth 函数（方案 B 不需要）
// export function bindOAuth(platform: OAuthPlatformCode, code: string, redirectUri: string)
```

---

## 预期后端返回参数

### 绑定成功

```
/user/safe?platform=gitee&action=bind&bindSuccess=true
```

### 绑定失败 - 账号已被绑定

```
/user/safe?platform=gitee&action=bind&error=true&errorCode=OAUTH_ACCOUNT_ALREADY_BOUND&message=该账号已被其他用户绑定
```

### 绑定失败 - 已绑定该平台

```
/user/safe?platform=gitee&action=bind&error=true&errorCode=OAUTH_PLATFORM_ALREADY_BOUND&message=您已绑定该平台的其他账号
```

### 绑定失败 - Token 无效

```
/user/safe?platform=gitee&action=bind&error=true&errorCode=TOKEN_INVALID&message=登录状态无效
```

---

## 流程图

### Web 端绑定流程

```
用户已登录，点击「绑定 Gitee」
    ↓
handleBind('gitee')
    ↓
buildBindRedirectUri('gitee')
→ "http://localhost:3000/user/safe?platform=gitee&action=bind"
    ↓
getAuthorizeUrl('gitee', redirectUri)
→ 后端返回授权 URL（state 中包含 userId）
    ↓
window.location.href = 授权URL
→ 用户跳转到 Gitee 授权页面
    ↓
用户授权，Gitee 回调到后端
    ↓
后端 handleCallback：
  - 识别 action=bind
  - 从 state 获取 userId
  - 直接创建绑定记录
  - 302 重定向到 /user/safe?bindSuccess=true
    ↓
前端 onMounted 检测 URL 参数
    ↓
handleBindCallback({ bindSuccess: true })
    ↓
ElMessage.success("绑定成功")
loadOAuthData() // 刷新绑定列表
```

### 桌面端绑定流程

```
用户已登录，点击「绑定 Gitee」
    ↓
handleBind('gitee')
    ↓
buildBindRedirectUri('gitee')
→ "jiwuchat://oauth/callback?platform=gitee&action=bind"
    ↓
getAuthorizeUrl('gitee', redirectUri)
→ 后端返回授权 URL
    ↓
open(授权URL) // 打开外部浏览器
    ↓
用户在浏览器中授权
    ↓
后端 handleCallback：
  - 识别 action=bind
  - 直接创建绑定记录
  - 302 重定向到深度链接 jiwuchat://oauth/callback?bindSuccess=true
    ↓
Tauri 接收深度链接，触发 oauth-callback 事件
    ↓
useOAuthDeepLink onCallback
    ↓
handleBindCallback({ bindSuccess: true })
    ↓
ElMessage.success("绑定成功")
```

---

## 完整代码示例

### UpdateCards.vue（简化后）

```typescript
// 处理绑定回调结果（方案 B：后端直接完成绑定）
async function handleBindCallback(data: {
  platform?: string;
  action?: string;
  error?: string;
  errorCode?: string;
  message?: string;
  bindSuccess?: boolean | string;
}) {
  const platform = data.platform as OAuthPlatformCode;

  // 处理错误
  if (data.error || data.errorCode) {
    const errorMessages: Record<string, string> = {
      OAUTH_ACCOUNT_ALREADY_BOUND: `该 ${platform} 账号已被其他用户绑定`,
      OAUTH_PLATFORM_ALREADY_BOUND: `您已绑定过 ${platform}，如需更换请先解绑`,
      TOKEN_EXPIRED: "登录已过期，请重新登录后再绑定",
      TOKEN_INVALID: "登录状态无效，请重新登录",
      USER_NOT_FOUND: "用户不存在",
    };
    const msg = errorMessages[data.errorCode || ""] 
      || (data.message ? decodeURIComponent(data.message) : "绑定失败");
    ElMessage.error(msg);
    bindingPlatform.value = null;
    return;
  }

  // 绑定成功
  if (data.bindSuccess === true || data.bindSuccess === "true") {
    ElMessage.success("绑定成功");
    bindingPlatform.value = null;
    await loadOAuthData();
    await reloadUserInfo();
    return;
  }

  // 未知情况
  ElMessage.error("绑定失败，请稍后重试");
  bindingPlatform.value = null;
}

// 构建绑定回调 URI
function buildBindRedirectUri(platform: OAuthPlatformCode): string {
  const baseUrl = window.location.origin;
  const isDesktop = setting.isDesktop;

  if (isDesktop) {
    return `jiwuchat://oauth/callback?platform=${platform}&action=bind`;
  }
  return `${baseUrl}/user/safe?platform=${platform}&action=bind`;
}

// 桌面端深度链接监听
useOAuthDeepLink({
  autoListen: setting.isDesktop,
  onCallback: async (payload: OAuthCallbackPayload) => {
    if (payload.action !== "bind") return;

    await handleBindCallback({
      platform: payload.platform || undefined,
      action: payload.action,
      error: payload.error,
      errorCode: payload.errorCode,
      message: payload.message,
      bindSuccess: payload.bindSuccess,
    });
  },
});

// 绑定第三方账号
async function handleBind(platform: OAuthPlatformCode) {
  if (bindingPlatform.value) return;

  bindingPlatform.value = platform;

  try {
    const redirectUri = buildBindRedirectUri(platform);
    const res = await getAuthorizeUrl(platform, redirectUri);
    
    if (res.code !== StatusCode.SUCCESS || !res.data) {
      ElMessage.error(res.message || "获取授权地址失败");
      bindingPlatform.value = null;
      return;
    }

    if (setting.isDesktop) {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(res.data);
    } else {
      window.location.href = res.data;
    }
  } catch (error: any) {
    console.error("绑定失败:", error);
    ElMessage.error(error?.message || "绑定失败，请稍后重试");
    bindingPlatform.value = null;
  }
}

// Web 端：处理 URL 参数回调
const route = useRoute();
onMounted(() => {
  const query = route.query;
  if (query.action === "bind" && query.platform) {
    // 清除 URL 参数
    window.history.replaceState({}, "", window.location.pathname);

    handleBindCallback({
      platform: query.platform as string,
      action: query.action as string,
      error: query.error as string,
      errorCode: query.errorCode as string,
      message: query.message as string,
      bindSuccess: query.bindSuccess as string,
    });
  }

  if (user.isLogin) {
    loadOAuthData();
  }
});
```

---

## 检查清单

- [ ] 移除 `bindOAuth` 导入（可选）
- [ ] 简化 `handleBindCallback`，移除 `code` 处理逻辑
- [ ] 移除 `needBind` 处理逻辑（绑定场景不需要）
- [ ] 确认 `buildBindRedirectUri` 正确携带 `action=bind`
- [ ] 测试 Web 端绑定流程
- [ ] 测试桌面端绑定流程
