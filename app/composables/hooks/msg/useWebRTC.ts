import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

interface RtcMsgVO {
  roomId: number;
  callType: CallTypeEnum;
  senderId: string;
  [key: string]: any;
}
const TURN_SERVER = import.meta.env.VITE_TURN_SERVER_URL;
const MAX_TIME_OUT_SECONDS = 30; // 拨打 超时时间
const configuration: RTCConfiguration = { // 默认配置
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};
const isSupportScreenSharing = !!navigator?.mediaDevices?.getDisplayMedia;
const isSupportFullscreen = !!document?.documentElement?.requestFullscreen;

/**
 * 使用webRtc通话
 *
 * @returns 返回webRtc相关状态和方法
 */
export function useWebRTC(
  openDialog: (type: CallTypeEnum, { confirmCall, rejectCall }: { confirmCall: () => void, rejectCall: () => void }) => void,
) {
  const user = useUserStore();
  const chat = useChatStore();
  const setting = useSettingStore();
  const ws = useWsStore();
  const rtcMsg = ref<Partial<RtcMsgVO>>({
    roomId: undefined,
    callType: undefined,
    senderId: undefined,
  });

  const theContact = ref<Partial<ChatContactDetailVO>>({
    activeTime: undefined,
    avatar: undefined,
    roomId: undefined,
    hotFlag: undefined,
    name: undefined,
    text: undefined,
    type: undefined,
    selfExist: undefined,
    unreadCount: undefined,
    roomGroup: undefined,
    member: undefined,
  });

  // 设备相关状态
  const audioDevices = ref<MediaDeviceInfo[]>([]);
  const videoDevices = ref<MediaDeviceInfo[]>([]);
  const selectedAudioDevice = ref<string | null | undefined>(null);
  const selectedVideoDevice = ref<string | null | undefined>(null);
  // 状态
  const connectionStatus = ref<CallStatusEnum | undefined>(undefined);
  const isSender = computed(() => rtcMsg.value.senderId === user.userId);
  const isDeviceLoad = ref(false);
  const linker = ref(false); // 链接人

  // rtc状态
  const rtcStatus = ref<RTCPeerConnectionState | undefined>(undefined);
  const isRtcConnecting = computed(() => rtcStatus.value === "connecting");
  // 流相关状态
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null | undefined>(null);

  // WebRTC 连接对象
  const peerConnection = ref<RTCPeerConnection | null>(null);
  const channel = ref<RTCDataChannel | null>(null);
  const channelStatus = ref<RTCDataChannelState | undefined>(undefined);
  // 待发送ice列表
  const pendingCandidates = ref<RTCIceCandidate[]>([]);

  if (TURN_SERVER && configuration.iceServers) {
    configuration.iceServers.push({
      urls: TURN_SERVER,
      username: import.meta.env.VITE_TURN_SERVER_USER,
      credential: import.meta.env.VITE_TURN_SERVER_PWD,
    });
  }

  // 添加铃声相关状态
  const bellAudio = ref<HTMLAudioElement | null>(null);

  // 添加计时器引用
  const callTimer = ref<NodeJS.Timeout | null>(null);

  // 添加计时相关的变量
  const callDuration = ref(0);
  const animationFrameId = ref<number | null>(null);
  const startTime = ref<number>(0);

  // 添加桌面共享相关状态
  const isScreenSharing = ref(false);

  // 开始计时的函数
  const startCallTimer = () => {
    startTime.value = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = Math.floor((currentTime - startTime.value) / 1000);
      callDuration.value = elapsed;
      animationFrameId.value = requestAnimationFrame(animate);
    };
    animationFrameId.value = requestAnimationFrame(animate);
  };

  // 停止计时的函数
  const stopCallTimer = () => {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
    callDuration.value = 0;
    startTime.value = 0;
  };

  /**
   * 获取房间信息
   * @param roomId 房间id
   */
  async function handleContactInfo(roomId: number) {
    // 先清空
    theContact.value = {
      activeTime: undefined,
      avatar: undefined,
      roomId: undefined,
      hotFlag: undefined,
      name: undefined,
      text: undefined,
      type: undefined,
      selfExist: undefined,
      unreadCount: undefined,
      roomGroup: undefined,
      member: undefined,
    };
    if (chat.contactMap[roomId]) {
      theContact.value = {
        ...chat.contactMap[roomId],
      };
    }
    else { // 房间信息不存在，请求接口获取
      const res = await getChatContactInfo(roomId, user.getToken);
      if (res && res.code === StatusCode.SUCCESS) {
        chat.refreshContact(res.data); // 刷新
        theContact.value = JSON.parse(JSON.stringify(res.data)); // 赋值
      }
    }
  }

  /**
   * 打开铃声
   */
  const startBell = () => {
    if (!setting.settingPage.rtcCallBellUrl) {
      console.log("rtc通话已经静音");
      bellAudio.value = null;
      return;
    }
    bellAudio.value = new Audio(setting.settingPage.rtcCallBellUrl);
    bellAudio.value!.loop = true;
    bellAudio.value?.play?.();
  };
  /**
   * 关闭铃声
   */
  const stopBell = () => {
    bellAudio.value?.pause?.();
    bellAudio.value = null;
  };

  /**
   * 结束通话
   * @param status 通话状态
   * @returns Promise<boolean> 成功返回 true，失败返回 false
   */
  const endCall = async (status: CallStatusEnum | undefined = CallStatusEnum.ERROR) => {
    try {
      if (!rtcMsg.value.roomId) {
        clear();
        return true;
      }
      // console.log("结束通话 : ", rtcMsg.value.roomId, status);
      if ([CallStatusEnum.END].includes(status)) {
        const res = await hangUpRTCCall(rtcMsg.value.roomId, user.getToken);
        if (res.code !== StatusCode.SUCCESS) {
          return false;
        }
      }
      else if (status !== undefined) { // 更新通话状态
        const res = await updateChatRTCMessage(rtcMsg.value.roomId, {
          status,
          signalType: SignalTypeEnum.LEAVE,
        }, user.getToken);
        if (res.code !== StatusCode.SUCCESS) {
          return false;
        }
      }
      clear();
      return true;
    }
    catch (err) {
      clear();
      console.error("结束通话失败:", err);
    }
  };


  // 获取设备列表
  const getDevices = async () => {
    try {
      isDeviceLoad.value = true;
      const devices = await navigator.mediaDevices.enumerateDevices() || [];
      if (devices.length === 0) {
        return false;
      }
      audioDevices.value = devices.filter(device => device.kind === "audioinput");
      videoDevices.value = devices.filter(device => device.kind === "videoinput");
      // 默认选择 “default” | "第一个" 设备
      selectedAudioDevice.value = audioDevices.value.find(device => device.deviceId === "default")?.deviceId || audioDevices.value?.[0]?.deviceId;
      selectedVideoDevice.value = videoDevices.value.find(device => device.deviceId === "default")?.deviceId || videoDevices.value?.[0]?.deviceId;
      isDeviceLoad.value = false;
      return true;
    }
    catch (err) {
      ElMessage.error("获取设备失败!");
      console.error("获取设备失败:", err);
      // connectionStatus.value = CallStatusEnum.ERROR;
      // 默认没有设备
      selectedAudioDevice.value = selectedAudioDevice.value || null;
      selectedVideoDevice.value = selectedVideoDevice.value || null;
      isDeviceLoad.value = false;
      return false;
    }
  };

  // 获取本地媒体流
  const getLocalStream = async (type: CallTypeEnum) => {
    try {
      const constraints = {
        audio: audioDevices.value.length > 0
          ? { deviceId: selectedAudioDevice.value || undefined }
          : false,
        video: type === CallTypeEnum.VIDEO && videoDevices.value.length > 0
          ? { deviceId: selectedVideoDevice.value || undefined }
          : false,
      };
      if (!constraints.audio && !constraints.video) {
        ElMessage.error("没有可用的设备!");
        return false;
      }
      localStream.value = await navigator.mediaDevices.getUserMedia(constraints);
      // 已默认选择设备，更新设备id
      // if (localStream?.value?.getAudioTracks()?.[0]?.getSettings().deviceId) {
      //   selectedAudioDevice.value = localStream?.value?.getAudioTracks()?.[0]?.getSettings().deviceId;
      // }
      // if (localStream.value?.getVideoTracks()?.[0]?.getSettings().deviceId) {
      //   selectedVideoDevice.value = localStream.value?.getVideoTracks()?.[0]?.getSettings().deviceId;
      // }
      return true;
    }
    catch (err) {
      console.warn("获取本地流失败:", err);
      ElMessage.error("获取本地媒体流失败，请检查设备!");
      return false;
    }
  };


  // 创建 RTCPeerConnection
  const createPeerConnection = (roomId: number) => {
    try {
      const pc = new RTCPeerConnection(configuration);

      // 监听远程流
      pc.ontrack = (event) => {
        if (event.streams[0]) {
          remoteStream.value = event.streams[0];
        }
        else {
          remoteStream.value = null;
        }
      };

      // 添加本地流
      localStream.value?.getTracks().forEach((track) => {
        localStream.value && pc.addTrack(track, localStream.value);
      });

      // 连接状态变化 "closed" | "connected" | "connecting" | "disconnected" | "failed" | "new";
      pc.onconnectionstatechange = (e) => {
        console.log("RTC 连接状态变化: ", pc.connectionState);
        switch (pc.connectionState) {
          case "new":
            break;
          case "connecting":
            connectionStatus.value = CallStatusEnum.CALLING;
            break;
          case "connected":
            connectionStatus.value = CallStatusEnum.ACCEPT;
            startCallTimer(); // 开始计时
            updateChatRTCMessage(roomId, {
              status: CallStatusEnum.ACCEPT,
            }, user.getToken);
            break;
          case "disconnected":
            connectionStatus.value = CallStatusEnum.END;
            ElMessage.error("RTC通讯连接失败!");
            setTimeout(async () => {
              await endCall(CallStatusEnum.ERROR);
              ElMessage.closeAll();
            }, 500);
            break;
          case "closed":
            connectionStatus.value = CallStatusEnum.END;
            setTimeout(async () => {
              await endCall(CallStatusEnum.END);
              ElMessage.closeAll();
            }, 500);
            break;
          case "failed":
            connectionStatus.value = CallStatusEnum.ERROR;
            ElMessage.error("RTC通讯连接失败!");
            setTimeout(async () => {
              await endCall(CallStatusEnum.ERROR);
              ElMessage.closeAll();
            }, 500);
            break;
          default:
            break;
        }
        // @ts-expect-error
        rtcStatus.value = (e?.currentTarget?.connectionState || pc.connectionState) as RTCPeerConnectionState;
      };
      // 创建信道
      channel.value = pc.createDataChannel("chat");
      channel.value.onopen = () => {
        // console.log("信道已打开");
      };
      channel.value.onmessage = (event) => {
        // console.log("收到消息:", event.data);
      };
      channel.value.onerror = (event) => {
        console.warn("信道出错:", event);
      };
      channel.value.onclose = () => {
        // console.log("信道已关闭");
      };
      pc.onicecandidate = async (event) => {
        if (event.candidate && roomId) {
          try {
            pendingCandidates.value.push(event.candidate);
          }
          catch (err) {
            console.error("发送ICE候选者出错:", err);
          }
        }
      };
      peerConnection.value = pc;
      return pc;
    }
    catch (err) {
      console.error("创建 PeerConnection 失败:", err);
      connectionStatus.value = CallStatusEnum.REJECT;
      throw err;
    }
  };

  // 发起通话
  const startCall = async (roomId: number, type: CallTypeEnum, uidList?: string[]) => {
    let loading: any;
    try {
      if (!roomId) {
        return false;
      }
      clear(); // 清理资源
      if (!await getDevices()) {
        ElMessage.error("获取设备失败!");
        return;
      }
      loading = ElLoading.service({
        lock: true,
        text: "正在获取设备...",
        background: "rgba(0, 0, 0, 0.1)",
        customClass: "backdrop-blur",
      });
      // 保存通话信息
      rtcMsg.value = {
        roomId,
        callType: type,
        senderId: user.userId,
        uidList: uidList || [],
      };
      linker.value = true; // 标记是会话人
      // 填充房间信息 @unocss-include
      handleContactInfo(roomId);
      // 设置30秒超时定时器
      callTimer.value = setTimeout(() => {
        if (connectionStatus.value === CallStatusEnum.CALLING) {
          ElMessage.warning("通话无人接听，自动挂断");
          endCall(CallStatusEnum.CANCEL);
        }
      }, MAX_TIME_OUT_SECONDS * 1000);

      if (!await getLocalStream(type)) {
        clear();
        loading.close();
        return false;
      }
      loading.close();

      // 1. 创建 RTCPeerConnection
      const pc = createPeerConnection(roomId);
      // 创建并发送 offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const res = await addChatRTCMessage(roomId, {
        callType: type,
        receiverIds: uidList,
        signalType: SignalTypeEnum.OFFER,
        data: offer,
      }, user.getToken);
      if (res.code !== StatusCode.SUCCESS) {
        return false;
      }
      else {
        const linkMsg = res?.data?.message?.body;
        if (linkMsg?.callId) {
          connectionStatus.value = CallStatusEnum.BUSY;
          ElMessage.closeAll();
          ElMessage.success("对方忙碌中...");
          return true;
        }
      }

      // 播放铃声
      startBell();

      // 开始通话
      connectionStatus.value = CallStatusEnum.CALLING;
      rtcStatus.value = "new";
    }
    catch (err) {
      console.error("开始通话失败:", err);
      ElMessage.error("RTC通讯连接失败!");
      clear();
      loading.close();
      return false;
    }
  };

  function clear() {
    try {
      // 停止铃声并重置
      stopBell();
      // 清除超时定时器
      if (callTimer.value) {
        clearTimeout(callTimer.value);
        callTimer.value = null;
      }
      // 停止计时器
      stopCallTimer();
      // 关闭信道
      channel.value?.close?.();
      // 关闭连接
      peerConnection.value?.close?.();
      // 关闭媒体流
      localStream.value?.getTracks().forEach(track => track.stop());
      remoteStream.value?.getTracks().forEach(track => track.stop());
    }
    catch (error) {
      ElMessage.error("部分资源清理失败!");
      console.error("清理资源失败:", error);
    }
    finally {
      // 重置状态
      rtcMsg.value = {
        roomId: undefined,
        callType: undefined,
        senderId: undefined,
      };
      pendingCandidates.value = [];
      audioDevices.value = [];
      videoDevices.value = [];
      selectedAudioDevice.value = null;
      selectedVideoDevice.value = null;
      localStream.value = null;
      remoteStream.value = null;
      connectionStatus.value = undefined;
      rtcStatus.value = undefined;
      isScreenSharing.value = false;
      linker.value = false;
      // 关闭连接
      peerConnection.value = null;
      channel.value = null;
      channelStatus.value = undefined;
    }
  }

  // 监听 ICE 连接
  async function lisenIceCandidate(roomId: number) {
    if (!peerConnection.value || !linker.value) {
      return;
    }
    // 交换信令后，发送 ICE candidate 信令
    if (pendingCandidates.value.length > 0) {
      for (const candidate of pendingCandidates.value) {
        try {
          updateChatRTCMessage(roomId, {
            signalType: SignalTypeEnum.CANDIDATE,
            data: candidate,
          }, user.getToken).then(() => {
          });
        }
        catch (err) {
          console.error("发送ICE候选者出错:", err);
        }
      }
      pendingCandidates.value = [];
      peerConnection.value.onicecandidate = async (event) => {
        // console.log(user.userInfo.username, "接收端 - 收到 ICE candidate 信令:", event.candidate);
        if (event.candidate) {
          try {
            const res = await updateChatRTCMessage(roomId, {
              signalType: SignalTypeEnum.CANDIDATE,
              data: event.candidate,
            }, user.getToken);

            if (res.code !== StatusCode.SUCCESS) {
              console.error("发送ICE候选者失败:", res.message);
            }
          }
          catch (err) {
            console.error("发送ICE候选者出错:", err);
          }
        }
      };
    };
  }


  // 1. 处理收到的 offer - 接听者
  async function handleOffer({ data: offer, type, roomId }: WSRtcCallMsg) {
    try {
      connectionStatus.value = CallStatusEnum.CALLING;
      // 预备接听
      rtcMsg.value = {
        roomId,
        callType: type,
        senderId: offer.senderId,
      };
      await nextTick();
      // 开启铃声
      startBell();
      // tauri显示窗口
      if (setting.isDesktop) {
        const win = await WebviewWindow.getByLabel(MAIN_WINDOW_LABEL);
        if (!win)
          return;
        await win.unminimize();
        await win.show();
        await win.setFocus();
      }
      // 获取房间信息
      handleContactInfo(roomId);
      // 用户接受通话，继续原有流程
      let isLocalStreamOk = false;
      getDevices().then(async () => {
        await getLocalStream(type);
        isLocalStreamOk = true;
      });
      // 等待用户确认接听
      const userConfirmed = await new Promise((resolve) => {
        // 添加确认和拒绝的方法
        const confirmCall = () => {
          connectionStatus.value = CallStatusEnum.ACCEPT;
          stopBell(); // 停止铃声
          resolve(true);
        };
        const rejectCall = () => {
          resolve(false); // 拒绝
        };
        openDialog(type, { confirmCall, rejectCall });

        // 30秒超时自动拒绝
        setTimeout(() => resolve(null), MAX_TIME_OUT_SECONDS * 1000);
      });
      if (userConfirmed === null) { // 超时自动拒绝
        connectionStatus.value = CallStatusEnum.BUSY;
        clear();
        return false;
      }
      else if (userConfirmed === false) { // 用户拒绝
        connectionStatus.value = CallStatusEnum.REJECT;
        await endCall(CallStatusEnum.REJECT);
        return false;
      }
      // 用户接受通话，继续原有流程
      if (!isLocalStreamOk) { // 重新获取
        // getDevices().then(() => getLocalStream(type));
        await getDevices();
        isLocalStreamOk = await getLocalStream(type);
      }
      await nextTick();

      // 2. 创建 RTCPeerConnection
      peerConnection.value = createPeerConnection(roomId);
      rtcStatus.value = "new";

      // 3. 设置远程描述
      await peerConnection.value.setRemoteDescription(offer);

      // 4. 创建并发送 answer
      const answer = await peerConnection.value.createAnswer();
      await peerConnection.value.setLocalDescription(answer);
      // console.log(`${user.userInfo.username}：发送 answer 信令:`, answer);
      // 监听 ICE 连接状态
      // 5. 监听 ICE candidate
      if (!roomId) {
        ElMessage.error("房间号不存在，请重新连接！");
        return false;
      }

      linker.value = true; // 标记是会话人
      // 6. 发送 answer 信令到远端
      const res = await updateChatRTCMessage(roomId, {
        signalType: SignalTypeEnum.ANSWER,
        data: answer,
      }, user.getToken);
      if (res.code !== StatusCode.SUCCESS) {
        return false;
      }
      lisenIceCandidate(roomId);
      connectionStatus.value = CallStatusEnum.ACCEPT;
    }
    catch (error) {
      console.error("处理 offer 失败:", error);
      endCall();
    }
  }

  // 2. 处理收到的 answer 发起者 收到的回信
  async function handleAnswer({ data: answer, roomId }: WSRtcCallMsg) {
    try {
      if (peerConnection.value) {
        // 清除超时定时器
        if (callTimer.value) {
          clearTimeout(callTimer.value);
          callTimer.value = null;
        }
        // console.log(`${user.userInfo.username}收到 answer 信令:`, answer);

        // 2. 停止铃声
        stopBell();

        // 3. 通知服务器通话已建立
        if (isSender.value) {
          if (!roomId) {
            ElMessage.error("房间号不存在，请重新连接！");
            endCall();
            return;
          }
          // 4. 发起者 - 设置远程描述
          await peerConnection.value.setRemoteDescription(answer);

          lisenIceCandidate(roomId);
        }
      }
    }
    catch (error) {
      console.error("处理 answer 失败:", error);
      connectionStatus.value = CallStatusEnum.ERROR;
      endCall();
    }
  }
  // 3. 处理 ICE candidate
  async function handleCandidate({ data: candidate, roomId }: WSRtcCallMsg) {
    try {
      if (peerConnection.value && candidate && candidate.candidate) {
        // console.log("收到 candidate 信令:", candidate.candidate);
        await peerConnection.value.addIceCandidate(candidate);
      }
    }
    catch (error) {
      console.error("处理 candidate 失败:", error);
    }
  }

  /** ****************************功能函数 */
  // 切换静音
  function toggleMute() {
    if (localStream.value) {
      const audioTrack = localStream.value.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }

  // 切换音频设备
  async function switchAudioDevice(deviceId: string) {
    try {
      selectedAudioDevice.value = deviceId;
      if (localStream.value) {
        const newStream = await navigator?.mediaDevices?.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
          video: rtcMsg.value.callType === CallTypeEnum.VIDEO ? (selectedVideoDevice.value ? { deviceId: { exact: selectedVideoDevice.value || undefined } } : false) : false,
        });
        // 替换现有轨道
        const newAudioTrack = newStream.getAudioTracks()[0];
        const oldAudioTrack = localStream.value.getAudioTracks()[0];

        if (newAudioTrack) {
          if (!oldAudioTrack) {
            localStream.value.addTrack(newAudioTrack);
            peerConnection.value?.addTrack(newAudioTrack, localStream.value);
            return;
          }
          peerConnection.value?.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "audio") {
              sender?.replaceTrack?.(newAudioTrack);
            }
          });
          oldAudioTrack && localStream.value.removeTrack(oldAudioTrack);
          localStream.value.addTrack(newAudioTrack);
        }
        else {
          ElMessage.error("切换设备不存在或不支持，请重新选择！");
        }
      }
    }
    catch (error) {
      ElMessage.error("切换音频设备失败！");
      console.error("切换音频设备失败:", error);
    }
  }

  // 切换视频设备
  async function switchVideoDevice(deviceId: string, checkScreenSharing = false) {
    try {
      // 前置校验
      if (checkScreenSharing) {
        ElMessageBox.confirm("切换设备会导致当前屏幕共享会话结束，是否继续？", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        }).then((action) => {
          if (action === "confirm") {
            switchVideoDevice(deviceId, false);
          }
        }).catch(() => {
        });
        return;
      }
      selectedVideoDevice.value = deviceId;
      if (localStream.value && localStream.value.getVideoTracks().length > 0) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioDevice.value ? { deviceId: { exact: selectedAudioDevice.value || undefined } } : false,
          video: { deviceId: { exact: deviceId } },
        });

        // 替换现有轨道
        const newVideoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = localStream.value.getVideoTracks()[0];
        // console.log(oldVideoTrack, newVideoTrack);

        if (newVideoTrack) {
          if (!oldVideoTrack) {
            localStream.value.addTrack(newVideoTrack);
            peerConnection.value?.addTrack(newVideoTrack, localStream.value);
            return;
          }
          peerConnection.value?.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "video") {
              sender.replaceTrack(newVideoTrack);
            }
          });
          oldVideoTrack && localStream.value.removeTrack(oldVideoTrack);
          localStream.value.addTrack(newVideoTrack);
        }
        else {
          ElMessage.error("切换设备不存在或不支持，请重新选择！");
        }
      }
    }
    catch (error) {
      ElMessage.error("切换视频设备失败！");
      console.error("切换视频设备失败:", error);
    }
  }

  // 切换视频开关
  function toggleVideo() {
    if (localStream.value) {
      const videoTrack = localStream.value.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }


  // 停止桌面共享
  const stopScreenShare = () => {
    if (isScreenSharing.value) {
      isScreenSharing.value = false;
      // 停止当前的本地流
      if (localStream.value) {
        localStream.value.getTracks().forEach(track => track.stop());
      }
      if (!selectedVideoDevice.value || !rtcMsg.value.callType) {
        return false;
      }
      // 切换到默认设备
      getLocalStream(rtcMsg.value.callType);
      // 切换原来的视频轨道
      selectedVideoDevice.value && switchVideoDevice(selectedVideoDevice.value);
      return true;
    }
    return false;
  };

  // 开始桌面共享
  const startScreenShare = async () => {
    try {
      if (!navigator?.mediaDevices?.getDisplayMedia) {
        ElNotification.warning({
          title: "兼容提示",
          message: "当前浏览器不支持桌面共享功能！",
        });
        return;
      }
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // 如果需要共享音频
      });
      if (!screenStream) {
        return;
      }

      // 停止当前的本地流
      if (localStream.value) {
        localStream.value.getTracks().forEach(track => track.stop());
      }

      // 替换本地流为桌面共享流
      localStream.value = screenStream;
      // 添加新的视频轨道到连接
      screenStream.getTracks().forEach((track) => {
        if (localStream.value) {
          peerConnection.value?.addTrack(track, localStream.value);
        }
      });
      // 远程替换为桌面共享流
      const newVideoTrack = screenStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.value.getVideoTracks()[0];
      if (!newVideoTrack) {
        ElMessage.error("桌面共享失败，请检查权限设置!");
        return;
      }
      newVideoTrack.onended = () => {
        ElNotification.warning("屏幕共享已结束 ~");
        stopScreenShare();
      };
      peerConnection.value?.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          sender.replaceTrack(newVideoTrack);
        }
      });
      oldVideoTrack && localStream.value.removeTrack(oldVideoTrack);
      localStream.value.addTrack(newVideoTrack);
      isScreenSharing.value = true; // 开始桌面共享
    }
    catch (error: any) {
      console.error("开始桌面共享失败:", error);
      isScreenSharing.value = false;
      stopScreenShare();
      if (error?.name === "NotAllowedError") {
        ElNotification.warning({
          message: "已取消屏幕共享...",
        });
        return;
      }
      ElMessage.error("桌面共享失败，请检查权限设置!");
    }
  };


  function unMounted() {
    mitter.off(MittEventType.RTC_CALL);
    endCall();
  }

  function mounted() {
  /**
   * 通话消息 事件
   */
    mitter.on(MittEventType.RTC_CALL, (msg) => {
    // 通话消息 type=1
      if (msg) {
      // 遍历所有消息
        msg = msg ? JSON.parse(JSON.stringify(msg)) : null;
        if (msg) {
          if (!linker.value && msg.status === CallStatusEnum.ACCEPT) {
            !isSender && ElMessage.warning("已在其他设备接听！");
            ws.wsMsgList.rtcMsg.splice(0); // 清空消息列表
            clear();
            return;
          }
          connectionStatus.value = msg.status;
          switch (msg.signalType) {
            case SignalTypeEnum.OFFER:
              // 收到offer信令
              if (msg.senderId !== user.userId)
                handleOffer(msg);
              break;
            case SignalTypeEnum.ANSWER:
              if (!peerConnection.value)
                break;
              handleAnswer(msg);
              break;
            case SignalTypeEnum.CANDIDATE:
              if (!peerConnection.value)
                break;
              handleCandidate(msg);
              break;
            case SignalTypeEnum.LEAVE:
              clear();
              break;
            default:
              break;
          }
        }
        ws.wsMsgList.rtcMsg.splice(0); // 清空消息列表
      }
    });
  }


  return {
    theContact,
    rtcMsg,
    isSender,
    isRtcConnecting,
    rtcStatus,
    callDuration, // 添加通话时长
    peerConnection,
    channel,

    // 兼容性
    isSupportFullscreen,
    isSupportScreenSharing,

    // 设备相关
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,

    // 状态相关
    connectionStatus,
    localStream,
    remoteStream,
    isScreenSharing, // 添加桌面共享状态

    // 方法
    startCall,
    endCall,
    getDevices,
    toggleMute,
    switchAudioDevice,
    toggleVideo,
    switchVideoDevice,
    startScreenShare, // 添加桌面共享方法
    stopScreenShare, // 添加停止桌面共享方法
    mounted,
    unMounted,
  };
}
