<script setup lang="ts">
interface Props {
  data: UrlInfoDTO
  url: string
  ctxName?: string
}

const { data, url } = defineProps<Props>();
function showImage() {
  if (!data.image)
    return;
  useImageViewer.open({
    urlList: [data.image],
    initialIndex: 0,
  });
}
const footer = data.siteName || data.author || data.publisher;
</script>

<template>
  <a :ctx-name="ctxName" :url="data.url" class="group flex flex-col" target="_blank" :href="data.url" title="点击查看详情" rel="noopener noreferrer">
    <p :ctx-name="ctxName" :url="data.url" class="text-overflow-2 text-0.8em text-color leading-1.25em" :title="data.title">
      {{ data.title || "网站名称不可访问" }}
    </p>
    <div :ctx-name="ctxName" :url="data.url" class="mt-a flex-row-bt-c pt-2">
      <small :ctx-name="ctxName" :url="data.url" class="text-overflow-3 mr-2 h-3rem flex-1 text-mini" :title="data.description">
        {{ data.description || "暂无网站具体描述..." }}
      </small>
      <CardElImage
        :src="data.image"
        alt=""
        title="查看大图"
        class="h-3rem w-3rem shrink-0 card-rounded-df bg-color-2 object-cover shadow-sm"
        error-root-class="bg-color-2"
        load-class="none"
        @click.stop.prevent.capture="showImage"
      />
    </div>
    <div v-if="footer" :ctx-name="ctxName" title="" :url="data.url" class="url-footer h-0 flex items-center overflow-hidden text-mini group-hover:(mt-2 h-6 border-default-2-t pt-1)">
      <CardElImage
        :src="data.icon || data.image"
        error-root-class="bg-color-2"
        error-class="!hidden"
        class="mr-2 h-4 w-4 shrink-0 rounded-4px object-cover"
        load-class="none"
      />
      <span>{{ footer }}</span>
    </div>
  </a>
</template>

<style scoped>
.url-footer {
  transition: height 0.2s ease, margin 0.2s ease, padding 0.2s ease;
}
</style>
