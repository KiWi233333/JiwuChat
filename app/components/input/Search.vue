<script lang="ts" setup>
// 搜索
const props = defineProps<{
  modelValue: string
  isChange?: boolean | false
}>();

const emit = defineEmits(["update:modelValue", "open", "close"]);
// 实例
const word = computed({
  get(): string {
    return props.modelValue;
  },
  set(v: string) {
    emit("update:modelValue", v);
  },
});

function onSearch() {
  if (!word.value.trim())
    return ElMessage.warning("搜索内容不能为空！");

  emit("open");
  navigateTo({
    path: "/search",
    query: {
      name: word.value.trim(),
    },
  });
}


const inputRef = ref();
function keySearch(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === "k") {
    e.preventDefault();
    emit("open");
    inputRef.value?.focus && inputRef.value?.focus();
  }
}
// 注册快捷键
onMounted(() => {
  window.addEventListener("keydown", keySearch);
});
onUnmounted(() => {
  window.removeEventListener("keydown", keySearch);
});
</script>

<template>
  <div class="group relative flex items-center">
    <ElInput
      ref="inputRef"
      v-model.trim="word"
      type="text"
      clearable
      text-center
      placeholder="开启搜索之旅✨"
      class="v-input mx-1"
      @keyup.enter="onSearch"
      @focus="$emit('open')"
      @blur="$emit('close')"
      @keyup.esc="$emit('close')"
    />
    <small
      class="absolute right-5rem hidden flex-row-c-c cursor-text text-0.7rem op-40 shadow md:block"
      size="small"
      @click="$emit('open')"
    >
      （Ctrl + K）
    </small>
    <el-button
      v-show="word !== ''"
      type="primary"
      class="absolute right-0 border-default shadow group-hover:opacity-100 md:opacity-0"
      round style="height: 80%;margin: 0 0.5rem;"
      @click="onSearch()"
    >
      搜索
    </el-button>
  </div>
</template>

<style lang="scss" scoped>
$input-width: min(50vw, 360px);
$scle-input-width: min(68vw, 520px);
.v-input {
  :deep(.el-input__wrapper) {
    width: $input-width;
    transition: width $transition-delay;
    transition-timing-function: $animate-cubic-bount;
    letter-spacing: 0.2em;
    border-radius: 20px;
    height: 36px;
    padding: 0 20px;
    font-size: 14px;
    input::placeholder {
      transition: width $transition-delay;
      color: var(--el-color-primary-light-5);
    }
    input:focus::placeholder {
      color: transparent;
    }
    input:focus,
    input:valid,
    &.is-focus {
      width: $scle-input-width;
    }
    .el-input__suffix {
      position: absolute;
      right: 3%;
    }
  }

  :deep(.el-input__inner):focus {
    width: $scle-input-width;
  }
}
.dark .v-input :deep(.el-input__wrapper) {
  background-color: black;
  input::placeholder {
    color: #ffffffb3;
  }
}
</style>
