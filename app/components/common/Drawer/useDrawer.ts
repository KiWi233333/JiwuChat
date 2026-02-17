import type { Ref } from "vue";
import { useZIndex } from "element-plus";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useHistoryState } from "@/composables/hooks/useHistoryState";
import { DRAWER_BODY_LOCK_CLASS } from "@/constants/ui";

export interface BodyLockConfig {
  /** 目标元素选择器或元素 */
  target?: string | HTMLElement;
  /** 添加的类名 */
  className?: string;
  /** 缩放比例 */
  scale?: number;
  /** Y轴偏移距离(rem) */
  translateY?: number;
  /** 圆角大小(rem) */
  borderRadius?: number;
}

export interface DrawerProps {
  /** 控制抽屉显示/隐藏 */
  modelValue?: boolean;
  /** 抽屉方向 */
  direction?: "top" | "bottom" | "left" | "right";
  /** 是否显示拖拽手柄 */
  showHandle?: boolean;
  /** 是否可以通过拖拽关闭 */
  dragToClose?: boolean;
  /** 拖拽关闭的阈值(px) */
  closeThreshold?: number;
  /** 是否点击遮罩层关闭 */
  closeOnClickModal?: boolean;
  /** 是否按ESC关闭 */
  closeOnPressEscape?: boolean;
  /** 抽屉标题 */
  title?: string;
  /** 抽屉大小(宽度或高度) */
  size?: string | number;
  /** 自定义类名 */
  customClass?: string;
  /** z-index */
  zIndex?: number;
  /** 遮罩层透明度 */
  modalOpacity?: number;
  /** 动画时长(ms) */
  duration?: number;
  /** 关闭后销毁内容 */
  destroyOnClose?: boolean;
  /** 传送目标 */
  teleportTo?: string | HTMLElement;
  /** 背景联动效果配置 */
  bodyLock?: boolean | BodyLockConfig;
  /** 是否支持拖拽放大 */
  expandable?: boolean;
  /** 放大阈值 */
  expandThreshold?: number;
}

export function useDrawer(
  props: DrawerProps,
  emit: (event: any, ...args: any[]) => void,
  modelValue: Ref<boolean>,
  drawerRef: Ref<HTMLElement | null>,
  handleRef: Ref<HTMLElement | null>,
) {
  // Default values
  const direction = computed(() => props.direction ?? "bottom");
  const showHandle = computed(() => props.showHandle ?? true);
  const dragToClose = computed(() => props.dragToClose ?? true);
  const closeThreshold = computed(() => props.closeThreshold ?? 0);
  const closeOnClickModal = computed(() => props.closeOnClickModal ?? true);
  const closeOnPressEscape = computed(() => props.closeOnPressEscape ?? true);
  const size = computed(() => props.size ?? "auto");
  const customClass = computed(() => props.customClass ?? "");
  const modalOpacity = computed(() => props.modalOpacity ?? 0.5);
  const duration = computed(() => props.duration ?? 500);
  const destroyOnClose = computed(() => props.destroyOnClose ?? false);
  const teleportTo = computed(() => props.teleportTo ?? "body");
  const bodyLock = computed(() => props.bodyLock ?? true);
  const expandable = computed(() => props.expandable ?? true);
  const expandThreshold = computed(() => props.expandThreshold ?? 150);
  const zIndex = computed(() => props.zIndex);

  // 使用 Element Plus 的 zIndex 管理
  const { nextZIndex } = useZIndex();
  const currentZIndex = ref(zIndex.value ?? nextZIndex());

  // ==================== 背景联动配置 ====================
  const bodyLockConfig = computed<BodyLockConfig | false>(() => {
    if (!bodyLock.value)
      return false;

    if (bodyLock.value === true) {
      return {
        target: `.${DRAWER_BODY_LOCK_CLASS}`,
        className: "drawer-body-locked",
        scale: 0.95,
        translateY: 2,
        borderRadius: 1,
      };
    }

    return {
      target: bodyLock.value.target || `.${DRAWER_BODY_LOCK_CLASS}`,
      className: bodyLock.value.className || "drawer-body-locked",
      scale: bodyLock.value.scale ?? 0.95,
      translateY: bodyLock.value.translateY ?? 2,
      borderRadius: bodyLock.value.borderRadius ?? 1,
    };
  });

  // ==================== 状态管理 ====================
  const isOpen = computed(() => modelValue.value);
  const shouldRender = ref(modelValue.value);
  const isAnimating = ref(false);
  const isExpanded = ref(false);

  // 拖拽相关状态
  const isDragging = ref(false);
  const dragStartPos = ref(0);
  const dragCurrentPos = ref(0);
  const dragOffset = ref(0);
  const velocity = ref(0);
  const lastMoveTime = ref(0);
  const lastMovePos = ref(0);
  const startSize = ref(0);
  const normalSize = ref(0);
  const isRestoring = ref(false);

  // ==================== 计算属性 ====================
  const isVertical = computed(() => direction.value === "top" || direction.value === "bottom");
  const isHorizontal = computed(() => direction.value === "left" || direction.value === "right");

  const drawerSize = computed(() => {
    if (!size.value || size.value === "auto")
      return "auto";
    return typeof size.value === "number" ? `${size.value}px` : size.value;
  });

  const drawerStyle = computed(() => {
    const transitionProp = `transform ${duration.value}ms cubic-bezier(0.32, 0.72, 0, 1), height ${duration.value}ms cubic-bezier(0.32, 0.72, 0, 1), width ${duration.value}ms cubic-bezier(0.32, 0.72, 0, 1), border-radius ${duration.value}ms cubic-bezier(0.32, 0.72, 0, 1)`;

    const baseStyle: Record<string, any> = {
      "--drawer-duration": `${duration.value}ms`,
      "zIndex": currentZIndex.value + 1,
      "transition": isDragging.value ? "none" : transitionProp,
    };

    if (isVertical.value) {
      if (drawerSize.value !== "auto") {
        baseStyle[direction.value === "top" ? "maxHeight" : "maxHeight"] = drawerSize.value;
      }
    }
    else {
      if (drawerSize.value !== "auto") {
        baseStyle.width = drawerSize.value;
      }
    }

    // 展开状态样式
    if (!isRestoring.value && isExpanded.value) {
      if (isVertical.value) {
        baseStyle.height = "100%";
        baseStyle.maxHeight = "none";
        if (direction.value === "bottom") {
          baseStyle.borderTopLeftRadius = 0;
          baseStyle.borderTopRightRadius = 0;
        }
        else if (direction.value === "top") {
          baseStyle.borderBottomLeftRadius = 0;
          baseStyle.borderBottomRightRadius = 0;
        }
      }
      else {
        baseStyle.width = "100%";
        baseStyle.maxWidth = "none";
        if (direction.value === "left") {
          baseStyle.borderTopRightRadius = 0;
          baseStyle.borderBottomRightRadius = 0;
        }
        else if (direction.value === "right") {
          baseStyle.borderTopLeftRadius = 0;
          baseStyle.borderBottomLeftRadius = 0;
        }
      }
    }

    // 恢复动画状态样式（使用像素值以确保 transition 生效）
    if (isRestoring.value) {
      baseStyle.maxHeight = "none";
      baseStyle.maxWidth = "none";

      if (isExpanded.value) {
        // 目标是全屏 -> 使用视口尺寸
        if (isVertical.value) {
          baseStyle.height = `${window.innerHeight}px`;
          // 去除圆角
          if (direction.value === "bottom") {
            baseStyle.borderTopLeftRadius = 0;
            baseStyle.borderTopRightRadius = 0;
          }
          else if (direction.value === "top") {
            baseStyle.borderBottomLeftRadius = 0;
            baseStyle.borderBottomRightRadius = 0;
          }
        }
        else {
          baseStyle.width = `${window.innerWidth}px`;
          if (direction.value === "left") {
            baseStyle.borderTopRightRadius = 0;
            baseStyle.borderBottomRightRadius = 0;
          }
          else {
            baseStyle.borderTopLeftRadius = 0;
            baseStyle.borderBottomLeftRadius = 0;
          }
        }
      }
      else {
        // 目标是 Normal -> 使用记录的 normalSize
        if (normalSize.value > 0) {
          if (isVertical.value) {
            baseStyle.height = `${normalSize.value}px`;
          }
          else {
            baseStyle.width = `${normalSize.value}px`;
          }
        }
      }
    }

    // 应用拖拽偏移
    if (isDragging.value || dragOffset.value !== 0) {
      const offset = dragOffset.value;

      if (expandable.value) {
        // 判断是否在进行放大/缩小操作
        let isExpanding = false;
        let isShrinking = false;

        if (direction.value === "bottom") {
          if (isExpanded.value && offset > 0)
            isShrinking = true;
          else if (!isExpanded.value && offset < 0)
            isExpanding = true;
        }
        else if (direction.value === "top") {
          if (isExpanded.value && offset < 0)
            isShrinking = true;
          else if (!isExpanded.value && offset > 0)
            isExpanding = true;
        }
        else if (direction.value === "left") {
          if (isExpanded.value && offset < 0)
            isShrinking = true;
          else if (!isExpanded.value && offset > 0)
            isExpanding = true;
        }
        else if (direction.value === "right") {
          if (isExpanded.value && offset > 0)
            isShrinking = true;
          else if (!isExpanded.value && offset < 0)
            isExpanding = true;
        }

        if (isShrinking) {
          const delta = Math.abs(offset);
          const size = Math.max(0, startSize.value - delta);
          if (isVertical.value) {
            baseStyle.height = `${size}px`;
            baseStyle.maxHeight = "none";
          }
          else {
            baseStyle.width = `${size}px`;
            baseStyle.maxWidth = "none";
          }
        }
        else if (isExpanding) {
          const delta = Math.abs(offset);
          const size = startSize.value + delta;
          if (isVertical.value) {
            baseStyle.height = `${size}px`;
            baseStyle.maxHeight = "none";
            // 放大时根据方向去掉对应圆角
            if (direction.value === "bottom") {
              baseStyle.borderTopLeftRadius = 0;
              baseStyle.borderTopRightRadius = 0;
            }
            else {
              baseStyle.borderBottomLeftRadius = 0;
              baseStyle.borderBottomRightRadius = 0;
            }
          }
          else {
            baseStyle.width = `${size}px`;
            baseStyle.maxWidth = "none";
            if (direction.value === "left") {
              baseStyle.borderTopRightRadius = 0;
              baseStyle.borderBottomRightRadius = 0;
            }
            else {
              baseStyle.borderTopLeftRadius = 0;
              baseStyle.borderBottomLeftRadius = 0;
            }
          }
        }
        else {
          // 正常的拖拽移动（关闭方向）
          switch (direction.value) {
            case "bottom":
              baseStyle.transform = `translateY(${Math.max(0, offset)}px)`;
              break;
            case "top":
              baseStyle.transform = `translateY(${Math.min(0, offset)}px)`;
              break;
            case "left":
              baseStyle.transform = `translateX(${Math.min(0, offset)}px)`;
              break;
            case "right":
              baseStyle.transform = `translateX(${Math.max(0, offset)}px)`;
              break;
          }
        }
      }
      else {
        // 不支持放大，原有逻辑
        switch (direction.value) {
          case "bottom":
            baseStyle.transform = `translateY(${Math.max(0, offset)}px)`;
            break;
          case "top":
            baseStyle.transform = `translateY(${Math.min(0, offset)}px)`;
            break;
          case "left":
            baseStyle.transform = `translateX(${Math.min(0, offset)}px)`;
            break;
          case "right":
            baseStyle.transform = `translateX(${Math.max(0, offset)}px)`;
            break;
        }
      }
    }

    return baseStyle;
  });

  const overlayStyle = computed(() => {
    const style: Record<string, any> = {
      "zIndex": currentZIndex.value,
      "--modal-opacity": modalOpacity.value,
    };

    // 拖拽时动态调整相关变量
    if (isDragging.value) {
      const offset = dragOffset.value;
      let isClosing = false;

      if (expandable.value) {
        // 只有在 Normal 状态下，向关闭方向拖拽才计算透明度
        if (!isExpanded.value) {
          switch (direction.value) {
            case "bottom":
              if (offset > 0)
                isClosing = true;
              break;
            case "top":
              if (offset < 0)
                isClosing = true;
              break;
            case "left":
              if (offset < 0)
                isClosing = true;
              break;
            case "right":
              if (offset > 0)
                isClosing = true;
              break;
          }
        }
      }
      else {
        isClosing = true;
      }

      if (isClosing) {
        // 采用更缓的下降速率（平方根方式，拖拽距离越大，透明度下降越慢）
        // 如果 closeThreshold 为 0，给予一个默认值防止瞬间消失，例如 150
        const threshold = closeThreshold.value > 0 ? closeThreshold.value : 150;
        const ratio = Math.min(1, Math.abs(offset) / threshold);
        style["--modal-opacity"] = Math.max(0, modalOpacity.value * (1 - Math.sqrt(ratio)));
      }
    }
    return style;
  });

  // ==================== 路由历史状态管理 ====================
  // 使用路由历史状态管理弹窗打开/关闭状态
  // 当弹窗打开时会在 URL 添加 query 参数，用户点击返回键可以关闭弹窗
  useHistoryState(modelValue, {
    enabled: true,
    activeValue: true,
    inactiveValue: false,
    useBackNavigation: true,
    scope: "global",
  });

  // ==================== 背景联动处理 ====================
  let lockTargetElement: HTMLElement | null = null;

  function applyBodyLock() {
    if (!bodyLockConfig.value)
      return;

    const config = bodyLockConfig.value;
    const target
      = typeof config.target === "string"
        ? document.querySelector<HTMLElement>(config.target)
        : config.target;

    if (!target)
      return;

    lockTargetElement = target;

    // 添加类名
    if (config.className) {
      target.classList.add(config.className);
    }

    // 应用内联样式
    target.style.setProperty("--drawer-body-scale", String(config.scale));
    target.style.setProperty("--drawer-body-translate-y", `${config.translateY}rem`);
    target.style.setProperty("--drawer-body-border-radius", `${config.borderRadius}rem`);
    target.style.setProperty("--drawer-body-duration", `${duration.value}ms`);

    // 添加过渡效果
    target.style.transition = `transform ${duration.value}ms cubic-bezier(0.32, 0.72, 0, 1), border-radius ${duration.value}ms ease`;
    target.style.transform = `scale(var(--drawer-body-scale)) translateY(var(--drawer-body-translate-y))`;
    target.style.borderRadius = `var(--drawer-body-border-radius)`;
    target.style.overflow = "hidden";
  }

  function removeBodyLock() {
    if (!lockTargetElement || !bodyLockConfig.value)
      return;

    const config = bodyLockConfig.value;

    // 移除类名
    if (config.className) {
      lockTargetElement.classList.remove(config.className);
    }

    // 重置样式
    lockTargetElement.style.transform = "";
    lockTargetElement.style.borderRadius = "";

    // 延迟移除 overflow 和过渡,让动画完成
    setTimeout(() => {
      if (lockTargetElement) {
        lockTargetElement.style.overflow = "";
        lockTargetElement.style.transition = "";
        lockTargetElement.style.removeProperty("--drawer-body-scale");
        lockTargetElement.style.removeProperty("--drawer-body-translate-y");
        lockTargetElement.style.removeProperty("--drawer-body-border-radius");
        lockTargetElement.style.removeProperty("--drawer-body-duration");
      }
      lockTargetElement = null;
    }, duration.value);
  }

  // ==================== 监听器 ====================
  watch(modelValue, (newVal) => {
    if (newVal) {
      shouldRender.value = true;
    }
    else {
      isExpanded.value = false;
    }
  });

  // ==================== 拖拽处理 ====================
  function handleDragStart(e: MouseEvent | TouchEvent) {
    if (!dragToClose.value)
      return;

    isDragging.value = true;
    if (drawerRef.value) {
      // 记录开始时的尺寸
      startSize.value = isVertical.value
        ? drawerRef.value.offsetHeight
        : drawerRef.value.offsetWidth;

      // 如果不是展开状态，记录 Normal 尺寸用于恢复动画
      if (!isExpanded.value) {
        normalSize.value = startSize.value;
      }
    }
    const pos = "touches" in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);

    if (!pos)
      return;

    if (isVertical.value) {
      dragStartPos.value = pos.clientY;
      lastMovePos.value = pos.clientY;
    }
    else {
      dragStartPos.value = pos.clientX;
      lastMovePos.value = pos.clientX;
    }

    lastMoveTime.value = Date.now();
    emit("dragStart");

    // 添加全局事件监听
    document.addEventListener("mousemove", handleDragMove, { passive: false });
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDragMove, { passive: false });
    document.addEventListener("touchend", handleDragEnd);
  }

  function handleDragMove(e: MouseEvent | TouchEvent) {
    if (!isDragging.value)
      return;

    e.preventDefault();

    const pos = "touches" in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
    if (!pos)
      return;
    const currentPos = isVertical.value ? pos.clientY : pos.clientX;
    const currentTime = Date.now();

    // 计算偏移
    let offset = currentPos - dragStartPos.value;

    // 限制拖拽方向
    // 如果支持扩展，则不做方向限制（在 drawStyle 中处理逻辑）
    // 如果不支持扩展，则限制只能向关闭方向拖拽
    if (!expandable.value) {
      switch (direction.value) {
        case "bottom":
          offset = Math.max(0, offset);
          break;
        case "top":
          offset = Math.min(0, offset);
          break;
        case "left":
          offset = Math.min(0, offset);
          break;
        case "right":
          offset = Math.max(0, offset);
          break;
      }
    }
    else if (isExpanded.value) {
      // 展开状态下，增加阻尼效果防止过度拖拽（如果是继续往展开方向拖）
      let isOverExpanding = false;
      switch (direction.value) {
        case "bottom":
          if (offset < 0)
            isOverExpanding = true;
          break;
        case "top":
          if (offset > 0)
            isOverExpanding = true;
          break;
        case "left":
          if (offset > 0)
            isOverExpanding = true;
          break;
        case "right":
          if (offset < 0)
            isOverExpanding = true;
          break;
      }
      if (isOverExpanding) {
        offset = offset * 0.2;
      }
    }

    // 添加全局阻尼效果
    const damping = 0.7;
    dragOffset.value = offset * damping;

    // 计算速度
    const timeDiff = currentTime - lastMoveTime.value;
    if (timeDiff > 0) {
      velocity.value = (currentPos - lastMovePos.value) / timeDiff;
    }

    lastMovePos.value = currentPos;
    lastMoveTime.value = currentTime;

    emit("dragMove", dragOffset.value);
  }

  function handleDragEnd() {
    if (!isDragging.value)
      return;

    isDragging.value = false;

    // 移除全局事件监听
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDragMove);
    document.removeEventListener("touchend", handleDragEnd);

    const v = velocity.value;
    const offset = dragOffset.value;

    // 判断是否应该关闭
    const shouldClose = Math.abs(offset) > closeThreshold.value || Math.abs(v) > 0.5;

    if (expandable.value) {
      let isClosingDir = false;
      let isExpandingDir = false;

      // 判断拖拽方向意图
      switch (direction.value) {
        case "bottom":
          if (offset > 0)
            isClosingDir = true;
          else if (offset < 0)
            isExpandingDir = true;
          break;
        case "top":
          if (offset < 0)
            isClosingDir = true;
          else if (offset > 0)
            isExpandingDir = true;
          break;
        case "left":
          if (offset < 0)
            isClosingDir = true;
          else if (offset > 0)
            isExpandingDir = true;
          break;
        case "right":
          if (offset > 0)
            isClosingDir = true;
          else if (offset < 0)
            isExpandingDir = true;
          break;
      }

      if (isExpanded.value) {
        // 展开状态下
        if (isClosingDir) {
          // 向关闭方向拖拽 -> 恢复 Normal 状态
          // 阈值判断：移动超过阈值，或者速度够快
          if (Math.abs(offset) > expandThreshold.value || Math.abs(v) > 0.5) {
            isExpanded.value = false;
          }
        }
      }
      else {
        // Normal 状态下
        if (isExpandingDir) {
          // 向展开方向拖拽 -> 切换到 Expanded
          if (Math.abs(offset) > expandThreshold.value || Math.abs(v) > 0.5) {
            isExpanded.value = true;
          }
        }
        else if (shouldClose && isClosingDir) {
          // 向关闭方向拖拽 -> 关闭抽屉
          modelValue.value = false;
        }
      }
    }
    else {
      // 原有逻辑
      if (shouldClose) {
        modelValue.value = false;
      }
    }

    // 重置状态
    dragOffset.value = 0;
    velocity.value = 0;

    // 开启恢复动画状态
    isRestoring.value = true;
    setTimeout(() => {
      isRestoring.value = false;
    }, duration.value);

    emit("dragEnd");
  }

  function handleToggleExpand() {
    if (!expandable.value)
      return;

    // 记录尺寸以便动画
    if (drawerRef.value) {
      if (!isExpanded.value) {
        // 当前是 Normal，即将变为 Expanded，记录 Normal 尺寸
        normalSize.value = isVertical.value
          ? drawerRef.value.offsetHeight
          : drawerRef.value.offsetWidth;
      }
    }

    isExpanded.value = !isExpanded.value;

    // 开启恢复动画状态
    isRestoring.value = true;
    setTimeout(() => {
      isRestoring.value = false;
    }, duration.value);
  }

  // ==================== 事件处理 ====================
  function handleClose() {
    if (closeOnClickModal.value) {
      modelValue.value = false;
    }
  }

  function handleEscClose(e: KeyboardEvent) {
    if (closeOnPressEscape.value && modelValue.value && e.key === "Escape") {
      e.stopImmediatePropagation();
      e.preventDefault();
      modelValue.value = false;
    }
  }

  // ==================== 过渡钩子 ====================
  function onBeforeEnter() {
    emit("open");
    isAnimating.value = true;
    applyBodyLock();
  }

  function onAfterEnter() {
    emit("opened");
    isAnimating.value = false;
  }

  function onBeforeLeave() {
    emit("close");
    isAnimating.value = true;
  }

  function onAfterLeave() {
    emit("closed");
    isAnimating.value = false;
    removeBodyLock();

    if (destroyOnClose.value) {
      shouldRender.value = false;
    }
  }

  // ==================== 生命周期 ====================
  onMounted(() => {
    if (closeOnPressEscape.value) {
      window.addEventListener("keydown", handleEscClose);
    }
  });

  onBeforeUnmount(() => {
    if (closeOnPressEscape.value) {
      window.removeEventListener("keydown", handleEscClose);
    }
    // 清理拖拽事件监听
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDragMove);
    document.removeEventListener("touchend", handleDragEnd);

    // 清理背景联动效果
    if (lockTargetElement) {
      removeBodyLock();
    }
  });

  return {
    isOpen,
    shouldRender,
    isAnimating,
    isExpanded,
    isDragging,
    drawerStyle,
    overlayStyle,
    handleDragStart,
    handleToggleExpand,
    handleClose,
    handleEscClose,
    onBeforeEnter,
    onAfterEnter,
    onBeforeLeave,
    onAfterLeave,
    // Returned defaults for template usage
    direction,
    showHandle,
    title: computed(() => props.title),
    teleportTo,
    customClass,
    duration,
    isHorizontal,
    isVertical,
  };
}
