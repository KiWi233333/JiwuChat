<script lang="ts" setup>
import UserIndex from "./index.vue";
</script>

<template>
  <UserIndex :id="$route.params.id as string" />
</template>
