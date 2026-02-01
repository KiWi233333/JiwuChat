<script setup lang="ts">
interface Props {
  show?: boolean;
  size?: "small" | "default" | "large";
}

const { show = false, size = "default" } = defineProps<Props>();
const emit = defineEmits(["update:show"]);
const setting = useSettingStore();

const _show = computed({
  get: () => show,
  set: value => emit("update:show", value),
});
</script>

<template>
  <!-- 定制化动画设置弹窗 -->
  <CommonPopup
    v-model="_show"
    title="动画配置"
    :center="true"
    :close-on-click-modal="true"
    :show-close="true"
    :duration="300"
    destroy-on-close
    content-class="select-none rounded-3 p-4 w-fit border-default-2 bg-color-2"
  >
    <div class="max-w-80vw w-20rem text-left">
      <!-- 页面动画设置 -->
      <div class="setting-group">
        <p class="title">
          页面动画
        </p>
        <div class="box">
          <div class="setting-item">
            <div class="setting-label" title="移动端页面切换动画">
              页面切换
              <span class="tip border-default rounded-8 px-2 py-0.2em text-mini">移动端</span>
            </div>
            <el-switch
              v-model="setting.settingPage.animation.pageTransition"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
            />
          </div>
        </div>
      </div>

      <!-- 主题切换动画设置 -->
      <div class="setting-group">
        <p class="title">
          主题动画
        </p>
        <div class="box">
          <div class="setting-item">
            <span class="setting-label">主题切换</span>
            <el-switch
              v-model="setting.settingPage.animation.themeTransition"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
            />
          </div>
        </div>
      </div>
      <!-- 组件动画设置 -->
      <div class="setting-group">
        <p class="title">
          组件动画
        </p>
        <div class="box">
          <div class="setting-item">
            <div class="setting-label" title="启用GPU硬件加速以提升动画性能">
              硬件加速
              <span class="tip border-default rounded-8 px-2 py-0.2em text-mini">GPU</span>
            </div>
            <el-switch
              v-model="setting.settingPage.animation.hardwareAcceleration"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
            />
          </div>

          <!-- 消息滚动动画 -->
          <div class="setting-item">
            <span class="setting-label">消息滚动</span>
            <el-switch
              v-model="setting.settingPage.animation.msgListScrollBottomAnimate"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
            />
          </div>

          <div class="setting-item">
            <span class="setting-label" title="骨架屏加载动画">消息列表动画
              <span class="tip border-default rounded-8 px-2 py-0.2em text-mini">骨架屏</span>
            </span>
            <el-switch
              v-model="setting.settingPage.animation.msgListSkeleton"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
            />
          </div>

          <div class="setting-item">
            <span class="setting-label">列表过渡</span>
            <el-switch
              v-model="setting.settingPage.animation.listTransition"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
              disabled
            />
          </div>

          <div class="setting-item">
            <span class="setting-label">弹窗进入</span>
            <el-switch
              v-model="setting.settingPage.animation.dialogTransition"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
              disabled
            />
          </div>

          <div class="setting-item">
            <span class="setting-label">消息气泡</span>
            <el-switch
              v-model="setting.settingPage.animation.messageTransition"
              class="transition-opacity hover:op-80"
              :size="size"
              inline-prompt
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  </CommonPopup>
</template>

<style lang="scss" scoped>
.title {
  --at-apply: "text-sm block px-3 tracking-0.1em mt-4 mb-2 sm:(px-4 mt-4 mb-2) ";
}
.setting-group {
  .title {
    --at-apply: "text-sm block px-3 tracking-0.1em mt-4 mb-2 sm:(px-4 mt-4 mb-2)";
  }
  .setting-label {
    --at-apply: "text-sm";
  }
  .box {
    border: 1px solid transparent;
    --at-apply: "text-sm card-rounded-df bg-white dark:bg-dark-6 shadow-sm px-3 sm:px-4 py-2 flex flex-col gap-3";

    .inputs {
      --at-apply: "w-10rem sm:w-12rem";
    }
    .setting-item {
      --at-apply: "h-8 text-sm flex-row-bt-c";
    }
  }
}
</style>
