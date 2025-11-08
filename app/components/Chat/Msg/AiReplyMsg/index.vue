<script lang="ts" setup>
import { ChatAIEllipsisBody } from "#components";
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/preview.css";

/**
 * AI回复消息
 */
const {
  data,
} = defineProps<{
  data: ChatMessageVO<AiChatReplyBodyMsgVO>;
  prevMsg: ChatMessageVO
  index: number
}>();
const OVERFLOW_LENGTH = 250;
const chat = useChatStore();
const user = useUserStore();

const body = computed(() => data.message?.body);
const initFold = data.message?.content?.length && data.message?.content?.length > 200 && chat.theContact.lastMsgId !== data.message.id;
const initReasonFold = body.value?.reasoningContent?.length && body.value.reasoningContent?.length > 200 && chat.theContact.lastMsgId !== data.message.id;
const isFold = ref(initFold);
const isReasonFold = ref(initReasonFold);
const showReasonLoading = computed(() => body.value?.status === AiReplyStatusEnum.IN_PROGRESS && !data.message?.content);
const showContentLoading = computed(() => (body.value?.status !== undefined && body.value?.status === AiReplyStatusEnum.IN_PROGRESS && (data.message?.content || !body.value?.reasoningContent)));
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    class="group"
    v-bind="$attrs"
  >
    <template #name-after>
      <!-- 折叠 -->
      <span
        v-if="!isFold && data.message?.content && data.message?.content.length > 40"
        class="flex-shrink-0 btn-info text-mini sm:(op-0 group-hover:op-100)"
        @click="isFold = !isFold"
      >
        收起
        <i i-solar:alt-arrow-up-line-duotone p-2 />
      </span>
    </template>
    <template #body>
      <div class="ai-reply-msg-popper relative min-h-2.5em min-w-2.6em">
        <!-- 思考内容 -->
        <div v-if="data?.message?.body?.reasoningContent && !isFold" class="reson-content-wrapper">
          <div :class="isReasonFold ? 'is-folded' : 'is-expanded'" class="reson-content">
            <div class="reson-content-inner">
              <span class="text-theme-info">
                <i i-solar:lightbulb-linear p-2 />
                <span>思考:</span>
              </span>
              {{ data?.message?.body?.reasoningContent }}
              <svg v-if="showReasonLoading" class="inline-block h-1.2em w-1.2em animate-spin -mb-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
            </div>
          </div>
          <button
            class="reson-toggle-btn"
            :class="isReasonFold ? 'is-folded-btn' : ''"
            @click="isReasonFold = !isReasonFold"
          >
            {{ isReasonFold ? '展开' : '收起' }}
            <i
              :class="isReasonFold ? 'i-solar:alt-arrow-down-line-duotone' : 'i-solar:alt-arrow-up-line-duotone'"
              ml-1 p-1.6
            />
          </button>
        </div>
        <!-- 回答内容 -->
        <component
          :is="isFold ? ChatAIEllipsisBody : MdPreview"
          :id="`msg-md-${data.message.id}`"
          language="zh-CN"
          show-code-row-number
          :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
          code-theme="a11y"
          :code-foldable="false"
          ctx-name="content"
          class="markdown-preivew"
          :model-value="data.message?.content || ''"
          @toggle="(val: boolean) => (isFold = val)"
        />
        <svg v-if="showContentLoading" class="absolute bottom-0.75em right-0.75em h-1.2em w-1.2em animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
      </div>
      <!-- 状态 -->
      <small
        v-if="data.message.body?.status === AiReplyStatusEnum.COTINUE && data.message.body.reply?.uid === user.userId"
        ctx-name="ai-status"
        class="at-list flex-mr-a border-default"
        @click.stop="ElMessage.warning('此问答已达最大回答长度，该能力敬请期待！')"
      >
        继续
      </small>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use "./msg.scss";

.markdown-preivew {
  --at-apply: "text-0.9rem p-0 bg-color";
  // line-height: initial !important;
  font-size: inherit;

  :deep(.md-editor-preview-wrapper) {
    color: inherit;
    padding: 0 !important;
    font-size: inherit;

    .md-editor-preview {
      color: var(--el-text-color-primary);
      font-size: inherit;

      img {
        border-radius: 0.25rem;
        overflow: hidden;
        max-width: 12rem !important;
        max-height: 12rem !important;
      }
      h1 {
        font-size: 1.5em;
        margin: 0.8em 0 0.6em 0;
      }

      p {
        margin: 0.4em 0;
      }

      p:not(p:last-of-type) {
        margin: 0.4em 0 0 0;
      }

      p:nth-child(1) {
        margin: 0 !important;
      }

      .md-editor-code {
        line-height: 1.6;
        --at-apply: "m-0 mt-2 flex flex-col overflow-hidden card-bg-color-2 rounded-3 border-default shadow-(md inset)";

        .md-editor-code-block {
          font-size: 0.8em;
          font-size: inherit;
          line-height: 1.6;

          & ~ span[rn-wrapper] > span {
            font-size: 0.8em;
            line-height: 1.6;
            font-size: inherit;
          }
        }
        code {
          border-radius: 0 0 8px 8px;
        }
      }
      .md-editor-code:first-child {
        --at-apply: "my-1";
        border-radius: 6px 1em 1em 1em;
      }
    }
  }
}

// 思考内容容器
.reson-content-wrapper {
  --at-apply: "mt-1 mb-2 relative";
}

.reson-content {
  --at-apply: "relative z-0 card-rounded-df p-2 shadow-(sm inset) bg-color-2 text-mini-50 flex overflow-hidden";
  transition: max-height 0.5s ease-in-out;

  &.is-folded {
    --at-apply: "max-h-3em";
    flex: 0 0 2.5em;

    .reson-content-inner {
      --at-apply: "overflow-hidden text-ellipsis";
      display: -webkit-box;
      -webkit-line-clamp: 1;
      line-clamp: 1;
      -webkit-box-orient: vertical;
      white-space: normal;
    }

    &::after {
      --at-apply: "op-100 z-1";
    }
  }

  &.is-expanded {
    --at-apply: "max-h-200";
    flex: 1 1 auto;

    .reson-content-inner {
      --at-apply: "whitespace-pre-wrap overflow-visible";
    }

    &::after {
      --at-apply: "op-0 -z-1";
    }
  }

  &::after {
    --at-apply: "absolute left-0 bottom-0 w-full h-50% pointer-events-none";
    content: "";
    background: linear-gradient(to top, var(--el-bg-color-overlay), transparent);
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.reson-content-inner {
  --at-apply: "leading-1.5em w-full";
}

.reson-toggle-btn {
  --at-apply: " absolute z-2 op-0 h-6 pl-3 pr-2 text-mini hover:shadow leading-6 shadow rounded cursor-pointer bg-color border-none";
  bottom: 0.4rem;
  right: 50%;
  transition: opacity 0.3s ease-in-out;
  transform: translateX(50%);

  &.is-folded-btn {
    --at-apply: "bg-color op-100";
    right: 0.4rem;
    transform: none;
  }
}

.reson-content-wrapper {
  &:hover {
    .reson-toggle-btn {
      --at-apply: "op-100";
    }
  }
}
</style>
