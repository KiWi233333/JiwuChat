<script setup lang="ts">
interface Props {
  size?: "small" | "default" | "large"
}

defineProps<Props>();

const setting = useSettingStore();
const audioDeviceManager = useAudioDeviceManager();
const microphoneTest = useMicrophoneTest();

// 设备选择选项
const deviceSelectOptions = computed(() =>
  audioDeviceManager.deviceOptions.value.map(device => ({
    label: device.label,
    value: device.deviceId,
  })),
);

// 权限状态显示
const permissionStatusText = computed(() => {
  if (audioDeviceManager.permissionStatus.value.granted) {
    return "已授权";
  }
  else if (audioDeviceManager.permissionStatus.value.denied) {
    return "已拒绝";
  }
  else {
    return "未授权";
  }
});

const permissionStatusType = computed(() => {
  if (audioDeviceManager.permissionStatus.value.granted) {
    return "success";
  }
  else if (audioDeviceManager.permissionStatus.value.denied) {
    return "danger";
  }
  else {
    return "warning";
  }
});

// 处理权限请求
async function handleRequestPermission() {
  const granted = await audioDeviceManager.requestMicrophonePermission();
  if (granted) {
    ElMessage.success("麦克风权限获取成功，设备列表已更新");
  }
}

// 处理设备选择
function handleDeviceChange(deviceId: string) {
  audioDeviceManager.selectAudioDevice(deviceId);
}

// 处理麦克风测试
async function handleTestMicrophone() {
  await microphoneTest.toggleTest(audioDeviceManager.selectedDevice.value);
}

// 处理自动检测设备设置
function handleAutoDetectChange(value: boolean) {
  setting.settingPage.audioDevice.autoDetectDevice = value;
  if (value) {
    ElMessage.success("已开启自动检测新设备");
  }
  else {
    ElMessage.info("已关闭自动检测新设备");
  }
}
</script>

<template>
  <div class="setting-group">
    <label class="title">音频设备</label>
    <!-- 权限状态 -->
    <div id="microphone-permission" class="box">
      <div class="setting-item">
        <div class="flex items-center gap-2">
          <span>麦克风权限</span>
          <span class="tip mx-2 border-default rounded-8 px-2 py-0.2em text-mini">
            {{ permissionStatusText }}
          </span>
        </div>
        <el-button
          v-if="!audioDeviceManager.hasPermission.value"
          type="primary"
          size="small"
          @click="handleRequestPermission"
        >
          申请权限
        </el-button>
        <div v-else class="text-color-3 flex items-center gap-2 text-xs">
          <i class="i-solar:check-circle-bold text-green-500" />
          权限已获取
        </div>
      </div>
    </div>

    <!-- 设备选择 -->
    <label class="title">设备选择</label>
    <div id="microphone-device" class="box">
      <div class="setting-item">
        默认麦克风
        <el-select
          :model-value="audioDeviceManager.selectedDevice.value"
          :size="size"
          :disabled="!audioDeviceManager.hasPermission.value || audioDeviceManager.isLoading.value"
          class="inputs ml-a"
          style="width: 11.5rem; max-width: 60%;"
          placeholder="选择麦克风设备"
          :teleported="false"
          placement="bottom"
          :show-arrow="false"
          fit-input-width
          allow-create
          filterable
          default-first-option
          @change="handleDeviceChange"
        >
          <el-option
            v-for="option in deviceSelectOptions"
            :key="option.value"
            class="flex items-center truncate px-2 !text-0.76rem"
            :title="`${option.label} - ${option.value}`"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-button
          :size="size"
          class="ml-2 !border-default-hover"

          style="padding: 0;"


          title="重新获取音频设备"
          :disabled="!audioDeviceManager.hasPermission.value || audioDeviceManager.isLoading.value"
          text bg circle plain
          @click="audioDeviceManager.refreshDevices"
        >
          <i class="i-solar:refresh-bold" :class="{ 'animate-spin': audioDeviceManager.isLoading.value }" />
        </el-button>
      </div>

      <!-- 设备测试 -->
      <div class="setting-item">
        麦克风测试
        <div class="ml-a flex items-center gap-2">
          <!-- 音轨显示 -->
          <CommonAudioWaveform
            v-if="microphoneTest.isTesting.value"
            :audio-data="microphoneTest.audioLevel.value"
            :width="60"
            :height="20"
            :bars="18"
            type="bars"
            :is-active="microphoneTest.isTesting.value && microphoneTest.audioLevel.value.level > 5"
            color="var(--el-color-primary)"
          />

          <el-button
            :size="size"

            class="ml-2 h-7 !border-default-hover"

            text plain round
            :loading="false"
            :disabled="!audioDeviceManager.hasPermission.value || audioDeviceManager.selectedDevice.value === ''"
            @click="handleTestMicrophone"
          >
            <template #icon>
              <i
                class="transition-colors duration-200"
                :class="microphoneTest.isTesting.value
                  ? 'i-solar:stop-bold text-red-500'
                  : 'i-solar:microphone-3-bold'"
              />
            </template>
            {{ microphoneTest.isTesting.value ? '停止测试' : '测试麦克风' }}
            &nbsp;
          </el-button>
        </div>
        <el-tooltip content="重置为系统默认麦克风" placement="top">
          <el-button
            :size="size"
            round
            class="ml-2 h-7 w-22 !border-default-hover"
            text
            plain
            :disabled="!audioDeviceManager.hasPermission.value"
            @click="audioDeviceManager.resetToDefault"
          >
            <template #icon>
              <i class="i-solar:refresh-square-bold" />
            </template>
            重置
          </el-button>
        </el-tooltip>
      </div>

      <!-- 自动检测新设备 -->
      <div class="setting-item">
        <div class="flex flex-col items-start gap-1">
          <span>自动检测新设备</span>
        </div>
        <el-switch
          :model-value="setting.settingPage.audioDevice.autoDetectDevice"
          :size="size"
          :active-value="true"
          :inactive-value="false"
          @change="(val: string | number | boolean) => handleAutoDetectChange(val as boolean)"
        />
      </div>
    </div>

    <!-- 设备列表信息 -->
    <!-- <div v-if="audioDeviceManager.hasPermission.value && audioDeviceManager.audioDevices.value.length > 0" class="box">
      <div class="setting-item flex-col items-start !h-auto">
        <div class="mb-2 flex items-center gap-2">
          <span class="font-medium">检测到的音频设备</span>
          <el-tag size="small">
            {{ audioDeviceManager.audioDevices.value.length }} 个
          </el-tag>
        </div>

        <div class="w-full space-y-2">
          <div
            v-for="device in audioDeviceManager.audioDevices.value"
            :key="device.deviceId"
            class="flex items-center justify-between border border-default-2 rounded-lg bg-color-2 p-2"
          >
            <div class="flex items-center gap-3">
              <i
                class="text-lg"
                :class="device.deviceId === audioDeviceManager.selectedDevice.value
                  ? 'i-solar:microphone-3-bold text-primary'
                  : 'i-solar:microphone-3-line-duotone text-color-3'"
              />
              <div class="flex flex-col">
                <span class="text-sm font-medium">
                  {{ device.label || `麦克风 ${device.deviceId.slice(0, 8)}` }}
                </span>
                <span class="text-color-3 text-xs">
                  ID: {{ device.deviceId.slice(0, 20) }}{{ device.deviceId.length > 20 ? '...' : '' }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <el-tag
                v-if="device.deviceId === audioDeviceManager.selectedDevice.value"
                type="success"
                size="small"
              >
                当前选中
              </el-tag>
              <el-tag
                v-else-if="device.deviceId === 'default'"
                type="info"
                size="small"
              >
                系统默认
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div> -->

    <!-- 提示信息 -->
    <!-- <div v-if="!audioDeviceManager.hasPermission.value" class="box">
      <div class="setting-item flex-col items-start !h-auto">
        <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <i class="i-solar:info-circle-bold" />
          <span class="font-medium">需要麦克风权限</span>
        </div>
        <p class="text-color-3 mt-2 text-sm leading-relaxed">
          为了管理和使用麦克风设备，需要获取麦克风访问权限。点击"申请权限"按钮来获取权限，然后就可以选择和测试不同的麦克风设备了。
        </p>
      </div>
    </div> -->
  </div>
</template>

<style scoped lang="scss">
@use "./setting.g.scss";

:deep(.el-select.inputs) {
  position: relative;
  z-index: 99;
  width: fit-content;

  .el-select__wrapper {
    border-radius: 2rem;
    background-color: transparent;
    box-shadow: none;
    font-size: 0.76rem;
    padding-top: 0;
    padding-bottom: 0;
    height: fit-content;
    --at-apply: "!border-default";
  }
}
</style>
