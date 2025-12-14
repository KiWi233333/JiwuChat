import { ElTooltip } from "element-plus";

export default defineNuxtPlugin(async (NuxtApp) => {
  // nuxtApp包含的属性可看文档 https://nuxt.com.cn/docs/guide/directory-structure/plugins
  // 1. 修改Element Plus 全局组件样式
  // 全局配置 popover 默认属性值，将hideAfter设置为0
  // ElPopover.props.hideAfter.default = 0
  // 修改全局 Popper 配置
  ElTooltip.props.popperOptions.default = () => ({
    modifiers: [
      {
        name: "computeStyles",
        options: {
          gpuAcceleration: false,
        },
      },
    ],
  });
});
