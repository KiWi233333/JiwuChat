/**
 * 麦克风测试 Hook
 * 用于测试麦克风并提供实时音轨数据
 */

export interface AudioLevelData {
  /** 当前音量级别 (0-100) */
  level: number;
  /** 频率数据数组 */
  frequencyData: Uint8Array;
  /** 时域数据数组 */
  timeData: Uint8Array;
  /** 平均音量 */
  average: number;
  /** 峰值音量 */
  peak: number;
}

export function useMicrophoneTest() {
  const audioDeviceManager = useAudioDeviceManager();
  const setting = useSettingStore();

  // 测试状态
  const isTesting = ref(false);
  const testError = ref<string>("");

  // 音频数据
  const audioLevel = ref<AudioLevelData>({
    level: 0,
    frequencyData: new Uint8Array(0),
    timeData: new Uint8Array(0),
    average: 0,
    peak: 0,
  });

  // Web Audio API 相关
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let mediaStream: MediaStream | null = null;
  let animationFrame: number | null = null;

  /**
   * 停止麦克风测试
   */
  const stopTest = () => {
    isTesting.value = false;
    testError.value = "";

    // 停止动画帧
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    // 关闭音频流
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    // 关闭音频上下文
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    analyser = null;

    // 重置音频数据
    audioLevel.value = {
      level: 0,
      frequencyData: new Uint8Array(0),
      timeData: new Uint8Array(0),
      average: 0,
      peak: 0,
    };
  };

  /**
   * 开始分析音频数据
   */
  const startAnalyzing = () => {
    if (!analyser || !isTesting.value)
      return;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.frequencyBinCount);

    const analyze = () => {
      if (!analyser || !isTesting.value)
        return;

      // 获取频率数据和时域数据
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeData);

      // 计算音量级别
      let sum = 0;
      let peak = 0;

      for (let i = 0; i < frequencyData.length; i++) {
        const value = frequencyData[i] || 0;
        sum += value;
        if (value > peak) {
          peak = value;
        }
      }

      const average = sum / frequencyData.length;
      const level = Math.round((average / 255) * 100);

      // 更新音频数据
      audioLevel.value = {
        level: Math.min(level, 100),
        frequencyData: new Uint8Array(frequencyData),
        timeData: new Uint8Array(timeData),
        average: Math.round(average),
        peak: Math.round(peak),
      };

      // 继续分析
      animationFrame = requestAnimationFrame(analyze);
    };

    analyze();
  };

  /**
   * 启动麦克风测试
   */
  const startTest = async (deviceId?: string): Promise<boolean> => {
    try {
      if (isTesting.value) {
        stopTest();
      }

      isTesting.value = true;
      testError.value = "";
      mediaStream = await audioDeviceManager.getCurrentDeviceStream(deviceId);
      if (!mediaStream) {
        throw new Error("无法获取音频流");
      }

      // 创建音频上下文和分析器
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();

      // 配置分析器
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // 连接音频源
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      // 开始分析音频数据
      startAnalyzing();

      return true;
    }
    catch (error: any) {
      isTesting.value = false;

      let message = "麦克风测试失败";
      if (error.name === "NotAllowedError") {
        message = "麦克风权限被拒绝";
      }
      else if (error.name === "NotFoundError") {
        message = "找不到指定的麦克风设备";
      }
      else if (error.message) {
        message = error.message;
      }

      testError.value = message;
      ElMessage.error(message);
      console.error("麦克风测试失败:", error);
      return false;
    }
  };

  /**
   * 切换测试状态
   */
  const toggleTest = async (deviceId?: string): Promise<boolean> => {
    if (isTesting.value) {
      stopTest();
      return false;
    }
    else {
      return await startTest(deviceId);
    }
  };

  // 监听麦克风切换
  const unWatchMicrophone = watch(() => setting.settingPage.audioDevice.defaultMicrophone, (newVal, oldVal) => {
    if (newVal !== oldVal && isTesting.value) { // 测试中热切换
      stopTest();
      startTest(newVal);
    }
  });

  // 组件卸载时清理
  onUnmounted(() => {
    stopTest();
    unWatchMicrophone();
  });

  /**
   * 获取共享的音频流（供录音等功能复用）
   */
  const getSharedStream = async (deviceId?: string): Promise<MediaStream | null> => {
    const targetDeviceId = deviceId || audioDeviceManager.selectedDevice.value;

    // 如果正在测试且设备相同，直接返回当前流
    if (isTesting.value && mediaStream
      && (targetDeviceId === audioDeviceManager.selectedDevice.value || !deviceId)) {
      return mediaStream;
    }

    // 否则获取新的流
    return await audioDeviceManager.getCurrentDeviceStream(targetDeviceId);
  };

  /**
   * 获取当前活跃的音频流
   */
  const getCurrentStream = (): MediaStream | null => {
    return mediaStream;
  };

  return {
    // 状态
    isTesting: readonly(isTesting),
    testError: readonly(testError),
    audioLevel: readonly(audioLevel),

    // 音频流相关
    getSharedStream,
    getCurrentStream,

    // 方法
    startTest,
    stopTest,
    toggleTest,
  };
}
