<script lang="ts" setup>
import { getUserLeave } from "@/composables/utils";

// 用户信息
const user = useUserStore();
const points = computed(() => user.userWallet.points);
const getLeave = computed(() => getUserLeave(user.userWallet.points || 0));
function submit() {
  ElMessage.warning("功能开发中...");
};
</script>

<template>
  <div class="px-10 py-8">
    <div class="flex justify-between">
      <!-- 积分 -->
      <strong class="inline-block w-8rem flex-row-c-c cursor-pointer opacity-90 transition-300 hover:scale-110">
        <small mr-4 text-1em>
          积分
        </small>
        <h2 inline>{{ points }}</h2>
      </strong>
      <!-- 等级 -->
      <div ml-3em flex flex-col>
        <small pb-3>等级：lv.{{ getLeave }}</small>
        <el-progress
          :percentage="(getLeave / 6) * 100"
          :show-text="false"
          striped
        />
      </div>
    </div>
    <!-- 签到按钮 -->
    <div class="btn mb-8 mt-4">
      <btn-el-button type="info" icon-class="i-solar:dollar-bold-duotone mr-1" :transition-icon="true" @click="submit">
        签 到
      </btn-el-button>
      <small
        truncate opacity-80
      >
        每日签到+100积分
        <el-popover
          :width="160"
          trigger="hover"
        >
          <template #reference>
            <small
              cursor-pointer
              text-blueGray
              underline
            >
              如何获取积分?
              <i
                i-solar:dollar-linear ml-2 p-2 text-bluegray
              />
            </small>
          </template>
          <p>1、通过钱包额度充值</p>
          <p>2、通过每日签到</p>
        </el-popover>
      </small>
    </div>
  </div>
</template>
