<script lang="ts" setup>
import type { UploadProps } from "element-plus";

defineProps<{
  propverProps?: any | object
}>();

const user = useUserStore();
const formData = new FormData();
const avatatRef = ref();
// 表单
const avatarUrl = computed({
  get() {
    return user.userInfo.avatar;
  },
  set(val) {
    user.userInfo.avatar = val;
  },
});

/**
 * 上传之前验证类型
 */
const imageTypeList = ref<string[]>(["image/png", "image/jpg", "image/jpeg", "image/svg"]);
const beforeUpload: UploadProps["beforeUpload"] = (rawFile) => {
  if (!imageTypeList.value.includes(rawFile.type)) {
    ElMessage.error("文件格式不是图片格式!");
    return false;
  }
  else if (rawFile.size / 1024 / 1024 > 2) {
    ElMessage.error("头像需要小于2MB!");
    return false;
  }
  // check success
  formData.append("file", rawFile);
  return true;
};
/**
 * 更新
 */
const onUpdateSuccess: UploadProps["onSuccess"] = async (data) => {
  avatatRef.value?.clearFiles();
  if (data.code === StatusCode.SUCCESS) {
    user.userInfo.avatar = data.data;
    avatarUrl.value = data.data || "";
    ElMessage.success("更换头像成功！");
  }
  else {
    ElMessage.error(data.message);
  }
};
// 自动导入
// @unocss-include
const menuList = ref([
  {
    name: "个人主页",
    path: "/user",
    className:
      "bg-[var(--el-color-primary)] i-solar:home-2-bold-duotone  group-hover:animate-[tada_1s_ease]",
  },
  // {
  //   name: "我的帖子",
  //   path: "/user/post",
  //   className: "i-solar:cup-hot-bold-duotone bg-[var(--el-color-info)] group-hover:animate-[portanim_1s]",
  // },
  // {
  //   name: "我的收藏",
  //   path: "/user/collect",
  //   className: "bg-yellow-5 i-solar:star-bold-duotone  group-hover:animate-[swing_1s_ease_1]",
  // },
  // {
  //   name: "钱 包",
  //   path: "/user/wallet",
  //   className:
  //     "bg-red-5 i-solar:wallet-bold-duotone  group-hover:scale-110",
  // },
  // {
  //   name: "购物车",
  //   path: "/user/shopcart",
  //   className:
  //     "bg-red-5 i-solar:cart-large-2-bold-duotone group-hover:animate-[shopcart_1s_ease-out]",
  // },
  // {
  //   name: "收货地址",
  //   path: "/user/address",
  //   className: "bg-lime-5 i-solar:compass-bold-duotone group-hover:animate-spin",
  // },
  // {
  //   name: "账 单",
  //   path: "/user/wallet",
  //   className:
  //     "bg-yellow-5  i-solar:bill-list-bold-duotone group-hover:animate-[tada_1s_ease-in-out_1]",
  // },
  // {
  //   name: "订 单",
  //   path: "/order/list",
  //   className: "bg-yellow-5 i-solar:clipboard-bold-duotone group-hover:animate-[swing_1s_ease_1]",
  // },
  // {
  //   name: "账户安全",
  //   path: "/user/safe",
  //   className: "bg-green-5 i-solar:danger-bold-duotone group-hover:rotate-360",
  // },
]);
</script>

<template>
  <div class="user-card flex-row-c-c cursor-pointer">
    <ClientOnly>
      <el-popover
        v-bind="propverProps"
        transition="popper-fade"
        :teleported="true"
        style="transform-origin: right top"
        :placement="propverProps?.placement || 'bottom'"
        :trigger="propverProps?.trigger || 'hover'"
        :offset="propverProps?.offset || 20"
        :width="propverProps?.width || 320"
      >
        <template #reference>
          <div>
            <slot>
              <div flex-row-c-c>
                <!-- 替换头像 -->
                <el-badge
                  :is-dot="!user.userInfo.avatar || user.userInfo.avatar === 'default.png'"
                  class="item mr-2 border-default rounded-10em"
                >
                  <el-avatar
                    :src="
                      !user.userInfo.avatar || user.userInfo.avatar === 'default.png'
                        ? ''
                        : BaseUrlImg + user.userInfo.avatar
                    "
                    class="hovers border-default"
                  >
                    <span
                      i-solar:user-bold
                      style="width: 60%; height: 60%"
                    />
                  </el-avatar>
                </el-badge>
                <div
                  pl-2
                  class="hidden md:block"
                >
                  <h4
                    w-7em tracking-1px
                    class="... overflow-hidden truncate"
                  >
                    {{ user.userInfo.nickname || '未填写昵称' }}
                  </h4>
                  <small
                    v-copying.toast="user.userInfo.id"
                    opacity-80
                    class="group overflow-hidden truncate p-0 decoration-dashed hover:underline"
                  >
                    ID:{{ user.userInfo.id }}
                    <span
                      class="p2 opacity-0 transition-200 group-hover:opacity-80"
                      i-solar:copy-bold-duotone
                    />
                  </small>
                </div>
              </div>
            </slot>
          </div>
        </template>
        <!-- 卡片 -->
        <template #default>
          <div
            class="top"
            p-10
          />
          <div class="popup">
            <!-- 上传 -->
            <el-upload
              ref="avatatRef"
              class="avatar-uploader"
              style="width: 100%; height: 100%; border-radius: 50%"
              drag
              :action="`${BaseUrlRef}/user/info/avatar`"
              :headers="{ Authorization: user.token }"
              method="PUT"
              :limit="1"
              :multiple="false"
              :auto-upload="true"
              :show-file-list="false"
              list-type="picture"
              :before-upload="beforeUpload"
              :on-success="onUpdateSuccess"
            >
              <img
                v-if="avatarUrl"
                loading="lazy" h-6em w-6em
                :src="BaseUrlImg + avatarUrl"
                :alt="user.userInfo.nickname"
                class="avatar"
              >
              <ElIconPlus
                v-else
                size="2em"
              />
            </el-upload>
            <div
              class="bottom"
              flex-col
            >
              <h3
                class="title"
                py-2
              >
                {{ user.userInfo.nickname }}
              </h3>
              <!-- 卡片集合 -->
              <div
                grid grid-cols-3 mb-2 justify-around grid-gap-2
              >
                <NuxtLink
                  v-for="p in menuList"
                  :key="p.path"
                  class="group card-default"
                  :to="p.path"
                >
                  <p
                    class="icon transition-200 group-hover:bg-light"
                    :class="p.className"
                  />
                  <p mt-2>
                    {{ p.name }}
                  </p>
                </NuxtLink>
              </div>
              <!-- 退出登录| 我的主页 -->
              <div
                class="btn"
                flex-row-bt-c
                pt-4
              >
                <BtnElButton
                  size="large"
                  type="danger"
                  transition-icon plain ml-3
                  icon-class="i-solar:logout-3-broken"
                  @click="user.exitLogin"
                >
                  退出登录
                </BtnElButton>
                <NuxtLink
                  to="/user/info"
                  mr-3
                >
                  <BtnElButton
                    size="large"
                    type="primary" transition-icon
                    icon-class="i-solar:home-2-bold"
                  >
                    个人主页
                  </BtnElButton>
                </NuxtLink>
              </div>
            </div>
          </div>
        </template>
      </el-popover>
    </ClientOnly>
  </div>
</template>

<style scoped lang="scss">
.hovers {
  width: 2.3em;
  height: 2.3em;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

// 标签
:deep(.el-tag) {
  padding: 0.1em 0.3em;
  height: 1.2rem;
}

.hovers:hover {
  transition: $transition-delay;
  position: relative;

  &::before {
    content: "";
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0.7em;
    left: 0;
    z-index: 2;
    transition: $transition-delay;
    font-size: 1em;
    margin: auto;
    color: var(--el-bg-color-primary);
  }
}

.user-card {
  // 弹窗
  .popup {
    border-radius: 4px;

    .img {
      .avatar-uploader {
        width: 100%;

        :deep(.el-upload) {
          display: flex;
        }
      }
    }
  }
}

.top {
  background-color: var(--el-color-primary);
  border-radius: 6px 6px 0 0;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset,
    rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset;
}

.avatar-uploader {
  transform: translateY(-50%);

  :deep(.el-upload--picture) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  :deep(.el-upload-dragger) {
    border-radius: 50%;
    width: 6em;
    height: 6em;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--el-bg-color);
    opacity: 0.95;
    box-shadow: rgba(60, 64, 67, 0.2) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px;
  }
}

.popup .bottom {
  margin-top: -3.8em;
  padding: 0.8em;
  border-radius: 6px;

  .title {
    text-align: center;
  }
}

.btn {
  border-top: 1px solid rgba(128, 128, 128, 0.12);
}

:deep(.div__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 6em;
  height: 6em;
  border-radius: 6px;
  cursor: pointer;
  margin: 0.2em;
}

.card-default {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  padding: 0.6em;
  transition: $transition-delay;
  &:hover {
    opacity: 0.9;
    background-color: var(--el-color-primary);
    color: #fff;
    svg {
      fill: #fff;
      color: #fff;
    }
  }
  .icon {
    cursor: pointer;
    width: 3em;
    height: 3em;
  }
}
</style>
