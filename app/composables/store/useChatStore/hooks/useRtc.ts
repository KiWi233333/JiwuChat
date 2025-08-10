/**
 * RTC 通话相关
 * @returns RTC 通话相关
 */
export function createRtcModule() {
  const showRtcCall = ref(false);
  const rtcCallType = ref<CallTypeEnum | undefined>(undefined);
  const confirmRtcFn = ref({
    confirmCall: () => {},
    rejectCall: () => {},
  });
  const webRtc = useWebRTC((type, { confirmCall, rejectCall }) => {
    rtcCallType.value = type;
    showRtcCall.value = true;
    confirmRtcFn.value = { confirmCall, rejectCall };
  });

  async function openRtcCall(roomId: number, type: CallTypeEnum, confirmOption?: { message?: string, title?: string }) {
    if (!roomId || !type)
      return;
    if (showRtcCall.value) {
      ElMessage.warning("通话中，请勿重复发起 ~");
      return;
    }
    const { message = "是否确认发起通话？", title = type === CallTypeEnum.AUDIO ? "语音通话" : "视频通话" } = confirmOption || {};
    const chat = useChatStore();
    if (chat.theContact?.type === RoomType.GROUP) {
      ElMessage.warning("群聊无法进行通话！");
      return;
    }
    ElMessageBox.confirm(message, { title, confirmButtonText: "确定", cancelButtonText: "取消", center: true })
      .then(async (action) => {
        if (action !== "confirm" || !type)
          return;
        rtcCallType.value = type;
        await nextTick();
        const user = useUserStore();
        const resp = await getChatRTCMessage(roomId, user.getToken);
        if (resp.code === StatusCode.SUCCESS && resp.status) {
          showRtcCall.value = false;
          return false;
        }
        const res = await webRtc.startCall(roomId, type, undefined);
        if (res === false)
          showRtcCall.value = false;
        else showRtcCall.value = true;
      })
      .catch(() => {});
  }

  async function rollbackCall(roomId: number, type: CallTypeEnum, data?: ChatMessageVO) {
    openRtcCall(roomId, type, { message: "是否确认重新拨打？" });
  }

  function useChatWebRTC() {
    return webRtc;
  }

  function resetRtc() {
    showRtcCall.value = false;
    rtcCallType.value = undefined;
  }

  return {
    showRtcCall,
    rtcCallType,
    confirmRtcFn,
    openRtcCall,
    rollbackCall,
    useChatWebRTC,
    resetRtc,
  };
}


