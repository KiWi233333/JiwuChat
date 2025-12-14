import type { RouteLocationNormalized } from "vue-router";

const MAIN_ROUTES: Record<string, number> = {
  "/": 1,
  "/friend": 2,
  "/ai": 3,
  "/user": 4,
  "/setting": 5,
};

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

  if (MAIN_ROUTES[toPath] && MAIN_ROUTES[fromPath]) {
    if (MAIN_ROUTES[toPath] > MAIN_ROUTES[fromPath]) {
      chat.pageTransition.name = "page-slide-left";
    }
    else if (MAIN_ROUTES[toPath] < MAIN_ROUTES[fromPath]) {
      chat.pageTransition.name = "page-slide-right";
    }
  }
  else {
    chat.pageTransition.name = "page-fade-in";
  }
}

