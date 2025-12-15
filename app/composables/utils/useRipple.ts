/**
 * 波纹涟漪效果 Composable
 * 提供高性能的 Material Design 风格波纹效果
 */

export interface RippleOptions {
  /**
   * 波纹颜色，支持 CSS 颜色值
   * @default 'rgba(var(--el-color-primary-rgb), 0.3)'
   */
  color?: string
  /**
   * 波纹动画持续时间（毫秒）
   * @default 600
   */
  duration?: number
  /**
   * 波纹最大缩放比例
   * @default 2.5
   */
  scale?: number
  /**
   * 是否禁用波纹效果
   * @default false
   */
  disabled?: boolean
}

// 确保全局样式已注入
let stylesInjected = false;

/**
 * 创建波纹效果
 * @param event 鼠标事件
 * @param options 波纹配置选项
 */
export function createRipple(event: MouseEvent, options: RippleOptions = {}) {
  // 获取主题色的 RGB 值
  const getPrimaryColor = () => {
    if (typeof document === "undefined")
      return "64, 158, 255"; // Element Plus 默认主题色
    const root = document.documentElement;
    const primaryRgb = getComputedStyle(root).getPropertyValue("--el-color-primary-rgb").trim();
    return primaryRgb || "64, 158, 255";
  };

  const {
    color = `rgba(${getPrimaryColor()}, 0.3)`,
    duration = 600,
    scale = 2.5,
    disabled = false,
  } = options;

  if (disabled)
    return;

  // 自动注入样式（仅首次调用）
  if (!stylesInjected && typeof document !== "undefined") {
    injectRippleStyles();
    stylesInjected = true;
  }

  const target = event.currentTarget as HTMLElement;
  if (!target)
    return;

  // 确保目标元素有正确的样式
  const computedStyle = window.getComputedStyle(target);
  if (computedStyle.position === "static") {
    target.style.position = "relative";
  }
  if (computedStyle.overflow !== "hidden") {
    target.style.overflow = "hidden";
  }

  const ripple = document.createElement("span");
  const rect = target.getBoundingClientRect();

  // 计算波纹大小（取容器最大边的对角线长度）
  const size = Math.max(rect.width, rect.height) * 2;
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  // 设置波纹样式
  Object.assign(ripple.style, {
    position: "absolute",
    width: `${size}px`,
    height: `${size}px`,
    left: `${x}px`,
    top: `${y}px`,
    borderRadius: "50%",
    backgroundColor: color,
    transform: "scale(0)",
    opacity: "1",
    pointerEvents: "none",
    zIndex: "0",
    animation: `ripple-animation ${duration}ms ease-out`,
  });

  ripple.classList.add("ripple-effect");

  // 移除旧的波纹效果（性能优化）
  const oldRipples = target.querySelectorAll(".ripple-effect");
  oldRipples.forEach((old) => {
    if (old !== ripple) {
      old.remove();
    }
  });

  target.appendChild(ripple);

  // 动画结束后移除元素
  const timer = setTimeout(() => {
    ripple.remove();
    clearTimeout(timer);
  }, duration);
}

/**
 * 使用波纹效果的 Composable
 * @param options 波纹配置选项
 * @returns 波纹处理函数
 */
export function useRipple(options: RippleOptions = {}) {
  const handleRipple = (event: MouseEvent) => {
    createRipple(event, options);
  };

  return {
    createRipple: handleRipple,
  };
}

/**
 * 为元素添加波纹效果的工具函数
 * @param element HTML 元素
 * @param options 波纹配置选项
 */
export function addRippleEffect(element: HTMLElement, options: RippleOptions = {}) {
  const handleClick = (event: MouseEvent) => {
    createRipple(event, options);
  };

  element.addEventListener("click", handleClick);

  // 返回清理函数
  return () => {
    element.removeEventListener("click", handleClick);
  };
}

/**
 * 注入全局 CSS 动画（仅需调用一次）
 */
export function injectRippleStyles() {
  if (typeof document === "undefined")
    return;

  const styleId = "ripple-global-styles";
  if (document.getElementById(styleId))
    return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes ripple-animation {
      to {
        transform: scale(2.5);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

