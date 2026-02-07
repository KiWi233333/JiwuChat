<script lang="ts">
import type { RouteLocationRaw } from "vue-router";

export interface PageHeaderProps {
  /** 页面标题 */
  title: string
  /** 副标题/描述 */
  description?: string
  /** 主图标类名 (UnoCSS icon) */
  icon?: string
  /** 返回跳转目标（如有则覆盖 router.back） */
  backTarget?: string | RouteLocationRaw
  /** 是否显示返回按钮（移动端） */
  showBackButton?: boolean
}
</script>

<script setup lang="ts">
const {
  title,
  description,
  icon,
  backTarget,
  showBackButton = true,
} = defineProps<PageHeaderProps>();

const router = useRouter();
const setting = useSettingStore();

const slots = useSlots();

/** 处理移动端返回 */
function handleBack() {
  if (setting.isMobileSize && showBackButton) {
    if (backTarget) {
      navigateTo(backTarget);
    }
    else {
      router.back();
    }
  }
}

/** 是否有右侧内容（actions 插槽或 badge 插槽） */
const hasRightContent = computed(() => slots.actions || slots.badge);

/** 是否为复杂布局（有副标题或右侧内容） */
const isComplexLayout = computed(() => description || hasRightContent.value);
</script>

<template>
  <!-- 复杂布局：有副标题或右侧操作按钮 -->
  <div
    v-if="isComplexLayout"
    class="flex select-none items-end"
  >
    <div class="flex-1">
      <h3
        class="flex items-center text-base font-500"
        :class="[
          showBackButton && setting.isMobileSize ? 'cursor-pointer' : '',
        ]"
        @click="handleBack"
      >
        <!-- 返回按钮（仅移动端） -->
        <i
          v-if="setting.isMobileSize && showBackButton"
          i-solar:alt-arrow-left-line-duotone
          mr-2
          inline-block
          p-2.5
          text-secondary
        />

        <!-- 主图标 -->
        <i
          v-else-if="icon"
          :class="icon"
          mr-2
          inline-block
          p-2.5
          text-secondary
        />

        <!-- 标题 -->
        {{ title }}

        <!-- Badge 插槽（标题右侧） -->
        <slot name="badge" />
      </h3>

      <!-- 副标题 -->
      <p v-if="description" class="mt-1 text-mini">
        {{ description }}
      </p>
    </div>

    <!-- 右侧操作按钮插槽 -->
    <div v-if="slots.actions" class="ml-a flex items-center gap-2 sm:gap-3">
      <slot name="actions" />
    </div>
  </div>

  <!-- 简单布局：单行标题 -->
  <h3
    v-else
    flex
    cursor-pointer
    items-center
    text-base
    font-500
    sm:cursor-default
    @click="handleBack"
  >
    <!-- 返回按钮（仅移动端） -->
    <i
      v-if="setting.isMobileSize && showBackButton"
      i-solar:alt-arrow-left-line-duotone
      mr-2
      inline-block
      p-2.5
      text-secondary
    />

    <!-- 主图标 -->
    <i
      v-else-if="icon"
      :class="icon"
      mr-2
      inline-block
      p-2.5
      text-secondary
    />

    <!-- 标题 -->
    {{ title }}

    <!-- Badge 插槽（标题右侧） -->
    <slot name="badge" />
  </h3>
</template>
