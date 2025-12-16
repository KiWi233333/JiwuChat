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
  cachedDeviceId?: string; // 缓存的设备ID
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
function useAudioPlayer(state: RecordingState, onError: { trigger: (msg: string) => void }) {
  const playAudio = (url?: string) => {
    const audioUrl = url || state.audioFile?.id;
    if (!audioUrl || state.isPlaying)
      return;

    const audio = new Audio(audioUrl);
    state.audioElement = audio;
    state.isPlaying = true;

    audio.play().catch(() => {
      state.isPlaying = false;
      onError.trigger("音频播放失败");
    });

    audio.addEventListener("ended", () => {
      state.isPlaying = false;
    });
  };

  const stopAudio = () => {
    if (state.audioElement && state.isPlaying) {
      state.audioElement.pause();
      state.isPlaying = false;
    }
  };

  return { playAudio, stopAudio };
}

/**
 * 语音转文字管理器
 */
function useSpeechToText(state: RecordingState, onError: { trigger: (msg: string) => void }) {
  const speechRecognition = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: "zh-CN",
  });

  const startSpeechRecognition = () => {
    if (!speechRecognition.isSupported) {
      onError.trigger("当前设备不支持语音转文字功能");
      return false;
    }

    try {
      speechRecognition.start();

      speechRecognition.recognition?.addEventListener("result", (event) => {
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result?.[0])
            state.transformTextList[i] = result[0].transcript;
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
function useRecordingCore(
  state: RecordingState,
  options: { timeslice: number; fileSizeLimit: number },
  onError: { trigger: (msg: string) => void },
) {
  const { timeslice, fileSizeLimit } = options;

  const cleanupResources = () => {
    // 释放音频元素
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement = undefined;
    }

    // 释放 MediaRecorder 和麦克风
    if (state.mediaRecorder) {
      try {
        // 停止录音器
        if (state.mediaRecorder.state === "recording") {
          state.mediaRecorder.stop();
        }

        // 释放麦克风流
        const stream = state.mediaRecorder.stream;
        if (stream) {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
        }
      }
      catch (error) {
        console.warn("停止录音器失败:", error);
      }
      state.mediaRecorder = undefined;
    }

    // 释放 URL 对象
    if (state.audioFile?.id && state.audioFile.id.startsWith("blob:"))
      URL.revokeObjectURL(state.audioFile.id);

    // 重置状态
    Object.assign(state, createInitialState());
  };

  const validateRecordingTime = (seconds: number): boolean => {
    if (seconds < MIN_CHAT_SECONDS) {
      onError.trigger(`录音时间过短，至少需要${MIN_CHAT_SECONDS}秒`);
      return false;
    }
    else if (seconds >= MAX_CHAT_SECONDS) {
      onError.trigger(`录音时间过长，最多支持${MAX_CHAT_SECONDS}秒`);
      return false;
    }
    return true;
  };

  const validateFileSize = (file: File): boolean => {
    if (file.size > fileSizeLimit) {
      onError.trigger(`文件大小超过限制，最大支持 ${formatFileSize(fileSizeLimit)}`);
      return false;
    }
    return true;
  };

  const createMediaRecorder = async (forceRecreate = false): Promise<MediaRecorder | null> => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia)
        throw new Error("设备不支持录音功能");

      const setting = useSettingStore();
      const currentDeviceId = setting.settingPage.audioDevice.defaultMicrophone;

      // 检查是否需要重新创建
      const deviceChanged = state.cachedDeviceId !== currentDeviceId;
      const needRecreate = forceRecreate || deviceChanged || !state.mediaRecorder;

      if (!needRecreate && state.mediaRecorder) {
        // 复用现有的 MediaRecorder
        return state.mediaRecorder;
      }

      // 尝试复用共享音频流
      const microphoneTest = useMicrophoneTest();
      let stream = await microphoneTest.getSharedStream();

      // 如果无法获取共享流，则回退到传统方式
      if (!stream) {
        const audioConstraints: MediaTrackConstraints | boolean = currentDeviceId === "default"
          ? true
          : { deviceId: { exact: currentDeviceId } };

        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
      }

      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
        mimeType: RECORDER_MIME_TYPE,
      });

      // 缓存设备ID
      state.cachedDeviceId = currentDeviceId;

      return recorder;
    }
    catch (error: any) {
      let message = "录音权限获取失败";
      if (error.code === 0 || error.name === "NotAllowedError")
        message = "请允许使用麦克风权限";
      else if (error.name === "NotFoundError")
        message = "未找到可用的录音设备，请检查麦克风设置";
      else if (error.name === "OverconstrainedError")
        message = "选定的麦克风设备不可用，请重新选择";
      onError.trigger(message);
      return null;
    }
  };

  const setupRecorderListeners = (recorder: MediaRecorder, onComplete: (file: File) => void) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        const blob = new Blob([event.data], { type: AUDIO_MIME_TYPE });
        state.audioChunks.push(blob);
        state.endTime = Date.now();

        const currentSeconds = Math.floor((state.endTime - state.startTime) / 1000);
        if (currentSeconds >= MAX_CHAT_SECONDS)
          recorder.stop();
      }
    });

    recorder.addEventListener("stop", () => {
      const seconds = Math.floor((state.endTime - state.startTime) / 1000);

      if (!validateRecordingTime(seconds)) {
        cleanupResources();
        return;
      }

      if (state.audioChunks.length === 0) {
        onError.trigger("录音数据为空");
        cleanupResources();
        return;
      }

      const file = new File(state.audioChunks, `${Date.now()}.mp3`, {
        type: AUDIO_MIME_TYPE,
      });

      if (!validateFileSize(file)) {
        cleanupResources();
        return;
      }

      const url = URL.createObjectURL(file);
      state.audioFile = {
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
      onError.trigger("录音过程中发生错误");
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
  const state = reactive<RecordingState>(createInitialState());

  // 模板引用
  const pressHandleRef = useTemplateRef<HTMLElement>(pressHandleRefName);

  // 事件钩子
  const onEndChat = createEventHook<File>();
  const onError = createEventHook<string>();

  // 计算属性
  const fileSizeLimit = computed(() =>
    setting.systemConstant.ossInfo?.audio?.fileSize || 20 * 1024 * 1024,
  );

  const recordingDuration = computed(() => {
    if (state.startTime > 0 && state.endTime > 0)
      return Math.floor((state.endTime - state.startTime) / 1000);
    return 0;
  });

  const audioTransformText = computed(() =>
    state.transformTextList.join(""),
  );

  // 子功能模块
  const audioPlayer = useAudioPlayer(state, onError);
  const speechToText = useSpeechToText(state, onError);
  const recordingCore = useRecordingCore(
    state,
    {
      timeslice,
      fileSizeLimit: fileSizeLimit.value,
    },
    onError,
  );

  // 监听设备切换
  const unwatchDevice = watch(
    () => setting.settingPage.audioDevice.defaultMicrophone,
    () => {
      // 设备切换时，如果当前正在录音，需要重新创建录音器
      if (state.isRecording) {
        // 设备切换时会由 useMicrophoneTest 自动处理音频流切换
        // 这里只需要清除缓存的设备ID，下次录音时会自动重新创建
        state.cachedDeviceId = undefined;
      }
    },
  );

  // 核心方法
  const startRecording = async (): Promise<boolean> => {
    if (state.isRecording)
      return false;

    const recorder = await recordingCore.createMediaRecorder();
    if (!recorder)
      return false;

    state.mediaRecorder = recorder;
    state.audioChunks = [];
    state.transformTextList = [];
    state.startTime = Date.now();
    state.endTime = 0;
    state.isRecording = true;

    recordingCore.setupRecorderListeners(recorder, (file) => {
      state.isRecording = false;
      onEndChat.trigger(file);
    });

    recorder.start(timeslice);
    speechToText.startSpeechRecognition();

    return true;
  };

  const stopRecording = () => {
    if (!state.isRecording || !state.mediaRecorder)
      return;

    speechToText.stopSpeechRecognition();

    // 停止录音并释放麦克风
    if (state.mediaRecorder.state === "recording") {
      state.mediaRecorder.stop();
    }

    // 释放麦克风流
    const stream = state.mediaRecorder.stream;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    state.isRecording = false;
  };

  const toggle = async () => {
    if (state.isRecording) {
      const seconds = Math.floor((Date.now() - state.startTime) / 1000);
      if (seconds < MIN_CHAT_SECONDS) {
        onError.trigger("录音时间过短！");
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
    if (e.key === "t" && e.ctrlKey && !state.isRecording) {
      e.preventDefault();
      await startRecording();
      chat.msgForm.msgType = MessageType.SOUND;
    }
    else if (e.key === "c" && e.ctrlKey && state.isRecording) {
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
    unwatchDevice();
    recordingCore.cleanupResources();
  });

  // 返回API（保持兼容性）
  return {
    fileSizeLimit,
    pressHandleRef,
    isRecording: computed(() => state.isRecording),
    recordingDuration,
    audioFile: computed(() => state.audioFile),
    audioTransformText,
    speechRecognition: speechToText.speechRecognition,
    isPlayingAudio: computed(() => state.isPlaying),
    toggle,
    start,
    stop: stopRecording,
    reset,
    onEndChat: onEndChat.on,
    onError: onError.on,
    handlePlayAudio,
  };
}
