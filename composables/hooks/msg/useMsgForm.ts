import type { UnlistenFn } from "@tauri-apps/api/event";
import type { ShallowRef } from "vue";
import type { OssConstantItemType } from "~/init/system";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { readFile, stat } from "@tauri-apps/plugin-fs";

// @unocss-include
const MAX_CHAT_SECONDS = 120;
const MimeType = "audio/mp3";
/**
 * mp3音频录制Hook
 */
export function useRecording(options: { timeslice?: number, pressHandleRefName?: string } = { timeslice: 1000, pressHandleRefName: "pressHandleRef" }) {
  const { timeslice = 1000, pressHandleRefName = "pressHandleRef" } = options;
  // 变量
  const setting = useSettingStore();
  const pressHandleRef = useTemplateRef<HTMLElement>(pressHandleRefName);
  const onEndChat = createEventHook<File>();
  const mediaRecorderContext = shallowRef<MediaRecorder>(); // 录音对象
  const isChating = ref(); // 是否正在聊天
  let audioChunks: Blob[] = [];
  const theAudioFile = shallowRef<Partial<OssFile>>(); // 录音文件
  const isPalyAudio = ref(false); // 是否正在播放音频
  const palyAudioContext = ref<HTMLAudioElement>();
  const startEndTime = reactive({ // 录音时间
    startTime: 0,
    endTime: 0,
  });
  const audioTransfromTextList = ref<string[]>([]);
  const audioTransfromText = computed(() => audioTransfromTextList.value.join(""));
  const second = computed(() => {
    if (startEndTime.startTime > 0 && startEndTime.endTime > 0)
      return +((startEndTime.endTime - startEndTime.startTime) / 1000 || 0).toFixed(0);
    else
      return 0;
  });

  // 获取文件大小限制
  const fileSizeLimit = computed(() => setting.systemConstant.ossInfo?.audio?.fileSize || 20 * 1024 * 1024); // 默认限制为20MB
  // 语音转译文字物料
  const speechRecognition = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: "zh-CN",
  });

  /**
   * 转文字
   * @returns void
   */
  async function useAudioTransfromText() {
    if (!speechRecognition.isSupported)
      return ElMessage.error("当前不支持语音转文字！");
    speechRecognition.start();
    speechRecognition.recognition?.addEventListener("result", (e) => {
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results?.[i];
        if (result && result?.[0])
          audioTransfromTextList.value[i] = result?.[0].transcript;
      }
    });
  }

  /**
   * 录音长按
   */
  onLongPress(
    pressHandleRef,
    toggle,
    {
      delay: 300,
      onMouseUp: toggle,
      distanceThreshold: 20,
      modifiers: {
        stop: true,
      },
    },
  );

  /**
   * 重置
   */
  const reset = () => {
    isPalyAudio.value = false;
    palyAudioContext.value?.pause();
    audioChunks = [];
    if (theAudioFile.value) {
      theAudioFile.value.id = "";
    }
    theAudioFile.value = undefined;
    startEndTime.startTime = 0;
    startEndTime.endTime = 0;
    isChating.value = false;
    palyAudioContext.value = undefined;
    audioTransfromTextList.value = [];
  };

  // 开始录音
  function toggle() {
    if (isChating.value) {
      if (second.value < 1) {
        ElMessage.warning("录音时间过短！");
        reset();
        return;
      }
      speechRecognition.stop();
    }
    else {
      useAudioTransfromText();
    }
    isChating.value = !isChating.value;
  }

  // 播放录音
  function handlePlayAudio(type: "play" | "del" | "stop", url?: string) {
    if (!type)
      return;
    const _url = url || theAudioFile.value?.id;
    if (_url && !isPalyAudio.value && type === "play") {
      const audio = new Audio(_url);
      palyAudioContext.value = audio;
      audio.play();
      isPalyAudio.value = true;
      audio.addEventListener("ended", () => {
        isPalyAudio.value = false;
      });
    }
    else if (isPalyAudio.value && type === "stop") {
      isPalyAudio.value = false;
      palyAudioContext.value?.pause();
    }
    else if (type === "del") {
      isPalyAudio.value = false;
      palyAudioContext.value?.pause();
      reset();
    }
  }

  // 开始录音
  async function start(e: KeyboardEvent) {
    const chat = useChatStore();
    if (e.key === "t" && e.ctrlKey && !isChating.value) {
      e.preventDefault();
      isChating.value = true;
      chat.msgForm.msgType = MessageType.SOUND; // 语音
    }
    else if (e.key === "c" && e.ctrlKey && isChating.value) {
      e.preventDefault();
      isChating.value = false;
      chat.msgForm.msgType = MessageType.SOUND; // 语音
    }
  }


  // 监听是否录音
  watch(isChating, (val) => {
    if (val) {
      if (!navigator?.mediaDevices?.getUserMedia) {
        isChating.value = false;
        return ElMessage.error("设备不支持录音！");
      }
      // 重新授权
      navigator?.mediaDevices?.getUserMedia({ audio: true, video: false }).then(
        stream => resolveAudioInput(stream),
        (reason) => {
          isChating.value = false;
          if (reason.code === 0) {
            ElMessage.warning("暂无麦克风权限！");
            return;
          }
          ElMessage.warning("拒绝授权麦克风，录音功能无法使用！");
        },
      );
    }
    else {
      mediaRecorderContext.value?.stop?.();
    }
  }, {
    immediate: false,
  });

  // 解析音频输入
  function resolveAudioInput(stream: MediaStream) {
    if (mediaRecorderContext.value) { // 防止重复创建
      mediaRecorderContext.value?.stop?.();
      mediaRecorderContext.value = undefined;
    }
    const recorder = new MediaRecorder(stream, {
      audioBitsPerSecond: 128000,
      mimeType: "audio/webm",
    });
    if (!recorder) {
      ElMessage.error("设备不支持录音！");
      return;
    }
    mediaRecorderContext.value = recorder;
    // 监听录音数据
    mediaRecorderContext.value.start(timeslice);// 1秒采样率
    startEndTime.startTime = Date.now();

    mediaRecorderContext.value.addEventListener("dataavailable", (e) => {
      const blob = new Blob([e.data], { type: MimeType });
      startEndTime.endTime = Date.now();
      audioChunks.push(blob);
      if (second.value >= MAX_CHAT_SECONDS) {
        ElMessage.warning("录音时间过长！");
        mediaRecorderContext.value?.stop?.();
        speechRecognition.stop();
        return;
      }
      if (speechRecognition) {
        try {
          speechRecognition?.start(); // 开始语音转文字
        }
        catch (error) {
          console.warn(error);
        }
      }
    });

    mediaRecorderContext.value.addEventListener("stop", (e) => {
      isChating.value = false;
      if (!audioChunks.length && second.value <= 2) {
        ElMessage.warning("录音时间过短！");
        return;
      }
      // 转化为文件上传
      const file = new File(audioChunks, `${Date.now()}.mp3`, { type: MimeType });
      console.log(`结束录音,时长：${second.value}s 文件大小：${formatFileSize(file.size)}`);

      if (file.size > fileSizeLimit.value) {
        ElMessage.error(`文件大小超过限制，最大支持 ${formatFileSize(fileSizeLimit.value)}`);
        reset();
        return;
      }
      theAudioFile.value = {
        id: URL.createObjectURL(file),
        key: undefined,
        status: "",
        percent: 0,
        file, // 文件对象
      };
      if (!theAudioFile.value)
        return;
      const url = window.URL.createObjectURL(file);
      theAudioFile.value.id = url;
      onEndChat.trigger(file);
    });
  }

  return {
    fileSizeLimit, // 文件大小限制
    pressHandleRef, // 长按录音按钮 Ref
    isChating, // 是否正在聊天
    second, // 录音时长
    theAudioFile, // 录音文件
    audioTransfromText, // 语音转文字
    speechRecognition, // 语音转文字
    isPalyAudio, // 是否正在播放音频
    toggle, // 开始/停止录音
    start, // 开始/停止录音
    stop, // 停止录音
    reset, // 重置录音
    onEndChat: onEndChat.on,
    handlePlayAudio,
  };
}


/**
 * 文件上传（图片、视频、图片）等
 * @param refsDom 上传组件的ref对象
 * @returns
 *  imgList: 图片列表
 *  fileList: 文件列表
 *  videoList: 视频列表
 *  onSubmitImg: 图片上传回调
 *  onSubmitFile: 文件上传回调
 *  onSubmitVideo: 视频上传回调
 */
export function useFileUpload(refsDom: RefDoms = { img: "inputOssImgUploadRef", file: "inputOssFileUploadRef", video: "inputOssVideoUploadRef" }, disabled?: ShallowRef<boolean>) {
  const {
    img: imgRefName = "inputOssImgUploadRef",
    file: fileRefName = "inputOssFileUploadRef",
    video: videoRefName = "inputOssVideoUploadRef",
  } = refsDom;

  const chat = useChatStore();
  const imgList = ref<OssFile[]>([]); // 图片列表
  const fileList = ref<OssFile[]>([]); // 文件列表
  const videoList = ref<OssFile[]>([]); // 视频列表

  // 计算 computed
  const isUploadImg = computed(() => chat.msgForm.msgType === MessageType.IMG && !!imgList?.value?.filter(f => f.status === "")?.length);
  const isUploadFile = computed(() => chat.msgForm.msgType === MessageType.FILE && !!fileList?.value?.filter(f => f.status === "")?.length);
  const isUploadVideo = computed(() => chat.msgForm.msgType === MessageType.VIDEO && !!videoList?.value?.filter(f => f.status === "")?.length);

  const inputOssImgUploadRef = useTemplateRef<any>(imgRefName);
  const inputOssVideoUploadRef = useTemplateRef<any>(videoRefName);
  const inputOssFileUploadRef = useTemplateRef<any>(fileRefName); // 文件上传

  // 图片上传回调
  function onSubmitImg(key: string, pathList: string[]) {
    if (disabled?.value === true)
      return;
    fileList.value = [];
    videoList.value = [];
    const file = imgList.value.find(f => f.key === key);
    if (!key || !file?.file) {
      return;
    }
    // const url = window.URL || window.webkitURL;
    // let width = 0;
    // let height = 0;
    // const img = new Image();
    // img.src = url.createObjectURL(file?.file);
    // img.onload = () => {
    //   width = img.width || 0;
    //   height = img.height || 0;
    // };
    chat.msgForm = {
      roomId: chat.theRoomId!,
      msgType: MessageType.IMG,
      content: chat.msgForm.content,
      body: {
        url: key,
        width: file?.width || 0,
        height: file?.height || 0,
        size: file?.file?.size,
      },
    };
  }

  // 文件上传回调
  function onSubmitFile(key: string, pathList: string[]) {
    if (disabled?.value === true)
      return;
    imgList.value = [];
    videoList.value = [];
    const file = fileList.value.find(f => f.key === key);
    if (key && file?.file) {
      chat.msgForm = {
        roomId: chat.theRoomId!,
        msgType: MessageType.FILE,
        content: chat.msgForm.content,
        body: {
          mentionList: chat.msgForm?.body?.mentionList,
          url: key,
          fileName: file?.file?.name,
          size: file?.file?.size,
        },
      };
    }
  }

  // 视频上传回调
  function onSubmitVideo(key: string, pathList: string[]) {
    if (disabled?.value === true)
      return;
    imgList.value = [];
    fileList.value = [];
    const file = videoList.value.find(f => f.key === key);
    if (key && file?.file) {
      chat.msgForm = {
        roomId: chat.theRoomId!,
        msgType: MessageType.VIDEO,
        content: chat.msgForm.content,
        body: {
          url: key,
          fileName: file?.file?.name,
          size: file?.file?.size,
          duration: file?.children?.[0]?.duration || 0,
          thumbUrl: file?.children?.[0]?.key || undefined,
          thumbSize: file?.children?.[0]?.thumbSize || 0,
          thumbWidth: file?.children?.[0]?.thumbWidth || 0,
          thumbHeight: file?.children?.[0]?.thumbHeight || 0,
        },
      };
    }
  }

  /**
   * 显示视频详情
   * @param e 事件对象
   * @param video 视频对象
   */
  function showVideoDialog(e: MouseEvent, video: OssFile) {
    if (disabled?.value === true)
      return;
    const thumb = video.children?.[0];
    if (!video?.key) {
      return;
    }
    mitter.emit(MittEventType.VIDEO_READY, {
      type: "play",
      payload: {
        mouseX: e.clientX,
        mouseY: e.clientY,
        url: BaseUrlVideo + video.key,
        duration: video?.duration || 0,
        thumbUrl: BaseUrlImg + thumb?.key,
        size: video.file?.size || 0,
        thumbSize: thumb?.thumbSize || 0,
        thumbWidth: thumb?.thumbWidth || 0,
        thumbHeight: thumb?.thumbHeight || 0,
      },
    });
  }

  /**
   * 粘贴上传
   * @param e 粘贴事件对象
   * @returns void
   */
  async function onPaste(e: ClipboardEvent) {
    if (disabled?.value === true)
      return;
    // 判断粘贴上传
    if (!e.clipboardData?.items?.length) {
      return;
    }
    // 拿到粘贴板上的 image file 对象
    const fileArr = Array.from(e.clipboardData.items).filter(v => v.kind === "file");
    if (!fileArr.length)
      return;
    e.preventDefault();
    // if (fileArr.length > 1 || fileArr.length < 0) {
    //   fileArr.length > 1 && ElMessage.warning("不支持批量上传！");
    //   return;
    // }
    for (let i = 0; i < fileArr.length; i++) {
      const item = fileArr[i];
      if (!item || item.kind !== "file") {
        continue;
      }
      if (item.type.includes("image")) {
        const file = item.getAsFile();
        file && uploadFile("image", file);
      }
      else if (item.type.includes("video")) {
        const file = item.getAsFile();
        file && uploadFile("video", file);
        // 单文件
        return;
      }
      else if (FILE_TYPE_ICON_MAP[item.type]) {
        const file = item.getAsFile();
        file && uploadFile("file", file);
        // 单文件
        return;
      }
    }
  }

  /**
   * 上传文件
   *
   * @param type 文件类型
   * @param file 文件对象
   * @returns void
   */
  async function uploadFile(type: OssConstantItemType, file: File, showUrl?: string) {
    if (disabled?.value === true)
      return false;
    let done = false;
    if (type === "video") {
      inputOssImgUploadRef.value?.resetInput?.();
      inputOssFileUploadRef.value?.resetInput?.();
      done = await inputOssVideoUploadRef.value?.onUpload({
        id: showUrl || URL.createObjectURL(file),
        key: undefined,
        status: "",
        percent: 0,
        file,
      });
      chat.msgForm.msgType = MessageType.VIDEO; // 视频
    }
    else if (type === "file") {
      if (isUploadFile.value) {
        ElMessage.warning("文件正在上传中，请稍后再试！");
        return false;
      }
      inputOssImgUploadRef.value?.resetInput?.();
      inputOssFileUploadRef.value?.resetInput?.();
      fileList.value = [];
      done = await inputOssFileUploadRef.value?.onUpload({
        id: showUrl || URL.createObjectURL(file),
        key: undefined,
        status: "",
        percent: 0,
        file,
      });
      chat.msgForm.msgType = MessageType.FILE; // 文件
    }
    else if (type === "image") {
      inputOssImgUploadRef.value?.resetInput?.();
      inputOssFileUploadRef.value?.resetInput?.();
      done = await inputOssImgUploadRef.value?.onUpload({
        id: showUrl || URL.createObjectURL(file),
        key: undefined,
        status: "",
        percent: 0,
        file,
      });
      chat.msgForm.msgType = MessageType.IMG; // 图片
    }
    // else if (type === "audio") {
    //   inputOssImgUploadRef.value?.resetInput?.();
    //   inputOssFileUploadRef.value?.resetInput?.();
    //   await inputOssImgUploadRef.value?.onUpload({
    //     id: showUrl || URL.createObjectURL(file),
    //     key: undefined,
    //     status: "",
    //     percent: 0,
    //     file,
    //   });
    //   chat.msgForm.msgType = MessageType.SOUND; // 语音
    // }
    return done;
  }

  // 监听拖拽上传
  const isDragDropOver = ref(false);
  const dragDropInfo = ref<{
    type?: "over" | "drop" | "cancel";
    position?: { x: number; y: number };
  }>({
    type: undefined,
    position: undefined,
  });
  let unlisten: UnlistenFn | undefined;

  /**
   * 监听拖拽上传
   * @param onDragDropCall 插入图片的回调
   * @returns 监听拖拽上传
   */
  async function listenDragDrop(onDragDropCall: (fileType: OssConstantItemType, file: File) => void) {
    const setting = useSettingStore();
    unlisten?.();
    if (!setting.isDesktop || unlisten) {
      return;
    }

    unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
      if (event.payload.type === "over") {
        if (!isDragDropOver.value) {
          isDragDropOver.value = !disabled?.value;
          // const { x, y } = event.payload.position;
          // console.log(`User is dragging over ${x}, ${y}`);
        }
      }
      else if (event.payload.type === "drop") {
        if (isDragDropOver.value) {
          isDragDropOver.value = false;
          const { x, y } = event.payload.position;
          console.log(`User dropped ${x}, ${y}, ${event.payload.paths}`);
          // 获取文件
          event.payload.paths.forEach(async (path) => {
            if (await existsFile(path)) {
              if (!path) {
                return;
              }
              // 根据后缀简单判断文件类型
              const ext = path.split(".").pop();
              if (!ext) {
                ElMessage.warning("无法判断该文件类型！");
                return;
              }
              const info = await stat(path);
              if (info.isDirectory) {
                ElMessage.warning("暂不支持文件夹上传！");
                return;
              }
              const setting = useSettingStore();
              // 判断类型
              const typeInfo = getSimpleOssTypeByExtName(ext);
              if (!typeInfo?.type || typeInfo.type === "audio") { // TODO: 暂不支持音频文件直接上传
                ElMessage.warning("暂不支持该文件类型上传！");
                return;
              }
              const ossInfo = setting?.systemConstant?.ossInfo?.[typeInfo.type];
              if (!ossInfo?.fileSize) {
                return;
              }
              if (info.size > ossInfo.fileSize) {
                ElMessage.warning(`文件大小超过限制，最大支持${formatFileSize(ossInfo.fileSize)}`);
                return;
              }
              // const url = convertFileSrc(path); // 生成本地url
              readFile(path).then((blod) => {
                const file = new File([blod], path.replaceAll("\\", "/")?.split("/").pop() || `${Date.now()}.${path.split(".").pop()}`, {
                  type: typeInfo.mineType || "application/octet-stream",
                });
                // 上传文件
                onDragDropCall(typeInfo.type, file);
              });
            }
          });
        }
      }
      else {
        console.log("File drop cancelled");
        isDragDropOver.value = false;
      }
    });
  }
  const unlistenDragDrop = () => {
    unlisten?.();
    unlisten = undefined;
  };

  return {
    imgList,
    fileList,
    videoList,
    isDragDropOver,
    uploadFile,

    isUploadImg,
    isUploadFile,
    isUploadVideo,

    inputOssVideoUploadRef,
    inputOssImgUploadRef,
    inputOssFileUploadRef,

    onSubmitImg,
    onSubmitFile,
    onSubmitVideo,
    onPaste,
    unlistenDragDrop,
    listenDragDrop,
    showVideoDialog,
  };
}
interface RefDoms {
  img?: string;
  file?: string;
  video?: string;
}

/**
 * 识别@用户
 * @param text 文本内容
 * @param userOptions 所有用户列表
 * @returns
 *  mentionList: 识别到的@用户的{uid, nickName}列表
 */
export function resolveAtUsers(text: string, userOptions: AtChatMemberOption[], configs: AtConfigs = { regExp: /@\S+\(#(\S+)\)\s/g }): { mentionList: MentionInfo[] } {
  const { regExp } = configs;
  if (!regExp || !text)
    throw new Error("regExp is required");
  const mentionList: MentionInfo[] = [];
  const matches = text.matchAll(regExp);
  for (const match of matches) {
    // 识别@和括号直接的昵称
    if (match[1]) {
      const atUser = userOptions.find(u => u.username === match[1]);
      if (atUser) {
        mentionList.push({
          uid: atUser.userId,
          displayName: `@${atUser.nickName}`,
        });
      }
    }
  }
  return {
    mentionList: JSON.parse(JSON.stringify(mentionList)),
  };
}

export function formatAiReplyTxt(item: AskAiRobotOption) {
  return `/${item.nickName} `;
}

export interface AtConfigs {
  regExp?: RegExp
}

const CACHE_TIME = 5 * 60 * 1000; // 5分钟缓存时间

/**
 * 加载@用户列表
 * @returns
 *  userOptions: 所有用户列表
 *  userAtOptions: 未添加的用户列表
 *  loadUser: 加载用户列表
 */
export function useLoadAtUserList() {
// AT @相关
  const chat = useChatStore();
  const user = useUserStore();
  const userOptions = ref<AtChatMemberOption[]>([]);
  const userAtOptions = computed(() => chat.theContact.type === RoomType.GROUP ? userOptions.value.filter(u => !chat.atUserList.find(a => a.userId === u.userId)) : []); // 过滤已存在的用户

  /**
   * 加载@用户列表
   */
  async function loadUser() {
    if (!chat.theRoomId! || chat.theContact.type !== RoomType.GROUP)
      return;

    const roomId = chat.theRoomId!;
    const cache = chat.atMemberRoomMap[roomId];

    // 如果缓存存在且未过期,直接使用缓存
    if (cache && (Date.now() - cache.time < CACHE_TIME)) {
      userOptions.value = (cache.uidList.map(uid => cache.userMap[uid] || { label: uid, value: uid }) || []) as AtChatMemberOption[];
      return;
    }

    const { data, code } = await getRoomGroupAllUser(chat.theRoomId!, user.getToken);
    if (data && code === StatusCode.SUCCESS) {
      const list = (data || []).map((u: ChatMemberSeVO) => ({
        label: u.nickName,
        value: `${u.nickName}(#${u.username})`,
        userId: u.userId,
        avatar: u.avatar,
        username: u.username,
        nickName: u.nickName,
      })).filter((u: AtChatMemberOption) => u.userId !== user.userInfo.id);

      userOptions.value = list;

      // 构建 userMap 和 uidList
      const userMap: Record<string, AtChatMemberOption> = {};
      const uidList: string[] = [];

      list.forEach((user) => {
        userMap[user.userId] = user;
        uidList.push(user.userId);
      });

      // 更新缓存
      chat.atMemberRoomMap[roomId] = {
        time: Date.now(),
        uidList,
        userMap,
      };
    }
  }

  // 加载用户
  const ws = useWsStore();
  watchDebounced(() => ws.wsMsgList.memberMsg.length, (len) => {
    if (!len)
      return;
    // 清除对应缓存
    const roomId = chat.theRoomId!;
    if (chat.atMemberRoomMap[roomId]) {
      delete chat.atMemberRoomMap[roomId];
    }
    loadUser();
  }, {
    debounce: 1000,
  });
  return {
    userOptions,
    userAtOptions,
    loadUser,
  };
}

/**
 * 处理@删除
 * @param context 文本内容
 * @param pattern 正则
 * @param prefix 前缀
 * @returns 是否匹配删除
 */
export function checkAtUserWhole(context: string | undefined | null, pattern: string, prefix: string) {
  const chat = useChatStore();
  if (prefix !== "@")
    return false;
  const atUserListOpt = chat.atUserList.map(u => ({
    ...u,
    label: `${u.nickName}(#${u.username})`,
    value: u.userId,
  }));
  if (pattern && context?.endsWith(`${prefix + pattern} `)) {
    const user = atUserListOpt.find(u => u.label === pattern.trim());
    if (user)
      chat.removeAtByUsername(user.username);
  }
  return true;
}

export interface AtChatMemberOption {
  label: string
  value: string
  userId: string
  username: string
  nickName: string
  avatar?: string
}
export interface AskAiRobotOption extends AtChatMemberOption {
  aiRobotInfo?: RobotUserVO;
}


/**
 * 好友状态
 */
export const SelfExistTextMap = {
  [RoomType.SELFT]: "已经不是好友",
  [RoomType.GROUP]: "已经不是群成员",
  [RoomType.AICHAT]: "已经被AI拉黑",
};

/**
 * 跳转到用户详情
 * @param userId 用户id
 */
export function navigateToUserInfoPage(userId: string) {
  navigateTo({
    path: "/user",
    query: {
      id: userId,
      dis: 1, // 移动尺寸禁止路由拦截
    },
    replace: false,
  });
}

/**
 * 跳转到用户详情
 * @param userId 用户id
 */
export function navigateToUserDetail(userId: string) {
  const chat = useChatStore();
  chat.setTheFriendOpt(FriendOptType.User, {
    id: userId,
  });
  navigateTo({
    path: "/friend",
    query: {
      id: userId,
      dis: 1, // 移动尺寸禁止路由拦截
    },
    replace: false,
  });
}

/**
 * 跳转到群聊详情
 */
export function navigateToGroupDetail(roomId: number) {
  const chat = useChatStore();
  chat.setTheFriendOpt(FriendOptType.Group, {
    ...chat.contactMap[roomId],
  });
  navigateTo({
    path: "/friend",
    query: {
      id: roomId,
      dis: 1, // 移动尺寸禁止路由拦截
    },
    replace: false,
  });
}

