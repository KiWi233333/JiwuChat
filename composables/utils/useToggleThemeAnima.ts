import { addRootClass, removeRootClass, STOP_TRANSITION_KEY } from "~/init/setting";

export const DEFAULT_THEME_TOGGLE_ID = "toggle-theme-btn";
/**
 * 切换主题
 */
export function useModeToggle(mode: "system" | "dark" | "light" | "auto" | string, event?: MouseEvent, isAnimated = true) {
  const setting = useSettingStore();
  if (setting.isThemeChangeLoad)
    return;

  setting.isThemeChangeLoad = true;
  // 切换动画
  const colorMode = useColorMode();
  // @ts-expect-error
  const isAppearanceTransition = document?.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 不支持动画
  if (!isAppearanceTransition || !isAnimated || !setting.settingPage.animation.themeTransition) {
    colorMode.preference = mode || "system";
    setting.isThemeChangeLoad = false;
    return;
  }
  if (!event && window) {
    // 计算屏幕中心坐标
    const modeBtn = document.getElementById(DEFAULT_THEME_TOGGLE_ID);
    if (!modeBtn) {
      const centerX = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) / 2;
      const centerY = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) / 2;
      event = {
        clientX: +centerX,
        clientY: +centerY,
      } as MouseEvent;
    }
    else {
      const rect = modeBtn.getBoundingClientRect();
      event = {
        clientX: +rect.left + rect.width / 2,
        clientY: +rect.top + rect.height / 2,
      } as MouseEvent;
    }
  }
  if (!event)
    return;
  // 画圆圈
  const x = event.clientX;
  const y = event.clientY;
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(() => {
    colorMode.preference = mode;
  });
  // 关闭所有渐变（优化性能）
  addRootClass(STOP_TRANSITION_KEY);
  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius.toFixed(0)}px at ${x}px ${y}px)`,
    ];
    document.documentElement.animate(
      {
        clipPath: colorMode.value === "dark" ? clipPath : [...clipPath].reverse(),
      },
      {
        duration: 800,
        easing: "ease-in-out",
        pseudoElement: colorMode.value === "dark" ? "::view-transition-new(root)" : "::view-transition-old(root)",
      },
    );
  }).catch(() => {
  });
  // 完成时
  transition.finished.then(async () => {
    removeRootClass(STOP_TRANSITION_KEY);
    await nextTick();
    setting.isThemeChangeLoad = false;
  }).catch(() => {
    setting.isThemeChangeLoad = false;
  });
}

