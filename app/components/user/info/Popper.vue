<script lang="ts" setup>
import type { UploadFile, UploadFiles, UploadProps } from "element-plus/es/components/upload";

const { data } = defineProps<{
  data: Partial<UserInfoVO>
  isEdit?: boolean
}>();

const user = reactive<Partial<UserInfoVO>>(data);
const store = useUserStore();
const formData = new FormData();
const ws = useWsStore();
const showMarkPhone = ref(true);
// 表单
const avatatRef = useTemplateRef("avatatRef");
const avatarUrl = computed({
  get() {
    return user?.avatar;
  },
  set(val) {
    user.avatar = val;
  },
});
const isLoading = ref<boolean>(false);
/**
 * 上传之前验证类型
 */
const imageTypeList = ref<string[]>(["image/png", "image/jpg", "image/jpeg", "image/svg"]);
const beforeUpload: UploadProps["beforeUpload"] = (rawFile: File) => {
  isLoading.value = true;
  if (!imageTypeList.value.includes(rawFile.type)) {
    isLoading.value = false;
    ElMessage.error("文件格式不是图片格式!");
    return false;
  }
  else if (rawFile.size / 1024 / 1024 > 2) {
    isLoading.value = false;
    ElMessage.error("头像需要小于2MB!");
    return false;
  }
  // check success
  formData.append("file", rawFile);
  return true;
};
/**
 * 更新头像
 */
const updateSucess: UploadProps["onSuccess"] = async (data: Result<string>, uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  isLoading.value = false; // check success
  avatatRef.value?.clearFiles();
  if (data.code === StatusCode.SUCCESS) {
    user.avatar = data.data;
    avatarUrl.value = data.data || "";
    ElMessage.success("更换头像成功！");
  }
  else {
    ElMessage.error(data.message);
  }
};

// 使用computed将函数转换为响应式属性
const getAgeText = computed(() => calculateAge(data.birthday));
const getConstellation = computed(() => computeConstellation(data.birthday));
const getBirthdayCount = computed(() => calculateBirthdayCount(data.birthday));
</script>

<template>
  <MenuPopper
    placement="right-start"
    transition="popper-fade"
    trigger="hover"
    :offset="4"
    :show-arrow="false"
    popper-class="!border-default !card-default-br-2"
  >
    <template #reference>
      <div class="relative mx-a h-9 w-9 border-default-hover card-default rounded-1/2 shadow">
        <CardElImage
          :default-src="avatarUrl"
          error-class="i-solar-user-line-duotone p-2 "
          class="relative z-100 h-full w-full cursor-pointer overflow-hidden rounded-1/2" alt="头像"
        />
        <UserInfoStatus
          :show-text="false"
          :status="ws.status"
          class="absolute z-101 rounded-1/2 shadow -bottom-1px -right-1px"
          dot-class="w-3  h-3 border-(2px light solid) rounded-1/2"
        />
      </div>
    </template>
    <template #default>
      <div class="card-bg-linear w-22em card-rounded-df p-6 pt-8">
        <!-- 信息 -->
        <div class="mb-5 flex gap-4 border-default-2-b pb-5 sm:gap-6">
          <div
            v-loading="isLoading"
            class="avatar h-5em w-5em flex-row-c-c flex-shrink-0 card-default-br shadow-md"
          >
            <!-- 上传 -->
            <el-upload
              ref="avatatRef"
              :disabled="!isEdit"
              class="avatar-uploader"
              drag
              :action="`${BaseUrlRef}/user/info/avatar`"
              :headers="{ Authorization: store.token }"
              method="PUT"
              :limit="1"
              accept="image/*"
              :multiple="false"
              auto-upload
              :show-file-list="false"
              :before-upload="beforeUpload"
              :on-success="updateSucess"
            >
              <div class="group relative flex-row-c-c">
                <template v-if="avatarUrl">
                  <img
                    alt="Design By Kiwi23333"
                    :src="BaseUrlImg + avatarUrl"
                    class="h-5em w-5em flex-shrink-0 overflow-hidden rounded-1/2 object-cover shadow transition-300 group-hover:filter-blur-4"
                  >
                  <i
                    class="i-solar:camera-broken absolute p-5 text-theme-primary opacity-0 transition-300 group-hover:opacity-100"
                  />
                </template>
                <ElIconPlus
                  v-else
                  size="2em"
                />
              </div>
            </el-upload>
          </div>
          <div truncate>
            <strong truncate text-1.1rem>{{ data.nickname }}</strong>
            <p mt-2 truncate class="text" :title="data.username">
              {{ data.username || ' - ' }}
            </p>
            <UserInfoStatus
              v-if="isEdit"
              class="mt-1 text-xs"
              :status="ws.status"
              title="状态"
              dot-class="w-2.8 h-2.8 rounded-full"
            />
          </div>
        </div>
        <!-- 详情 -->
        <div class="flex flex-col gap-4 truncate pb-6">
          <p class="text">
            <i mr-3 p-2 :class="data.gender === Gender.BOY ? 'i-tabler:gender-male text-blue' : data.gender === Gender.GIRL ? 'i-tabler:gender-female text-pink' : 'i-tabler:gender-transgender text-yellow'" />
            <span class="mr-2 border-default-r pr-2">
              {{ data.gender }}
            </span>
            <template v-if="data.birthday">
              <span class="mr-2 border-default-r pr-2">
                {{ getAgeText }}
              </span>
              <span class="mr-2 border-default-r pr-2">
                {{ data.birthday || ' - ' }}
              </span>
              <span>
                {{ getConstellation }}
              </span>
            </template>
          </p>
          <p class="text">
            <i class="i-carbon:send mr-3 p-2" />
            签名：{{ data.slogan || ' - ' }}
          </p>
          <p class="text" :title="data.birthday || ' - '">
            <i class="i-tabler:calendar mr-3 p-2" />
            距离生日还有：{{ getBirthdayCount || ' - ' }}天
          </p>
          <p class="text">
            <i class="i-solar:mailbox-line-duotone mr-3 p-2" />
            邮箱：{{ data.email || ' - ' }}
          </p>
          <p class="text" btn-primary title="切换隐藏" @click="showMarkPhone = !showMarkPhone">
            <i class="i-solar:phone-linear mr-3 p-2" />
            手机号：{{ data.phone ? showMarkPhone ? data.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : data.phone : ' - ' }}
          </p>
          <p class="text op-80">
            <i class="i-solar:user-speak-outline mr-3 p-2" />
            上次在线：
            {{ data.lastLoginTime ? formatContactDate(data.lastLoginTime) : ' - ' }}
          </p>
        </div>
        <!-- 按钮 -->
        <div v-show="!isLoading" class="flex-row-bt-c">
          <BtnElButton
            v-if="isEdit"
            icon-class="i-solar:pen-2-line-duotone mr-2"
            style="transition: .2s;font-size: 0.85em;height: 2.5em; width: 10em;text-align: center;letter-spacing: 1px;--el-color-primary: var(--el-color-success);"
            plain
            @click.stop="navigateTo('/user')"
          >
            编辑资料&ensp;
          </BtnElButton>
          <BtnElButton
            v-if="isEdit"
            icon-class="i-solar:logout-3-broken mr-2"
            style="transition: .2s;font-size: 0.85em;height: 2.5em; width: 10em;text-align: center;letter-spacing: 1px;"
            type="danger"
            class="shadow"
            @click.stop="store.exitLogin"
          >
            退出登录&ensp;
          </BtnElButton>
        </div>
      </div>
    </template>
  </MenuPopper>
</template>

<style scoped lang="scss">
.card-bg-linear {
  background-image: linear-gradient(160deg, #c9d7ffc9, transparent, transparent, transparent, transparent);
}
.dark {
  .card-bg-linear {
    background-image: linear-gradient(160deg, #616161c2, transparent, transparent, transparent, transparent);
  }
}
:deep(.el-loading-mask) {
  border-radius: 50%;
  overflow: hidden !important;
}
.avatar {
  width: 5em;
  height: 5em;
  border-radius: 50%;
  overflow: hidden;

  :deep(.el-upload) {
    .el-upload-dragger {
      padding: 0;
      border: none;
    }
  }
}
.text {
  --at-apply: "truncate text-xs";
}
</style>
