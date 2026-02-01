import type { RouteLocationNormalized } from "vue-router";

import { MAIN_ROUTES } from "~/constants/route";

export default defineNuxtRouteMiddleware((
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) => {
  setPageTransition(to.path, from.path);
});

function setPageTransition(
  toPath: string,
  fromPath: string,
): void {
  const chat = useChatStore();

  const toMainIndex = MAIN_ROUTES[toPath];
  const fromMainIndex = MAIN_ROUTES[fromPath];

  // 如果都是一级页面，则不使用滑动动画
  if (toMainIndex !== undefined && fromMainIndex !== undefined) {
    chat.pageTransition.name = "page-fade-in";
    return;
  }

  // 计算路由层级
  const getDepth = (path: string, isMain: boolean) => {
    // 一级页面层级为1
    if (isMain) {
      return 1;
    }

    // 二级及以上页面，基于路径段数计算
    // 例如:
    // / (main) -> depth 1
    // /msg (not main) -> depth 2 (1 + 1)
    // /user/safe (not main) -> depth 3 (1 + 2)
    const segments = path.split("/").filter(Boolean).length;
    return 1 + (segments || 1); // 至少为2 (1+1)，防止非Main的根路径被算作1
  };

  const toDepth = getDepth(toPath, toMainIndex !== undefined);
  const fromDepth = getDepth(fromPath, fromMainIndex !== undefined);

  if (toDepth > fromDepth) {
    // 进入更深层级 (类似 push)
    chat.pageTransition.name = "page-slide-left";
  }
  else if (toDepth < fromDepth) {
    // 返回上一级 (类似 pop)
    chat.pageTransition.name = "page-slide-right";
  }
  else {
    // 同级切换
    chat.pageTransition.name = "page-fade-in";
  }
}
