import type { AppContext, VNode } from "vue";
import type { ViewerOptions } from "~/components/common/ImageViewer.vue";
import { createVNode, getCurrentInstance, render } from "vue";
import ImageViewer from "~/components/common/ImageViewer.vue";

// 单例实例
type ViewerInstance = InstanceType<typeof ImageViewer>;
let container: HTMLElement | null = null;
let vnode: VNode | null = null;
let appContext: AppContext | null = null;

/**
 * 获取主应用的 AppContext
 * 优先使用缓存的 appContext，否则尝试从当前组件实例获取
 */
function getAppContext(): AppContext | null {
  // 如果已有 appContext，直接返回
  if (appContext) {
    return appContext;
  }

  // 尝试从当前实例获取（仅在组件内部调用时可用）
  const instance = getCurrentInstance();
  if (instance?.appContext) {
    appContext = instance.appContext;
    return appContext;
  }

  // 如果无法获取，打印警告
  if (!appContext) {
    console.warn(
      "[useImageViewer] AppContext not available. Router and other injections may not work. "
      + "Consider calling useImageViewer from within a component setup.",
    );
  }

  return null;
}

/**
 * 创建或获取 ImageViewer 实例
 * 使用 createVNode + render 方式，复用主应用的上下文
 */
function createOrGetImageViewer(): ViewerInstance | null {
  // 如果已存在实例则返回
  if (vnode?.component?.exposed) {
    return vnode.component.exposed as ViewerInstance;
  }

  // 创建容器
  if (!container) {
    container = document.createElement("div");
    container.classList.add("custom-image-viewer-container");
    document.body.appendChild(container);
  }

  // 创建 VNode
  vnode = createVNode(ImageViewer);

  // 设置 appContext，使其能访问主应用的 router、pinia 等
  const context = getAppContext();
  if (context) {
    vnode.appContext = context;
  }

  // 渲染到容器（使用 Vue 3 的 render 函数，不创建新的应用实例）
  render(vnode, container);

  // 获取组件实例
  return vnode.component?.exposed as ViewerInstance;
}

/**
 * 销毁 ImageViewer 实例
 */
function destroyImageViewer() {
  if (container && vnode) {
    // 清空渲染内容
    render(null, container);
    document.body.removeChild(container);
    container = null;
    vnode = null;
  }
}

/**
 * 全局可调用的 ImageViewer API
 * 使用虚拟 DOM 渲染，共享主应用上下文，性能更好
 */
export const useImageViewer = {
  /**
   * 打开图片查看器
   */
  open(options: ViewerOptions) {
    const viewer = createOrGetImageViewer();
    viewer?.open(options);
  },

  /**
   * 关闭图片查看器
   */
  close() {
    const viewer = vnode?.component?.exposed as ViewerInstance;
    viewer?.close();
  },

  /**
   * 销毁图片查看器实例
   */
  destroy() {
    destroyImageViewer();
  },

  /**
   * 获取查看器状态
   */
  get state() {
    const viewer = vnode?.component?.exposed as ViewerInstance;
    return viewer?.state;
  },
};
