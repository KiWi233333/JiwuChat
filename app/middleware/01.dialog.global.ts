import type { NavigationGuardReturn, RouteLocationNormalized } from "vue-router";

type DialogCleanupFunction = (() => void) | undefined;

export default defineNuxtRouteMiddleware((
  to: RouteLocationNormalized,
): NavigationGuardReturn => {
  const cleanup = checkAndCleanupDialogs();
  if (cleanup && !to.query?.dis) {
    cleanup();
    return abortNavigation();
  }
});

function checkAndCleanupDialogs(): DialogCleanupFunction {
  const chat = useChatStore();
  if (!chat.notDialogShow) {
    return () => {
      chat.notDialogShow = false;
    };
  }

  return undefined;
}

