<script lang="ts">
import type { ReactionEmojiType, ReactionVO } from "~/composables/api/chat/message";
import { CommonListTransitionGroup } from "#components";
import { MSG_REACTION_EMOJI_MAP, toggleMessageReaction } from "~/composables/api/chat/message";

export interface MsgReactionProps {
  /** 消息数据 */
  data: ChatMessageVO;
}
</script>

<script lang="ts" setup>
const { data } = defineProps<MsgReactionProps>();

const chat = useChatStore();
const user = useUserStore();
const isSelf = computed(() => user?.userInfo?.id === data?.fromUser?.userId);

// 是否支持 reaction（AI 和热门房间不支持）
const canReact = computed(() => !chat.isAIRoom);

// 当前消息的 reactions
const reactions = computed(() => data.message?.reactions?.filter(r => r.count > 0) || []);
const hasReactions = computed(() => reactions.value.length > 0);

// 根据 userId 解析用户昵称
function resolveNickName(userId: string): string {
  if (userId === user?.userInfo?.id)
    return "我";
  const roomId = data.message.roomId;
  const member = chat.groupMemberMap[`${roomId}_${userId}`];
  if (member?.nickName)
    return member.nickName;
  // 好友房间直接用消息中的用户信息
  if (chat.theContact.name)
    return chat.theContact.name;
  return userId;
}

// 获取 reaction 的用户名称列表
function getReactionNames(reaction: ReactionVO): string {
  return reaction.userIds.map(resolveNickName).join("、");
}

// 切换 reaction（点击 pill 时触发）
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
  <CommonListTransitionGroup
    v-if="canReact && hasReactions"
    tag="div"
    name="reaction-animate-list"
    :immediate="false"
    class="reaction-bar"
    :class="{ 'is-self': isSelf }"
  >
    <!-- 每一个触发表情 -->
    <div
      v-for="reaction in reactions"
      :key="reaction.emojiType"
    >
      <el-popover
        trigger="hover"
        placement="top"
        popper-class="global-custom-select !bg-color-br !backdrop-blur-20px !border-default-3"
        :show-arrow="false"
        :offset="5"
        :width="200"
        :show-after="500"
      >
        <template #reference>
          <span
            :key="reaction.emojiType"
            class="reaction-pill"
            :class="{ active: reaction.isCurrentUser }"
            role="button"
            tabindex="0"
            @click="onToggleReaction(reaction.emojiType)"
          >
            <i class="reaction-emoji" :class="MSG_REACTION_EMOJI_MAP[reaction.emojiType]?.icon" />
            <span class="reaction-count">{{ reaction.count }}</span>
          </span>
        </template>
        <template #default>
          <div class="text-0.8rem leading-1.6em">
            <div class="mb-1 font-500">
              <i :class="MSG_REACTION_EMOJI_MAP[reaction.emojiType]?.icon" class="inline-block p-2 align-middle" />
              {{ MSG_REACTION_EMOJI_MAP[reaction.emojiType]?.label }}
            </div>
            <div class="text-small-color">
              {{ getReactionNames(reaction) }}
            </div>
          </div>
        </template>
      </el-popover>
    </div>
  </CommonListTransitionGroup>
</template>

<style lang="scss" scoped>
.reaction-bar {
  --at-apply: "flex flex-wrap gap-1";

  &.is-self {
    --at-apply: "justify-end";
  }
}

.reaction-pill {
  --at-apply: "bg-transparent border-default-2-hover inline-flex items-center gap-1 pl-1 pr-2 py-0 rounded-full cursor-pointer select-none text-0.5rem";

  &:hover {
    --at-apply: "shadow-sm";
  }

  &.active {
    --at-apply: "light:bg-white dark:bg-dark-500 border-default-3 text-color";
  }

  &:hover {
    .reaction-emoji {
      --at-apply: "p-2 transition-200 hover:(filter-brightness-110 scale-110)";
    }
  }

  .reaction-emoji {
    --at-apply: "p-2 transition-200 hover:(filter-brightness-110 scale-110)";
  }

  .reaction-count {
    --at-apply: "text-secondary text-0.75rem";
  }
}

.reaction-animate-list {
  --at-apply: "flex flex-wrap gap-1 items-center";
  overflow: hidden;
  transition:
    max-width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    max-height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.2s;
  max-width: 4rem;
}

.reaction-animate-list-enter-active,
.reaction-animate-list-leave-active {
  transition:
    max-width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    max-height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s;
}

.reaction-animate-list-enter-from,
.reaction-animate-list-leave-to {
  opacity: 0;
  max-width: 0;
  max-height: 0;
  padding: 0 !important;
}

.reaction-animate-list-enter-to,
.reaction-animate-list-leave-from {
  opacity: 1;
  max-width: 4rem;
}
</style>
