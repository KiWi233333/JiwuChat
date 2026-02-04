/**
 * 全局外部链接拦截插件（仅移动端生效）
 * 拦截所有 target="_blank" 的外部链接，通过 Tauri opener 在外部浏览器中打开
 */
export default defineNuxtPlugin(() => {
  const setting = useSettingStore();

  if (!setting.isMobile)
    return;

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;

    if (!anchor)
      return;

    const href = anchor.getAttribute("href");
    const targetAttr = anchor.getAttribute("target");

    if (href?.startsWith("http") && targetAttr === "_blank") {
      e.preventDefault();
      e.stopPropagation();
      useOpenUrl(href);
    }
  }, true);
});
