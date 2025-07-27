/**
 * 音频设备管理 Hook
 * 用于管理麦克风设备的枚举、选择和权限检查
 */

interface AudioDevicePermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export function useAudioDeviceManager() {
  const setting = useSettingStore();

  // 状态管理
  const isLoading = ref(false);
  const hasPermission = ref(false);
  const permissionStatus = ref<AudioDevicePermissionStatus>({
    granted: false,
    denied: false,
    prompt: true,
  });

  // 音频设备列表
  const audioDevices = computed(() => setting.settingPage.audioDevice.microphoneList);
  const selectedDevice = computed(() => setting.settingPage.audioDevice.defaultMicrophone);
  const lastSelectedDevice = computed(() => setting.settingPage.audioDevice.lastSelectedMicrophone);

  // 默认设备选项
  const deviceOptions = computed(() => [
    {
      deviceId: "default",
      label: "系统默认麦克风",
      groupId: "",
      kind: "audioinput" as MediaDeviceKind,
    },
    ...audioDevices.value.map(device => ({
      deviceId: device.deviceId,
      label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}`,
      groupId: device.groupId,
      kind: device.kind,
    })),
  ]);

  /**
   * 枚举音频输入设备
   */
  const enumerateAudioDevices = async (): Promise<MediaDeviceInfo[]> => {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        throw new Error("浏览器不支持设备枚举");
      }

      isLoading.value = true;

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(device => device.kind === "audioinput");

      // 更新设置中的设备列表
      setting.settingPage.audioDevice.microphoneList = audioInputDevices;
      return audioInputDevices;
    }
    catch (error) {
      console.error("枚举音频设备失败:", error);
      ElMessage.error("获取音频设备列表失败");
      return [];
    }
    finally {
      isLoading.value = false;
    }
  };

  /**
   * 请求麦克风权限
   */
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        ElMessage.error("您的浏览器不支持麦克风功能");
        return false;
      }

      // 请求访问麦克风
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 立即释放流
      stream.getTracks().forEach(track => track.stop());

      hasPermission.value = true;
      permissionStatus.value = {
        granted: true,
        denied: false,
        prompt: false,
      };

      ElMessage.success("麦克风权限获取成功");

      // 权限获取成功后，枚举设备
      await enumerateAudioDevices();

      return true;
    }
    catch (error: any) {
      hasPermission.value = false;

      let message = "麦克风权限获取失败";
      if (error.name === "NotAllowedError") {
        message = "麦克风权限被拒绝，请在浏览器设置中允许访问麦克风";
        permissionStatus.value.denied = true;
      }
      else if (error.name === "NotFoundError") {
        message = "未找到可用的麦克风设备";
      }
      else if (error.name === "NotSupportedError") {
        message = "您的浏览器不支持麦克风功能";
      }

      ElMessage.error(message);
      console.error("请求麦克风权限失败:", error);
      return false;
    }
  };

  /**
   * 检查麦克风权限
   */
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (!navigator?.permissions?.query) {
        // 浏览器不支持权限API，尝试直接请求权限
        return await requestMicrophonePermission();
      }

      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });

      permissionStatus.value = {
        granted: result.state === "granted",
        denied: result.state === "denied",
        prompt: result.state === "prompt",
      };

      hasPermission.value = result.state === "granted";

      // 监听权限状态变化
      result.addEventListener("change", () => {
        permissionStatus.value = {
          granted: result.state === "granted",
          denied: result.state === "denied",
          prompt: result.state === "prompt",
        };
        hasPermission.value = result.state === "granted";

        // 权限变化时重新枚举设备
        if (result.state === "granted") {
          enumerateAudioDevices();
        }
      });

      return hasPermission.value;
    }
    catch (error) {
      console.warn("检查麦克风权限失败:", error);
      return await requestMicrophonePermission();
    }
  };

  /**
   * 选择音频设备
   */
  const selectAudioDevice = (deviceId: string) => {
    const previousDevice = setting.settingPage.audioDevice.defaultMicrophone;

    // 更新设置
    setting.settingPage.audioDevice.defaultMicrophone = deviceId;
    setting.settingPage.audioDevice.lastSelectedMicrophone = previousDevice;

    // 找到设备信息
    const device = deviceOptions.value.find(d => d.deviceId === deviceId);
    const deviceName = device?.label || (deviceId === "default" ? "系统默认" : "未知设备");
    console.log(`音频设备已切换: ${deviceName} (${deviceId})`);
  };

  /**
   * 重置到默认设备
   */
  const resetToDefault = () => {
    selectAudioDevice("default");
  };

  /**
   * 刷新设备列表
   */
  const refreshDevices = async () => {
    if (!hasPermission.value) {
      const granted = await requestMicrophonePermission();
      if (!granted)
        return;
    }

    await enumerateAudioDevices();
    ElMessage.success("设备列表已刷新");
  };

  /**
   * 测试选定的麦克风
   */
  const testSelectedMicrophone = async (deviceId?: string): Promise<boolean> => {
    try {
      const targetDeviceId = deviceId || selectedDevice.value;

      if (!hasPermission.value) {
        ElMessage.warning("请先获取麦克风权限");
        return false;
      }

      const constraints: MediaStreamConstraints = {
        audio: targetDeviceId === "default"
          ? true
          : { deviceId: { exact: targetDeviceId } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // 简单测试：检查是否有音频轨道
      const audioTracks = stream.getAudioTracks();
      const hasAudio = audioTracks.length > 0 && audioTracks[0]?.readyState === "live";

      // 立即释放流
      stream.getTracks().forEach(track => track.stop());

      if (hasAudio) {
        ElMessage.success("麦克风测试成功");
        return true;
      }
      else {
        ElMessage.error("麦克风测试失败：没有检测到音频信号");
        return false;
      }
    }
    catch (error: any) {
      let message = "麦克风测试失败";
      if (error.name === "NotFoundError") {
        message = "找不到指定的麦克风设备";
      }
      else if (error.name === "NotAllowedError") {
        message = "麦克风权限被拒绝";
      }

      ElMessage.error(message);
      console.error("麦克风测试失败:", error);
      return false;
    }
  };

  /**
   * 获取当前选定设备的媒体流
   */
  const getCurrentDeviceStream = async (deviceId?: string): Promise<MediaStream | null> => {
    try {
      const targetDeviceId = deviceId || selectedDevice.value;

      if (!hasPermission.value) {
        throw new Error("没有麦克风权限");
      }

      const constraints: MediaStreamConstraints = {
        audio: targetDeviceId === "default"
          ? true
          : { deviceId: { exact: targetDeviceId } },
      };

      return await navigator.mediaDevices.getUserMedia(constraints);
    }
    catch (error) {
      console.error("获取设备流失败:", error);
      return null;
    }
  };

  // 初始化
  onMounted(async () => {
    await checkMicrophonePermission();

    // 如果有权限，立即枚举设备
    if (hasPermission.value) {
      await enumerateAudioDevices();
    }

    // 监听设备变化
    if (navigator?.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", () => {
        if (hasPermission.value && setting.settingPage.audioDevice.autoDetectDevice) {
          enumerateAudioDevices();
        }
      });
    }
  });

  return {
    // 状态
    isLoading: readonly(isLoading),
    hasPermission: readonly(hasPermission),
    permissionStatus: readonly(permissionStatus),

    // 设备信息
    audioDevices,
    deviceOptions,
    selectedDevice,
    lastSelectedDevice,

    // 方法
    checkMicrophonePermission,
    requestMicrophonePermission,
    enumerateAudioDevices,
    selectAudioDevice,
    resetToDefault,
    refreshDevices,
    testSelectedMicrophone,
    getCurrentDeviceStream,
  };
}
