<script lang="ts" setup>
const props = withDefaults(defineProps<{
  msg: string
  icon?: string
}>(), {
  icon: "i-solar:bone-broken-bold-duotone",
});
function onRefresh() {
  if (window && window?.location)
    window?.location?.reload();
}
const router = useRouter();
function onBack(rollback?: string) {
  if (rollback) {
    navigateTo({
      path: rollback,
      replace: true,
    });
  }
  else {
    router.back();
  }
}
</script>

<template>
  <div data-fades>
    <i class="mx-a mb-2 block h-10rem w-10rem opacity-60" :class="icon" />
    <div
      flex-row-c-c
      flex-col
    >
      <h3 mb-5 opacity-80>
        {{ msg }}
      </h3>
      <div class="mx-a flex-row-c-c opacity-90">
        <slot name="footer">
          <BtnElButton
            type="danger"
            transition-icon
            plain
            icon-class="i-solar:alt-arrow-left-line-duotone mr-2"
            @click="onBack($route.query?.rollback ? String($route.query?.rollback) : '')"
          >
            返回
          </BtnElButton>
          <BtnElButton
            type="danger"
            transition-icon
            icon-class="i-solar:refresh-line-duotone mr-2"
            @click="onRefresh"
          >
            刷新
          </BtnElButton>
        </slot>
      </div>
    </div>
  </div>
</template>

