<script setup lang="ts">
interface Props {
  data: UrlInfoDTO
  ctxName?: string
}

const { data } = defineProps<Props>();
function showImage() {
  if (!data.image)
    return;
  useImageViewer.open({
    urlList: [data.image],
    initialIndex: 0,
  });
}
const footer = data.siteName || data.author || data.publisher;
const googleIconUrl = "https://www.google.com/s2/favicons?sz=64&domain=";
</script>

<template>
  <a :ctx-name="ctxName" :url="data.url" class="group flex flex-col px-3 pb-2 pt-3" target="_blank" :href="data.url" title="点击查看详情" rel="noopener noreferrer">
    <p :ctx-name="ctxName" :url="data.url" class="text-overflow-2 text-0.8em text-color leading-1.25em" :title="data.title">
      {{ data.title || "网站名称不可访问" }}
    </p>
    <div :ctx-name="ctxName" :url="data.url" class="mt-a flex-row-bt-c py-2">
      <small :ctx-name="ctxName" :url="data.url" class="text-overflow-3 mr-3 h-3rem flex-1 text-mini" :title="data.description">
        {{ data.description || "暂无网站具体描述..." }}
      </small>
      <CardElImage
        :src="data.image || data.icon"
        alt=""
        title="查看大图"
        class="h-3rem w-3rem shrink-0 card-rounded-df bg-color-2 object-cover shadow-sm"
        error-root-class="bg-color-2"
        load-class="none"
        @click.stop.prevent.capture="showImage"
      />
    </div>
    <div v-if="footer" :ctx-name="ctxName" title="" :url="data.url" class="url-footer flex items-center border-default-2-t pt-1.5 text-mini">
      <CardElImage
        :src="data.icon"
        error-root-class="bg-color-2"
        error-class="!hidden"
        class="mr-2 h-4 w-4 shrink-0 rounded-4px object-cover"
        load-class="none"
      >
        <template #error>
          <CardElImage
            :src="googleIconUrl + data.url"
            error-root-class="bg-color-2"
            error-class="!hidden"
            class="mr-2 h-4 w-4 shrink-0 rounded-4px object-cover"
            load-class="none"
          />
        </template>
      </CardElImage>
      <span truncate :title="footer">{{ footer }}</span>
    </div>
  </a>
</template>

<style scoped>
/* .url-footer {
  transition: height 0.2s ease, margin 0.2s ease, padding 0.2s ease;
} */
</style>
