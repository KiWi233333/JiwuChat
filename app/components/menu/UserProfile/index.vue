<script lang="ts" setup>
const user = useUserStore();
enum FormType {
  LOGIN,
  REGISTER,
}
// 表单
function onLogin(type: FormType) {
  user.showLoginPageType = type === FormType.LOGIN ? "login" : "register";
}
</script>

<template>
  <div>
    <ClientOnly>
      <template #fallback>
        加载中...
      </template>
      <div
        v-if="!user.isLogin"
        class="group z-0 flex flex-col"
      >
        <!-- 移动端 -->
        <div class="block md:hidden">
          <el-popover
            placement="bottom"
            class="inline-block sm:hidden"
            transition="popper-fade"
            teleported
            :width="100"
            :offset="20"
            trigger="click"
          >
            <template #reference>
              <el-button
                class="sm:hidden"
                round
                style="margin: 0; padding: 0.5em"
                tag="登录"
              >
                <i
                  class="cursor-pointer rounded-4em bg-dark-1 p-2 opacity-80 shadow-md dark:bg-light"
                  i-solar:user-outline
                />
              </el-button>
            </template>
            <div
              inline-block flex flex-col sm:hidden grid="~ cols-1 sm:cols-2 gap-2"
            >
              <BtnElButton
                icon-class="i-solar:user-rounded-outline mr-2"
                round
                class="m-2 cursor-pointer px-2 shadow-md"
                type="primary"
                style="margin: 0.2rem;"
                @click="onLogin(FormType.LOGIN)"
              >
                登 录
              </BtnElButton>
              <BtnElButton
                round
                icon-class="i-solar:crown-outline mr-2"
                class="m-2 cursor-pointer px-2"
                style="margin: 0.2rem;"
                @click="onLogin(FormType.REGISTER)"
              >
                注 册
              </BtnElButton>
            </div>
          </el-popover>
        </div>
        <!-- pc -->
        <div
          hidden flex-col items-center md:block md:flex-row
          class="z-1 rounded-10px bg-[#d8d8d854] p-2 backdrop-blur-12px md:static dark:bg-[#4d4d4d48] md:bg-transparent md:p-0 dark:md:bg-transparent"
        >
          <BtnElButton
            icon-class="i-solar:user-bold-duotone mr-2"
            round
            :transition-icon="true"
            class="m-2 cursor-pointer px-2 shadow-md"
            type="primary"
            style="margin: 0.2rem;"
            @click="onLogin(FormType.LOGIN)"
          >
            登 录
          </BtnElButton>
          <BtnElButton
            round
            icon-class="i-solar:crown-outline mr-2"
            :transition-icon="true"
            class="m-2 cursor-pointer px-2"
            style="margin: 0.2rem;"
            @click="onLogin(FormType.REGISTER)"
          >
            注 册
          </BtnElButton>
        </div>
      </div>
      <div
        v-else
        class="box"
      >
        <LazyCardUserLine :user-info="user.userInfo" />
      </div>
    </ClientOnly>
  </div>
</template>

<style scoped lang="scss"></style>
