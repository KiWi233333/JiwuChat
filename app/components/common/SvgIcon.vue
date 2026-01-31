<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  name: {
    type: String,
    required: false,
  },
  data: {
    type: String,
    required: false,
  },
  color: {
    type: String,
    default: "#000000",
  },
  width: {
    type: String,
    default: "",
  },
  height: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "1rem",
  },
});
// id
const symbolId = computed(() => `#icon-${props.name}`);
</script>

<template>
  <svg
    aria-hidden="true"
    class="svg-icon"
    :width="props.width || props.size"
    :height="props.height || props.size"
  >
    <use :xlink:href="symbolId" :fill="props.color" />
  </svg>
</template>
