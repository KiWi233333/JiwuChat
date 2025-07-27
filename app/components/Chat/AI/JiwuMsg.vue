<script lang="ts" setup>
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/preview.css";

/**
 * AI消息 - 极物圈ai的消息模板
 */
defineProps<{
  data: ChatMessageVO<TextBodyMsgVO>
  prevMsg?: ChatMessageVO
  index: number
}>();

const user = useUserStore();
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body>
      <!-- 内容 -->
      <template v-if="data.fromUser.userId === user.userInfo.id">
        <p class="msg-popper">
          {{ data.message?.content }}
        </p>
      </template>
      <template v-else>
        <div class="msg-popper relative text-color sm:max-w-40rem">
          <MdPreview
            language="zh-CN"
            show-code-row-number
            :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
            code-theme="a11y"
            class="markdown"
            :code-foldable="false"
            style="font-size: 1em;color: inherit;padding: 0;"
            :model-value="data.message?.content || ''"
          />
          <slot name="actions" />
        </div>
      </template>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use '../Msg/msg.scss';

.markdown {
  --at-apply: "text-0.8rem p-0 bg-color";
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

      p {
        margin: 0.4em 0;
      }

      p:not(p:last-of-type) {
        margin: 0 0 0.4em 0;
      }

      p:first-of-type {
        margin: 0;
      }

      .md-editor-code {
        line-height: 1.6;
        --at-apply: 'm-0 mt-2 flex flex-col overflow-hidden card-default border-default hover:shadow transition-all';

        .md-editor-code-block {
          line-height: 1.6;

          &~span[rn-wrapper]>span {
            line-height: 1.6;
          }
        }

        code {
          border-radius: 0 0 8px 8px;
        }

      }
    }
  }
}
</style>
