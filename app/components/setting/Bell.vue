<script lang="ts" setup>
import { DEFAULT_RTC_CALL_BELL_URL } from "~/composables/store/useSettingStore";

const setting = useSettingStore();

// 铃声
const {
  audioRaw,
  togglePlayRtcCallBell,
  toggleRtcCallBell,
} = useSettingBell();
</script>

<template>
  <div id="chat-bell" class="group h-8 flex-row-bt-c">
    通话铃声
    <div class="ml-a flex items-center gap-3 pr-4 text-0.9em" :title="setting.isDefaultRtcCallBell ? '默认铃声' : '自定义铃声'">
      <span
        v-if="!setting.isDefaultRtcCallBell"
        class="btn-warning cursor-pointer tracking-0.1em op-0 group-hover:op-100"
        @click="setting.settingPage.rtcCallBellUrl = DEFAULT_RTC_CALL_BELL_URL"
      >恢复默认</span>
      <div
        v-show="setting.settingPage.rtcCallBellUrl"
        class="flex-row-c-c cursor-pointer"
        :class="audioRaw ? 'text-[var(--el-color-danger)] hover:text-[var(--el-color-danger)]' : 'hover:text-[var(--el-color-info)] op-80'"
        @click="togglePlayRtcCallBell(setting.settingPage.rtcCallBellUrl)"
      >
        <i
          class="mr-2 p-2"
          :class="audioRaw ? 'i-solar:pause-bold' : 'i-solar:play-bold'"
        />
        {{ setting.isDefaultRtcCallBell ? '默认铃声' : '自定义铃声' }}
      </div>
      <span class="btn-warning cursor-pointer tracking-0.1em" @click="toggleRtcCallBell()">
        {{ setting.settingPage.rtcCallBellUrl ? '更改' : '添加' }}
      </span>
      <!-- 关闭 -->
      <span
        v-if="setting.settingPage.rtcCallBellUrl"
        class="btn-warning cursor-pointer tracking-0.1em" @click="setting.settingPage.rtcCallBellUrl = ''"
      >
        关闭
      </span>
    </div>
  </div>
</template>
