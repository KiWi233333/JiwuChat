<script lang="ts" setup>
import { getImgSize } from ".";

/**
 * 视频消息
 */
const props = defineProps<{
  data: ChatMessageVO<VideoBodyMsgVO>
  prevMsg: Partial<ChatMessageVO<TextBodyMsgVO>>
  index: number
}>();
const { data } = toRefs(props);
// 具体
const body = props.data.message?.body;
const thumbUrl = computed(() => (body?.thumbUrl ? BaseUrlImg + body.thumbUrl : ""));

// 时长
const minutes = Math.floor((body?.duration || 0) / 60);
const seconds = (body?.duration || 0) % 60;
const formattedDuration = body?.duration ? `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}` : "";
function showVideoDetail(e: MouseEvent) {
  if (!body?.url) {
    return;
  }
  mitter.emit(MittEventType.VIDEO_READY, {
    type: "play",
    payload: {
      mouseX: e.clientX,
      mouseY: e.clientY,

      url: BaseUrlVideo + body.url,
      duration: body.duration,
      thumbUrl: BaseUrlVideo + body.thumbUrl,
      size: body.size,
      thumbSize: body.thumbSize,
      thumbWidth: body.thumbWidth,
      thumbHeight: body.thumbHeight,
    },
  });
}
const { width, height } = getImgSize(body?.thumbWidth, body?.thumbHeight);
</script>

<template>
  <ChatMsgTemplate
    :prev-msg="prevMsg"
    :index="index"
    :data="data"
    v-bind="$attrs"
  >
    <template #body-pre>
      <div
        class="relative max-h-50vh max-w-76vw flex-row-c-c cursor-pointer border-default-hover card-default md:(max-h-18rem max-w-18rem)"
        title="点击播放[视频]"
        ctx-name="video"
        :style="{ width, height }"
        @click.stop="showVideoDetail($event)"
      >
        <template
          v-if="body?.url"
        >
          <CardElImage
            loading="lazy"
            ctx-name="video"
            error-class="i-solar:file-smile-line-duotone p-2.8"
            :src="thumbUrl"
            class="h-full w-full flex-row-c-c card-default"
          />
          <div ctx-name="video" class="play-btn absolute h-12 w-12 flex-row-c-c rounded-full" style="border-width: 2px;">
            <i i-solar:alt-arrow-right-bold ml-1 p-4 ctx-name="video" />
          </div>
        </template>
        <div v-if="formattedDuration" ctx-name="video-duration" class="absolute bottom-1 right-2 text-white text-shadow-lg">
          {{ formattedDuration }}
        </div>
      </div>
    </template>
  </ChatMsgTemplate>
</template>

<style lang="scss" scoped>
@use './msg.scss';
.play-btn {
  box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px;
  --at-apply: "text-white  border-(2px solid #ffffff) bg-(gray-5 op-30) backdrop-blur-3px";
}
</style>
