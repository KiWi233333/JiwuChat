<script lang="ts" setup>
import { EXTEND_PAGE_CONFIG, isExtendPageType } from "~/constants/extend";
import extendPage from "~/pages/extend/[type].vue";

const route = useRoute();
const type = route.query.type as string | undefined;
if (!type || !isExtendPageType(type)) {
  throw createError({ statusCode: 404, statusMessage: "Not found" });
}

const config = EXTEND_PAGE_CONFIG[type];
const pageTitle = config.title;
const pageDescription = config.description;
const pageIcon = config.icon ?? "i-ri:apps-2-line";
</script>

<template>
  <main class="internal-page w-full flex flex-1 flex-col bg-color-2 p-2 sm:bg-color">
    <!-- 移动端左上角可返回的标题 -->
    <div class="flex shrink-0 items-center px-3 pb-4 pt-2">
      <CommonPageHeader
        :title="pageTitle"
        :description="pageDescription"
        :icon="pageIcon"
      />
    </div>
    <!-- 扩展内容区域 -->
    <div class="min-h-0 flex flex-1 flex-col overflow-hidden rounded">
      <div class="internal-page__content min-h-0 flex flex-1 flex-col overflow-hidden rounded-b-sm">
        <extendPage :key="type" :type="type" />
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
