<script setup lang="ts">
import { appName } from "@/constants/index";
</script>

<template>
  <div class="flex select-none items-center tracking-0.1em">
    <!-- <CardAvatar
      style="--anima: blur-in;"
      src="/logo.png"
      class="mr-2 h-7 w-7 shadow-sm"
    /> -->
    <div class="mr-2 h-7 w-7 card-rounded-df shadow-lg">
      <OtherMetallicPaint
        image-url="/logo.png"
        class="card-rounded-df"
        :params="{
          patternScale: 0.6,
          refraction: 0.012,
          edge: 0.2,
          patternBlur: 0.002,
          liquid: 0.07,
          speed: 0.2,
        }"
      />
    </div>
    <span class="text-color-br shrink-0 text-4 font-500">{{ appName }}</span>
  </div>
</template>

<style scoped lang="scss">
</style>
