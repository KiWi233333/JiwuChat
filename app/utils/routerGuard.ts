import { type } from "@tauri-apps/plugin-os";

type OSType = "windows" | "macos" | "linux" | string;

export const DESKTOP_OS_TYPES: OSType[] = ["windows", "macos", "linux"];

// 白名单配置（支持字符串精确匹配和正则表达式）
export const WHITE_LIST: (string | RegExp)[] = [
  "/login",
  /^\/oauth\/callback.*$/, // OAuth 回调页面
];

/**
 * 检查路径是否在白名单中
 */
export function checkInWhiteList(path: string): boolean {
  return WHITE_LIST.some((item) => {
    if (typeof item === "string") {
      return item === path;
    }
    return item.test(path);
  });
}

/**
 * 判断是否属于登录流程相关路由
 */
export function isLoginFlowRoute(path: string): boolean {
  return path === "/login" || /^\/oauth\/callback/.test(path);
}

/**
 * 桌面端登录/回调流程跳转是否应直接放行
 */
export function shouldBypassDesktopGuard(
  toPath: string,
  fromPath: string,
): boolean {
  const toInWhiteList = checkInWhiteList(toPath);
  // const fromInWhiteList = checkInWhiteList(fromPath);

  if (toInWhiteList) {
    return true;
  }

  return false;
}

/**
 * 获取阻止导航的提示消息
 */
export function getBlockNavigationMessage(path: string): string {
  if (path.startsWith("/goods/detail")) {
    return "请使用「极物圈」查看商品详情";
  }
  return "";
}

/**
 * 检查是否为桌面端
 */
export async function detectIsDesktop(
  setting: { isDesktop?: boolean },
): Promise<boolean> {
  try {
    if (setting?.isDesktop) {
      return true;
    }
    const osTypeName = type() as OSType;
    return DESKTOP_OS_TYPES.includes(osTypeName);
  }
  catch {
    return false;
  }
}

