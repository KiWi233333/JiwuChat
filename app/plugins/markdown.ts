// @ts-expect-error 没有声明文件
import LinkAttr from "markdown-it-link-attributes";
import { config, XSSPlugin } from "md-editor-v3";

export default defineNuxtPlugin(() => {
  const router = useRouter();
  config({
    markdownItPlugins(plugins) {
      return [
        {
          type: "linkAttr",
          plugin: LinkAttr,
          options: {
            matcher: (href: string) => !href.startsWith("#") && !router.hasRoute(href),
            attrs: { target: "_blank" },
          },
        },
        {
          type: "xss",
          plugin: XSSPlugin,
          options: { extendedWhiteList: {} },
        },
        ...plugins.map(item =>
          item.type === "taskList"
            ? { ...item, options: { ...item.options, enabled: true } }
            : item,
        ),
      ];
    },
  });
});
