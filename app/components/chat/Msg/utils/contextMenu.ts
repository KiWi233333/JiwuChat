import type { MessageCtxNameWithMenu } from "~/constants/msgContext";
import ContextMenu from "@imengyu/vue3-context-menu";
import { MSG_CTX_NAMES } from "~/constants/msgContext";
import { COPY_IMAGE_TYPES, RECALL_TIME_OUT } from "./constants";
import { deleteMsg, refundMsg } from "./messageActions";

// @unocss-include

/**
 * 获取 HTMLElement 的自定义属性（优先取 data-xxx，没有再取 xxx 本身）
 * @param {HTMLElement} el 元素
 * @param {string} name 属性名（不带 data- 前缀）
 * @returns {string} 属性值或空字符串
 */
function getElementAttr(el: HTMLElement | null | undefined, name: string): string {
  if (!el)
    return "";
  const dataAttr = el.getAttribute?.(`data-${name}`); // 优先 data-xxx
  if (dataAttr !== null && dataAttr !== undefined)
    return dataAttr;
  return el.getAttribute?.(name) ?? "";
}

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
  let ctxName = getElementAttr(e?.target as HTMLElement, "ctx-name");
  ctxName = String(ctxName || "");
  const isAiReplyMsg = data.message.type === MessageType.AI_CHAT_REPLY;

  // 如果没有上下文名称且不是AI回复，则返回
  if (!ctxName && !isAiReplyMsg) {
    return;
  }

  // 如果是未发送成功的消息
  if (chat.isExsistQueue(data.message.id)) {
    return;
  }

  // 为AI回复设置上下文名称
  if (!ctxName && isAiReplyMsg) {
    ctxName = MSG_CTX_NAMES.AI_REPLY;
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
  if (setting.isMobileSize && ctxName === MSG_CTX_NAMES.AVATAR && chat.theContact?.type === RoomType.GROUP) {
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
  const contextMenuType: Partial<Record<MessageCtxNameWithMenu, any[]>> = {
    // 文本内容
    [MSG_CTX_NAMES.CONTENT]: [
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
        label: translation ? "关闭翻译" : "翻译",
        hidden: !txt,
        customClass: "group",
        icon: `i-solar:text-field-focus-line-duotone group-hover:(scale-110 i-solar:text-field-focus-bold) ${translation ? "group-btn-danger" : "group-btn-success"}`,
        onClick: async () => {
          if (translation) {
            closeTranslation(data.message.id, translation.targetLang);
            data.message.body._textTranslation = null;
          }
          else {
            const res = await useTranslateTxt(data.message.id, data.message.content as string, user.getToken);
            if (res) {
              data.message.body._textTranslation = res;
            }
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
          useOpenUrl(bingUrl);
        },
      },
      ...defaultContextMenu,
    ],

    // 链接内容
    [MSG_CTX_NAMES.URL_LINK]: [
      {
        label: "复制链接",
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          const url = getElementAttr(e?.target as HTMLElement, "url");
          navigator.clipboard.writeText((url || txt) as string);
          ElMessage.success("复制成功！");
        },
      },
      {
        label: "打开链接",
        hidden: !Object.keys(data.message.body?.urlContentMap || {}).length,
        customClass: "group",
        icon: "i-solar:link-line-duotone group-hover:(scale-110 i-solar:link-bold-duotone) group-btn-info",
        onClick: () => {
          const url = getElementAttr(e?.target as HTMLElement, "url");
          if (!url)
            return;
          useOpenUrl(url);
        },
      },
    ],

    // 翻译
    [MSG_CTX_NAMES.TRANSLATION]: [
      {
        label: "复制",
        hidden: !txt || !translation,
        customClass: "group",
        icon: "i-solar-copy-line-duotone group-hover:(scale-110 i-solar-copy-bold-duotone) group-btn-info",
        onClick: () => {
          useCopyText(translation?.result as string);
        },
      },
      {
        label: "重新",
        hidden: !txt || !translation,
        customClass: "group",
        icon: "i-solar:refresh-outline group-hover:(rotate-180 i-solar:refresh-bold) group-btn-info",
        onClick: async () => {
          if (translation) {
            closeTranslation(data.message.id, translation.targetLang);
            data.message.body._textTranslation = null;
          }
          const res = await useTranslateTxt(data.message.id, data.message.content as string, user.getToken);
          if (res) {
            data.message.body._textTranslation = res;
          }
        },
      },
      {
        label: "关闭",
        hidden: !txt || !translation,
        customClass: "group",
        icon: "i-solar:text-field-focus-line-duotone group-hover:(scale-110 i-solar:text-field-focus-bold) group-btn-danger",
        onClick: async () => {
          if (!txt || !data.message.id || !translation)
            return;
          if (closeTranslation(data.message.id, translation.targetLang)) {
            data.message.body._textTranslation = null;
          }
        },
      },
    ],

    // 图片内容
    [MSG_CTX_NAMES.IMG]: [
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
    [MSG_CTX_NAMES.FILE]: [
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
    [MSG_CTX_NAMES.SOUND]: [
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
    [MSG_CTX_NAMES.NICKNAME]: [
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
        hidden: isSelf || chat.theContact.type === RoomType.SELF,
        onClick: () => chat.setAtUid(data.fromUser.userId),
      },
    ],

    // 头像内容
    [MSG_CTX_NAMES.AVATAR]: [
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
        hidden: isSelf || chat.theContact.type === RoomType.SELF,
        onClick: () => chat.setAtUid(data.fromUser.userId),
      },
    ],

    // RTC通话内容
    [MSG_CTX_NAMES.RTC]: [
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
    [MSG_CTX_NAMES.VIDEO]: [
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

    // AI回复内容
    [MSG_CTX_NAMES.AI_REPLY]: [
      {
        label: "分享图片",
        icon: "i-solar:share-line-duotone group-hover:(scale-110 i-solar:share-bold-duotone) group-btn-war",
        customClass: "group",
        onClick: () => {
          ElMessage.warning("暂不支持分享图片");
        },
      },
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
        label: translation ? "关闭翻译" : "翻译",
        hidden: !txt,
        customClass: "group",
        icon: `i-solar:text-field-focus-line-duotone group-hover:(scale-110 i-solar:text-field-focus-bold) ${translation ? "group-btn-danger" : "group-btn-success"}`,
        onClick: async () => {
          if (translation) {
            closeTranslation(data.message.id, translation.targetLang);
            data.message.body._textTranslation = null;
          }
          else {
            const res = await useTranslateTxt(data.message.id, data.message.content as string, user.getToken);
            if (res) {
              data.message.body._textTranslation = res;
            }
            else {
              ElMessage.error("翻译失败，请稍后再试！");
            }
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
          useOpenUrl(bingUrl);
        },
      },
      ...defaultContextMenu,
    ],
  };

  // 获取适当的上下文菜单项
  const items = contextMenuType[ctxName as MessageCtxNameWithMenu] || [];
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
