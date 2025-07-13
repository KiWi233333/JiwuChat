<script lang="ts" setup>
import type { ElForm } from "#components";
import type { OssConstantItemType } from "~/init/system";
import ContextMenuGlobal from "@imengyu/vue3-context-menu";

const emit = defineEmits<{
  (e: "submit", newMsg: ChatMessageVO): void
}>();
const user = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();
const route = useRoute();

// 表单
const isSending = ref(false);
const isDisabledFile = computed(() => !user?.isLogin || chat.theContact.selfExist === 0);
const isLord = computed(() => chat.theContact.type === RoomType.GROUP && chat.theContact.member?.role === ChatRoomRoleEnum.OWNER); // 群主
const isSelfRoom = computed(() => chat.theContact.type === RoomType.SELFT); // 私聊
const isAiRoom = computed(() => chat.theContact.type === RoomType.AICHAT); // 机器人
const maxContentLen = computed(() => chat.theContact.type === RoomType.AICHAT ? 2048 : 512); // 对话文本长度
// 状态
const showGroupNoticeDialog = ref(false);
const loadInputDone = ref(false); // 用于移动尺寸动画
const loadInputTimer = shallowRef<NodeJS.Timeout>();
// ref
const formRef = useTemplateRef<InstanceType<typeof ElForm>>("formRef"); // 表单

// hooks
const isDisableUpload = computed(() => isAiRoom.value || route.path !== "/");

const {
  // 核心 refs 和状态
  inputFocus,
  msgInputRef,
  focusRef,
  selectionRange,

  // 管理器
  imageManager,
  selectionManager,

  // @ 和 AI 选择状态
  showAtOptions,
  showAiOptions,
  selectedAtItemIndex,
  selectedAiItemIndex,
  optionsPosition,

  // 计算选项
  filteredUserAtOptions,
  filteredAiOptions,
  userOptions,
  aiOptions,

  // 状态
  isReplyAI,

  // 滚动条引用
  atScrollbar,
  aiScrollbar,

  // 加载函数
  loadUser,
  loadAi,

  // 内容管理
  updateFormContent,
  clearInputContent,
  getInputVaildText,
  resolveContentAtUsers,

  // 选区和范围
  updateSelectionRange,

  // 标签插入
  insertAtUserTag,
  insertAiRobotTag,

  // 选项处理器
  resetOptions,
  handleSelectAtUser,
  handleSelectAiRobot,

  // 事件处理器
  handleInput,
  handleKeyDown,
  onContextMenu,
} = useMsgInputForm("msgInputRef", handleSubmit, {
  atScrollbarRef: "atScrollbar",
  aiScrollbarRef: "aiScrollbar",
}, 160, "focusRef");

// 是否在房间
const isNotExistOrNorFriend = computed(() => {
  const res = chat.theContact.selfExist === isTrue.FALESE;
  if (res) {
    msgInputRef.value?.blur(); // 失去焦点
    clearInputContent();
  }
  return res;
}); // 自己不存在 或 不是好友  || chat.contactMap?.[chat.theRoomId!]?.isFriend === isTrue.FALESE

const {
  imgList,
  fileList,
  videoList,
  isUploadImg,
  isUploadFile,
  isUploadVideo,
  isDragDropOver,
  uploadFile,
  onSubmitImg,
  onSubmitFile,
  onSubmitVideo,
  listenDragDrop,
  unlistenDragDrop,
  showVideoDialog,
  inputOssImgUploadRef,
  inputOssVideoUploadRef,
  inputOssFileUploadRef,
} = useFileUpload({ img: "inputOssImgUploadRef", file: "inputOssFileUploadRef", video: "inputOssVideoUploadRef" }, isDisableUpload);

// 移动端上传预览
const showUploadPreview = computed({
  get() {
    return setting.isMobileSize && (imgList.value.length > 0 || fileList.value.length > 0 || videoList.value.length > 0);
  },
  set(val) {
    if (!val)
      resetForm();
  },
});

// 拖拽区域处理
const { isOverDropZone } = useDropZone(focusRef, {
  onDrop: (files: File[] | null) => {
    if (!files || files.length === 0)
      return;
    // 遍历处理每个文件
    files.forEach((file) => {
      const type = getSimpleOssTypeByExtName(file.name);
      if (!type) {
        ElMessage.warning(`不支持的文件类型！`);
        return;
      }
      resolveFileUpload(type?.type, file);
    });
  },
  // 接受所有文件类型
  dataTypes: undefined,
  // 支持多文件拖拽
  multiple: true,
  // 对未处理的事件不阻止默认行为
  preventDefaultForUnhandled: false,
});

onMounted(() => {
  listenDragDrop(resolveFileUpload);
});
onUnmounted(() => {
  unlistenDragDrop();
});

// 处理图片插入输入框
function onOssImgChange(imgRaws: File[]) {
  for (const imgRaw of imgRaws) {
    if (imgRaw instanceof File && imgRaw.type?.startsWith("image/")) {
      // 插入图片到输入框
      imageManager.insert(imgRaw);
    }
  }
}

/**
 * 处理文件上传
 *
 * @param fileType 文件类型
 * @param file 文件对象
 */
async function resolveFileUpload(fileType: OssConstantItemType, file: File) {
  // 图片
  if (fileType === "image" && !setting.isMobileSize) {
    imageManager.insert(file);
    return;
  }

  // 文件 | 视频
  const done = await uploadFile(fileType, file);
  if (!done) {
    return;
  }

  // 移动端显示预览弹窗
  if (setting.isMobileSize) {
    // showUploadPreview.value = true;
  }
}

// 录音
const {
  isChating,
  second, // 获取录音时间
  theAudioFile,
  speechRecognition,
  audioTransfromText,
  isPalyAudio,
  pressHandleRef,
  reset: resetAudio,
  start: startAudio,
  handlePlayAudio, // 播放录音
} = useRecording({ pressHandleRefName: "pressHandleRef", timeslice: 1000 });

// computed
const isBtnLoading = computed(() => isSending.value || isUploadImg.value || isUploadFile.value || isUploadVideo.value);
const isSoundRecordMsg = computed(() => chat.msgForm.msgType === MessageType.SOUND);


/**
 * 处理粘贴事件 - 支持图片粘贴
 */
async function handlePasteEvent(e: ClipboardEvent) {
  // 使用 hook 中的增强粘贴处理
  e.preventDefault();

  const clipboardData = e.clipboardData;
  if (!clipboardData)
    return;

  // 判断粘贴上传
  if (!e.clipboardData?.items?.length) {
    return false;
  }
  // 拿到粘贴板上的 image file 对象
  const fileArr = Array.from(e.clipboardData.items).filter(v => v.kind === "file");
  if (!fileArr.length) { // 处理文本
    const text = clipboardData.getData("text/plain");
    if (text) {
      document.execCommand("insertText", false, text);
      updateFormContent();
    }
    return false;
  }

  if (isDisableUpload?.value) // 处理文件
    return false;

  for (let i = 0; i < fileArr.length; i++) {
    const item = fileArr[i];
    if (!item || item.kind !== "file") {
      continue;
    }
    const file = item.getAsFile();
    let type: OssConstantItemType | undefined;
    if (item.type.includes("image")) {
      type = "image";
    }
    else if (item.type.includes("video")) {
      type = "video";
    }
    else if (FILE_TYPE_ICON_MAP[item.type]) {
      type = "file";
    }
    if (type !== undefined) {
      file && await resolveFileUpload(type, file);
    }
  }
}

/**
 * 发送消息
 */
async function handleSubmit() {
  if (isSending.value)
    return;

  const content = getInputVaildText();

  // 检查编辑器中是否有图片需要处理
  const imageFiles = imageManager.getFiles();
  if (!content && chat.msgForm.msgType === MessageType.TEXT && imageFiles.length === 0)
    return;

  chat.msgForm.content = content;

  // 如果有图片，先发送图片
  if (imageFiles.length > 0) {
    if (imageFiles.length >= MAX_UPLOAD_IMAGE_COUNT) {
      ElMessage.warning(`最多只能发送${MAX_UPLOAD_IMAGE_COUNT}张图片！`);
      return;
    }
    chat.msgForm.msgType = MessageType.IMG;
    // 发送图片
    await handleImageSubmit(imageFiles);
    return;
  }

  // 处理文本
  if (chat.msgForm.msgType === MessageType.TEXT && (!content || content.length > maxContentLen.value)) {
    ElMessage.warning(`消息长度应小于${maxContentLen.value}字符！`);
    return;
  }

  // 发送请求
  isSending.value = true;
  await onSubmit().finally(() => {
    isSending.value = false;
  });
}

/**
 * 处理图片发送
 */
async function handleImageSubmit(files: File[]) {
  try {
    isSending.value = true;
    // 上传每一张图片
    let doneCount = 0;
    for (const file of files) {
      const done = await uploadFile("image", file);
      if (done) {
        doneCount += 1;
      }
    }
    // 校验
    if (doneCount === 0) {
      return false;
    }
    else if (doneCount !== files.length) {
      console.log("部分上传失败！");
      return false;
    }
    await onSubmit();

    // 清空编辑器
    clearInputContent();
    imageManager.clear();
  }
  catch (error) {
    console.error("发送图片失败:", error);
    ElMessage.error("发送图片失败，请稍后再试！");
  }
  finally {
    isSending.value = false;
  }
}

async function onSubmit() {
  const formDataTemp = JSON.parse(JSON.stringify(chat.msgForm));
  // 文本类
  if (chat.msgForm.content) {
    if (document.querySelector(".at-select")) // enter冲突at选择框
      return;

    if (chat.theContact.type === RoomType.GROUP) { // 处理 @用户
      const atUidList = resolveContentAtUsers();
      if (atUidList?.length) {
        chat.atUserList = atUidList;
        // 将 atUidList 转换为 mentionList 格式
        formDataTemp.body.mentionList = atUidList.map(item => ({
          uid: item.userId,
          displayName: `@${item.nickName}`,
        }));
      }
    }

    // 处理 AI机器人 TODO: 可改为全体呼叫
    const { replaceText, aiRobitUidList } = resolveAiReply(formDataTemp.content, aiOptions.value, chat.askAiRobotList);
    if (aiRobitUidList.length > 0) {
      if (!replaceText)
        return false;
      formDataTemp.content = replaceText;
      formDataTemp.body = {
        // userId: aiRobitUidList?.[0],
        // modelCode: 1,
        userIds: aiRobitUidList.length > 0 ? aiRobitUidList : undefined,
        businessCode: AiBusinessType.TEXT,
      } as AiChatBodyDTO;
      formDataTemp.msgType = MessageType.AI_CHAT; // 设置对应消息类型
    }
  };
  // 图片
  if (formDataTemp.msgType === MessageType.IMG) {
    if (isUploadImg.value) {
      ElMessage.warning("图片正在上传中，请稍等！");
      return false;
    }
    if (imgList.value.length > 1) {
      return await multiSubmitImg(formDataTemp);
    }
  }
  // 文件
  if (formDataTemp.msgType === MessageType.FILE) {
    if (isUploadFile.value) {
      ElMessage.warning("文件正在上传中，请稍等！");
      return false;
    }
    if (fileList.value.length > 1) {
      return await multiSubmitFile(formDataTemp);
    }
  }
  // 视频
  if (formDataTemp.msgType === MessageType.VIDEO) {
    if (isUploadVideo.value) {
      ElMessage.warning("视频正在上传中，请稍等！");
      return false;
    }
    if (videoList.value.length > 1) {
      return await multiSubmitVideo(formDataTemp);
    }
  }
  // 开始提交
  isSending.value = true;
  // 1) 语音消息
  if (formDataTemp.msgType === MessageType.SOUND) {
    await onSubmitSound((key) => {
      formDataTemp.body.url = key;
      formDataTemp.body.translation = audioTransfromText.value;
      formDataTemp.body.second = second.value;
      submitToQueue(formDataTemp);
    });
    return true;
  }
  // 2) AI私聊
  if (isAiRoom.value) {
    const content = formDataTemp.content?.trim();
    if (!content)
      return false;
    if (!chat.theContact?.targetUid) {
      if (!chat.theContact.roomId || !chat.theContact.type) {
        ElMessage.error("房间信息不完整！");
        return false;
      }
      await chat.reloadBaseContact(chat.theContact.roomId, chat.theContact.type);
    }
    await submitToQueue({
      roomId: chat.theRoomId!,
      msgType: MessageType.AI_CHAT, // AI消息
      content,
      body: {
        userIds: [chat.theContact?.targetUid],
        businessCode: AiBusinessType.TEXT,
      } as AiChatBodyDTO,
    });
    return true;
  }
  // 3) 普通消息
  await submitToQueue(formDataTemp);
  return true;
}

/**
 * 消息发送配置接口
 */
interface MessageSubmitConfig extends ChatMessageDTO {
  _skipReset?: boolean;
  validateFn?: () => boolean | string;
  prepareData?: () => Partial<ChatMessageDTO>;
}

/**
 * 统一的消息提交方法
 */
async function submitMessage(
  config: MessageSubmitConfig | ChatMessageDTO,
  callback?: (msg: ChatMessageVO) => void,
) {
  const roomId = chat.theRoomId!;

  // 如果传入的是ChatMessageDTO，直接使用
  let formData: ChatMessageDTO;
  if ("msgType" in config && typeof config.msgType === "number") {
    formData = config as ChatMessageDTO;
  }
  else {
    const msgConfig = config as MessageSubmitConfig;

    // 执行验证
    if (msgConfig.validateFn) {
      const validation = msgConfig.validateFn();
      if (typeof validation === "string") {
        ElMessage.error(validation);
        return;
      }
      if (!validation)
        return;
    }

    // 准备数据
    const preparedData = msgConfig.prepareData?.() || {};

    formData = {
      roomId,
      msgType: msgConfig.msgType as CanSendMessageType,
      content: msgConfig.content || "",
      body: { ...msgConfig.body, ...preparedData.body },
      ...preparedData,
    };
  }

  // 添加到消息队列
  chat.addToMessageQueue(formData, (msg: ChatMessageVO) => {
    emit("submit", msg);
    if (!(config as MessageSubmitConfig)._skipReset) {
      resetForm();
    }
    callback?.(msg);
  });

  if (!(config as MessageSubmitConfig)._skipReset) {
    resetForm();
  }
  isSending.value = false;
}

/**
 * 批量发送图片消息
 */
async function multiSubmitImg(rawMsgFormData: ChatMessageDTO) {
  isSending.value = true;
  const uploadedFiles = new Set();

  // 批量发送图片
  for (const file of imgList.value) {
    await submitMessage({
      roomId: chat.theRoomId!,
      msgType: MessageType.IMG,
      content: "",
      body: {
        url: file.key!,
        width: file.width || 0,
        height: file.height || 0,
        size: file?.file?.size || 0,
      },
      _skipReset: true,
    });
    uploadedFiles.add(file.key);
  }

  // 清理已上传的图片
  imgList.value = imgList.value.filter(file => !uploadedFiles.has(file.key));

  // 发送文本消息
  if (rawMsgFormData.content) {
    await submitMessage({
      roomId: chat.theRoomId!,
      msgType: MessageType.TEXT,
      content: rawMsgFormData.content,
      body: {
        ...rawMsgFormData.body,
        url: undefined,
        width: undefined,
        height: undefined,
        size: undefined,
      },
      _skipReset: true,
    });
  }

  resetForm();
  isSending.value = false;
}

/**
 * 批量发送文件消息
 */
async function multiSubmitFile(rawMsgFormData: ChatMessageDTO) {
  isSending.value = true;
  const uploadedFiles = new Set();

  // 批量发送文件
  for (const file of fileList.value) {
    await submitMessage({
      roomId: chat.theRoomId!,
      msgType: MessageType.FILE,
      content: "",
      body: {
        fileName: file?.file?.name || Date.now().toString(),
        url: file.key!,
        size: file?.file?.size || 0,
      },
      _skipReset: true,
    });
    uploadedFiles.add(file.key);
  }

  // 清理已上传的文件
  fileList.value = fileList.value.filter(file => !uploadedFiles.has(file.key));

  // 发送文本消息
  if (rawMsgFormData.content) {
    await submitMessage({
      roomId: chat.theRoomId!,
      msgType: MessageType.TEXT,
      content: rawMsgFormData.content,
      body: {
        ...rawMsgFormData.body,
        fileName: undefined,
        url: undefined,
        size: undefined,
      },
      _skipReset: true,
    });
  }

  resetForm();
  isSending.value = false;
}

/**
 * 批量发送视频消息
 */
async function multiSubmitVideo(rawMsgFormData: ChatMessageDTO) {
  isSending.value = true;
  const uploadedFiles = new Set();

  // 批量发送视频
  for (const file of videoList.value) {
    const thumb = file.children?.[0];
    await submitMessage({
      roomId: chat.theRoomId!,
      msgType: MessageType.VIDEO,
      content: "",
      body: {
        url: file.key,
        size: file.file?.size || 0,
        duration: thumb?.duration || 0,
        thumbUrl: thumb?.key,
        thumbSize: thumb?.thumbSize,
        thumbWidth: thumb?.thumbWidth,
        thumbHeight: thumb?.thumbHeight,
      },
      _skipReset: true,
    });
    uploadedFiles.add(file.key);
  }

  // 清理已上传的视频
  videoList.value = videoList.value.filter(file => !uploadedFiles.has(file.key));

  // 发送文本消息
  if (rawMsgFormData.content) {
    await submitMessage({
      roomId: chat.theRoomId!,
      msgType: MessageType.TEXT,
      content: rawMsgFormData.content,
      body: {
        ...rawMsgFormData.body,
        url: undefined,
        size: undefined,
        duration: undefined,
        thumbUrl: undefined,
        thumbSize: undefined,
        thumbWidth: undefined,
        thumbHeight: undefined,
      },
      _skipReset: true,
    });
  }

  resetForm();
  isSending.value = false;
}

/**
 * 将消息提交到队列
 */
async function submitToQueue(formData: ChatMessageDTO = chat.msgForm, callback?: (msg: ChatMessageVO) => void) {
  const roomId = chat.theRoomId!;

  // 添加到消息队列
  chat.addToMessageQueue({
    ...formData,
    roomId,
  }, (msg: ChatMessageVO) => {
    // 发送信息后触发
    emit("submit", msg);
    typeof callback === "function" && callback(msg); // 执行回调
  });

  // 重置表单
  resetForm();
  isSending.value = false;
}
/**
 * 发送群通知消息
 */
function onSubmitGroupNoticeMsg(formData: ChatMessageDTO) {
  const replyMsgId = chat.msgForm?.body?.replyMsgId;
  const body = formData?.body as any;

  submitMessage({
    roomId: chat.theRoomId!,
    msgType: MessageType.GROUP_NOTICE,
    content: formData.content,
    validateFn: () => {
      if (!isLord.value) {
        return "仅群主可发送群通知消息！";
      }
      return true;
    },
    body: {
      noticeAll: body?.noticeAll,
      imgList: body?.imgList,
      replyMsgId: body?.replyMsgId || replyMsgId || undefined,
    },
  });
}

// onSubmitUploadPreview
function onSubmitUploadPreview(content?: string) {
  // content
  chat.msgForm.content = content || "";
  onSubmit();
}

/**
 * 发送语音
 * @param callback 上传成功回调
 */
async function onSubmitSound(callback: (key: string) => void) {
  if (!theAudioFile.value || !theAudioFile?.value?.id) {
    isSending.value = false;
    return false;
  }

  return await useOssUpload(OssFileType.SOUND, theAudioFile.value as OssFile, user.getToken, {
    callback(event, data, file) {
      if (event === "error") {
        isSending.value = false;
        ElMessage.error("发送语音失败，请稍后再试！");
      }
      else if (event === "success") {
        callback(data);
      }
    },
  });
}

// 重置表单
function resetForm() {
  chat.msgForm = {
    roomId: chat.theRoomId!,
    msgType: MessageType.TEXT, // 默认
    content: "",
    body: {
      mentionList: [],
    },
  };
  clearInputContent();
  imageManager.clear();
  imgList.value = [];
  fileList.value = [];
  videoList.value = []; // 清空视频
  // store
  chat.atUserList.splice(0);
  chat.askAiRobotList.splice(0);

  // 重置上传
  inputOssImgUploadRef.value?.resetInput?.();
  inputOssFileUploadRef.value?.resetInput?.();
  inputOssVideoUploadRef.value?.resetInput?.();
  isSending.value = false;
  chat.setReplyMsg({});
  resetAudio();

  // 清除@和AI选择
  resetOptions();
}

/**
 * 右键菜单
 * @param e 事件对象
 * @param key key
 * @param index 索引
 */
function onContextFileMenu(e: MouseEvent, key?: string, index: number = 0, type: OssFileType = OssFileType.IMAGE) {
  e.preventDefault();
  const textMap = {
    [OssFileType.IMAGE]: "图片",
    [OssFileType.FILE]: "文件",
    [OssFileType.VIDEO]: "视频",
    [OssFileType.SOUND]: "语音",
  } as Record<OssFileType, string>;
  const opt = {
    x: e.x,
    y: e.y,
    theme: setting.contextMenuTheme,
    items: [
      {
        customClass: "group",
        icon: "i-solar:trash-bin-minimalistic-outline group-btn-danger",
        label: `撤销${textMap[type]}`,
        onClick: async () => {
          if (!key)
            return;
          removeOssFile(type, key, index);
        },
      },
    ],
  };
  ContextMenuGlobal.showContextMenu(opt);
}

function removeOssFile(type: OssFileType = OssFileType.IMAGE, key?: string, index: number = 0) {
  const filesMap: Record<OssFileType, (Ref<OssFile[]> | undefined)> = {
    [OssFileType.IMAGE]: imgList,
    [OssFileType.FILE]: fileList,
    [OssFileType.VIDEO]: videoList,
    [OssFileType.SOUND]: undefined,
    [OssFileType.FONT]: undefined,
  };

  const targetList = filesMap[type];
  if (!targetList || !key)
    return;

  const item = targetList.value.find(f => f.key === key);
  if (item) {
    item.subscribe.unsubscribe();
    const keys = [key, ...(item.children || []).map(f => f.key)];
    keys.forEach(k => k && deleteOssFile(k, user.getToken));
  }

  // 重置上传组件
  ElMessage.closeAll("error");
  const resetFunctions = [
    inputOssFileUploadRef?.value?.resetInput,
    inputOssImgUploadRef?.value?.resetInput,
    inputOssVideoUploadRef?.value?.resetInput,
  ];
  resetFunctions.forEach(fn => fn?.());

  // 移除文件
  targetList.value.splice(index, 1);

  // 如果列表为空，重置消息类型
  if (targetList.value.length === 0) {
    chat.msgForm.msgType = MessageType.TEXT;
    chat.msgForm.body.url = undefined;
  }
}

// 移动端工具栏
const showMobileTools = ref(false);
watch(
  () => [chat.isOpenContact, isSoundRecordMsg, inputFocus],
  ([open, rcord, focus]) => {
    if (open || rcord || focus)
      showMobileTools.value = false;
  },
  {
    immediate: true,
    deep: true,
  },
);

// 移动端工具栏配置
interface ToolItem {
  id: string;
  icon: string;
  label: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}
const mobileTools = computed(() => {
  const tools: ToolItem[] = [
    {
      id: "image",
      icon: "i-solar:album-bold",
      label: "相册",
      disabled: isDisabledFile.value,
      onClick: () => inputOssImgUploadRef.value?.openSelector?.({ accept: "image/*" }),
    },
    // 拍摄
    {
      id: "camera",
      icon: "i-solar:camera-bold",
      label: "拍摄",
      disabled: isDisabledFile.value,
      onClick: () => inputOssImgUploadRef.value?.openSelector?.({ accept: "image/*", capture: "environment" }),
    },
    {
      id: "video",
      icon: "i-solar:video-library-line-duotone",
      label: "视频",
      disabled: isDisabledFile.value,
      onClick: () => inputOssVideoUploadRef.value?.openSelector?.({ accept: "video/*" }),
    },
    // 录视频
    {
      id: "video-record",
      icon: "i-solar:videocamera-add-bold",
      label: "录视频",
      disabled: isDisabledFile.value,
      onClick: () => inputOssVideoUploadRef.value?.openSelector?.({ accept: "video/*", capture: "environment" }),
    },
    {
      id: "file",
      icon: "i-solar-folder-with-files-bold",
      label: "文件",
      disabled: isDisabledFile.value,
      onClick: () => inputOssFileUploadRef.value?.openSelector?.({ }),
    },
  ];

  // 群主可以发送群通知
  if (isLord.value) {
    tools.push({
      id: "notice",
      icon: "i-carbon:bullhorn",
      label: "群通知",
      onClick: () => showGroupNoticeDialog.value = true,
    });
  }

  // 私聊可以语音/视频通话
  if (isSelfRoom.value) {
    tools.push(
      {
        id: "audio-call",
        icon: "i-solar:phone-calling-bold",
        label: "语音通话",
        onClick: () => chat.openRtcCall(chat.theRoomId!, CallTypeEnum.AUDIO),
      },
      {
        id: "video-call",
        icon: "i-solar:videocamera-record-bold",
        label: "视频通话",
        onClick: () => chat.openRtcCall(chat.theRoomId!, CallTypeEnum.VIDEO),
      },
    );
  }

  return tools;
});

// 到底部并消费消息
function setReadAndScrollBottom() {
  if (chat.theRoomId) {
    chat.setReadRoom(chat.theRoomId);
    chat.scrollBottom();
  }
}

// watch
// 房间号变化
watch(() => chat.theRoomId, (newVal, oldVal) => {
  if (newVal === oldVal) {
    return;
  }
  resetForm();
  // 加载数据
  loadUser();
  loadAi(newVal);
  // 移动端与动画兼容
  loadInputTimer.value && clearTimeout(loadInputTimer.value);
  if (!setting.isMobileSize) {
    loadInputDone.value = true;
    nextTick(() => {
      selectionManager.focusAtEnd();
    });
  }
  else {
    loadInputTimer.value = setTimeout(() => {
      loadInputDone.value = true;
    }, 300);
  }
}, {
  immediate: true,
});

// 回复消息
watch(() => chat.replyMsg?.message?.id, (val) => {
  chat.msgForm.body = {
    ...chat.msgForm.body,
    replyMsgId: val,
  };
  nextTick(() => {
    selectionManager.focusAtEnd();
  });
});

// 生命周期
onMounted(() => {
  // 监听快捷键
  window.addEventListener("keydown", startAudio);

  nextTick(() => {
    selectionManager.focusAtEnd()
    ;
  });
  // At 用户
  mitter.on(MittEventType.CHAT_AT_USER, (e) => {
    if (isReplyAI.value) {
      // TODO: 待后期考虑添加引用@信息，让去理解
      ElMessage.warning("当前使用AI机器人无法@其他人");
      return;
    }
    const { type, payload: userId } = e;
    const user = userOptions.value.find(u => u.userId === userId);
    if (!user)
      return ElMessage.warning("该用户不可艾特！");

    if (type === "add") {
      // 检查是否已经存在该用户标签
      const existingTag = msgInputRef.value?.querySelector(`[data-uid="${user.userId}"]`);
      if (existingTag)
        return;

      selectionManager.focusAtEnd()
      ;
      insertAtUserTag(user);
    }
    else if (type === "remove") {
      // 移除指定用户的标签
      const userTag = msgInputRef.value?.querySelector(`[data-uid="${user.userId}"]`);
      if (userTag) {
        userTag.remove();
        updateFormContent();
      }
    }
  });

  // / 询问ai机器人
  mitter.on(MittEventType.CAHT_ASK_AI_ROBOT, (e) => {
    const { type, payload: userId } = e;
    const robot = aiOptions.value.find(u => u.userId === userId);
    if (type === "add" && robot) {
      // 检查是否已经存在该机器人标签
      const existingTag = msgInputRef.value?.querySelector(`[data-uid="${robot.userId}"]`);
      if (existingTag)
        return;

      selectionManager.focusAtEnd()
      ;
      insertAiRobotTag(robot);
    }
  });

  // 处理聚焦
  mitter.on(MittEventType.MSG_FORM, ({ type, payload }) => {
    if (type === "focus") {
      selectionManager.focusAtEnd();
    }
    else if (type === "blur") {
      msgInputRef.value?.blur();
    }
    else if (type === "update") {
      // 更新输入框内容
      chat.msgForm = {
        ...payload,
      };
      // 清空输入框
      clearInputContent();
      // 插入新内容
      if (msgInputRef.value) {
        msgInputRef.value.textContent = payload.content || "";
        // 更新表单内容
        updateFormContent();
        // 聚焦到末尾
        selectionManager.focusAtEnd();
      }
      updateFormContent();
    }
  });
});

onUnmounted(() => {
  mitter.off(MittEventType.CAHT_ASK_AI_ROBOT);
  mitter.off(MittEventType.CHAT_AT_USER);
  loadInputTimer.value && clearTimeout(loadInputTimer.value);
  window.removeEventListener("keydown", startAudio);
});

onDeactivated(() => {
  showMobileTools.value = false;
});

defineExpose({
  resetForm,
  onContextFileMenu,
  onClickOutside: () => {
    showMobileTools.value = false;
  },
  focus: selectionManager.focusAtEnd,
  getSelectionRange: () => selectionRange.value,
  updateSelectionRange,
});
</script>

<template>
  <el-form
    ref="formRef"
    :model="chat.msgForm"
    v-bind="$attrs"
    :disabled="isDisabledFile"
  >
    <!-- 拖拽上传遮罩 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isDragDropOver"
          key="drag-over"
          :data-tauri-drag-region="setting.isDesktop"
          class="fixed left-0 top-0 z-3000 h-full w-full flex select-none items-center justify-center border-default card-rounded-df backdrop-blur"
        >
          <div class="flex-row-c-c flex-col border-(1px [--el-border-color] dashed) card-default-br rounded-4 p-6 text-small transition-all hover:(border-1px border-[--el-color-primary] border-solid) sm:p-12 !hover:text-color">
            <i class="i-solar:upload-minimalistic-linear p-4" />
            <p class="mt-4 text-0.8rem sm:text-1rem">
              拖拽文件到此处上传
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- 预览 -->
    <ChatMsgAttachview
      :img-list="[]"
      :video-list="setting.isMobileSize ? [] : videoList"
      :file-list="setting.isMobileSize ? [] : fileList"
      :reply-msg="chat.replyMsg"
      :the-contact="chat.theContact"
      :default-loading-icon="defaultLoadingIcon"
      :context-menu-theme="setting.contextMenuTheme"
      @remove-file="removeOssFile"
      @show-video="showVideoDialog"
      @clear-reply="chat.setReplyMsg({})"
      @scroll-bottom="setReadAndScrollBottom"
    />
    <div class="form-contain">
      <!-- 工具栏 TODO: AI机器人暂不支持 -->
      <template v-if="!isAiRoom">
        <div
          class="relative h-9 flex flex-shrink-0 items-center gap-3 px-2"
        >
          <el-tooltip popper-style="padding: 0.2em 0.5em;" :content="!isSoundRecordMsg ? (setting.isMobileSize ? '语音' : '语音 Ctrl+T') : '键盘'" placement="top">
            <i
              :class="!isSoundRecordMsg ? 'i-solar:microphone-3-broken hover:animate-pulse' : 'i-solar:keyboard-broken'"
              class="h-6 w-6 btn-primary cursor-pointer"
              @click="chat.msgForm.msgType = chat.msgForm.msgType === MessageType.TEXT ? MessageType.SOUND : MessageType.TEXT"
            />
          </el-tooltip>
          <!-- 语音 -->
          <template v-if="isSoundRecordMsg">
            <div v-show="!theAudioFile?.id" class="absolute-center-x">
              <BtnElButton
                ref="pressHandleRef"
                type="primary" class="group tracking-0.1em hover:shadow"
                :class="{ 'is-chating': isChating }"
                style="padding: 0.8rem 3rem;"
                round
                size="small"
              >
                <i i-solar:soundwave-line-duotone class="icon" p-2.5 />
                <div class="text w-5rem truncate text-center transition-width group-hover:(w-6rem sm:w-8rem) sm:w-8rem">
                  <span class="chating-hidden">{{ isChating ? `正在输入 ${second}s` : (setting.isMobileSize ? '语音' : '语音 Ctrl+T') }}</span>
                  <span hidden class="chating-show">停止录音 {{ second ? `${second}s` : '' }}</span>
                </div>
              </BtnElButton>
            </div>
            <div v-show=" theAudioFile?.id" class="absolute-center-x">
              <i p-2.4 />
              <BtnElButton
                type="primary"
                class="group tracking-0.1em op-60 hover:op-100" :class="{ 'is-chating !op-100': isPalyAudio }"
                style="padding: 0.8rem 3rem;" round size="small"
                @click="handlePlayAudio(isPalyAudio ? 'stop' : 'play', theAudioFile?.id)"
              >
                {{ second ? `${second}s` : '' }}
                <i :class="isPalyAudio ? 'i-solar:stop-bold' : 'i-solar:play-bold'" class="icon" ml-2 p-1 />
              </BtnElButton>
              <i
                i-solar:trash-bin-minimalistic-broken ml-3 btn-danger p-2.4
                @click="handlePlayAudio('del')"
              />
            </div>
            <BtnElButton
              v-if="setting.isMobileSize"
              :disabled="!user.isLogin || isSending || isNotExistOrNorFriend"
              type="primary"
              round
              style="height: 1.8rem !important;"
              class="ml-a w-3.6rem text-xs tracking-0.1em"
              :loading="isBtnLoading"
              @click="handleSubmit()"
            >
              发送
            </BtnElButton>
          </template>
          <!-- 非语音 -->
          <template v-else>
            <div v-show="!setting.isMobileSize" class="grid cols-4 items-center gap-3 sm:flex sm:gap-4">
              <!-- 图片 -->
              <InputOssFileUpload
                ref="inputOssImgUploadRef"
                v-model="imgList"
                :multiple="true"
                :preview="false"
                :size="setting.systemConstant.ossInfo?.image?.fileSize"
                :min-size="1024"
                :limit="9"
                :auto-upload="false"
                :disable="isDisabledFile"
                class="i-solar:album-line-duotone h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)"
                pre-class="hidden"
                :upload-type="OssFileType.IMAGE"
                input-class="op-0 h-6 w-6 sm:(w-5 h-5) cursor-pointer "
                @error-msg="(msg:string) => {
                  ElMessage.error(msg)
                }"
                @submit="onSubmitImg"
                @on-change="onOssImgChange"
              />
              <!-- 视频 -->
              <InputOssFileUpload
                ref="inputOssVideoUploadRef"
                v-model="videoList"
                :size="setting.systemConstant.ossInfo?.video?.fileSize"
                :min-size="1024"
                :multiple="true"
                :limit="9"
                :preview="false"
                :disable="isDisabledFile"
                class="i-solar:video-library-line-duotone h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)"
                pre-class="hidden"
                :upload-type="OssFileType.VIDEO"
                input-class="op-0 h-6 w-6 sm:(w-5 h-5) cursor-pointer "
                accept=".mp4,.webm,.mpeg,.flv"
                @error-msg="(msg:string) => {
                  ElMessage.error(msg)
                }"
                @submit="onSubmitVideo"
              />
              <!-- 文件 -->
              <InputOssFileUpload
                ref="inputOssFileUploadRef"
                v-model="fileList"
                :size="setting.systemConstant.ossInfo?.file?.fileSize"
                :min-size="1024"
                :preview="false"
                :multiple="true"
                :limit="9"
                :disable="isDisabledFile"
                class="i-solar-folder-with-files-line-duotone h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)"
                pre-class="hidden"
                :upload-type="OssFileType.FILE"
                input-class="op-0 h-6 w-6 sm:(w-5 h-5) cursor-pointer "
                :accept="FILE_UPLOAD_ACCEPT"
                @error-msg="(msg:string) => {
                  ElMessage.error(msg)
                }"
                @submit="onSubmitFile"
              />
            </div>
            <!-- AI机器人选择器 -->
            <el-select
              v-if="aiOptions.length > 0"
              v-model="chat.askAiRobotList"
              placeholder="AI助手"
              size="small"
              style="width: 9rem;"
              :multiple-limit="6"
              no-match-text="没有找到机器人"
              :fallback-placements="['top']"
              no-data-text="暂无机器人"
              placement="top"
              tag-type="primary"
              tag-effect="dark"
              :show-arrow="false"
              class="group ai-select text-1rem text-color"
              :class="{ 'selected-items': chat.askAiRobotList.length > 0 }"
              popper-class="w-9rem global-custom-select"
              :offset="8"
              :value-on-clear="undefined"
              clearable teleported collapse-tags multiple
              :max-collapse-tags="2"
            >
              <template #footer>
                <el-button text bg size="small" class="w-full" :disabled="!chat.askAiRobotList.length" @click="chat.askAiRobotList = []">
                  清除选择{{ chat.askAiRobotList.length > 0 ? `（已选${chat.askAiRobotList.length}）` : '' }}
                </el-button>
              </template>
              <template #prefix>
                <i class="robot-select-icon" />
              </template>
              <template #label="{ value }">
                <CardAvatar
                  class="h-5 w-5 shrink-0 rounded-1/2 bg-color"
                  :src="BaseUrlImg + value.avatar"
                  :title="value.label"
                />
              </template>
              <el-option
                v-for="item in aiOptions"
                :key="item.userId"
                :label="item.nickName"
                :value="item"
              >
                <div class="h-full w-8em flex items-center pr-1" :title="item.label">
                  <CardAvatar class="h-6 w-6 shrink-0 border-default rounded-1/2 bg-color" :src="BaseUrlImg + item.avatar" />
                  <span class="ml-2 flex-1 truncate text-xs text-color">{{ item.label }}</span>
                </div>
              </el-option>
            </el-select>
            <i ml-a block w-0 />
            <!-- 群通知消息 -->
            <div
              v-if="isLord"
              title="群通知消息"
              class="i-carbon:bullhorn inline-block btn-primary p-3.2 transition-200 sm:p-2.8"
              @click="showGroupNoticeDialog = true"
            />
            <template v-if="isSelfRoom && !setting.isMobileSize">
              <!-- 语音通话 -->
              <div
                title="语音通话"
                class="i-solar:phone-calling-outline btn-primary p-3 transition-200 sm:p-2.8"
                @click="chat.openRtcCall(chat.theRoomId!, CallTypeEnum.AUDIO)"
              />
              <!-- 视频通话 -->
              <div
                title="视频通话"
                class="i-solar:videocamera-record-line-duotone btn-primary p-3.2 transition-200 sm:p-2.8"
                @click="chat.openRtcCall(chat.theRoomId!, CallTypeEnum.VIDEO)"
              />
            </template>
            <!-- 工具栏打开扩展 -->
            <span
              class="i-solar:add-circle-linear inline-block btn-primary p-3 transition-200 sm:hidden"
              :class="{ 'rotate-45': showMobileTools }"
              @click="showMobileTools = !showMobileTools"
            />
          </template>
        </div>
        <!-- 录音 -->
        <p
          v-if="isSoundRecordMsg"
          class="relative max-h-3.1rem min-h-3.1rem w-full flex-row-c-c flex-1 overflow-y-auto text-wrap text-small sm:(h-fit max-h-full p-6)"
        >
          {{ (isChating && speechRecognition.isSupported || theAudioFile?.id) ? (audioTransfromText || '...') : `识别你的声音 🎧${speechRecognition.isSupported ? '' : '（不支持）'}` }}
        </p>
      </template>
      <!-- 富文本输入框 -->
      <div
        v-if="!isSoundRecordMsg"
        ref="focusRef"
        class="input-wrapper relative h-fit w-full"
      >
        <!-- 拖拽悬停效果 -->
        <div
          v-if="isOverDropZone"
          key="drag-over"
          class="absolute left-0 top-0 z-999 h-full w-full flex-row-c-c select-none border-default-dashed card-rounded-df text-small backdrop-blur"
        >
          <i class="i-solar:upload-minimalistic-linear mr-2 p-2.6" />
          拖拽文件到此处上传
        </div>
        <el-scrollbar
          :max-height="setting.isMobileSize ? (showMobileTools ? '2.4rem' : '30vh') : '10rem'"
          class="h-full w-full flex-1"
          wrap-class="h-full transition-max-height rounded bg-color-3 sm:(!bg-transparent rounded-0)"
          view-class="h-full"
        >
          <div
            id="message-input"
            ref="msgInputRef"
            class="rich-editor"
            :class="{ focused: inputFocus }"
            :contenteditable="!isNotExistOrNorFriend"
            spellcheck="false"
            :data-placeholder="!setting.isMobileSize && aiOptions.length ? '输入 / 唤起AI助手' : ''"
            @input="handleInput"
            @paste="handlePasteEvent"
            @keydown="handleKeyDown"
            @focus="showMobileTools = false"
            @contextmenu.self="onContextMenu"
            @compositionend="updateSelectionRange"
          />
        </el-scrollbar>
        <!-- @用户选择框 -->
        <div
          v-if="showAtOptions && filteredUserAtOptions.length > 0"
          class="at-options"
          :style="{
            left: `${optionsPosition.left}px`,
            top: `${optionsPosition.top}px`,
            width: `${optionsPosition.width}px`,
          }"
        >
          <ListVirtualScrollList
            ref="atScrollbar"
            :items="filteredUserAtOptions"
            :selected-index="selectedAtItemIndex"
            :item-height="32"
            max-height="12rem"
            wrap-class="px-1.5"
            class-name="py-1.5"
            class="py-1.5"
            item-class="at-item"
            active-class="active"
            @item-click="(item) => handleSelectAtUser(item)"
            @item-hover="(item, index) => selectedAtItemIndex = index"
          >
            <template #default="{ item }">
              <CardAvatar class="avatar" :src="BaseUrlImg + item.avatar" />
              <span class="name">{{ item.nickName }}</span>
            </template>
          </ListVirtualScrollList>
        </div>
        <!-- AI机器人选择框 -->
        <div
          v-if="showAiOptions && filteredAiOptions.length > 0"
          class="ai-options"
          :style="{
            left: `${optionsPosition.left}px`,
            top: `${optionsPosition.top}px`,
            width: `${optionsPosition.width}px`,
          }"
        >
          <ListVirtualScrollList
            ref="aiScrollbar"
            :items="filteredAiOptions"
            :item-height="32"
            :selected-index="selectedAiItemIndex"
            item-class="ai-item"
            active-class="active"
            max-height="12rem"
            wrap-class="px-1.5"
            class-name="py-1.5"
            @item-click="handleSelectAiRobot"
            @item-hover="(item, index) => selectedAiItemIndex = index"
          >
            <template #default="{ item }">
              <CardAvatar class="avatar" :src="BaseUrlImg + item.avatar" />
              <span class="name">{{ item.nickName }}</span>
            </template>
          </ListVirtualScrollList>
        </div>

        <BtnElButton
          v-if="setting.isMobileSize"
          :disabled="!user.isLogin || isSending || isNotExistOrNorFriend"
          type="primary"
          style="height: 2.2rem !important;"
          class="ml-2 mt-a w-4.4rem"
          :loading="isBtnLoading"
          @click="handleSubmit()"
        >
          发送
        </BtnElButton>
      </div>

      <!-- 发送按钮 -->
      <div
        v-if="!setting.isMobileSize && !isSoundRecordMsg"
        class="hidden items-end sm:flex"
      >
        <div class="tip ml-a hidden text-mini sm:block">
          <p>
            <i i-solar:plain-2-line-duotone mr-1.8 p-1.6 />Enter
          </p>
          <p mt-1>
            <i i-solar:reply-2-bold-duotone mr-1 p-2 />Shift+Enter
          </p>
        </div>
        <BtnElButton
          class="group ml-a overflow-hidden card-rounded-df tracking-0.2em shadow sm:ml-2"
          type="primary"
          :disable="isNotExistOrNorFriend"
          :icon-class="isSending || isNotExistOrNorFriend ? '' : 'i-solar:plain-2-line-duotone mr-1.6'"
          size="small"
          :loading="isBtnLoading"
          style="padding: 0.8rem;width: 6rem;"
          @click="handleSubmit()"
        >
          发送&nbsp;
        </BtnElButton>
      </div>
      <!-- 已经不是好友 -->
      <div
        v-show="isNotExistOrNorFriend"
        class="absolute left-0 top-0 h-full w-full flex-row-c-c border-0 border-default border-t-1px tracking-2px shadow backdrop-blur-4px"
      >
        <span op-80>
          <i i-solar:adhesive-plaster-bold-duotone mr-3 p-2.4 />
          {{ chat.theContact.type !== undefined && SelfExistTextMap[chat?.theContact?.type] }}
        </span>
      </div>
    </div>
  </el-form>
  <!-- 移动端菜单栏 -->
  <Transition name="slide-height">
    <div
      v-if="showMobileTools && !isAiRoom && setting.isMobileSize"
      class="w-full overflow-hidden"
    >
      <div class="grid-container h-32vh flex select-none overflow-hidden">
        <div class="grid grid-cols-4 my-a w-full gap-4 p-4">
          <div
            v-for="tool in mobileTools"
            :key="tool.id"
            class="flex-row-c-c flex-col gap-1 transition-200 hover:op-70"
            :class="[tool.className, tool.disabled ? 'op-50 pointer-events-none' : 'cursor-pointer']"
            @click="!tool.disabled ? tool.onClick?.() : undefined"
          >
            <span h-15 w-15 flex-row-c-c card-default>
              <i class="p-3.6" :class="[tool.icon]" />
            </span>
            <span class="text-xs">{{ tool.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  <!-- 新建通知 -->
  <ChatGroupNoticeMsgDialog v-model:show="showGroupNoticeDialog" @submit="onSubmitGroupNoticeMsg" />
  <!-- 上传预览弹窗 -->
  <ChatUploadPreviewDialog
    v-model:show="showUploadPreview"
    :target-contact="chat.theContact"
    :img-list="imgList"
    :video-list="videoList"
    :file-list="fileList"
    :input-props="{
      maxlength: maxContentLen,
    }"
    @remove-file="removeOssFile"
    @show-video="showVideoDialog"
    @clear-reply="chat.setReplyMsg({})"
    @scroll-bottom="setReadAndScrollBottom"
    @submit="onSubmitUploadPreview"
  />
</template>

<style lang="scss" scoped>
.form-contain {
  --at-apply: "card-bg-color sm:(!bg-transparent h-62) relative flex flex-col justify-between px-4 pb-4 pt-1  sm:(p-2 pt-1)";
  box-shadow: rgba(0, 0, 0, 0.04) 0px -4px 16px;
  .tip {
    --at-apply: "op-0 transition-100";
  }
  &:hover {
    .tip {
      --at-apply: "op-100";
    }
  }
}

.input-wrapper {
  --at-apply: "flex-1 mt-2 sm:mt-0";
  display: flex;
  position: relative;

  // 拖拽悬停效果样式
  .drag-overlay {
    background: rgba(255, 255, 255, 0.95);
    animation: fadeInDrag 0.2s ease-in-out;

    .drag-content {
      border: 2px dashed var(--el-border-color);
      background: var(--el-bg-color);
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--el-color-primary);
        border-style: solid;
        color: var(--el-color-primary);
        transform: scale(1.02);
      }

      i {
        color: var(--el-color-primary);
        font-size: 2rem;
      }
    }
  }

  .rich-editor {
    --at-apply: "text-0.9em flex-1 w-full h-full min-h-36px p-2 outline-none text-color ";
    caret-color: var(--el-color-primary);
    word-break: break-word;
    white-space: pre-wrap;

    &:empty:before {
      content: attr(data-placeholder);
      --at-apply: "text-mini line-height-none";
      pointer-events: none;
    }

    &:hover:before {
      --at-apply: "op-100";
    }
     // @用户标签样式
    :deep(.at-user-tag),
    // AI机器人标签样式
    :deep(.ai-robot-tag) {
      --at-apply: "";

      .at-user-inner {
        --at-apply: "inline text-0.9em pl-1 text-theme-primary dark:text-theme-info font-500";
      }
      .ai-robot-inner {
        --at-apply: "inline pr-2 pl-1 mr-1 py-1 cursor-pointer bg-color border-default-2-hover select-none text-0.8em card-rounded-df";
      }
      .ai-robot-inner {
        --at-apply: "text-";
      }
      .ai-robot-inner::before {
        content: "";
        --at-apply: "p-2 mr-1 text-theme-primary i-ri:robot-2-line";
      }
    }

    // 图片容器样式
    :deep(.image-container) {
      --at-apply: "inline-block relative mx-1";

      .inserted-image {
        --at-apply: "block hover:shadow-sm transition-200 rounded-1 border-default-2";
      }
      .image-delete-btn {
        --at-apply: "absolute -top-2 -right-2 w-5 h-5 text-xs bg-theme-danger text-white rounded-full cursor-pointer flex-row-c-c z-10 sm:opacity-0 transition-all duration-200";
        &:before {
          content: "";
          --at-apply: "i-carbon:close";
        }

        &:hover {
          --at-apply:  "scale-110";
        }
      }
      &:hover .image-delete-btn {
        --at-apply: "opacity-100";
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes fadeInDrag {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.at-options, .ai-options {
  --at-apply: "absolute z-99 bg-color border-default rounded-3 -translate-y-full w-160px";
  box-shadow: var(--el-box-shadow-light);

  :deep(.at-item),
  :deep(.ai-item) {
    --at-apply: "flex items-center px-2 py-1 cursor-pointer hover:bg-color-2 card-rounded-df";

    .avatar {
      --at-apply: "h-6 w-6 rounded-full border-default";
    }

    .name {
      --at-apply: "ml-2 flex-1 truncate text-xs";
    }

    &.active {
      --at-apply: "bg-color-2";
    }
  }
}

// 语音
.is-chating {
  --at-apply: "shadow";
  --shadow-color: var(--el-color-primary);
  --shadow-color2: var(--el-color-primary-light-3);
  outline: none !important;
  background-size: 400% 400%;
  transition: all 0.2s;
  animation: aniamte-poppup-pluse 1s linear infinite;
  background-image: linear-gradient(to right, var(--shadow-color2) 0%, var(--shadow-color) 50%,var(--shadow-color2) 100%);
  background-color: var(--shadow-color);
  border-color: var(--shadow-color);
  &:deep(.el-button) {
    outline: none !important;
  }
  &:hover .chating-hidden {
    --at-apply: "hidden";
  }
  &:hover .chating-show {
    --at-apply: "inline-block";
  }
  .icon {
    --at-apply: "animate-pulse";
  }
  .text {
    --at-apply: "w-6rem !sm:w-8rem";
  }
  &:hover {
    --at-apply: "shadow-md";
    --shadow-color: var(--el-color-danger);
    --shadow-color2: var(--el-color-danger-light-3);
    box-shadow: 0 0 0.8rem var(--shadow-color);
    animation-play-state: paused;
    background-color: var(-shadow-color);
    border-color: var(-shadow-color);
  }
}

@keyframes aniamte-poppup-pluse {
  0% {
    box-shadow: 0 0 0.5rem var(--shadow-color);
    background-position: 0% 50%;
  }
  50% {
    box-shadow: 0 0 1.2rem var(--shadow-color);
    background-position: 100% 50%;
  }
  100% {
    box-shadow: 0 0 0.5rem var(--shadow-color);
    background-position: 0% 50%;
  }
}

.play-btn {
  background-color: #7e7e7e7a;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px;
  --at-apply: "text-white  border-(2px solid #ffffff) bg-(gray-5 op-30) backdrop-blur-3px";
  .bg-blur {
    --at-apply: " bg-(gray-5 op-30) backdrop-blur";
  }
}

// 添加高度渐变动画
.slide-height-enter-active,
.slide-height-leave-active {
  height: 32vh;
  will-change: height, opacity;
  transition: height 0.2s ease, opacity 0.2s ease;
  opacity: 1;
  overflow: hidden;
}

.slide-height-enter-from,
.slide-height-leave-to {
  height: 0;
  opacity: 0;
}
.grid-container {
  transform-origin: top;
}

.ai-select {
  :deep(.el-select__wrapper) {
    --at-apply: "rounded-4 flex-row-c-c pr-3 pl-2 h-7 min-w-9rem w-fit !border-default !sm:border-(1px solid transparent) sm:!bg-transparent !shadow-none";
    &:hover,
    &.is-hoving,
    &.is-focused {
      --at-apply: "!border-default";
    }
    .el-select__placeholder {
      --at-apply: "!text-color tracking-0.1em op-80";
    }
    .el-tag {
      --at-apply: "text-light rounded-4 !h-fit min-h-5 w-5 p-0 bg-none border-none cursor-pointer";
      .el-tag__close {
        --at-apply: "hidden";
      }
    }
    .in-tooltip {
      --at-apply: "h-fit";
    }
    .el-select__tags-text {
      --at-apply: "flex-row-c-c";
    }
    .el-select__selected-item {
      animation: latter-slice-left 0.3s both;
      &.el-select__placeholder {
        animation: none;
      }
    }
  }
  .robot-select-icon {
    --at-apply: "text-color p-2.4 i-ri:robot-2-line";
  }

  &.selected-items {
    :deep(.el-select__wrapper) {
      --at-apply: "!border-default";
      .robot-select-icon {
        --at-apply: "bg-theme-primary";
      }
      .el-select__prefix {
        --at-apply: "relative";
        &::after {
          content: "";
          --at-apply: "absolute -z-1 inset-0 rounded-full bg-theme-primary animate-ping";
        }
      }
    }
  }
}
</style>
