<script lang="ts" setup>
const {
  size = "default",
} = defineProps<{
  size?: "default" | "small" | "mini" | "" | any
}>();
const setting = useSettingStore();
</script>

<template>
  <div v-if="setting.isDesktop" class="group h-8 flex-row-bt-c">
    开机自启
    <el-switch
      v-model="setting.settingPage.isAutoStart"
      class="transition-opacity hover:op-80"
      :size="size"
      inline-prompt
    />
  </div>
</template>
