/**
 * 硬件加速管理
 * 用于控制应用的硬件加速功能
 */
export function useHardwareAcceleration() {
  const setting = useSettingStore();

  // 应用硬件加速设置到body类名
  const apply = () => {
    if (typeof document === "undefined")
      return;

    const body = document.body;
    const className = "hardware-acceleration-enabled";

    if (setting.settingPage.animation.hardwareAcceleration) {
      body.classList.add(className);
    }
    else {
      body.classList.remove(className);
    }
  };

  // 检查浏览器是否支持硬件加速
  const isSupported = () => {
    if (typeof window === "undefined")
      return false;

    // 检查是否支持3D变换
    const element = document.createElement("div");
    element.style.transform = "translateZ(0)";
    element.style.willChange = "transform";

    return element.style.transform !== "" && element.style.willChange !== "";
  };
  // 获取硬件加速状态信息
  const getHardwareInfo = () => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) {
      return {
        supported: false,
        renderer: "Software",
        vendor: "Unknown",
      };
    }

    // 类型断言为WebGL上下文
    const webglContext = gl as WebGLRenderingContext;
    const debugInfo = webglContext.getExtension("WEBGL_debug_renderer_info");

    return {
      supported: true,
      renderer: debugInfo ? webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unknown",
      vendor: debugInfo ? webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "Unknown",
    };
  };

  // 监听设置变化
  watch(
    () => setting.settingPage.animation.hardwareAcceleration,
    () => {
      apply();
    },
  );

  // 初始化
  onMounted(() => {
    apply();
  });

  return {
    apply,
    isSupported,
    getHardwareInfo,
  };
}
