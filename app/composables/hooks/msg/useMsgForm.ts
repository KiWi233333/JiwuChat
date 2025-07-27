import type { UnlistenFn } from "@tauri-apps/api/event";
import type { OssConstantItemType } from "~/init/system";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { readFile, stat } from "@tauri-apps/plugin-fs";

// @unocss-include
/**
 * 监听文件上传(粘贴、拖拽)
 */
export function useFileLinstener(handleFile: (files: File[]) => void) {
  // /**
  //  * 粘贴上传
  //  * @param e 粘贴事件对象
  //  * @returns void
  //  */
  // async function onPaste(e: ClipboardEvent) {
  //   // 判断粘贴上传
  //   if (!e.clipboardData?.items?.length) {
  //     return;
  //   }
  //   // 拿到粘贴板上的 image file 对象
  //   const fileArr = Array.from(e.clipboardData.items).filter(v => v.kind === "file");
  //   if (!fileArr.length)
  //     return;
  //   e.preventDefault();
  //   const files = [];
  //   for (let i = 0; i < fileArr.length; i++) {
  //     const item = fileArr[i];
  //     if (!item || item.kind !== "file") {
  //       continue;
  //     }
  //     const file = item.getAsFile();
  //     if (file) {
  //       files.push(file);
  //     }
  //   }
  //   handleFile(files);
  // }

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
          // isDragDropOver.value = !disabled?.value;
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
    isDragDropOver,
    unlistenDragDrop,
    listenDragDrop,
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
  const userOptions = shallowRef<AtChatMemberOption[]>([]);
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
      const list: AtChatMemberOption[] = [];
      (data || []).forEach((u: ChatMemberSeVO) => {
        const obj = {
          label: u.nickName,
          value: `${u.nickName}(#${u.username})`,
          userId: u.userId,
          avatar: u.avatar,
          username: u.username,
          nickName: u.nickName,
          role: u.role,
        };
        chat.groupMemberMap[u.userId] = obj;
        if (u.userId !== user.userInfo.id) {
          list.push(obj);
        }
      });

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

/**
 * 加载/AI列表
 * @returns
 *  aiOptions: 所有AI列表
 *  loadAi: 加载AI列表
 */
export function useLoadAiList() {
  const chat = useChatStore();
  const user = useUserStore();
  const aiOptions = ref<AskAiRobotOption[]>([]);
  const aiRoomMap = ref<Record<number, { time: number, isLoading: boolean, list: AskAiRobotOption[] }>>({});

  /**
   * 加载AI列表
   */
  async function loadAi(roomId?: number) {
    aiOptions.value = [];
    if (!roomId)
      return;

    const cache = aiRoomMap.value[roomId];
    if (chat.contactMap[roomId]?.type !== RoomType.GROUP) { // 单聊不查询
      return;
    }

    // 如果缓存存在且未过期,直接使用缓存
    if (cache && (Date.now() - cache.time < CACHE_TIME)) {
      aiOptions.value = cache.list;
      // console.log("use cache ai list");
      return;
    }

    const { data, code } = await getAiRobotListByRoomId(roomId, user.getToken);
    if (data && code === StatusCode.SUCCESS) {
      const list = (data || []).map((u: RobotUserVO) => ({
        label: u.nickname,
        value: u.nickname,
        userId: u.userId,
        avatar: u.avatar,
        username: u.username,
        nickName: u.nickname,
        aiRobotInfo: u,
      }));

      // 更新缓存
      aiRoomMap.value[roomId] = {
        time: Date.now(),
        list,
        isLoading: false,
      };
      aiOptions.value = [
        // {
        //   label: "AI风暴",
        //   value: "AI风暴",
        //   userId: "AI风暴",
        //   avatar: "",
        //   username: "AI风暴",
        //   nickName: "AI风暴",
        //   aiRobotInfo: undefined,
        // }, // 问答全部
        ...list,
      ];
    }
  }

  return {
    aiOptions,
    loadAi,
  };
}

/**
 * 处理/AI删除 mention
 * @param context 文本内容
 * @param pattern 正则
 * @param prefix 前缀
 * @returns 是否匹配删除
 */
export function checkAiReplyWhole(context: string | undefined | null, pattern: string, prefix: string) {
  const chat = useChatStore();
  if (prefix !== "/")
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

/**
 * 处理/AI回复
 * @param text 文本内容
 * @param aiOptions 所有AI列表
 * @returns
 *  aiReply: 识别到的/AI回复
 */
export function resolveAiReply(
  text: string,
  aiOptions: AskAiRobotOption[],
  selectedOptions: AskAiRobotOption[] = [],
  configs: AtConfigs = { regExp: /\/(\S+?)(?=\/|\s|$)/g },
): { aiRobitUidList: string[]; aiRobotList: AskAiRobotOption[]; replaceText: string } {
  const { regExp = /\/(\S+?)(?=\/|\s|$)/g } = configs;
  if (!regExp || !text)
    throw new Error("regExp is required");
  const aiRobotList: AskAiRobotOption[] = [];

  // 匹配所有以/开头的AI名称
  const matches = Array.from(text.matchAll(regExp));

  // 遍历所有匹配项
  for (const match of matches) {
    if (match && match[1]) {
      const aiRobot = aiOptions.find(u => u.nickName === match[1]);
      if (aiRobot && !aiRobotList.some(a => a.userId === aiRobot.userId)) {
        aiRobotList.push(aiRobot);
      }
    }
  }

  // 添加已选择的机器人
  selectedOptions.forEach((option) => {
    if (!aiRobotList.some(a => a.userId === option.userId)) {
      aiRobotList.push(option);
    }
  });

  // 替换所有匹配的AI昵称文本
  let replaceText = text;
  matches.forEach((match) => {
    if (match && match[0]) {
      replaceText = replaceText.replace(match[0], "").trim();
    }
  });

  return {
    aiRobitUidList: aiRobotList.map(p => p.userId),
    aiRobotList: JSON.parse(JSON.stringify(aiRobotList)),
    replaceText,
  };
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

