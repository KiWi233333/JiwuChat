/**
 * 渲染消息体
 * @param {ChatMessageVO} msg - 消息对象
 * @returns {string} 消息内容
 */
export function useRenderMsg(msg: ChatMessageVO) {
  const body = msg?.message?.body as TextBodyMsgVO;
  const urlContentMap = body.urlContentMap || {};
  const mentionList = body.mentionList || [];

  const parsedContent = computed(() => {
    const content = msg.message.content || "";
    if (!content)
      return [];

    return parseMessageContent(content, mentionList, urlContentMap);
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
   * 解析消息内容
   *
   * @description 替换@提及和链接
   * @param content 消息文本内容
   * @param mentions 提及列表（每个提及只替换一次）
   * @param urlMap 链接映射（全文匹配所有出现的位置）
   */
  function parseMessageContent(
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
      priority: number; // 优先级：mention > url
    }> = [];

    // 处理@提及（每个提及只替换一次）
    const usedMentions = new Set<string>(); // 用于跟踪已使用的提及
    mentions.forEach((mention) => {
      if (usedMentions.has(mention.uid)) {
        return; // 该用户的提及已经处理过，跳过
      }

      const index = content.indexOf(mention.displayName);
      if (index !== -1) {
        replacements.push({
          start: index,
          end: index + mention.displayName.length,
          type: "mention",
          data: mention,
          displayText: mention.displayName,
          priority: 1, // 提及优先级高于链接
        });
        usedMentions.add(mention.uid); // 标记该用户的提及已使用
      }
    });

    // 处理URL链接（全文匹配所有出现的位置）
    Object.entries(urlMap).forEach(([originalUrl, urlInfo]) => {
      let searchIndex = 0;

      // 查找所有出现的位置
      while (true) {
        const index = content.indexOf(originalUrl, searchIndex);
        if (index === -1) {
          break; // 没有更多匹配
        }

        replacements.push({
          start: index,
          end: index + originalUrl.length,
          type: "url",
          data: {
            ...urlInfo,
            url: originalUrl,
            altTitle: `${urlInfo.title?.replace(/^(\S{8})\S+(\S{4})$/, "$1...$2") || "未知网站"} (${originalUrl})`,
          },
          displayText: originalUrl,
          priority: 2, // 链接优先级低于提及
        });

        // 继续从下一个位置搜索
        searchIndex = index + originalUrl.length;
      }
    });

    // 按位置排序，优先级高的在前（同位置时）
    replacements.sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start;
      }
      return a.priority - b.priority; // 优先级高的在前
    });

    // 去除重叠的替换项（优先级高的保留）
    const filteredReplacements: typeof replacements = [];
    replacements.forEach((current) => {
    // 检查是否与已添加的替换项重叠
      const hasOverlap = filteredReplacements.some((existing) => {
        return !(current.end <= existing.start || current.start >= existing.end);
      });

      if (!hasOverlap) {
        filteredReplacements.push(current);
      }
    });

    // 重新按位置排序（移除重叠后可能顺序有变）
    filteredReplacements.sort((a, b) => a.start - b.start);

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
          const fullUrl = token.data?.url?.startsWith("/") || token.data?.url?.includes("://") ? token.data?.url : `http://${token.data?.url}`;
          return h("a", {
            "key": `url-${index}`,
            "href": fullUrl,
            "ctx-name": "urllink",
            "url": fullUrl,
            "target": "_blank",
            "rel": "noopener noreferrer",
            "class": "msg-link",
            "title": token.data?.altTitle || fullUrl,
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
