<script lang="ts" setup>
import type { IndexMenuType } from ".";
import { ElMenuItem, ElSubMenu } from "element-plus";

const { data } = defineProps<{
  data: IndexMenuType
}>();
</script>

<template>
  <component
    :is="data.children?.length ? ElSubMenu : ElMenuItem"
    :index="data?.url"
    :popper-offset="10"
  >
    <div flex-row-c-c>
      <!-- 无儿子 -->
      <i
        v-if="data.icon && !data.children?.length"
        class="transition-200"
        :class="data.icon"
        filter-drop-shadows p-0.8em
      />
      <img
        v-else-if="data.image && !data.children?.length"
        :src="BaseUrlImg + data.image"
        loading="lazy"
        :alt="data.title"
        class="h-2.4em w-2.4em card-default"
        fit="cover"
      >
    </div>
    <template #title>
      <div v-if="data.children?.length" flex-row-c-c>
        <i
          v-if="data.icon"
          class="transition-100"
          :class="data.icon"
          p-0.8em filter-drop-shadow
        />
        <img
          v-else-if="data.image"
          :src="BaseUrlImg + data.image"
          loading="lazy"
          :alt="data.title"
          class="h-2.4em w-2.4em card-default"
          fit="cover"
        >
      </div>
      <span class="flex-1 animate-[fade-in] overflow-hidden truncate text-center tracking-0.4em">{{ data.title }}</span>
    </template>

    <MenuLine
      v-for="child in data.children"
      :key="child.url"
      :data="child"
    />
  </component>
</template>
