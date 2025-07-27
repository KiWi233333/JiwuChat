<script lang="ts" setup>
definePageMeta({
  key: route => route.path,
  layout: false,
});
</script>

<template>
  <div>
    <NuxtLayout name="error">
      <OtherError :msg="$route.query?.errorMsg ? $route.query?.errorMsg.toString() : '404, 找不到页面 !'" />
    </NuxtLayout>
  </div>
</template>

<style scoped lang="scss"></style>
