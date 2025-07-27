<script setup lang="ts">
// 导入主题自定义功能
import { useThemeCustomization } from "~/composables/hooks/useThemeCustomization";

interface Props {
  show?: boolean;
  size?: "small" | "default" | "large";
}

const { show = false, size = "default" } = defineProps<Props>();
const emit = defineEmits(["update:show"]);

const _show = computed({
  get: () => show,
  set: value => emit("update:show", value),
});

// 使用主题自定义功能
const {
  apply,
  getCurrentThemeConfig,
  presetThemes,
  storyThemes,
} = useThemeCustomization();

const { open: openFileDialog, onChange } = useFileDialog({
  accept: ".json",
  multiple: false,
});

// 监听文件选择变化
onChange((selectedFiles) => {
  if (selectedFiles?.[0]) {
    importThemeConfig(selectedFiles[0] as File);
  }
});

// 当前主题配置
const currentThemeConfig = ref<ThemeConfig>(JSON.parse(JSON.stringify(getCurrentThemeConfig.value)));

// 原始主题配置 - 用于取消时恢复
const originalThemeConfig = ref<ThemeConfig>(JSON.parse(JSON.stringify(getCurrentThemeConfig.value)));

// 当前选中的主题
const selectedTheme = computed(() => currentThemeConfig.value?.key);

// 记录初始颜色配置，用于检测手动修改
const initialColors = ref<any>(null);

// 颜色配置选项
const colorOptions = [
  { key: "primary" as const, label: "主色调" },
  { key: "success" as const, label: "成功色" },
  { key: "warning" as const, label: "警告色" },
  { key: "danger" as const, label: "危险色" },
  { key: "error" as const, label: "错误色" },
  { key: "info" as const, label: "信息色" },
];

// 是否有未保存的更改
const hasUnsavedChanges = computed(() => JSON.stringify(currentThemeConfig.value) !== JSON.stringify(originalThemeConfig.value));

// 处理颜色变化的通用函数
function handleColorChange(colorKey: keyof ThemeConfig["colors"], value: string | null) {
  if (!value)
    return;

  const colorConfig = currentThemeConfig.value.colors[colorKey];
  if (colorConfig) {
    colorConfig.base = value;
    colorConfig.light = value;
    colorConfig.dark = value;
  }
}

// 监听颜色配置变化，检测手动修改
watch(() => currentThemeConfig.value.colors, (newColors: any, oldColors: any) => {
  if (initialColors.value && oldColors) {
    // 检查是否有颜色被手动修改
    const isManuallyModified = Object.keys(newColors).some(colorKey =>
      (newColors[colorKey]?.base as string) !== initialColors.value[colorKey]?.base,
    );
    // 如果检测到手动修改，将 key 设为空，标识为自定义配色
    if (isManuallyModified && currentThemeConfig.value.key) {
      currentThemeConfig.value.key = "";
    }
    // 如果在预览模式下，更新预览主题
    apply(currentThemeConfig.value);
  }
}, { deep: true });

// 初始化时获取当前配置
onMounted(() => {
  const current = getCurrentThemeConfig.value;
  if (current) {
    currentThemeConfig.value = JSON.parse(JSON.stringify(current));
    originalThemeConfig.value = JSON.parse(JSON.stringify(current));
    // 记录初始颜色配置
    initialColors.value = JSON.parse(JSON.stringify(current.colors));
  }
});

// 监听弹窗关闭，如果有未保存的更改则提示
watch(_show, (newShow, oldShow) => {
  if (!newShow && oldShow) {
    // 弹窗关闭时处理预览模式和未保存更改
    apply(originalThemeConfig.value);

    if (hasUnsavedChanges.value) {
      // 恢复原始配置（不应用）
      currentThemeConfig.value = JSON.parse(JSON.stringify(originalThemeConfig.value));
      ElMessage.info("已取消主题更改");
    }
  }
});

// 选择预设主题
function selectPresetTheme(theme: ThemeConfig) {
  currentThemeConfig.value = {
    ...currentThemeConfig.value,
    colors: { ...theme.colors },
    key: theme.key,
    name: theme.name,
    preview: theme.preview,
  };
  // 更新初始颜色配置为当前选择的预设主题
  initialColors.value = JSON.parse(JSON.stringify(theme.colors));
}

// 重置为默认主题
function resetToDefault() {
  const defaultConfig = presetThemes.value[0]; // 获取默认主题
  if (defaultConfig) {
    currentThemeConfig.value = JSON.parse(JSON.stringify(defaultConfig));
    initialColors.value = JSON.parse(JSON.stringify(defaultConfig.colors));
    ElMessage.success("已重置为默认主题");
  }
}

// 应用主题
function applyTheme() {
  apply(currentThemeConfig.value);
  // 更新原始配置为当前配置
  originalThemeConfig.value = JSON.parse(JSON.stringify(currentThemeConfig.value));
  _show.value = false;
  ElMessage.success("主题已应用");
}

// 导出主题配置
function exportThemeConfig() {
  const config = {
    selectedTheme: selectedTheme.value,
    themeConfig: currentThemeConfig.value,
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  downloadFileByStreamSaver(url, `jiwu-theme-config.json`, (val) => {
    // URL.revokeObjectURL(url);
    if (val === 1)
      ElMessage.success("主题配置已导出");
  });
}

// 导入主题配置
function importThemeConfig(file: File) {
  if (!file)
    return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target?.result as string);

      if (config.themeConfig) {
        currentThemeConfig.value = {
          ...currentThemeConfig.value,
          ...config.themeConfig,
        };
        // 更新初始颜色配置
        initialColors.value = JSON.parse(JSON.stringify(currentThemeConfig.value.colors));
        ElMessage.success("主题配置已导入");
      }
      else {
        ElMessage.error("无效的主题配置文件");
      }
    }
    catch (error) {
      console.error("导入主题配置失败:", error);
      ElMessage.error("导入失败，请检查文件格式");
    }
  };
  reader.readAsText(file);
}
</script>

<template>
  <!-- 主题配置弹窗 -->
  <DialogPopup
    v-model="_show"
    title="主题定制"
    :center="true"
    :close-on-click-modal="true"
    :show-close="true"
    :duration="300"
    :z-index="999"
    destroy-on-close
    content-class="select-none rounded-3 p-4 w-fit border-default-2 bg-color-2"
  >
    <el-scrollbar max-height="60vh" wrap-class="max-w-86vw w-30rem text-left p-1">
      <!-- 预设主题区域 -->
      <div class="setting-group">
        <p class="title">
          <i class="i-solar:palette-round-bold-duotone mr-2 p-2.6" />
          预设主题
          <span class="tip">更多色彩活力，定制你的主题</span>
        </p>
        <div class="theme-grid">
          <div
            v-for="theme in presetThemes"
            :key="theme.key"
            class="theme-card"
            :class="{ active: selectedTheme === theme.key }"
            @click="selectPresetTheme(theme)"
          >
            <div
              class="theme-preview"
              :style="{ background: theme.preview }"
            />
            <span class="theme-name">{{ theme.name }}</span>
          </div>
        </div>
      </div>

      <!-- 故事美学主题 -->
      <div class="setting-group">
        <p class="title">
          <i class="i-solar:magic-stick-3-bold-duotone mr-2 p-2.6" />
          故事美学
          <span class="tip">处处皆之美，细致如复雅</span>
        </p>
        <div class="theme-grid">
          <div
            v-for="theme in storyThemes"
            :key="theme.key"
            class="theme-card"
            :class="{ active: selectedTheme === theme.key }"
            @click="selectPresetTheme(theme)"
          >
            <div
              class="theme-preview"
              :style="{ background: theme.preview }"
            />
            <span class="theme-name">{{ theme.name }}</span>
          </div>
        </div>
      </div>      <!-- 自定义颜色配置 -->
      <div class="setting-group">
        <p class="title">
          <i class="i-solar:pallete-2-bold-duotone mr-2 p-2.6" />
          自定义配色
          <i v-if="!currentThemeConfig.key" class="i-solar:check-circle-bold ml-2 p-2.6 text-green" />
          <span v-if="hasUnsavedChanges" class="unsaved-indicator">
            <i class="i-solar:document-medicine-bold ml-2 p-2 text-orange" />
            <span class="tip text-orange-5">未保存</span>
          </span>
        </p>
        <div class="box">
          <div class="color-config-grid">
            <div
              v-for="colorOption in colorOptions"
              :key="colorOption.key"
              class="color-item"
            >
              <span class="color-label">{{ colorOption.label }}</span>              <el-color-picker
                :model-value="currentThemeConfig.colors[colorOption.key as keyof ThemeConfig['colors']].base"
                show-alpha
                color-format="hex"
                size="small"
                class="color-picker"
                @change="(val: string | null) => handleColorChange(colorOption.key, val)"
              />
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <!-- 操作按钮区域 -->
    <div class="actions-footer p-1">
      <div class="left-actions">
        <BtnElButton
          icon-class="i-solar:import-bold-duotone mr-1"
          text
          size="small"
          @click="openFileDialog()"
        >
          导入
        </BtnElButton>
        <BtnElButton
          icon-class="i-solar:export-bold-duotone mr-1"
          text
          size="small"
          @click="exportThemeConfig()"
        >
          导出
        </BtnElButton>
      </div><div class="right-actions">
        <BtnElButton
          text
          size="small"
          @click="resetToDefault"
        >
          重置
        </BtnElButton>
        <BtnElButton
          type="primary"
          icon-class="i-solar:paint-roller-bold-duotone mr-1"
          size="small"
          :disabled="!hasUnsavedChanges"
          @click="applyTheme"
        >
          应用主题
        </BtnElButton>
      </div>
    </div>
  </DialogPopup>
</template>

<style lang="scss" scoped>
.title {
  --at-apply: "text-sm flex items-center tracking-0.1em mb-4";

  .tip {
    --at-apply: "text-mini ml-2";
  }

  .unsaved-indicator {
    --at-apply: "flex items-center ml-auto";
  }
}

.setting-group {
  --at-apply: "p-4 bg-color rounded-2 shadow mb-4";

  .box {
    --at-apply: "flex gap-3";
  }
}

.theme-grid {
  --at-apply: "grid grid-cols-3 sm:grid-cols-5 gap-3";
}

.theme-card {
  --at-apply: "mx-a flex-row-c-c p-2 w-fit flex-col gap-2 rounded-2 cursor-pointer transition-all duration-200";
  border: 2px solid transparent;

  &.active {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
    --at-apply: "shadow";
  }

  &:hover {
    --at-apply: "shadow-sm";
  }
}

.theme-preview {
  --at-apply: "w-12 h-12 card-rounded-df border-default";
}

.theme-name {
  --at-apply: "text-xs text-center font-medium";
}

.color-config-grid {
  --at-apply: "grid w-full py-4 grid-cols-3 gap-4 justify-center";

  .color-item {
    --at-apply: "flex-row-c-c sm:gap-2 w-full";
  }

  .color-label {
    --at-apply: "text-sm flex-shrink-0 min-w-12";
  }

  .color-picker {
    --at-apply: "w-10 h-8 rounded border cursor-pointer";
    border: 1px solid var(--el-border-color);

    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    &::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }
  }

}

.actions-footer {
  --at-apply: "pt-4 flex justify-between items-center";
}

.left-actions,
.right-actions {
  --at-apply: "flex items-center gap-2";
}


:deep(.el-scrollbar__bar) {
  right: 1px;
  --at-apply: "!hidden sm:block";
  --el-scrollbar-bg-color: #9292928a;
  .el-scrollbar__thumb {
    width: 6px;
  }
}

:deep(.el-color-picker) {
  --at-apply: "p-0 shadow-sm card-rounded-df overflow-hidden";

    .el-color-picker__trigger {
    --at-apply: "p-0 border-none";
  }
  .el-color-picker__color {
    --at-apply: "p-0 border-none";
  }
}
</style>
