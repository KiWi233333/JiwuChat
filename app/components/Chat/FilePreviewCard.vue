<script lang="ts" setup>
const props = defineProps<{
  fileName: string;
  size: number;
  mimeType?: string,
  ctxName?: string;
}>();

const emit = defineEmits<{
  (e: "delete"): void;
}>();

function deleteFile(e: MouseEvent) {
  e.stopPropagation();
  emit("delete");
}

const icon = (props?.mimeType ? (FILE_TYPE_ICON_MAP[props.mimeType] || FILE_TYPE_ICON_DEFAULT) : FILE_TYPE_ICON_DEFAULT);
</script>

<template>
  <div
    :ctx-name="ctxName"
    :title="fileName"
    class="file"
  >
    <img pointer-events-none :src="icon" class="file-icon h-8 w-8 object-contain">
    <div class="flex-1">
      <p pointer-events-none class="max-w-full min-h-1.5em w-full flex-1 select-none truncate text-sm leading-5">
        {{ fileName?.replace(/(.{8}).*(\..+)/, '$1****$2') }}
      </p>
      <small pointer-events-none class="float-right mt-2 text-xs op-60">
        {{ formatFileSize(size || 0) }}
      </small>
      <div
        class="icon file-delete-btn" @click="deleteFile"
      >
        <i i-carbon:close pointer-events-none p-2 />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file {
  --at-apply: " relative inline-block max-w-16rem min-w-14rem w-fit flex cursor-pointer gap-3 border-default-2 card-default bg-color p-2 shadow-sm transition-shadow !items-center hover:shadow";
  .icon {
    --at-apply: " absolute h-5 w-5 flex-row-c-c rounded-full bg-theme-danger text-center text-light shadow transition-200 -right-2 -top-2 sm:op-0";
  }

  &:hover {
    .icon {
      --at-apply: "op-100";
    }
  }
}
</style>
