<script setup lang="ts">
interface Props {
  show: boolean;
  size?: "small" | "default" | "large";
  shortcut?: ShortcutConfig | null;
}

interface Emits {
  (e: "update:show", value: boolean): void;
  (e: "save", data: ShortcutConfig): void;
  (e: "reset", shortcut: ShortcutConfig): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const setting = useSettingStore();
// 弹窗显示状态
const dialogVisible = computed({
  get: () => {
    if (props.show) {
      startRecording();
    }
    else {
      stopRecording();
    }
    return props.show;
  },
  set: (value: boolean) => {
    if (value) {
      startRecording();
    }
    else {
      stopRecording();
    }
    emit("update:show", value);
  },
});

// 表单数据
const form = ref<Omit<ShortcutConfig & { keyDisplay: string }, "condition">>({
  description: "",
  key: "",
  keyDisplay: "",
  category: "app",
  enabled: true,
  eventType: "",
});

// 录制状态
const isRecording = ref(false);
const errorMessage = ref("");

// 监听快捷键数据变化
watchEffect(() => {
  if (props.shortcut) {
    form.value = {
      description: props.shortcut.description || "",
      key: props.shortcut.key || "",
      keyDisplay: formatKeyDisplay(props.shortcut.key || ""),
      category: props.shortcut.category || "app",
      enabled: props.shortcut.enabled ?? true,
      eventType: props.shortcut.eventType || "",
    };
  }
  else {
    form.value = {
      description: "",
      key: "",
      keyDisplay: "",
      category: "app",
      enabled: true,
      eventType: "",
    };
  }
});


// 格式化快捷键显示
function formatKeyDisplay(key: string): string {
  return key.replace(/\+/g, " + ");
}

// 规范化快捷键
function normalizeKey(key: string): string {
  return key.split("+").map((part) => {
    const trimmed = part.trim().toLowerCase();
    if (["ctrl", "alt", "shift", "meta", "cmd"].includes(trimmed)) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }).join("+");
}

// 检查是否可以保存
const canSave = computed(() => {
  return form.value.description.trim()
    && form.value.key.trim()
    && !errorMessage.value;
});

// 切换录制状态
function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  }
  else {
    startRecording();
  }
}

// 开始录制快捷键
function startRecording() {
  isRecording.value = true;
  errorMessage.value = "";

  const recordingHandler = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 构建快捷键字符串
    const keys: string[] = [];

    if (e.ctrlKey)
      keys.push("Ctrl");
    if (e.altKey)
      keys.push("Alt");
    if (e.shiftKey)
      keys.push("Shift");
    if (e.metaKey)
      keys.push("Meta");

    // 获取主键
    let mainKey = e.key;
    if (mainKey === "Control" || mainKey === "Alt" || mainKey === "Shift" || mainKey === "Meta") {
      return; // 忽略单独的修饰键
    }

    // 特殊键处理
    const specialKeys: Record<string, string> = {
      " ": "Space",
      "ArrowUp": "ArrowUp",
      "ArrowDown": "ArrowDown",
      "ArrowLeft": "ArrowLeft",
      "ArrowRight": "ArrowRight",
      "Enter": "Enter",
      "Escape": "Escape",
      "Tab": "Tab",
      "Backspace": "Backspace",
      "Delete": "Delete",
    };

    if (specialKeys[mainKey]) {
      mainKey = specialKeys[mainKey]!;
    }

    keys.push(mainKey);

    const keyString = keys.join("+");
    const normalizedKey = normalizeKey(keyString);

    // 检查快捷键冲突
    if (props.shortcut && normalizedKey === props.shortcut.key) {
      // 如果是编辑模式且键值未变化，则不报错
      form.value.key = normalizedKey;
      form.value.keyDisplay = formatKeyDisplay(normalizedKey);
      errorMessage.value = "";
    }
    else {
      const hasConflict = setting.shortcutManager.hasConflict(normalizedKey, form.value.category, props.shortcut?.key);
      if (hasConflict) {
        errorMessage.value = `快捷键 "${formatKeyDisplay(normalizedKey)}" 已被使用`;
      }
      else {
        form.value.key = normalizedKey;
        form.value.keyDisplay = formatKeyDisplay(normalizedKey);
        errorMessage.value = "";
      }
    }

    stopRecording();
  };

  // 添加键盘事件监听
  window.addEventListener("keydown", recordingHandler, true);

  // 保存清理函数
  const cleanup = () => {
    window.removeEventListener("keydown", recordingHandler, true);
  };
  // 保存清理函数供停止录制时使用
  (window as any).__shortcutRecordingCleanup = cleanup;
}

// 停止录制快捷键
function stopRecording() {
  isRecording.value = false;

  // 清理事件监听
  if ((window as any).__shortcutRecordingCleanup) {
    (window as any).__shortcutRecordingCleanup();
    delete (window as any).__shortcutRecordingCleanup;
  }
}

// 处理保存
function handleSave() {
  if (!canSave.value)
    return;

  const saveData: ShortcutConfig = {
    key: form.value.key,
    description: form.value.description,
    category: form.value.category,
    enabled: form.value.enabled,
    disabledEdit: props.shortcut?.disabledEdit || false,
    eventType: form.value.eventType || props.shortcut?.eventType || "",
  };

  emit("save", saveData);
}

// 处理关闭
function handleClose() {
  stopRecording();
  emit("update:show", false);
}

// 组件卸载时清理
onUnmounted(() => {
  stopRecording();
});
</script>

<template>
  <CommonPopup
    v-model="dialogVisible"
    :close-on-click-modal="true"
    :show-close="false"
    :duration="300"
    title="编辑快捷键"
    center
    destroy-on-close
    content-class="shortcut-edit-dialog select-none rounded-3 p-4 sm:w-fit border-default-2 bg-color-2"
  >
    <div class="dialog-content">
      <div class="shortcut-info">
        <!-- 快捷键显示区域 -->
        <div class="shortcut-display-area">
          <div
            class="shortcut-display"
            :class="{
              recording: isRecording,
              empty: !form.keyDisplay && !isRecording,
              error: errorMessage,
            }"
            @click="toggleRecording"
          >
            <div v-if="isRecording" class="recording-indicator">
              <div class="recording-dot" />
              <span text-small text-theme-primary>请按下快捷键...</span>
            </div>
            <div v-else-if="form.keyDisplay" class="shortcut-keys">
              <span
                v-for="(key, index) in form.keyDisplay.split(' + ')"
                :key="index"
                class="key-item"
              >
                {{ key }}
              </span>
            </div>
            <div v-else class="empty-placeholder">
              <i class="el-icon-mouse" />
              <span>点击开始录制快捷键</span>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          <i class="el-icon-warning" />
          {{ errorMessage }}
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button
          class="w-2/5"
          @click="handleClose"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="!canSave"
          class="w-2/5"
          @click="handleSave"
        >
          保存
        </el-button>
      </div>
    </template>
  </CommonPopup>
</template>

<style scoped lang="scss">
.dialog-content {
  --at-apply: "w-16rem max-w-full sm:max-w-90vw";
}

.shortcut-info {
  --at-apply: "mb-5";

  .form-label {
    --at-apply: "block mb-3 font-medium text-regular";
  }

  .shortcut-display-area {
    .shortcut-display {
      --at-apply: "min-h-20 border-2 border-solid border-default rounded-2 p-4 flex items-center justify-center cursor-pointer transition-all duration-300 ease-in-out bg-blank mb-3";

      &:hover {
        --at-apply: "border-theme-primary bg-theme-primary-light-9";
      }

      &.recording {
        --at-apply: "border-theme-primary bg-theme-primary-light-9 animate-pulse";
      }

      &.empty {
        --at-apply: "border-dashed text-placeholder";
      }

      &.error {
        --at-apply: "border-theme-danger bg-theme-danger-light-9";
      }

      .recording-indicator {
        --at-apply: "flex items-center gap-2 text-theme-primary font-medium";

        .recording-dot {
          --at-apply: "w-2 h-2 rounded-full bg-theme-primary animate-pulse";
        }
      }

      .shortcut-keys {
        --at-apply: "flex items-center gap-2 flex-wrap";

        .key-item {
          --at-apply: "bg-theme-primary text-white py-1 px-3 rounded text-sm font-medium shadow-md min-w-6 text-center";
        }
      }

      .empty-placeholder {
        --at-apply: "flex flex-col items-center gap-2 text-placeholder";

        i {
          --at-apply: "text-2xl";
        }
      }
    }

    .action-buttons {
      --at-apply: "flex gap-2 justify-end";
    }
  }

  .error-message {
    --at-apply: "mt-2 py-2 px-3 bg-theme-danger-light-9 border border-solid border-theme-danger-light-5 rounded text-xs text-theme-danger flex items-center gap-1.5";

    i {
      --at-apply: "text-sm";
    }
  }
}

.dialog-footer {
  --at-apply: "flex-row-bt-c";
}
</style>
