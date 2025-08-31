<script lang="ts" setup>
const {
  isSelf = Math.random() > 0.5,
  animteClass = "sky-loading",
} = defineProps<{
  isSelf?: boolean;
  animteClass?: string;
}>();
/**
 * 静态骨架屏
 */
const randon = Math.random();
</script>

<template>
  <div
    class="msg"
    :class="{ self: isSelf }"
  >
    <!-- 头像 -->
    <div
      :class="animteClass"
      class="avatar h-2.4rem w-2.4rem flex-shrink-0 cursor-pointer rounded-1/2 object-cover !border-none !bg-color"
    />
    <!-- 消息体 -->
    <div
      class="body"
    >
      <!-- 昵称 -->
      <div class="nickname h-4 w-6em rounded bg-color" />
      <!-- 内容 -->
      <p
        :class="animteClass"
        class="msg-popper !bg-color !shadow-sm" :style="{ width: `${5 + Math.floor(randon * 10) * 2}em`, height: `${3 * Math.floor(randon * 5)}em` }"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "./msg.scss";
</style>
