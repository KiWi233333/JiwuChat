<script lang="ts" setup>
const setting = useSettingStore();
</script>

<template>
  <main class="main relative flex flex-col !overflow-hidden">
    <!-- 头部 extend 扩展模版（仅结构，无 ws/chat 等逻辑） -->
    <MenuHeaderMenuBarDesktop
      nav-class="relative z-999 left-0 w-full top-0 ml-a h-3.5rem w-full flex flex-shrink-0 select-none items-center justify-right gap-4 rounded-b-0 px-3 sm:(absolute right-0 top-0 p-1 ml-a h-3.125rem h-fit border-b-0 !bg-transparent) border-default-b bg-color"
      :data-tauri-drag-region="setting.isDesktop"
    >
      <template #center="{ appTitle }">
        <div v-if="setting.isMobile" class="absolute-center-center block tracking-0.1em">
          {{ appTitle }}
        </div>
      </template>
    </MenuHeaderMenuBarDesktop>
    <!-- 桌面端拖拽区域 -->
    <div v-if="setting.isDesktop" :data-tauri-drag-region="setting.isDesktop" class="fixed left-0 top-0 z-9 block h-8 w-full select-none" />

    <div class="relative h-1 max-h-full flex flex-1">
      <slot />
    </div>
  </main>
</template>

<style lang="scss" scoped>
</style>
