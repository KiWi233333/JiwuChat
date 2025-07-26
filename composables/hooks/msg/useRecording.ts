// 常量定义
const MAX_CHAT_SECONDS = 120;
const MIN_CHAT_SECONDS = 1;
const AUDIO_MIME_TYPE = "audio/mp3";
const RECORDER_MIME_TYPE = "audio/webm";
const AUDIO_BITS_PER_SECOND = 128000;
const DEFAULT_TIMESLICE = 1000;
const LONG_PRESS_DELAY = 300;
const LONG_PRESS_THRESHOLD = 20;

// 录音状态接口
interface RecordingState {
  isRecording: boolean;
  startTime: number;
  endTime: number;
  audioChunks: Blob[];
  mediaRecorder?: MediaRecorder;
  audioFile?: Partial<OssFile>;
  isPlaying: boolean;
  audioElement?: HTMLAudioElement;
  transformTextList: string[];
}

/**
 * 创建初始录音状态
 */
function createInitialState(): RecordingState {
  return {
    isRecording: false,
    startTime: 0,
    endTime: 0,
    audioChunks: [],
    mediaRecorder: undefined,
    audioFile: undefined,
    isPlaying: false,
    audioElement: undefined,
    transformTextList: [],
  };
}

/**
 * 音频播放管理器
 */
function useAudioPlayer(state: Ref<RecordingState>) {
  const playAudio = (url?: string) => {
    const audioUrl = url || state.value.audioFile?.id;
    if (!audioUrl || state.value.isPlaying)
      return;

    const audio = new Audio(audioUrl);
    state.value.audioElement = audio;
    state.value.isPlaying = true;

    audio.play().catch(() => {
      state.value.isPlaying = false;
      ElMessage.error("音频播放失败");
    });

    audio.addEventListener("ended", () => {
      state.value.isPlaying = false;
    });
  };

  const stopAudio = () => {
    if (state.value.audioElement && state.value.isPlaying) {
      state.value.audioElement.pause();
      state.value.isPlaying = false;
    }
  };

  return { playAudio, stopAudio };
}

/**
 * 语音转文字管理器
 */
function useSpeechToText(state: Ref<RecordingState>) {
  const speechRecognition = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: "zh-CN",
  });

  const startSpeechRecognition = () => {
    if (!speechRecognition.isSupported) {
      ElMessage.error("当前设备不支持语音转文字功能");
      return false;
    }

    try {
      speechRecognition.start();

      speechRecognition.recognition?.addEventListener("result", (event) => {
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result?.[0]) {
            state.value.transformTextList[i] = result[0].transcript;
          }
        }
      });

      return true;
    }
    catch (error) {
      console.warn("语音识别启动失败:", error);
      return false;
    }
  };

  const stopSpeechRecognition = () => {
    try {
      speechRecognition.stop();
    }
    catch (error) {
      console.warn("停止语音识别失败:", error);
    }
  };

  return {
    speechRecognition,
    startSpeechRecognition,
    stopSpeechRecognition,
  };
}

/**
 * 录音核心功能管理器
 */
function useRecordingCore(state: Ref<RecordingState>, options: { timeslice: number; fileSizeLimit: number }) {
  const { timeslice, fileSizeLimit } = options;

  const cleanupResources = () => {
    // 释放音频元素
    if (state.value.audioElement) {
      state.value.audioElement.pause();
      state.value.audioElement = undefined;
    }

    // 释放 MediaRecorder
    if (state.value.mediaRecorder) {
      try {
        state.value.mediaRecorder.stop();
      }
      catch (error) {
        console.warn("停止录音器失败:", error);
      }
      state.value.mediaRecorder = undefined;
    }

    // 释放 URL 对象
    if (state.value.audioFile?.id && state.value.audioFile.id.startsWith("blob:")) {
      URL.revokeObjectURL(state.value.audioFile.id);
    }

    // 重置状态
    Object.assign(state.value, createInitialState());
  };

  const validateRecordingTime = (seconds: number): boolean => {
    if (seconds < MIN_CHAT_SECONDS) {
      ElMessage.warning(`录音时间过短，至少需要${MIN_CHAT_SECONDS}秒`);
      return false;
    }
    if (seconds >= MAX_CHAT_SECONDS) {
      ElMessage.warning(`录音时间过长，最多支持${MAX_CHAT_SECONDS}秒`);
      return false;
    }
    return true;
  };

  const validateFileSize = (file: File): boolean => {
    if (file.size > fileSizeLimit) {
      ElMessage.error(`文件大小超过限制，最大支持 ${formatFileSize(fileSizeLimit)}`);
      return false;
    }
    return true;
  };

  const createMediaRecorder = async (): Promise<MediaRecorder | null> => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("设备不支持录音功能");
      }

      // 获取设置中的默认麦克风设备
      const setting = useSettingStore();
      const selectedDeviceId = setting.settingPage.audioDevice.defaultMicrophone;

      // 构造音频约束条件
      const audioConstraints: MediaTrackConstraints | boolean = selectedDeviceId === "default"
        ? true // 使用系统默认设备
        : { deviceId: { exact: selectedDeviceId } }; // 使用指定设备

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
        mimeType: RECORDER_MIME_TYPE,
      });

      return recorder;
    }
    catch (error: any) {
      let message = "录音权限获取失败";
      if (error.code === 0 || error.name === "NotAllowedError") {
        message = "请允许使用麦克风权限";
      }
      else if (error.name === "NotFoundError") {
        message = "未找到可用的录音设备，请检查麦克风设置";
      }
      else if (error.name === "OverconstrainedError") {
        message = "选定的麦克风设备不可用，请重新选择";
      }
      ElMessage.error(message);
      return null;
    }
  };

  const setupRecorderListeners = (recorder: MediaRecorder, onComplete: (file: File) => void) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        const blob = new Blob([event.data], { type: AUDIO_MIME_TYPE });
        state.value.audioChunks.push(blob);
        state.value.endTime = Date.now();

        const currentSeconds = Math.floor((state.value.endTime - state.value.startTime) / 1000);
        if (currentSeconds >= MAX_CHAT_SECONDS) {
          recorder.stop();
        }
      }
    });

    recorder.addEventListener("stop", () => {
      const seconds = Math.floor((state.value.endTime - state.value.startTime) / 1000);

      if (!validateRecordingTime(seconds)) {
        cleanupResources();
        return;
      }

      if (state.value.audioChunks.length === 0) {
        ElMessage.warning("录音数据为空");
        cleanupResources();
        return;
      }

      const file = new File(state.value.audioChunks, `${Date.now()}.mp3`, {
        type: AUDIO_MIME_TYPE,
      });

      if (!validateFileSize(file)) {
        cleanupResources();
        return;
      }

      const url = URL.createObjectURL(file);
      state.value.audioFile = {
        id: url,
        key: undefined,
        status: "",
        percent: 0,
        duration: seconds,
        file,
      };

      console.log(`录音完成 - 时长: ${seconds}s, 大小: ${formatFileSize(file.size)}`);
      onComplete(file);
    });

    recorder.addEventListener("error", (event: any) => {
      console.error("录音错误:", event.error);
      ElMessage.error("录音过程中发生错误");
      cleanupResources();
    });
  };

  return {
    cleanupResources,
    createMediaRecorder,
    setupRecorderListeners,
  };
}

/**
 * mp3音频录制Hook
 */
export function useRecording(options: {
  timeslice?: number;
  pressHandleRefName?: string;
} = {}) {
  const {
    timeslice = DEFAULT_TIMESLICE,
    pressHandleRefName = "pressHandleRef",
  } = options;

  // 依赖注入
  const setting = useSettingStore();
  const chat = useChatStore();

  // 状态管理
  const state = ref<RecordingState>(createInitialState());

  // 模板引用
  const pressHandleRef = useTemplateRef<HTMLElement>(pressHandleRefName);

  // 事件钩子
  const onEndChat = createEventHook<File>();

  // 计算属性
  const fileSizeLimit = computed(() =>
    setting.systemConstant.ossInfo?.audio?.fileSize || 20 * 1024 * 1024,
  );

  const recordingDuration = computed(() => {
    if (state.value.startTime > 0 && state.value.endTime > 0) {
      return Math.floor((state.value.endTime - state.value.startTime) / 1000);
    }
    return 0;
  });

  const audioTransformText = computed(() =>
    state.value.transformTextList.join(""),
  );

  // 子功能模块
  const audioPlayer = useAudioPlayer(state);
  const speechToText = useSpeechToText(state);
  const recordingCore = useRecordingCore(state, {
    timeslice,
    fileSizeLimit: fileSizeLimit.value,
  });

  // 核心方法
  const startRecording = async (): Promise<boolean> => {
    if (state.value.isRecording)
      return false;

    const recorder = await recordingCore.createMediaRecorder();
    if (!recorder)
      return false;

    state.value.mediaRecorder = recorder;
    state.value.audioChunks = [];
    state.value.transformTextList = [];
    state.value.startTime = Date.now();
    state.value.endTime = 0;
    state.value.isRecording = true;

    recordingCore.setupRecorderListeners(recorder, (file) => {
      state.value.isRecording = false;
      onEndChat.trigger(file);
    });

    recorder.start(timeslice);
    speechToText.startSpeechRecognition();

    return true;
  };

  const stopRecording = () => {
    if (!state.value.isRecording || !state.value.mediaRecorder)
      return;

    speechToText.stopSpeechRecognition();
    state.value.mediaRecorder.stop();
    state.value.isRecording = false;
  };

  const toggle = async () => {
    if (state.value.isRecording) {
      const seconds = Math.floor((Date.now() - state.value.startTime) / 1000);
      if (seconds < MIN_CHAT_SECONDS) {
        ElMessage.warning("录音时间过短！");
        recordingCore.cleanupResources();
        return;
      }
      stopRecording();
    }
    else {
      await startRecording();
    }
  };

  const handlePlayAudio = (type: "play" | "del" | "stop", url?: string) => {
    switch (type) {
      case "play":
        audioPlayer.playAudio(url);
        break;
      case "stop":
        audioPlayer.stopAudio();
        break;
      case "del":
        audioPlayer.stopAudio();
        recordingCore.cleanupResources();
        break;
    }
  };

  const reset = () => {
    audioPlayer.stopAudio();
    recordingCore.cleanupResources();
  };

  // 键盘快捷键处理
  const start = async (e: KeyboardEvent) => {
    if (e.key === "t" && e.ctrlKey && !state.value.isRecording) {
      e.preventDefault();
      await startRecording();
      chat.msgForm.msgType = MessageType.SOUND;
    }
    else if (e.key === "c" && e.ctrlKey && state.value.isRecording) {
      e.preventDefault();
      stopRecording();
      chat.msgForm.msgType = MessageType.SOUND;
    }
  };

  // 长按录音设置
  onLongPress(
    pressHandleRef,
    toggle,
    {
      delay: LONG_PRESS_DELAY,
      onMouseUp: toggle,
      distanceThreshold: LONG_PRESS_THRESHOLD,
      modifiers: {
        stop: true,
      },
    },
  );

  // 组件卸载时清理资源
  onBeforeUnmount(() => {
    recordingCore.cleanupResources();
  });

  // 返回API（保持兼容性）
  return {
    fileSizeLimit,
    pressHandleRef,
    isChating: computed(() => state.value.isRecording), // 保持原名称
    second: recordingDuration,
    theAudioFile: computed(() => state.value.audioFile), // 保持原名称
    audioTransfromText: audioTransformText, // 保持原名称（包含拼写错误）
    speechRecognition: speechToText.speechRecognition,
    isPalyAudio: computed(() => state.value.isPlaying), // 保持原名称（包含拼写错误）
    toggle,
    start,
    stop: stopRecording,
    reset,
    onEndChat: onEndChat.on,
    handlePlayAudio,
  };
}
