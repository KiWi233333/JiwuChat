<script lang="ts" setup>
import type { ElForm, ElMention } from "element-plus";
import type { OssConstantItemType } from "~/init/system";
import ContextMenu from "@imengyu/vue3-context-menu";

const emit = defineEmits<{
  (e: "submit", newMsg: ChatMessageVO): void
}>();
const user = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();
const route = useRoute();

// 读取@用户列表 hook
const { userOptions, userAtOptions, loadUser } = useLoadAtUserList();
const { aiOptions, loadAi } = useLoadAiList();
const isReplyAI = computed(() => chat.msgForm.content?.startsWith("/") && aiOptions.value?.length > 0);
const isReplyAT = computed(() => chat.msgForm.content?.startsWith("@") && userOptions.value?.length > 0);
const mentionList = computed(() => isReplyAI.value ? aiOptions.value : isReplyAT.value ? userAtOptions.value : []);
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
const inputFocus = ref(false);

// ref
const inputContentRef = useTemplateRef<InstanceType<typeof ElMention>>("inputContentRef"); // 输入框
const formRef = useTemplateRef<InstanceType<typeof ElForm>>("formRef"); // 表单

// 是否在房间
const isNotExistOrNorFriend = computed(() => {
  const res = chat.theContact.selfExist === isTrue.FALESE;
  if (res) {
    inputContentRef.value?.input?.blur(); // 失去焦点
  }
  return res;
}); // 自己不存在 或 不是好友  || chat.contactMap?.[chat.theRoomId!]?.isFriend === isTrue.FALESE

// hooks
const isDisableUpload = computed(() => isAiRoom.value || route.path !== "/");
// Oss上传
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
  onPaste,
  listenDragDrop,
  unlistenDragDrop,
  showVideoDialog,
  inputOssImgUploadRef,
  inputOssVideoUploadRef,
  inputOssFileUploadRef,
} = useFileUpload({ img: "inputOssImgUploadRef", file: "inputOssFileUploadRef", video: "inputOssVideoUploadRef" }, isDisableUpload);
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

onMounted(() => {
  listenDragDrop(resolveFileUpload);
});
onUnmounted(() => {
  unlistenDragDrop();
});
async function resolveFileUpload(fileType: OssConstantItemType, file: File) {
  await uploadFile(fileType, file);
  await onSubmit();
}

/**
 * 发送消息
 */
async function handleSubmit() {
  if (isSending.value)
    return;
  formRef.value?.validate(async (action: boolean) => {
    if (!action)
      return;
    if (chat.msgForm.msgType === MessageType.TEXT && (!chat.msgForm.content || chat.msgForm.content?.trim().length > maxContentLen.value))
      return;
    // 发送请求
    await onSubmit().finally(() => {
      isSending.value = false;
    });
  });
}

async function onSubmit() {
  const formDataTemp = JSON.parse(JSON.stringify(chat.msgForm));
  if (chat.msgForm.content) {
    if (document.querySelector(".at-select")) { // enter冲突at选择框      return;
      if (chat.theContact.type === RoomType.GROUP) { // 处理 @用户
        const { mentionList } = resolveAtUsers(formDataTemp.content, userOptions.value);
        if (mentionList?.length) {
          chat.atUserList = [...mentionList.map(m => ({ userId: m.uid, nickName: m.displayName }))];
          formDataTemp.body.mentionList = [...mentionList];
        }
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
      await multiSubmitImg();
      return false;
    }
  }
  // 文件
  if (formDataTemp.msgType === MessageType.FILE && isUploadFile.value) {
    ElMessage.warning("文件正在上传中，请稍等！");
    return false;
  }
  // 视频
  if (formDataTemp.msgType === MessageType.VIDEO && isUploadVideo.value) {
    ElMessage.warning("视频正在上传中，请稍等！");
    return false;
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
      ElMessage.error("房间信息不完整！");
      return false;
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
    resetForm();
    typeof callback === "function" && callback(msg); // 执行回调
  });

  // 重置表单
  resetForm();
  isSending.value = false;
}

/**
 * 批量发送图片消息
 */
async function multiSubmitImg() {
  isSending.value = true;
  const formTemp = JSON.parse(JSON.stringify(chat.msgForm));
  // 批量发送图片消息
  const uploadedFiles = new Set(); // 用来跟踪已经上传的文件
  for (const file of imgList.value) {
    chat.msgForm = {
      roomId: chat.theRoomId!,
      msgType: MessageType.IMG, // 默认
      content: "",
      body: {
        url: file.key!,
        width: file.width || 0,
        height: file.height || 0,
        size: file?.file?.size || 0,
      },
    };
    await submitToQueue(chat.msgForm); // 提交到队列
    uploadedFiles.add(file.key); // 标记文件为已上传
  }
  // 一次性移除所有已上传的文件
  imgList.value = imgList.value.filter(file => !uploadedFiles.has(file.key));

  // 发送文本消息
  if (formTemp.content) {
    formTemp.body.url = undefined;
    formTemp.body.size = undefined;
    formTemp.msgType = MessageType.TEXT; // 默认
    chat.msgForm = {
      ...formTemp,
      roomId: chat.theRoomId!,
      msgType: MessageType.TEXT, // 默认
    };
    await submitToQueue(chat.msgForm);
  }
  isSending.value = false;
}

/**
 * 发送群通知消息
 */
function onSubmitGroupNoticeMsg(formData: ChatMessageDTO) {
  if (!isLord.value) {
    ElMessage.error("仅群主可发送群通知消息！");
    return;
  }
  const replyMsgId = chat.msgForm?.body?.replyMsgId;
  chat.msgForm = {
    roomId: chat.theRoomId!,
    msgType: MessageType.GROUP_NOTICE,
    content: "",
    body: {
    },
  };
  const body = formData?.body as any;
  submitToQueue({
    roomId: chat.theRoomId!,
    msgType: MessageType.GROUP_NOTICE,
    content: formData.content,
    body: {
      // TODO: 后期可支持富文本编辑
      noticeAll: body?.noticeAll, // 是否群发
      imgList: body?.imgList, // 图片列表
      replyMsgId: body?.replyMsgId || replyMsgId || undefined, // 回复消息ID
    },
  });
}

/**
 * 单按键触发事件
 */
function onInputExactKey(key: "ArrowUp" | "ArrowDown") {
  if (!chat.msgForm.content?.trim() && (key === "ArrowUp" || key === "ArrowDown")) {
    chat.onDownUpChangeRoom(key === "ArrowDown" ? "down" : "up");
  }
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
  ContextMenu.showContextMenu(opt);
}

function removeOssFile(type: OssFileType = OssFileType.IMAGE, key?: string, index: number = 0) {
  const filesMap: Record<OssFileType, (Ref<OssFile[]> | undefined)> = {
    [OssFileType.IMAGE]: imgList,
    [OssFileType.FILE]: fileList,
    [OssFileType.VIDEO]: videoList,
    [OssFileType.SOUND]: undefined,
    [OssFileType.FONT]: undefined,
  };
  const item = filesMap?.[type]?.value.find(f => f.key === key);
  if (item && key)
    item.subscribe.unsubscribe();
  const keys = [key, ...(item?.children || []).map(f => f.key)];
  keys.forEach(k => k && deleteOssFile(k, user.getToken));
  ElMessage.closeAll("error");
  inputOssFileUploadRef?.value?.resetInput?.();
  inputOssImgUploadRef?.value?.resetInput?.();
  inputOssVideoUploadRef?.value?.resetInput?.();
  filesMap?.[type]?.value.splice(
    index,
    1,
  );
  if (filesMap?.[type]?.value?.length === 0) {
    chat.msgForm.msgType = MessageType.TEXT; // 默认
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
      onClick: () => inputOssImgUploadRef.value?.openSelector?.({ accept: "video/*" }),
    },
    // 录视频
    {
      id: "video-record",
      icon: "i-solar:videocamera-add-bold",
      label: "录视频",
      disabled: isDisabledFile.value,
      onClick: () => inputOssImgUploadRef.value?.openSelector?.({ accept: "video/*", capture: "environment" }),
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
let timer: any = 0;
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
  }
  else {
    loadInputTimer.value = setTimeout(() => {
      loadInputDone.value = true;
    }, 400);
    return;
  }
  if (inputContentRef.value?.input)
    inputContentRef.value?.input?.focus(); // 聚焦
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
    if (inputContentRef.value?.input)
      inputContentRef.value?.input?.focus(); // 聚焦
  });
});

// 生命周期
onMounted(() => {
  // 监听快捷键
  window.addEventListener("keydown", startAudio);
  !setting.isMobileSize && inputContentRef.value?.input?.focus(); // 聚焦
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
      inputContentRef.value?.input?.focus(); // 聚焦
      if (chat?.msgForm?.content?.includes(`@${user.nickName}(#${user.username}) `))
        return;
      chat.msgForm.content += `@${user.nickName}(#${user.username}) `;
    }
    else if (type === "remove") {
      const atIndex = chat?.msgForm?.content?.lastIndexOf?.(`@${user.nickName}(#${user.username}) `) ?? -1;
      if (atIndex === -1 || !chat?.msgForm?.content)
        return;
      chat.msgForm.content = chat.msgForm.content?.slice(0, atIndex) + chat.msgForm.content?.slice(atIndex + `@${user.nickName}(#${user.username}) `.length);
    }
    else if (type === "clear") {
    //
    }
  });
  // / 询问ai机器人
  mitter.on(MittEventType.CAHT_ASK_AI_ROBOT, (e) => {
    const { type, payload: userId } = e;
    const robot = aiOptions.value.find(u => u.userId === userId);
    if (type === "add" && robot) {
      if (robot) {
        chat.msgForm.content += `/${robot.nickName}(#${robot.username}) `;
        inputContentRef.value?.input?.focus(); // 聚焦
      }
    }
    else if (type === "remove" && robot) {
    //
    }
    else if (type === "clear") {
    //
    }
  });
  // 处理聚焦
  mitter.on(MittEventType.MSG_FORM, ({
    type,
    // payload ={}
  }: MsgFormEventPlaoyload) => {
    if (type === "focus") {
      inputContentRef.value?.input?.focus(); // 聚焦
    }
    else if (type === "blur") {
      inputContentRef.value?.input?.blur(); // 聚焦
    }
  });
});

onUnmounted(() => {
  mitter.off(MittEventType.CAHT_ASK_AI_ROBOT);
  mitter.off(MittEventType.CHAT_AT_USER);
  clearTimeout(timer);
  clearInterval(timer);
  timer = null;
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
      :img-list="imgList"
      :video-list="videoList"
      :file-list="fileList"
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
          <el-tooltip popper-style="padding: 0.2em 0.5em;" :content="!isSoundRecordMsg ? '语音' : '键盘'" placement="top">
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
                  <span class="chating-hidden">{{ isChating ? `正在输入 ${second}s` : '语音' }}</span>
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
                :disable="isDisabledFile"
                class="i-solar:album-line-duotone h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)"
                pre-class="hidden"
                :upload-type="OssFileType.IMAGE"
                input-class="op-0 h-6 w-6 sm:(w-5 h-5) cursor-pointer "
                :upload-quality="0.5"
                @error-msg="(msg:string) => {
                  ElMessage.error(msg)
                }"
                @submit="onSubmitImg"
              />
              <!-- 视频 -->
              <InputOssFileUpload
                ref="inputOssVideoUploadRef"
                v-model="videoList"
                :multiple="false"
                :size="setting.systemConstant.ossInfo?.video?.fileSize"
                :min-size="1024"
                :preview="false"
                :limit="1"
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
                :multiple="false"
                :size="setting.systemConstant.ossInfo?.file?.fileSize"
                :min-size="1024"
                :preview="false"
                :limit="1"
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
      <!-- 内容（文本） -->
      <el-form-item
        v-if="!isSoundRecordMsg"
        prop="content"
        class="input relative h-fit w-full"
        style="padding: 0;margin:  0;"
        :rules="[
          { min: 1, max: maxContentLen, message: `长度在 1 到 ${maxContentLen} 个字符`, trigger: `change` },
        ]"
      >
        <el-scrollbar max-height="32vh" wrap-class="h-full card-rounded-df " class="input relative h-fit w-full card-rounded-df">
          <el-mention
            v-if="loadInputDone"
            ref="inputContentRef"
            v-model.lazy="chat.msgForm.content"
            :options="mentionList"
            :prefix="isReplyAI ? ['/'] : ['@']"
            popper-class="at-select border-default"
            :check-is-whole="(pattern: string, value: string) => isReplyAI ? checkAiReplyWhole(chat.msgForm.content, pattern, value) : checkAtUserWhole(chat.msgForm.content, pattern, value)"
            :rows="setting.isMobileSize ? 1 : 6"
            :maxlength="maxContentLen"
            :placeholder="aiOptions.length ? '输入 / 唤起AI助手' : ''"
            :autosize="setting.isMobileSize"
            type="textarea"
            resize="none"
            :class="{
              focused: chat.msgForm.content,
            }"
            placement="top"
            autofocus
            :show-word-limit="!setting.isMobileSize"
            whole
            :offset="10"
            :popper-options="{
              placement: 'top-start',
            }"
            @focus="inputFocus = true"
            @blur="inputFocus = false"
            @paste.stop="onPaste($event)"
            @keydown.exact.enter.stop.prevent="handleSubmit()"
            @keydown.exact.arrow-up.stop.prevent="onInputExactKey('ArrowUp')"
            @keydown.exact.arrow-down.stop.prevent="onInputExactKey('ArrowDown')"
          >
            <template #label="{ item }">
              <div class="h-full w-9rem flex items-center pr-1" :title="item.label">
                <CardElImage class="h-6 w-6 border-default rounded-full" :src="BaseUrlImg + item.avatar" />
                <span class="ml-2 flex-1 truncate">{{ item.label }}</span>
              </div>
            </template>
          </el-mention>
        </el-scrollbar>
        <BtnElButton
          v-if="setting.isMobileSize"
          :disabled="!user.isLogin || isSending || isNotExistOrNorFriend"
          type="primary"
          style="height: 2.2rem !important;"
          class="mb-1px ml-2 mr-2 mt-a w-4.5rem"
          :loading="isBtnLoading"
          @click="handleSubmit()"
        >
          发送
        </BtnElButton>
      </el-form-item>
      <!-- 发送 -->
      <div
        v-if="!setting.isMobileSize"
        class="hidden items-end p-1 pt-0 sm:flex"
      >
        <div class="tip ml-a hidden text-mini sm:block">
          Enter发送, Shift+Enter换行
        </div>
        <BtnElButton
          class="group ml-a overflow-hidden tracking-0.2em shadow sm:ml-2"
          type="primary"
          round
          :disable="isNotExistOrNorFriend"
          :icon-class="isSending || isNotExistOrNorFriend ? '' : 'i-solar:chat-round-dots-linear mr-1'"
          size="small"
          :loading="isBtnLoading"
          style="padding: 0.8rem;width: 6rem;"
          @click="handleSubmit()"
        >
          发送&nbsp;
        </BtnElButton>
      </div>
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
      <div class="grid-container min-h-32vh flex select-none">
        <div class="grid grid-cols-4 my-a w-full gap-4 p-4">
          <div
            v-for="tool in mobileTools"
            :key="tool.id"
            class="flex-row-c-c flex-col gap-1 transition-200 hover:op-70"
            :class="[tool.className, tool.disabled ? 'op-50 pointer-events-none' : 'cursor-pointer']"
            @click="!tool.disabled ? tool.onClick?.() : undefined"
          >
            <span h-12 w-12 flex-row-c-c card-default>
              <i class="p-3" :class="[tool.icon]" />
            </span>
            <span class="text-xs">{{ tool.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  <!-- 新建通知 -->
  <ChatGroupNoticeMsgDialog v-model:show="showGroupNoticeDialog" @submit="onSubmitGroupNoticeMsg" />
</template>

<style lang="scss" scoped>
.form-contain {
    --at-apply: "card-bg-color sm:(!bg-transparent h-62) relative flex flex-col justify-between overflow-hidden pt-1 px-2 pb-4 sm:pb-2";
    box-shadow: rgba(0, 0, 0, 0.04) 0px -4px 16px;
    .tip {
    --at-apply: "op-0";
  }
  &:hover {
    .tip {
      --at-apply: "op-100";
    }
  }
}
.at-select {
  :deep(.el-select__wrapper),
  :deep(.el-select-v2__input-wrapper),
  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    background-color: transparent;
    padding: 0;
  }
  :deep(.el-form-item__error) {
    padding-left: 1rem;
  }
}
:deep(.el-form-item__content) {
  padding: 0;
}

.input {
  --at-apply: "flex-1";
  :deep(.el-form-item__content) {
    --at-apply: "mt-2 sm:mt-0";
    display: flex;
    .el-mention {
      width: auto;
      flex: 1;
      height: 100%;
    }
  }
  :deep(.el-input__count) {
    left: 0.8em;
    bottom: -2em;
    width: fit-content;
    background-color: transparent;
    transition: opacity 0.2s;
    opacity: 0;
  }
  :deep(.el-text),
  :deep(.el-textarea) {
    --at-apply: "h-full flex-1";

    .el-input__inner,
    .el-textarea__inner {
      resize: none;
      height: 100%;
      box-shadow: none !important;
      height: 100%;
      background-color: transparent;
      caret-color: var(--el-color-primary);
      font-size: 1rem;
      &:hover + .el-input__count  {
        opacity: 1;
      }
      &::-webkit-input-placeholder {
        font-size: 0.9em;
        line-height: 1.7em;
      }
    }
  }
  :deep(.el-input) {

    --at-apply: "p-2";
    .el-input__wrapper {
      box-shadow: none !important;
      outline: none !important;
      --at-apply: "bg-color-2";
    }
    .el-input__suffix {
      display: none !important;
    }
    .el-input-group__append {
      border: none;
      outline: none;
      box-shadow: none;
      --at-apply: "w-5em card-rounded-df px-4 ml-2 text-center bg-[var(--el-color-primary)] text-white text-center ";
    }
  }

  // 移动端尺寸下scss
  @media (max-width: 768px) {
    :deep(.el-form-item__content) {
      .el-input__count {
        left: auto;
        right: 1.2em;
        bottom: 2rem;
      }
      .el-textarea {
        padding-left: 0.6em;
        .el-textarea__inner {
          min-height: 2.2rem !important;
          --at-apply: "bg-light-900 dark:bg-[#111111] shadow-lg shadow-inset";
        }
      }
    }
  }
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
  transition: all 0.3s ease;
  max-height: 32vh;
  opacity: 1;
  overflow: hidden;
}

.slide-height-enter-from,
.slide-height-leave-to {
  max-height: 0;
  opacity: 0;
}
.grid-container {
  height: auto;
  transform-origin: top;
}
</style>
