<script lang="ts" setup>
import type { ElForm } from "#components";

const emit = defineEmits<{
  (e: "submit", newMsg: ChatMessageVO): void
}>();
const user = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();

// 表单
const isSending = ref(false);
const isLord = computed(() => chat.theContact.type === RoomType.GROUP && chat.theContact.member?.role === ChatRoomRoleEnum.OWNER); // 群主
const isSelfRoom = computed(() => chat.theContact.type === RoomType.SELFT); // 私聊
const isAiRoom = computed(() => chat.theContact.type === RoomType.AICHAT); // 机器人
const maxContentLen = computed(() => setting.systemConstant.msgInfo[chat.msgForm.msgType]?.maxLength || 0);
// 状态
const showGroupNoticeDialog = ref(false);
const loadInputDone = ref(false);
const loadInputTimer = shallowRef<NodeJS.Timeout>();
// 其他
const sendKeyCodeStr = computed(() => setting.shortcutManager.getShortcutByKey("send-message")?.key || "Enter");
const lineBreakKeyCodeStr = computed(() => setting.shortcutManager.getShortcutByKey("line-break")?.key || "Shift+Enter");
// ref
const formRef = useTemplateRef<InstanceType<typeof ElForm>>("formRef");

// =================================================================
// 核心 Hooks
// =================================================================


// 1. 新的文件上传管理 Hook
const { uploadFile, releaseFile } = useOssFileUpload();

// 2. 新的文件操作 Hook
const fileActions = useFileActions((files) => {
  if (files && files.length > 0) {
    processFiles(Array.from(files)); // 确保传入的是数组
  }
});

// 3. 消息输入框相关 Hook (保持不变)
const {
  // 核心 refs 和状态
  inputFocus,
  msgInputRef,
  focusRef,
  selectionRange,

  // 管理器
  imageManager,
  fileManager,
  videoManager,
  selectionManager,
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
  atScrollbar,
  aiScrollbar,

  // 加载函数
  loadUser,
  loadAi,

  // 内容管理
  updateFormContent,
  clearInputContent,
  getInputDTOByText,

  // 选区和范围
  updateSelectionRange,

  // 标签插入
  insertAtUserTag,
  insertAiRobotTag,

  // 选项处理器
  resetOptions,
  handleSelectAtUser,
  handleSelectAiRobot,

  // 消息构建
  constructMsgFormDTO,

  // 事件处理器
  handleInput,
  handleKeyDown,
  onContextMenu,
} = useMsgInputForm("msgInputRef", handleSubmit, {
  atScrollbarRef: "atScrollbar",
  aiScrollbarRef: "aiScrollbar",
}, 160, "focusRef");
const isNotExistOrNorFriend = computed(() => {
  const res = chat.theContact.selfExist === isTrue.FALESE;
  if (res) {
    msgInputRef.value?.blur(); // 失去焦点
    clearInputContent();
  }
  return res;
}); // 自己不存在 或 不是好友  || chat.contactMap?.[chat.theRoomId!]?.isFriend === isTrue.FALESE
/**
 * 禁用上传文件
 */
const disabledUploadFile = computed(() => isAiRoom.value);

// =================================================================
// 文件处理流程
// =================================================================

// 流程 1: 行为 (选择、拖拽、粘贴)
// 1.1 选择文件 - fileActions.selectImageFiles
// 1.2 拖拽文件
const { isOverDropZone } = useDropZone(focusRef, {
  onDrop: (files: File[] | null) => {
    if (files && files.length > 0) {
      processFiles(files);
    }
  },
});

// 1.3 粘贴文件
async function handlePasteEvent(e: ClipboardEvent) {
  e.preventDefault();
  const clipboardData = e.clipboardData;
  if (!clipboardData)
    return;

  // 优先处理文件
  const pastedFiles = Array.from(clipboardData.items)
    .filter(item => item.kind === "file")
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null);

  if (pastedFiles.length > 0) {
    if (disabledUploadFile.value)
      return;
    await processFiles(pastedFiles);
    return;
  }

  // 处理文本
  const text = clipboardData.getData("text/plain");
  if (text) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    updateFormContent();
  }
}

// 流程 2 & 4: 分析文件类型 & 解析插入文件 (加入管理队列)
/**
 * 统一的文件处理入口
 * @param files - 从选择、拖拽、粘贴等来源获取的 File 对象数组
 */
async function processFiles(files: File[]) {
  for (const file of files) {
    const analysis = fileActions.analyzeFile(file);
    if (!analysis.isValid) {
      ElMessage.warning(`不支持的文件类型: ${file.name}`);
      continue;
    }
    if (isAiRoom.value) {
      ElMessage.warning("AI对话暂不支持附件输入！");
      return;
    }
    if (disabledUploadFile.value) {
      ElMessage.warning("暂不支持文件上传！");
      return;
    }

    switch (analysis.type) {
      case "image":
        imageManager.insert(file);
        break;
      case "video":
        videoManager.insert(file);
        break;
      case "file":
        fileManager.insert(file);
        break;
      default:
        // 其他类型暂不处理
        break;
    }
  }
}

// 录音处理 (单独触发，但上传逻辑统一)
const {
  isChating,
  second,
  theAudioFile,
  speechRecognition,
  audioTransfromText,
  isPalyAudio,
  pressHandleRef,
  stop: stopRecord,
  reset: resetRecord,
  start: startRecord,
  handlePlayAudio, // 播放录音
} = useRecording({ pressHandleRefName: "pressHandleRef", timeslice: 1000 });
const isUploadSound = ref(false); // 用于UI状态
const isSoundRecordMsg = computed(() => chat.msgForm.msgType === MessageType.SOUND);

// =================================================================
// 发送逻辑
// =================================================================
const isDisableSubmit = computed(() => isSending.value || isUploadSound.value || !user.isLogin || isNotExistOrNorFriend.value);

/**
 * 主提交函数
 */
async function handleSubmit() {
  if (isDisableSubmit.value)
    return;

  isSending.value = true;
  try {
    const analysisTextFormData = getInputDTOByText();
    const soundOpt = isSoundRecordMsg.value && second.value ? { customUploadType: OssFileType.SOUND } : undefined;
    // 新增：获取聊天框内所有图片、视频、文件类型的文件
    const ossFiles: OssFile[] = [
      ...(imageManager.getFiles() || []),
      ...(fileManager.getFiles() || []),
      ...(videoManager.getFiles() || []),
    ];
    if (soundOpt) {
      // 停止语音
      stopRecord();
      await nextTick();
      ossFiles.unshift(theAudioFile.value as OssFile);
      chat.msgForm = {
        ...chat.msgForm,
        msgType: MessageType.SOUND,
        body: {
          ...chat.msgForm.body,
          translation: audioTransfromText.value,
          second: second.value,
        } as SoundBodyDTO,
      };
    }

    // 1. 上传文件并发送消息
    const uploadAndSendPromises = ossFiles.map(async (ossFile, index) => {
      const isLastMsg = index === ossFiles.length - 1;
      const { getFormData, previewFormDataTemp, time, ackId } = constructMsgFormDTO(
        fileActions,
        ossFile,
        isLastMsg && !soundOpt ? analysisTextFormData : soundOpt ? chat.msgForm : {},
        soundOpt ? OssFileType.SOUND : undefined,
      );
      const sendMsg = async () => {
        const uploadResult = await uploadFile(
          ossFile as OssFile,
          soundOpt ? { customUploadType: OssFileType.SOUND } : undefined,
        );
        if (!uploadResult.success) {
          const txt = uploadResult.error || "上传失败，请稍后再试！";
          ElMessage.error(txt);
          throw new Error(txt);
        }

        return sendChatMessage(getFormData() as ChatMessageDTO, user.getToken);
      };
      // 提交到消息队列
      return submitToQueue(time, ackId, previewFormDataTemp.value, sendMsg, { _skipReset: !isLastMsg }).finally(() => releaseFile(ossFile));
    });
    if (uploadAndSendPromises.length > 0) {
      return await (uploadAndSendPromises.length > 1 ? Promise.allSettled(uploadAndSendPromises) : uploadAndSendPromises[0]);
    }

    // 2. 文本相关
    if (!analysisTextFormData?.content?.trim()) {
      return;
    }
    else if (analysisTextFormData?.content.length > maxContentLen.value) {
      ElMessage.warning(`消息长度不能超过${maxContentLen.value}字！`);
      return;
    }
    const { getFormData, time, ackId, previewFormDataTemp } = constructMsgFormDTO(fileActions, undefined, analysisTextFormData);
    const sendMsg = async () => {
      return sendChatMessage(getFormData() as ChatMessageDTO, user.getToken);
    };
    // 提交到消息队列
    return submitToQueue(time, ackId, previewFormDataTemp.value, sendMsg).finally(() => {});
  }
  catch (error) {
    console.error("Submit failed:", error);
    ElMessage.error("发送失败，请稍后重试。");
  }
  finally {
    // 确保在所有操作后重置表单，除非有特殊情况
    resetForm();
    // 统一在各处理函数内部或此处重置状态
    isSending.value = false;
  }
}

// 文件拖拽上传监听
const {
  isDragDropOver,
  unlistenDragDrop,
  listenDragDrop,
} = useFileLinstener(disabledUploadFile);

// 监听拖拽上传（仅桌面端）
onMounted(() => {
  if (setting.isDesktop) {
    listenDragDrop(async (fileType, file) => {
      await processFiles([file]);
    });
  }
});
onUnmounted(() => {
  unlistenDragDrop();
});


/**
 * 发送群通知消息
 */
async function onSubmitGroupNoticeMsg(formData: ChatMessageDTO) {
  const replyMsgId = chat.replyMsg?.message?.id;
  const body = formData?.body as any;
  if (!isLord.value) {
    return "仅群主可发送群通知消息！";
  }
  const time = Date.now();
  const ackId = `temp_${time}_${Math.floor(Math.random() * 100)}`;
  const formDataTemp = {
    roomId: chat.theRoomId!,
    msgType: MessageType.GROUP_NOTICE as CanSendMessageType,
    content: formData.content,
    clientId: ackId,
    body: {
      noticeAll: body?.noticeAll,
      imgList: body?.imgList,
      replyMsgId: body?.replyMsgId || replyMsgId || undefined,
    },
  };

  const sendMsg = async () => sendChatMessage(formDataTemp, user.getToken);
  await submitToQueue(time, ackId, formDataTemp, sendMsg, { _skipReset: true });
}

/**
 * 统一的消息提交到队列
 */
async function submitToQueue(time: number, ackId: any, formData: ChatMessageDTO, sendMsg: () => Promise<Result<ChatMessageVO>>, options: { _skipReset?: boolean } = {}) {
  formData.clientId = ackId;
  chat.addToMessageQueue(time, formData, sendMsg, msg => emit("submit", msg));
  if (!options._skipReset) {
    resetForm();
  }
}


// 重置表单
function resetForm() {
  chat.msgForm = {
    roomId: chat.theRoomId!,
    msgType: MessageType.TEXT,
    content: "",
    body: { mentionList: [] },
  };
  clearInputContent();
  chat.atUserList.splice(0);
  chat.askAiRobotList.splice(0);
  isSending.value = false;
  chat.setReplyMsg({});
  resetRecord();
  resetOptions();
  // 清空编辑器
  imageManager?.clear?.();
  fileManager?.clear?.();
  videoManager?.clear?.();
}

// // 右键菜单
// function onContextFileMenu(e: MouseEvent, ossFile: OssFIle) {
//   e.preventDefault();
//   ContextMenuGlobal.showContextMenu({
//     x: e.x,
//     y: e.y,
//     theme: setting.contextMenuTheme,
//     items: [
//       {
//         label: `撤销文件`,
//         icon: "i-solar:trash-bin-minimalistic-outline group-btn-danger",
//         onClick: () => {
//           // deleteFile(); // 使用新的删除方法
//         },
//       },
//     ],
//   });
// }

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
      disabled: disabledUploadFile.value,
      onClick: () => fileActions.selectImageFiles(),
    },
    // 拍摄
    {
      id: "camera",
      icon: "i-solar:camera-bold",
      label: "拍摄",
      disabled: disabledUploadFile.value,
      onClick: () => fileActions.selectImageFiles("environment"),
    },
    {
      id: "video",
      icon: "i-solar:video-library-line-duotone",
      label: "视频",
      disabled: disabledUploadFile.value,
      onClick: () => fileActions.selectVideoFiles(),
    },
    // 录视频
    {
      id: "video-record",
      icon: "i-solar:videocamera-add-bold",
      label: "录视频",
      disabled: disabledUploadFile.value,
      onClick: () => fileActions.selectVideoFiles("environment"),
    },
    {
      id: "file",
      icon: "i-solar-folder-with-files-bold",
      label: "文件",
      disabled: disabledUploadFile.value,
      onClick: () => fileActions.selectAnyFiles(),
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
  window.addEventListener("keydown", startRecord);

  nextTick(() => {
    selectionManager.focusAtEnd();
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
  window.removeEventListener("keydown", startRecord);
});

onDeactivated(() => {
  showMobileTools.value = false;
});

defineExpose({
  resetForm,
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
    :disabled="isDisableSubmit"
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
    <!-- <ChatMsgAttachview
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
    /> -->
    <div class="absolute w-full flex flex-col p-2 -transform-translate-y-full" @click.prevent>
      <!-- 滚动底部 -->
      <div
        v-show="!chat.isScrollBottom"
        data-fade
        class="mb-2 ml-a mr-2 w-fit btn-info border-default-hover rounded-full card-bg-color px-3 text-right shadow-lg"
        @click="setReadAndScrollBottom"
      >
        <i class="i-solar:double-alt-arrow-down-line-duotone block h-5 w-5 transition-200" />
      </div>
      <!-- 回复 -->
      <div
        v-if="chat.replyMsg?.fromUser"
        prop="body.replyMsgId"
        class="w-full text-sm"
      >
        <div class="w-full flex animate-[300ms_fade-in] items-center border-default-2-hover card-default-br p-2 shadow">
          <el-tag effect="dark" size="small" class="mr-2 shrink-0">
            回复
          </el-tag>
          <div class="max-w-4/5 truncate">
            {{ `${chat.replyMsg?.fromUser?.nickName}: ${chat.replyMsg ? resolveMsgReplyText(chat.replyMsg as ChatMessageVO) : '未知'}` }}
          </div>
          <div class="i-solar:close-circle-bold ml-a h-6 w-6 btn-default text-dark op-80 transition-200 transition-color sm:(h-5 w-5) dark:text-light hover:text-[var(--el-color-danger)]" @click="chat.setReplyMsg({})" />
        </div>
      </div>
    </div>
    <div class="form-contain">
      <!-- 工具栏 TODO: AI机器人暂不支持 -->
      <template v-if="!isAiRoom">
        <div class="relative h-9 flex flex-shrink-0 items-center gap-3 sm:px-2">
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
            <div v-show="theAudioFile?.id" class="absolute-center-x">
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
                i-solar:trash-bin-minimalistic-broken ml-3 btn-danger rounded-0 p-2.4
                @click="handlePlayAudio('del')"
              />
            </div>
            <BtnElButton
              type="primary"
              round
              style="height: 1.8rem !important;"
              class="ml-a w-3.6rem text-xs tracking-0.1em"
              :disabled="isDisableSubmit"
              :loading="isDisableSubmit"
              @click="handleSubmit()"
            >
              发送
            </BtnElButton>
          </template>
          <!-- 非语音 -->
          <template v-else>
            <div v-show="!setting.isMobileSize" class="grid cols-4 items-center gap-3 sm:flex sm:gap-4">
              <!-- 图片 -->
              <i class="i-solar:album-line-duotone h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)" @click.stop="fileActions.selectImageFiles()" />
              <!-- 视频 -->
              <i class="i-solar:video-library-line-duotone h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)" @click.stop="fileActions.selectVideoFiles()" />
              <!-- 文件 -->
              <i class="i-solar:folder-with-files-line-duotone h-6 w-6 btn-primary cursor-pointer sm:(h-5 w-5)" @click.stop="fileActions.selectFile({ multiple: true, directory: false })" />
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
          class="relative max-h-2.6rem min-h-2.6rem w-full flex-row-c-c flex-1 overflow-y-auto rounded-0 text-wrap text-small sm:(h-fit max-h-full p-6)"
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
          type="primary"
          style="height: 2.2rem !important;"
          class="ml-2 mt-a w-4.4rem"
          :disabled="isDisableSubmit"
          :loading="isDisableSubmit"
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
        <div class="tip ml-a text-mini">
          <p>
            <i i-solar:plain-2-line-duotone mr-1.8 p-1.6 />{{ sendKeyCodeStr }}
          </p>
          <p mt-1>
            <i i-solar:reply-2-bold-duotone mr-1 p-2 />{{ lineBreakKeyCodeStr }}
          </p>
        </div>
        <BtnElButton
          class="group ml-a overflow-hidden card-rounded-df tracking-0.2em shadow sm:ml-2"
          type="primary"
          :icon-class="isSending || isNotExistOrNorFriend ? '' : 'i-solar:plain-2-line-duotone mr-1.6'"
          size="small"
          :disabled="isDisableSubmit"
          :loading="isDisableSubmit"
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
  <!-- <ChatUploadPreviewDialog
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
  /> -->
</template>

<style lang="scss" scoped>
@use "./MsgFormV2.scss"
</style>
