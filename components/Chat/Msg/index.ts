import ContextMenu from "@imengyu/vue3-context-menu";

// @unocss-include
// 常量定义
export const RECALL_TIME_OUT = 300000; // 默认5分钟
const COPY_IMAGE_TYPES = ["image/png", "image/jpg", "image/svg+xml"];

/**
 * 处理消息上下文菜单事件
 * @param {MouseEvent} e - 鼠标事件
 * @param {ChatMessageVO<any>} data - 聊天消息数据
 * @param {Function} onDownLoadFile - 可选的文件下载回调函数
 */
export function onMsgContextMenu(e: MouseEvent, data: ChatMessageVO<any>, onDownLoadFile?: () => any) {
  const chat = useChatStore();
  const user = useUserStore();
  const setting = useSettingStore();
  const showTranslation = ref(false);
  // 阻止默认上下文菜单
  e.preventDefault();

  // 从目标元素获取上下文名称
  const ctxName = String((e?.target as HTMLElement)?.getAttribute?.("ctx-name") || "");

  // 如果没有上下文名称，则返回
  if (!ctxName) {
    return;
  }

  // 如果是未发送成功的消息
  if (chat.isExsistQueue(data.message.id)) {
    return;
  }

  // 权限检查
  const isSelf = user.userInfo.id === data.fromUser.userId;
  const isTheGroupPermission = computed(() => {
    return chat.theContact?.member?.role === ChatRoomRoleEnum.OWNER
      || chat.theContact?.member?.role === ChatRoomRoleEnum.ADMIN;
  });

  // 选中的文本或消息内容
  const txt = window.getSelection()?.toString() || data.message.content;

  // 处理移动端@提及
  if (setting.isMobileSize && ctxName === "avatar" && chat.theContact?.type === RoomType.GROUP) {
    chat.setAtUid(data.fromUser.userId);
    return;
  }

  const translation = data?.message.body?._textTranslation as TranslationVO | null;

  // 大多数消息类型的默认上下文菜单选项
  const defaultContextMenu = [
    {
      label: "撤回",
      hidden: !isSelf || data.message.sendTime < Date.now() - RECALL_TIME_OUT, // 超过5分钟
      customClass: "group",
      icon: "i-solar:backspace-broken group-hover:(scale-110 i-solar:backspace-bold) group-btn-danger",
      onClick: () => refundMsg(data, data.message.id),
    },
    {
      label: "回复",
      customClass: "group",
      icon: "i-solar:arrow-to-down-right-line-duotone -rotate-90 group-hover:(translate-x-1 translate-x-2px) group-btn-info",
      onClick: () => chat.setReplyMsg(data),
    },
    {
      label: "删除",
      customClass: "group",
      divided: "up",
      icon: "i-solar:trash-bin-minimalistic-outline group-hover:(shake i-solar:trash-bin-minimalistic-bold) group-btn-danger",
      hidden: !isTheGroupPermission.value,
      onClick: () => deleteMsg(data, data.message.id),
    },
  ];

  // 不同消息类型的上下文菜单配置
  const contextMenuType: Record<string, any> = {
    // 文本内容
    content: [
      {
        label: "复制",
        hidden: !txt,
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          if (!txt) {
            return ElMessage.error("复制失败，请选择文本！");
          }
          useCopyText(txt as string);
        },
      },
      {
        label: "打开链接",
        hidden: !Object.keys(data.message.body?.urlContentMap || {}).length,
        customClass: "group",
        icon: "i-solar:link-line-duotone group-hover:(scale-110 i-solar:link-bold-duotone) group-btn-info",
        onClick: () => {
          if (!txt)
            return;
          const urlMap = data.message.body?.urlContentMap || {};
          const urls = Object.keys(urlMap);
          if (!urls?.length) {
            return ElMessage.error("抱歉找不到链接！");
          }
          if (urls.length === 1) {
            return window.open(urls[0], "_blank");
          }
        },
      },
      {
        label: "搜一搜",
        hidden: !data.message.content,
        customClass: "group",
        icon: "i-solar:magnifer-linear group-hover:(rotate-15 i-solar:magnifer-bold) group-btn-info",
        onClick: () => {
          if (!txt) {
            return ElMessage.error("选择内容为空，无法搜索！");
          }
          const bingUrl = `https://bing.com/search?q=${encodeURIComponent(txt as string)}`;
          window.open(bingUrl, "_blank");
        },
      },
      ...defaultContextMenu,
    ],
    // 图片内容
    img: [
      {
        label: "复制",
        customClass: "group",
        hidden: !data.message.body.url || setting.isMobile,
        icon: "i-solar:copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: async () => {
          let img = await getImgBlob(BaseUrlImg + data.message.body.url);
          if (!img) {
            return ElMessage.error("图片加载失败！");
          }

          if (!COPY_IMAGE_TYPES.includes(img.type)) {
            img = await convertImgToPng(img);
          }

          if (!img) {
            return ElMessage.error("图片处理失败！");
          }

          const { copy, isSupported } = useClipboardItems({
            read: false,
            source: [new ClipboardItem({ [img.type]: img })],
          });

          if (isSupported.value) {
            copy()
              .then(() => {
                ElMessage.success("图片已复制到剪切板！");
              })
              .catch((e) => {
                console.warn(e);
                ElMessage.error("复制失败，请手动保存！");
              });
            img = null;
          }
          else {
            ElMessage.error("当前设备不支持复制图片！");
            img = null;
          }
        },
      },
      {
        label: "保存图片",
        customClass: "group",
        hidden: !data.message.body.url,
        icon: "i-solar-download-minimalistic-broken group-hover:(translate-y-2px i-solar-download-minimalistic-bold) group-btn-success",
        onClick: async () => saveImageLocal(BaseUrlImg + data.message.body.url),
      },
      ...defaultContextMenu,
    ],

    // 文件内容
    file: [
      {
        label: setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url] ? "打开文件" : "下载文件",
        hidden: setting.isWeb || data.message.type !== MessageType.FILE,
        customClass: "group",
        icon: setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url]
          ? "i-solar-file-line-duotone group-hover:(scale-110 i-solar-file-bold-duotone) group-btn-info"
          : "i-solar-download-minimalistic-broken group-hover:(translate-y-2px i-solar-download-minimalistic-bold) group-btn-success",
        onClick: () => onDownLoadFile && onDownLoadFile(),
      },
      {
        label: "文件夹打开",
        hidden: setting.isWeb || data.message.type !== MessageType.FILE
          || !setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url],
        customClass: "group",
        icon: "i-solar:folder-with-files-line-duotone group-hover:(scale-110 i-solar:folder-with-files-bold-duotone) group-btn-info",
        onClick: () => setting.openFileFolder(setting.fileDownloadMap?.[BaseUrlFile + data.message.body.url] as FileItem),
      },
      ...defaultContextMenu,
    ],

    // 语音内容
    sound: [
      {
        label: showTranslation.value ? "折叠转文字" : "转文字",
        hidden: data.message.type !== MessageType.SOUND || !translation,
        customClass: "group",
        icon: "i-solar:text-broken group-hover:(scale-110 i-solar:text-bold) group-btn-info",
        onClick: () => (showTranslation.value = !showTranslation.value),
      },
      ...defaultContextMenu,
    ],

    // 昵称内容
    nickname: [
      {
        label: "复制",
        hidden: !data.fromUser.nickName,
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          const txt = window.getSelection()?.toString() || data.fromUser.nickName;
          useCopyText(txt as string);
        },
      },
      {
        label: "个人资料",
        icon: "i-solar:user-broken group-hover:(scale-110 i-solar:user-bold) group-btn-info",
        customClass: "group",
        hidden: isSelf,
        onClick: () => navigateToUserDetail(data.fromUser.userId),
      },
      {
        label: "TA",
        icon: "i-solar:mention-circle-broken group-hover:(rotate-15 i-solar:mention-circle-bold) group-btn-info",
        customClass: "group",
        hidden: isSelf || chat.theContact.type === RoomType.SELFT,
        onClick: () => chat.setAtUid(data.fromUser.userId),
      },
    ],

    // 头像内容
    avatar: [
      {
        label: isSelf ? "查看自己" : "个人资料",
        icon: "i-solar:user-broken group-btn-info",
        customClass: "group",
        onClick: () => navigateToUserDetail(data.fromUser.userId),
      },
      {
        label: "TA",
        icon: "i-solar:mention-circle-broken group-btn-info",
        customClass: "group",
        hidden: isSelf || chat.theContact.type === RoomType.SELFT,
        onClick: () => chat.setAtUid(data.fromUser.userId),
      },
    ],

    // RTC通话内容
    rtc: [
      {
        label: "重新拨打",
        icon: "i-solar:call-dropped-bold p-2.6 group-btn-warning",
        customClass: "group",
        onClick: () => chat.rollbackCall(data.message.roomId, data.message.body?.type, data),
      },
      {
        label: "回复",
        icon: "i-solar:arrow-to-down-right-line-duotone -rotate-90 group-btn-info",
        onClick: () => chat.setReplyMsg(data),
      },
    ],

    // 视频内容
    video: [
      {
        label: "静音播放",
        icon: "i-solar:volume-cross-line-duotone group-hover:(scale-110 i-solar:volume-cross-bold-duotone) group-btn-warning",
        customClass: "group",
        onClick: () => {
          const body = data.message.body as VideoBodyMsgVO;
          if (!body?.url) {
            return;
          }

          mitter.emit(MittEventType.VIDEO_READY, {
            type: "play-dbsound",
            payload: {
              mouseX: e.clientX,
              mouseY: e.clientY,
              url: BaseUrlVideo + body.url,
              duration: body.duration,
              size: body.size,
              thumbUrl: BaseUrlImg + body.thumbUrl,
              thumbSize: body.thumbSize,
              thumbWidth: body.thumbWidth,
              thumbHeight: body.thumbHeight,
            },
          });
        },
      },
      {
        label: "另存视频",
        icon: "i-solar:download-line-duotone group-hover:(scale-110 i-solar:download-bold-duotone) group-btn-success",
        customClass: "group",
        onClick: async () => saveVideoLocal(BaseUrlVideo + data.message.body.url),
      },
      ...defaultContextMenu,
    ],
  };

  // 获取适当的上下文菜单项
  const items = contextMenuType[ctxName] || [];
  if (items.length === 0) {
    return;
  }

  // 显示上下文菜单
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    theme: setting.contextMenuTheme,
    items,
  });
}

/**
 * 撤回消息
 * @param {ChatMessageVO} data - 消息数据
 * @param {number} msgId - 消息ID
 */
async function refundMsg(data: ChatMessageVO<any>, msgId: number) {
  const oldData = JSON.parse(JSON.stringify(data));
  const user = useUserStore();
  const chat = useChatStore();
  const roomId = data.message.roomId;

  const res = await refundChatMessage(roomId, msgId, user.getToken);

  if (res.code === StatusCode.SUCCESS) {
    if (data.message.id === msgId) {
      if (data.message.content) {
        // 存储撤回的消息以便潜在的恢复
        chat.setRecallMsg(oldData);
      }
      data.message.type = MessageType.RECALL;
      data.message.content = `${data.fromUser.userId === user.userInfo.id ? "我" : `"${data.fromUser.nickName}"`}撤回了一条消息`;
      data.message.body = undefined;
    }
  }
}

/**
 * 删除消息
 * @param {ChatMessageVO} data - 消息数据
 * @param {number} msgId - 消息ID
 */
function deleteMsg(data: ChatMessageVO<any>, msgId: number) {
  ElMessageBox.confirm("是否确认删除消息？", "删除提示", {
    lockScroll: false,
    confirmButtonText: "确 认",
    confirmButtonClass: "el-button--primary is-plain border-default",
    cancelButtonText: "取 消",
    center: true,
    callback: async (action: string) => {
      if (action !== "confirm")
        return;

      const user = useUserStore();
      const roomId = data.message.roomId;

      const res = await deleteChatMessage(roomId, msgId, user.getToken);

      if (res.code === StatusCode.SUCCESS) {
        if (data.message.id === msgId) {
          data.message.type = MessageType.DELETE;
          data.message.content = `${
            data.fromUser.userId === user.userInfo.id
              ? "我删除了一条消息"
              : `我删除了一条"${data.fromUser.nickName}"成员消息`
          }`;
          data.message.body = undefined;
        }
      }
    },
  });
}

export interface ImgSizeOptions {
  maxWidth: number;
  maxHeight: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * 获取图片尺寸
 * @param {number} rawWidth - 原始宽度
 * @param {number} rawWeight - 原始高度
 * @returns {object} 图片尺寸对象
 */
export function getImgSize(rawWidth?: number, rawWeight?: number, options: ImgSizeOptions = { maxWidth: 280, maxHeight: 280, minWidth: 40, minHeight: 40 }) {
  const width = rawWidth || 0;
  const height = rawWeight || 0;
  const { maxWidth = 300, maxHeight = 300, minWidth = 40, minHeight = 40 } = options;

  // 提前返回默认值
  if (!width || !height) {
    return {
      width: "",
      height: "",
    };
  }

  const ratio = width / height;
  const maxRatio = maxWidth / maxHeight;

  // 检查是否接近最小值（阈值设为最小值的1.5倍）
  const minThreshold = 2;
  const isNearMinWidth = width <= minWidth * minThreshold;
  const isNearMinHeight = height <= minHeight * minThreshold;

  let finalWidth: number;
  let finalHeight: number;

  // 如果原始宽高都接近最小值，进行整体放大
  if (isNearMinWidth && isNearMinHeight) {
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY, 4); // 限制最大放大倍数为4倍

    finalWidth = width * scale;
    finalHeight = height * scale;
  }
  else {
    // 原有的缩放逻辑
    if (ratio > maxRatio) {
      // 宽度优先
      finalWidth = Math.min(width, maxWidth);
      finalHeight = finalWidth / ratio;
    }
    else {
      // 高度优先
      finalHeight = Math.min(height, maxHeight);
      finalWidth = finalHeight * ratio;
    }
  }

  return {
    width: `${Math.max(finalWidth, minWidth)}px`,
    height: `${Math.max(finalHeight, minHeight)}px`,
  };
}

/**
 * 渲染消息体
 * @param {ChatMessageVO} msg - 消息对象
 * @returns {string} 消息内容
 */
export function useRenderMsg(msg: ChatMessageVO) {
  const chat = useChatStore();
  const body = msg?.message?.body as TextBodyMsgVO;
  const urlContentMap = body.urlContentMap || {};
  const mentionList = body.mentionList || [];

  const parsedContent = computed(() => {
    const content = msg.message.content || "";
    if (!content)
      return [];

    return parseMessageContentWithMentionsAndUrls(content, mentionList, urlContentMap);
  });

type Token
  = | {
    type: "text";
    content: string;
    startIndex: number;
    endIndex: number;
  }
  | {
    type: "mention";
    content: string;
    data: MentionInfo;
    startIndex: number;
    endIndex: number;
  }
  | {
    type: "url";
    content: string;
    data: {
      title?: string;
      description?: string;

      url: string;
      altTitle?: string;
    };
    startIndex: number;
    endIndex: number;
  };
/**
 * 解析消息内容，替换@提及和链接
 */
function parseMessageContentWithMentionsAndUrls(
  content: string,
  mentions: MentionInfo[],
  urlMap: { [key: string]: UrlInfoDTO },
) {
  const tokens: Token[] = [];

  // 收集所有需要替换的位置信息
  const replacements: Array<{
    start: number;
    end: number;
    type: "mention" | "url";
    data: any;
    displayText: string;
  }> = [];

  // 创建副本以避免修改原始数据
  const remainingMentions = [...mentions];
  const remainingUrlMap = { ...urlMap };

  // 处理@提及
  remainingMentions.forEach((mention, mentionIndex) => {
    // 查找@mention的位置，支持多种格式：@username、@[username]等
    const index = content.indexOf(mention.displayName);
    if (index !== -1) {
      replacements.push({
        start: index,
        end: index + mention.displayName.length,
        type: "mention",
        data: mention,
        displayText: mention.displayName,
      });
      // 移除已匹配的mention，防止重复匹配
      remainingMentions.splice(mentionIndex, 1);
    }
  });

  // 处理URL链接
  Object.entries(remainingUrlMap).forEach(([originalUrl, urlInfo]) => {
    const index = content.indexOf(originalUrl);
    if (index !== -1) {
      replacements.push({
        start: index,
        end: index + originalUrl.length,
        type: "url",
        data: {
          ...urlInfo,
          url: originalUrl, // 确保URL信息包含原始链接
          altTitle: `${urlInfo.title?.replace(/^(\S{8})\S+(\S{4})$/, "$1...$2") || "未知网站"} (${originalUrl})`,
        },
        displayText: originalUrl,
      });
      // 移除已匹配的URL，防止重复匹配
      delete remainingUrlMap[originalUrl];
    }
  });

  // 按位置排序，避免重叠
  replacements.sort((a, b) => a.start - b.start);

  // 去除重叠的替换项
  const filteredReplacements = replacements.filter((current, index) => {
    if (index === 0)
      return true;
    const previous = replacements[index - 1];
    return current.start >= (previous?.end || 0);
  });

  // 构建token列表
  let currentIndex = 0;

  filteredReplacements.forEach((replacement) => {
    // 添加替换前的文本
    if (currentIndex < replacement.start) {
      const textContent = content.slice(currentIndex, replacement.start);
      if (textContent) {
        tokens.push({
          type: "text",
          content: textContent,
          startIndex: currentIndex,
          endIndex: replacement.start,
        });
      }
    }

    // 添加替换项
    tokens.push({
      type: replacement.type,
      content: replacement.displayText,
      data: replacement.data,
      startIndex: replacement.start,
      endIndex: replacement.end,
    });

    currentIndex = replacement.end;
  });

  // 添加剩余的文本
  if (currentIndex < content.length) {
    const remainingText = content.slice(currentIndex);
    if (remainingText) {
      tokens.push({
        type: "text",
        content: remainingText,
        startIndex: currentIndex,
        endIndex: content.length,
      });
    }
  }

  return tokens;
}

// @unocss-include
// 优化渲染函数，使用更高效的VNode创建
function renderMessageContent() {
  return parsedContent.value.map((token, index) => {
    switch (token.type) {
      case "mention":
        return h("span", {
          "key": `mention-${index}`,
          "title": `前往 ${token.data?.displayName} 的主页`,
          "class": "at-user",
          "data-display-name": token.data?.displayName,
          "data-user-id": token.data?.uid,
          "ctx-name": "content",
          "onClick": () => handleMentionClick(token.data),
        }, token.content);

      case "url":
        return h("a", {
          "key": `url-${index}`,
          "href": token.data?.url,
          "ctx-name": "content",
          "target": "_blank",
          "rel": "noopener noreferrer",
          "class": "msg-link",
          "title": token.data?.altTitle || token.data?.url,
        }, token.content);

      default:
        return h("span", {
          "ctx-name": "content",
          "key": `text-${index}`,
        }, token.content);
    }
  });
}

// 处理@提及点击
function handleMentionClick(mentionItem?: MentionInfo) {
  if (!mentionItem)
    return;

  // 跳转到用户详情页面
  navigateTo({
    path: "/user",
    query: {
      id: mentionItem.uid,
    },
  });
}

return {
  renderMessageContent,
};
}
