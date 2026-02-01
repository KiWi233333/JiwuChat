<script lang="ts" setup>
import type { MenuItemConfig } from "~/components/common/MenuItemCard.vue";

export interface UserInfoPanelProps {
  data?: Partial<UserInfoVO>
  isEdit?: boolean
}

const { data, isEdit = false } = defineProps<UserInfoPanelProps>();

const user = computed(() => data || {});

// 菜单项配置
// @unocss-include
const personalMenuItems = computed<MenuItemConfig[]>(() => [
  {
    icon: "i-solar:clock-circle-bold-duotone text-mini op-50",
    title: "上一次登录时间",
    append: user.value?.lastLoginTime || "未知",
  },
]);

// @unocss-include
const collectionMenuItems = computed<MenuItemConfig[]>(() => [
  {
    icon: "i-solar:heart-bold-duotone text-pink-500",
    title: "TA的收藏",
    onClick: () => ElMessage.info("未完善，敬请期待！"),
  },
]);
</script>

<template>
  <div class="user-panel-container flex flex-col gap-3">
    <!-- 主信息卡片 (头像、昵称、签名等) -->
    <UserInfoHeader
      :data="user"
      :is-edit="isEdit"
    />

    <!-- 个人卡片 (登录时间等) -->
    <div v-if="user.lastLoginTime" class="info-card">
      <CommonMenuItemList
        size="medium"
        :items="personalMenuItems"
        variant="list"
      />
    </div>

    <!-- 收藏卡片 (仅当不是自己或有收藏时显示) -->
    <div v-if="!isEdit" class="info-card">
      <CommonMenuItemList
        size="medium"
        :items="collectionMenuItems"
        variant="list"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.info-card {
  --at-apply: "rounded-xl bg-color px-4 shadow-sm sm:(shadow-none border-default-2 border-op-04)";
}
</style>
