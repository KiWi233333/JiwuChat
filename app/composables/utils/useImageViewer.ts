import type { ViewerOptions } from "~/components/image/ImageViewer.vue";
import { createApp, h } from "vue";
import ImageViewer from "~/components/image/ImageViewer.vue";


// 单例实例
type ViewerInstance = InstanceType<typeof ImageViewer>;
let instance: ViewerInstance | null = null;

function createOrGetImageViewer(): ViewerInstance {
  // 如果已存在实例则返回
  if (instance)
    return instance;

  // 创建容器
  const container = document.createElement("div");
  container.classList.add("custom-image-viewer-container");
  document.body.appendChild(container);
  // 创建应用实例
  const app = createApp({
    render() {
      return h(ImageViewer, {
        ref: "viewer",
      });
    },
  });

  // 挂载应用
  const mount = app.mount(container);
  const viewer = mount.$refs.viewer as ViewerInstance;

  // 保存实例引用
  instance = {
    open: viewer.open,
    close: viewer.close,
    destroy: () => {
      app.unmount();
      document.body.removeChild(container);
      instance = null;
    },
    state: viewer.state,
  } as ViewerInstance;

  return viewer;
}

// 全局可调用的查看器
export const useImageViewer = {
  open(options: ViewerOptions) {
    createOrGetImageViewer().open(options);
  },
  close() {
    if (instance) {
      instance.close();
    }
  },
  destroy() {
    if (instance) {
      instance.destroy();
    }
  },
  state: createOrGetImageViewer().state,
};
