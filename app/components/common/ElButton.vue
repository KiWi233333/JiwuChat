<script lang="ts" setup>
import type { ButtonProps } from "element-plus";
import { ElButton } from "element-plus";

// @unocss-include
interface Props extends Partial<ButtonProps> {
  iconClass?: string;
  transitionIcon?: boolean;
}

const props = defineProps<Props>();
const vm = getCurrentInstance();
function changeRef(instance: any) {
  if (vm) {
    vm.exposed = instance || {};
    vm.exposeProxy = instance || {};
  }
}
</script>

<template>
  <component
    :is="h(ElButton, { ...$attrs, ...props, ref: changeRef }, $slots)"
    class="group-btn"
  >
    <span
      v-if="iconClass"
      class="block h-1.1em"
      :class="[iconClass, transitionIcon ? 'toggle' : 'w-1.1em']"
    />
    <slot name="default" />
  </component>
</template>

<style lang="scss" scoped>
.toggle {
  width: 0;
  margin-right: 0;
  transform: scale(0);
  transition-property: all;
  transition-duration: 200ms;
}
.group-btn:hover {
  .toggle {
    width: 1.1em;
    margin-right: 0.4em;
    transform: scale(1);
  }
}
</style>
