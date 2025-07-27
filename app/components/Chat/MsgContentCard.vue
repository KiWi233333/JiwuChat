<script lang="ts" setup>
defineProps<{
  data: Partial<ChatMessageVO>
}>();
</script>

<template>
  <div>
    {{ `${data?.fromUser?.nickName}:${data?.message?.content}` }}
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-radio-group) {
  display: block;
  padding: 0;
  font-size: 1rem;
  margin: 0;
  width: 100%;
}

:deep(.el-radio){
  width: 100%;
  height: fit-content;
  display: block;
  padding: 0;
  margin: 0;
  border-color: #adadad18;
    transition: 200ms border;
  margin-bottom: 1rem;
  .el-radio__input {
    display: none;
    border-color: transparent;
  }
  .el-radio__label {
    padding: 0;
  }
}
</style>
