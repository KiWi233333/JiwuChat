<script lang="ts" setup>
const props = defineProps<{
  modelValue: {
    showUpdatePwd: boolean
    showUpdateEmail: boolean
    showUpdatePhone: boolean
  }
}>();
function close() {
  props.modelValue.showUpdateEmail = false;
  props.modelValue.showUpdatePhone = false;
  props.modelValue.showUpdatePwd = false;
}
</script>

<template>
  <transition name="popup">
    <div
      v-if=" modelValue.showUpdatePwd || modelValue.showUpdateEmail || modelValue.showUpdatePhone"
      v-bind="$attrs"
      key="popup"
      class="fixed left-0 top-0 z-1000 h-100dvh w-full flex-row-c-c overflow-hidden"
    >
      <div
        class="absolute h-full w-full card-rounded-df backdrop-blur-2px"
        @click="close"
      />
      <UserSafePwdForm v-if="modelValue.showUpdatePwd" key="UserSafePwdForm" class="shadow-lg" @close="close()" />
      <UserSafePhoneForm v-if="modelValue.showUpdatePhone" key="UserSafePhoneForm" class="shadow-lg" @close="close()" />
      <UserSafeEmailForm v-if="modelValue.showUpdateEmail" key="UserSafeEmailForm" class="shadow-lg" @close="close()" />
    </div>
  </transition>
</template>

<style scoped lang="scss"></style>
