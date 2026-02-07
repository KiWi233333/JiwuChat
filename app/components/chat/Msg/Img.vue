<script lang="ts" setup>
import { MSG_CTX_NAMES } from "~/constants/msgContext";
import { getImgSize } from ".";

/**
 * 图片消息
 */
const {
  data,
} = defineProps<{
  data: ChatMessageVO<ImgBodyMsgVO>
  prevMsg: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
}>();

// 获取聊天store
const chat = useChatStore();
// 具体
const body: Partial<ImgBodyMsgVO> & { showWidth?: string, showHeight?: string } = data.message?.body || {};
// 计算图片宽高
const { width, height } = getImgSize(body?.width, body?.height);
body.showWidth = width;
body.showHeight = height;

const getUrl = computed(() => body?.url?.startsWith("blob") ? body?.url : BaseUrlImg + body?.url);
// 处理图片点击预览
function handleImagePreview() {
  if (!getUrl.value)
    return;

  // 获取当前房间的所有图片
  const imgs = chat.theContact?.msgIds
    ?.map(id => chat.theContact?.msgMap?.[id])
    .filter((msg): msg is ChatMessageVO<ImgBodyMsgVO> =>
      !!msg && msg.message?.type === MessageType.IMG,
    );
  if (!imgs?.length)
    return;
  const currentImgUrl = getUrl.value;
  const imgsUrl = imgs.map(msg => msg.message?.body?.url?.startsWith("blob") ? msg.message?.body?.url : BaseUrlImg + msg.message?.body?.url);
  useImageViewer.open({
    urlList: imgsUrl,
    index: imgsUrl.indexOf(currentImgUrl),
    ctxName: MSG_CTX_NAMES.IMG,
  });
}
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body-pre>
      <!-- 内容 -->
      <div
        v-if="body?.url"
        :ctx-name="MSG_CTX_NAMES.IMG"
        :style="{ width, height }"
        class="max-h-50vh max-w-76vw cursor-pointer border-default-2 card-default shadow-sm transition-shadow md:(max-h-18rem max-w-18rem) hover:shadow"
        @click="handleImagePreview"
      >
        <CommonElImage
          :src="getUrl"
          load-class="sky-loading block absolute  top-0"
          class="h-full w-full card-rounded-df"
          :alt="body?.url"
          fit="cover"
          :ctx-name="MSG_CTX_NAMES.IMG"
          :preview="false"
        />
      </div>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use "./msg.scss";
</style>
