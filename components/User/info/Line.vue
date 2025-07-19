<script lang="ts" setup>
import type { UploadFile, UploadFiles, UploadProps } from "element-plus/es/components/upload";
import type { UpdateInfo } from "@/composables/api/user/info";
import { updateInfoByDTO } from "@/composables/api/user/info";
import { compareObjects } from "@/composables/utils";

const { data } = defineProps<{
  data: Partial<UserInfoVO>
  isEdit?: boolean
}>();

const user = reactive<Partial<UserInfoVO>>(data);
const store = useUserStore();
const formData = new FormData();
// 表单
const avatatRef = ref();
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

const genderList = ref<string[]>(["男", "女", "保密"]);
// 用户基本信息
const userCopy = reactive<UpdateInfo>({
  nickname: user?.nickname,
  slogan: user?.slogan,
  gender: user?.gender,
  birthday: user?.birthday,
});

// 是否开启slogan编辑
const isEditSlogan = ref<boolean>(false);
const isEditNickname = ref<boolean>(false);

/**
 * 更新用户基本信息
 * @param key dto key
 */
async function submitUpdateUser(key: string) {
  // 判空
  if (Object.keys(userCopy).includes(key)) {
    if (!JSON.parse(JSON.stringify(userCopy))[key])
      return ElMessage.error("内容不能为空！");
    if (isLoading.value)
      return;

    // 网络请求
    const { code, message } = await updateInfoByDTO(
      compareObjects({
        nickname: user?.nickname,
        slogan: user?.slogan,
        gender: user?.gender,
        birthday: user?.birthday,
      }, { ...userCopy }),
      store.getToken,
    );
    if (code === StatusCode.SUCCESS) {
      ElMessage.success("修改成功！");
      store.$patch({
        userInfo: {
          ...userCopy,
        },
      });
    }
    else {
      ElMessage.error(message || "修改失败，请稍后重试！");
    }
    // 关闭
    isEditNickname.value = false;
    isEditSlogan.value = false;
  }
}

/**
 * 邀请方法
 */
function showInvitation() {
  useAsyncCopyText(`${document.URL}?id=${user?.id}`)
    .then(() => {
      ElMessage.success("链接已复制到剪切板！");
    })
    .catch(() => {
      ElMessage.error("链接分享失败！");
    });
}
const nicknameInputRef = useTemplateRef("nicknameInputRef");
function onFocusNickname() {
  isEditNickname.value = true;
  nextTick(() => {
    nicknameInputRef.value?.focus();
  });
}

function onBlur() {
  setTimeout(() => {
    if (!isEditNickname.value && !isEditNickname.value)
      return;
    isEditNickname.value = false;
    isEditSlogan.value = false;
    // 检查昵称是否修改
    if (userCopy.nickname !== user?.nickname) {
      ElMessageBox.confirm("是否确认修改昵称？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        center: true,
      })
        .then(() => submitUpdateUser("nickname"))
        .catch(() => { userCopy.nickname = user?.nickname; });
    }
    // 检查个性签名是否修改
    else if (userCopy.slogan !== user?.slogan) {
      ElMessageBox.confirm("是否确认修改个性签名？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        center: true,
      })
        .then(() => submitUpdateUser("slogan"))
        .catch(() => { userCopy.slogan = user?.slogan; });
    }
  }, 100);
}

onMounted(() => {
  nextTick(() => {
    userCopy.slogan = user?.slogan;
    userCopy.birthday = user?.birthday;
    userCopy.gender = user?.gender;
  });
});

const [autoAnimateRef, enable] = useAutoAnimate({});
onMounted(() => {
  const setting = useSettingStore();
  enable(!setting.settingPage.isCloseAllTransition);
});
</script>

<template>
  <div>
    <div
      v-loading="isLoading"
      class="avatar card-default-br shadow-md"
    >
      <!-- 上传 -->
      <el-upload
        ref="avatatRef"
        :disabled="!isEdit"
        class="avatar-uploader"
        :class="{ 'is-disabled': !isEdit }"
        drag
        :action="`${BaseUrlRef}/user/info/avatar`"
        :headers="{ Authorization: store.token }"
        method="PUT"
        :limit="1"
        accept="image/*"
        :multiple="false"
        auto-upload
        :show-file-list="false"
        list-type="picture"
        :before-upload="beforeUpload"
        :on-success="updateSucess"
      >
        <div class="group relative flex-row-c-c">
          <CardAvatar
            v-if="avatarUrl"
            alt="Design By Kiwi23333"
            :src="BaseUrlImg + avatarUrl"
            class="avatar-mark h-6em w-6em select-none overflow-hidden overflow-hidden rounded-1/2 object-cover p-0 transition-300 group-hover:filter-blur-4"
          />
          <ElIconPlus
            v-else
            size="2em"
          />
          <!-- <i
            class="i-solar:camera-broken absolute p-5 opacity-0 transition-300 group-hover:opacity-60"
          /> -->
        </div>
      </el-upload>
    </div>
    <div class="text inline-flex flex-col items-start px-2">
      <div ref="autoAnimateRef" tag="div" class="my-2">
        <!-- 原 -->
        <h2
          v-show="!isEditNickname"
          key="nickname1"
          class="group h-2rem w-full flex"
        >
          <span max-w-50vw truncate sm:max-w-16em title="点击编辑" @click="onFocusNickname()">{{ user.nickname }}</span>
          <el-button
            type="info"
            size="small"
            class="ml-4em border-default group-hover:opacity-100 sm:op-0"
            @click="showInvitation"
          >
            分 享
          </el-button>
        </h2>
        <!-- 昵称 -->
        <div
          v-show="isEditNickname"
          v-if="isEdit"
          key="nickname-input"
          class="h-2rem flex-row-c-c"
        >
          <el-input
            ref="nicknameInputRef"
            v-model.lazy="userCopy.nickname"
            class="mr-2"
            style="font-size: 0.9em; font-weight: 700"
            placeholder="修改用户昵称"
            @focus="isEditNickname = true"
            @blur="onBlur()"
            @keyup.enter="submitUpdateUser('nickname')"
          />
          <el-button
            style="padding: 0 1.5em"
            type="primary"
            @click="submitUpdateUser('nickname')"
          >
            修改
          </el-button>
        </div>
      </div>

      <!-- id -->
      <small class="group small-input cursor-pointer opacity-60">
        ID：{{ user?.id }}
        <el-tooltip
          v-if="user?.id"
          content="复制 ID"
          placement="bottom"
          popper-class="el-popper-init"
        >
          <span
            v-copying.toast="user?.id"
            class="i-solar:copy-broken mx-2 cursor-pointer bg-blueGray p-2 transition-300 hover:bg-[var(--el-color-success)]"
          />
        </el-tooltip>
      </small>
      <div mt-4 flex flex-row flex-col flex-wrap gap-2>
        <!-- 个性签名 -->
        <div class="small-input mt-3 flex items-center justify-start">
          <small>签名：</small>
          <el-input
            v-if="isEdit"
            v-model.lazy="userCopy.slogan"
            class="mr-1"
            size="small"
            type="text"
            style="width: 14em"
            placeholder="展示你的个性签名吧~ ✨"
            @keyup.enter="submitUpdateUser('slogan')"
            @focus="isEditSlogan = true"
            @blur="onBlur()"
          />
          <span
            v-else
            class="truncate pl-2 text-xs"
            :title="userCopy?.slogan"
          >{{ userCopy?.slogan || "暂无个性签名" }}</span>
          <el-button
            v-show="isEditSlogan"
            key="isEditSlogan-btn"
            :icon="ElIconSelect"
            size="small"
            type="primary"
            @click="submitUpdateUser('slogan')"
          />
        </div>
        <!-- 生日 -->
        <div class="small-input mt-3 flex-row-c-c justify-start">
          <small flex-shrink-0>生日：</small>
          <el-date-picker
            v-model.lazy="userCopy.birthday"
            type="date"
            placeholder="选择生日"
            size="small"
            :disabled="!isEdit"
            @change="submitUpdateUser('birthday')"
          />
        </div>
        <!-- 性别 -->
        <div class="small-input mt-3 flex-row-c-c justify-start">
          <!-- <i i-solar:adhesive-plaster-linear p-1 mr-2></i> -->
          <small>性别：</small>
          <el-select
            v-model="userCopy.gender"
            placeholder="Select"
            style="width: 10.5em"
            size="small"
            :disabled="!isEdit"
            @change="submitUpdateUser('gender')"
          >
            <el-option
              v-for="item in genderList"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-loading-mask) {
  border-radius: 50%;
  overflow: hidden !important;
}
.avatar {
  width: 6em;
  height: 6em;
  border-radius: 50%;
  overflow: hidden;

    :deep(.el-upload) {
    overflow: hidden;
    width: 6em;
    height: 6em;
    border-radius: 50%;

    .el-upload-dragger {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      width: 6em;
      height: 6em;
      border-width: 2px;
      border-radius: 50%;
      border-style: solid;
      border-color: var(--el-border-color);
      &:hover {
        border-style: dashed;
      }
      transition: $transition-delay;
    }
  }
  .is-disabled {
    pointer-events: none;
  }
}
/* stylelint-disable-next-line selector-class-pattern */
.small-input :deep(.el-input__wrapper) {
  & {
    box-shadow: none;
  }
  &.is-focus {
    box-shadow: 0 0 0 1px var(--el-input-foucs-border-color) inset;
  }
}

.el-popper-init {
  padding: 2px 4px;
}
:deep(.el-input) {
  .el-input__wrapper {
    background-color: transparent;
  }
}
:deep(.el-select) {
  .el-select__wrapper {
    background-color: transparent;
    box-shadow: none;
  }
}
</style>
