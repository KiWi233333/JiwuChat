<script setup lang="ts">
interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();

const setting = useSettingStore();
// 通知设置
const notificationTypeList = computed(() => (setting.isMobile || setting.isWeb)
  ? [
      {
        label: "系统",
        value: NotificationEnums.SYSTEM,
      },
      {
        label: "关闭",
        value: NotificationEnums.CLOSE,
      },
    ]
  : [
      {
        label: "托盘",
        value: NotificationEnums.TRAY,
      },
      {
        label: "系统",
        value: NotificationEnums.SYSTEM,
      },
      {
        label: "关闭",
        value: NotificationEnums.CLOSE,
      },
    ],
);
</script>

<template>
  <div class="setting-group">
    <label class="title">通知与铃声</label>
    <div id="notification" class="box">
      <!-- 消息通知 -->
      <div class="setting-item">
        消息通知
        <el-segmented
          v-model="setting.settingPage.notificationType"
          class="inputs border-default"
          :size="size"
          style="background-color: transparent;--el-segmented-item-selected-color: #fff;--el-border-radius-base: 2rem;"
          :options="notificationTypeList"
        />
      </div>
      <!-- 通话铃声 -->
      <SettingBell />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";
:deep(.el-segmented) {
  height: 1.8rem;
  min-height: 1.8rem;
  line-height: 1.8rem;
  // --el-segmented-padding: 2px;
  .el-segmented__item-label {
    font-size: 0.86rem;
  }
}
</style>
