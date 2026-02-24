<script setup lang="ts">
interface Props {
  size?: "small" | "default" | "large";
}

const { size = "small" } = defineProps<Props>();
const setting = useSettingStore();

// 修改快捷键弹窗状态
const showEditDialog = ref(false);
const editingShortcut = ref<ShortcutConfig | null>(null);

// 打开修改快捷键弹窗
function openEditDialog(shortcut: ShortcutConfig) {
  if (shortcut.disabledEdit)
    return;
  editingShortcut.value = shortcut;
  showEditDialog.value = true;
}

// 保存修改的快捷键
function saveShortcutEdit(shortcutData: ShortcutConfig) {
  // 只更新可编辑的字段，保留原有的 handler 和 condition
  const updates: Partial<ShortcutConfig> = {
    key: shortcutData.key,
    description: shortcutData.description,
    category: shortcutData.category,
    enabled: shortcutData.enabled,
  };

  // 只有当 disabledEdit 有值时才更新
  if (shortcutData.disabledEdit !== undefined) {
    updates.disabledEdit = shortcutData.disabledEdit;
  }

  // 找到原始快捷键进行更新
  const originalShortcut = editingShortcut.value;
  if (originalShortcut) {
    setting.shortcutManager.updateShortcut(originalShortcut.key, originalShortcut.category, updates);
  }
  showEditDialog.value = false;
}

// 切换快捷键启用状态
function toggleShortcut(key: string, category: ShortcutCategory, enabled: boolean) {
  setting.shortcutManager.toggleShortcut(key, category, enabled);
}

// 获取快捷键配置数组（直接使用数组）
const globalShortcutList = computed(() =>
  setting.shortcutManager.getShortcutsByCategory("app"),
);

const localShortcutList = computed(() =>
  setting.shortcutManager.getShortcutsByCategory("local"),
);
</script>

<template>
  <div class="group setting-group">
    <label class="title">全局快捷键</label>
    <div id="shortcuts-global" class="box">
      <!-- <label mt-3 op-80>
        全局快捷键
      </label> -->
      <div
        v-for="(shortcut, index) in globalShortcutList"
        :key="`global-${index}`"
        class="setting-item"
      >
        <div>{{ shortcut.description }}</div>
        <div class="shortcut-key">
          <span
            title="编辑快捷键"
            class="key-display"
            :class="{ 'cursor-not-allowed': shortcut.disabledEdit }"
            @click="openEditDialog(shortcut)"
          >
            <SettingKbd :shortcut="shortcut.key" />
          </span>
          <el-switch
            :model-value="shortcut.enabled"
            :size="size"
            inline-prompt
            @change="(val: string | number | boolean) => toggleShortcut(shortcut.key, shortcut.category, !!val)"
          />
        </div>
      </div>
    </div>

    <label class="title">
      消息快捷键
    </label>
    <div id="shortcuts-global" class="box">
      <div
        v-for="(shortcut, index) in localShortcutList"
        :key="`local-${index}`"
        class="setting-item"
      >
        <div>{{ shortcut.description }}</div>
        <div class="shortcut-key">
          <span
            title="编辑快捷键"
            class="key-display"
            :class="{ 'cursor-not-allowed': shortcut.disabledEdit }"
            @click="openEditDialog(shortcut)"
          >
            <SettingKbd :shortcut="shortcut.key" />
          </span>
          <el-switch
            :model-value="shortcut.enabled"
            :size="size"
            inline-prompt
            @change="(val: string | number | boolean) => toggleShortcut(shortcut.key, shortcut.category, !!val)"
          />
        </div>
      </div>
    </div>

    <!-- 修改快捷键弹窗 -->
    <SettingShortcutEditDialog
      v-model:show="showEditDialog"
      :size="size"
      :shortcut="editingShortcut"
      @save="saveShortcutEdit"
    />
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";
.shortcut-key {
  .key-display {
    --at-apply: "mx-2 cursor-pointer transition-200 hover:opacity-70";

    &.cursor-not-allowed {
      --at-apply: "cursor-not-allowed opacity-60";
    }
  }
}
</style>
