<script lang="ts" setup>
/**
 * AI问答消息
 */
const { data, prevMsg, index } = defineProps<{
  data: ChatMessageVO<AiChatBodyMsgVO>
  prevMsg: Partial<ChatMessageVO>
  index: number
}>();
// 只计算一次，提升性能
const body: Partial<AiChatBodyMsgVO> = data.message?.body || {};
const robotList = body.robotList || (body.robotInfo ? [body.robotInfo] : []);
const robotListLen = robotList.length;
const getTitle = robotListLen === 1
  ? robotList[0]?.nickname
  : `${robotList.map(p => p.nickname).join("、")} 集合问答`;
// const robotList = body.robotList || [] TODO: 后期采用
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
      <p v-if="data.message?.content?.trim()" ctx-name="content" class="msg-popper">
        {{ data.message.content }}
      </p>
      <!--  询问的AI -->
      <div v-if="robotList?.length" class="ask-ai flex-ml-a flex-wrap gap-1" :title="getTitle">
        <template v-for="(robot, i) in robotList" :key="i">
          <img
            v-if="robot?.avatar"
            :src="BaseUrlImg + robot?.avatar"
            class="h-4 w-4 flex-shrink-0 rounded-full"
          >
          <span
            v-else
            class="h-4 w-4 flex-shrink-0 rounded-full card-bg-color-2"
          />
          <template v-if="robotListLen === 1">
            {{ robot?.nickname }}
          </template>
        </template>
      </div>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use "./msg.scss";
</style>
