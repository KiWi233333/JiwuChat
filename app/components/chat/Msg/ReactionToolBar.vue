<script lang="ts">
import type { ReactionEmojiType } from "~/composables/api/chat/message";
import { MSG_REACTION_EMOJI_LIST, MSG_REACTION_EMOJI_MAP, toggleMessageReaction } from "~/composables/api/chat/message";

export interface MsgReactionToolBarProps {
  /** 消息数据 */
  data: ChatMessageVO;
}
</script>

<script lang="ts" setup>
const { data } = defineProps<MsgReactionToolBarProps>();

const chat = useChatStore();
const user = useUserStore();
const isSelf = computed(() => user?.userInfo?.id === data?.fromUser?.userId);

// 是否支持 reaction（AI 和热门房间不支持）
const canReact = computed(() => !chat.isAIRoom);

// 快捷 emoji（工具栏上直接显示的）
const quickEmojis: ReactionEmojiType[] = MSG_REACTION_EMOJI_LIST.slice(0, 6);

// 切换 reaction
const isToggling = ref(false);
async function onToggleReaction(emojiType: ReactionEmojiType) {
  if (isToggling.value || !canReact.value)
    return;
  const msgId = data.message.id;
  const roomId = data.message.roomId;
  if (!msgId || !roomId)
    return;

  // 乐观更新
  const userId = user?.userInfo?.id;
  if (userId) {
    const existing = data.message.reactions?.find(r => r.emojiType === emojiType);
    if (existing) {
      if (existing.isCurrentUser) {
        existing.count--;
        existing.userIds = existing.userIds.filter(id => id !== userId);
        existing.isCurrentUser = false;
      }
      else {
        existing.count++;
        existing.userIds.push(userId);
        existing.isCurrentUser = true;
      }
    }
    else {
      if (!data.message.reactions)
        data.message.reactions = [];
      data.message.reactions.push({
        emojiType,
        count: 1,
        userIds: [userId],
        isCurrentUser: true,
      });
    }
  }

  isToggling.value = true;
  try {
    const res = await toggleMessageReaction(roomId, { msgId, emojiType }, user.getToken);
    if (res.code === StatusCode.SUCCESS && res.data?.reactions) {
      const finalReactions = res.data.reactions;
      if (userId) {
        for (const r of finalReactions) {
          r.isCurrentUser = r.userIds.includes(userId);
        }
      }
      chat.updateMsgReactions(roomId, msgId, finalReactions);
    }
  }
  catch {
    // 失败时不处理，等 WS 推送修正
  }
  finally {
    isToggling.value = false;
  }
}
</script>

<template>
  <!-- reaction-toolbar 类名由 msg.scss :deep(.reaction-toolbar) 控制显隐 -->
  <div v-if="canReact" class="reaction-toolbar" :class="{ 'is-self': isSelf }">
    <!-- 快捷表情 -->
    <span
      v-for="emoji in quickEmojis"
      :key="emoji"
      class="toolbar-emoji"
      role="button"
      tabindex="0"
      :title="MSG_REACTION_EMOJI_MAP[emoji].label"
      @click="onToggleReaction(emoji)"
    >
      <i :class="MSG_REACTION_EMOJI_MAP[emoji].icon" />
    </span>

    <!-- 更多表情 -->
    <el-popover
      trigger="hover"
      :teleported="false"
      :placement="isSelf ? 'top-start' : 'top-end'"
      :width="200"
      :show-after="0"
      :show-arrow="false"
      :offset="5"
      popper-class="global-custom-select !bg-color-br !p-1 !border-none"
    >
      <template #reference>
        <span class="toolbar-emoji toolbar-more" role="button" tabindex="0" title="更多表情">
          <i class="i-tabler:dots p-2" />
        </span>
      </template>
      <template #default>
        <div class="emoji-picker-grid">
          <span
            v-for="emoji in MSG_REACTION_EMOJI_LIST"
            :key="emoji"
            class="emoji-picker-item"
            role="button"
            tabindex="0"
            :title="MSG_REACTION_EMOJI_MAP[emoji].label"
            @click="onToggleReaction(emoji)"
          >
            <i :class="MSG_REACTION_EMOJI_MAP[emoji].icon" />
          </span>
        </div>
      </template>
    </el-popover>
  </div>
</template>

<style lang="scss" scoped>
// reaction-toolbar 显隐由父级 .msg:hover 在 msg.scss 中统一控制
.reaction-toolbar {
  --at-apply: "bg-color flex items-center gap-0.5 p-0.5 rounded-lg shadow transition-200 op-0 pointer-events-none";
}

.toolbar-emoji {
  --at-apply: "inline-flex items-center justify-center cursor-pointer rounded-md transition-200 hover:bg-color-inverse p-0.5";

  i {
    --at-apply: "p-2.8";
  }
}

.toolbar-more {
  --at-apply: "text-small-color hover:text-color";
}

.emoji-picker-grid {
  --at-apply: "grid gap-1";
  grid-template-columns: repeat(6, 1fr);

  .emoji-picker-item {
    --at-apply: "w-7 h-7 inline-flex items-center justify-center cursor-pointer rounded-md p-1 hover:bg-color-inverse hover:filter-brightness-110";

    i {
      --at-apply: "p-2.75";
    }
  }
}
</style>
