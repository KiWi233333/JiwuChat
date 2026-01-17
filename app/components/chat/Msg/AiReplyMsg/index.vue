<script lang="ts" setup>
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
const user = useUserStore();

const body = computed(() => data.message?.body);
// 初始折叠状态：内容长度超过200  // 且不是最后一条消息时，默认折叠  && chat.theContact.lastMsgId !== data.message.id
const initFold = data.message?.content?.length && data.message?.content?.length > 200;
const isContentExpanded = ref(!initFold);
const showReasonLoading = computed(() => body.value?.status === AiReplyStatusEnum.IN_PROGRESS && !data.message?.content);
const showContentLoading = computed(() => (body.value?.status !== undefined && body.value?.status === AiReplyStatusEnum.IN_PROGRESS && (!!data.message?.content || !body.value?.reasoningContent)));
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    class="group"
    v-bind="$attrs"
  >
    <template #body>
      <div
        class="ai-reply-msg-box relative min-h-2.5em min-w-2.6em"
        :class="{
          'text-op-half': !isContentExpanded,
        }"
      >
        <!-- 回答内容 -->
        <CommonAutoCollapsePanel
          v-model="isContentExpanded"
          :max-height="200"
          :max-height-with-expand-button="40"
          :default-expanded="!initFold"
          :disabled="showContentLoading || showReasonLoading"
          class="content-wrapper"
        >
          <!-- 思考内容 -->
          <CommonAutoCollapsePanel
            v-if="data?.message?.body?.reasoningContent"
            :max-height="36"
            :max-height-with-expand-button="40"
            :default-expanded="true"
            :disabled-animate="showReasonLoading || showContentLoading"
            class="reason-content-wrapper"
          >
            <div class="reason-content-inner">
              <span class="text-theme-info">
                <i i-solar:lightbulb-linear p-2 />
                <span>思考:</span>
              </span>
              {{ data?.message?.body?.reasoningContent }}
              <svg v-if="showReasonLoading" class="inline-block h-1.2em w-1.2em animate-spin -mb-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" /><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1" /><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3" /></g></svg>
            </div>
            <template #toggle-button="{ isExpanded, toggleExpand }">
              <button
                class="reason-toggle-btn cursor-pointer"
                :class="isExpanded ? '' : 'is-folded-btn'"
                @click="toggleExpand()"
              >
                {{ isExpanded ? '收起' : '展开' }}
                <i
                  :class="isExpanded ? 'i-solar-double-alt-arrow-up-line-duotone' : 'i-solar-double-alt-arrow-down-line-duotone'"
                  ml-1 p-1.6
                />
              </button>
            </template>
          </CommonAutoCollapsePanel>
          <!-- 回答内容 -->
          <div
            class="content-wrapper"
          >
            <MdPreview
              :id="`msg-md-${data.message.id}`"
              language="zh-CN"
              show-code-row-number
              :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
              code-theme="a11y"
              :code-foldable="false"
              ctx-name="content"
              class="markdown-preview"
              :model-value="data.message?.content || ''"
            />
          </div>
        </CommonAutoCollapsePanel>
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
@use "../msg.scss";

.markdown-preview {
  --at-apply: "text-0.9rem p-0 bg-color";
  // line-height: initial !important;

  :deep(.md-editor-preview-wrapper) {
    color: inherit;
    padding: 0 !important;

    .md-editor-preview {
      color: var(--el-text-color-primary);
      font-size: 0.875rem;

      img {
        border-radius: 0.25rem;
        overflow: hidden;
        max-width: 12rem !important;
        max-height: 12rem !important;
      }
      blockquote {
        font-size: 0.9em;
        padding-top: 0.4em;
        padding-bottom: 0.4em;
        margin-top: 0.6em;
        margin-bottom: 0.6em;
      }

      h1 {
        font-size: 1.2em;
        margin: 0.8em 0 0.6em 0;
      }
      h2 {
        font-size: 1.15em;
        margin: 0.7em 0 0.5em 0;
      }
      h3 {
        font-size: 1.1em;
        margin: 0.6em 0 0.4em 0;
      }
      h4 {
        font-size: 1.05em;
        margin: 0.5em 0 0.4em 0;
      }
      h5 {
        font-size: 1em;
        margin: 0.4em 0 0.3em 0;
      }
      h6 {
        font-size: 1em;
        margin: 0.3em 0 0.2em 0;
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

      // 表格圆角样式
      table {
        border-radius: 0.75rem;
        overflow: hidden;
        border-collapse: separate;
        border-spacing: 0;

        thead tr:first-child th:first-child {
          border-top-left-radius: 0.75rem;
        }

        thead tr:first-child th:last-child {
          border-top-right-radius: 0.75rem;
        }

        tbody tr:last-child td:first-child {
          border-bottom-left-radius: 0.75rem;
        }

        tbody tr:last-child td:last-child {
          border-bottom-right-radius: 0.75rem;
        }
      }

      // 引用块
      blockquote {
        --at-apply: "rounded-3 rounded-l-1 border-l-color-[var(--el-color-warning)] overflow-hidden border-collapse-separate border-spacing-0";
      }
    }
  }
}

// 思考内容
:deep(.reason-content-wrapper) {
  --at-apply: "mt-1 mb-2 overflow-hidden  relative z-0 card-rounded-df p-2 shadow-(sm inset) bg-color-2 text-mini-50 flex overflow-hidden";
  .reason-content-inner {
    --at-apply: "leading-1.5em w-full whitespace-pre-wrap";
  }
  .reason-toggle-btn {
    --at-apply: "absolute btn-default-text translate-y-1 scale-80 z-2 op-0 pl-3 bottom-1.5 right-1.5 pr-2 text-mini leading-6 shadow rounded cursor-pointer transition-200 border-none bg-transparent shadow-none";

    &.is-folded-btn {
      --at-apply: "bg-color translate-y-2 scale-100 bg-color shadow-sm hover:shadow ";
    }
  }

  &:hover {
    .reason-toggle-btn {
      --at-apply: "op-100 translate-y-0  scale-100";
    }
  }
}

// 折叠内容
.text-op-half {
  .reason-content-inner {
    --at-apply: "op-80";
  }
}
</style>
