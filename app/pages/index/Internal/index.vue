<script lang="ts" setup>
import type { ExtendPageType } from "~/constants/extend";
import { EXTEND_PAGE_CONFIG, isExtendPageType } from "~/constants/extend";
import extendPage from "~/pages/extend/[type].vue";

const route = useRoute();
const type = computed(() => route.query.type as string | undefined);
const config = computed(() => EXTEND_PAGE_CONFIG[type.value as ExtendPageType] || undefined);
watch(type, (newVal) => {
  if (!newVal || !isExtendPageType(newVal)) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
});
</script>

<template>
  <main class="internal-page w-full flex flex-1 flex-col bg-color-2 p-2 sm:bg-color">
    <!-- 移动端左上角可返回的标题 -->
    <div class="flex shrink-0 items-center px-3 pb-4 pt-2">
      <CommonPageHeader
        :title="config.title"
        :description="config?.description"
        :icon="config.icon"
      />
    </div>
    <!-- 扩展内容区域 -->
    <div class="min-h-0 flex flex-1 flex-col overflow-hidden border-default-2 rounded">
      <div class="min-h-0 flex flex-1 flex-col overflow-hidden rounded-b-sm">
        <extendPage :key="type" :type="type" :show-loading="true" />
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.internal-page {
  --at-apply: "min-h-0";
  &__header {
    --at-apply: "bg-color sm:bg-transparent";
  }
  &__content {
    --at-apply: "min-h-20rem";
  }
}
</style>
