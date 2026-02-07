<script lang="ts" setup>
import type { UploadProps } from "element-plus/es/components/upload";
import type { UpdateInfo } from "@/composables/api/user/info";
import dayjs from "dayjs";
import { updateInfoByDTO } from "@/composables/api/user/info";
import { compareObjects } from "@/composables/utils";

export interface UserInfoHeaderProps {
  data: Partial<UserInfoVO>
  isEdit?: boolean
}

interface GenderConfig {
  icon: string
  color: string
  bg: string
}

const { data, isEdit = false } = defineProps<UserInfoHeaderProps>();

// 响应式状态管理
const store = useUserStore();
const formData = new FormData();

// 加载状态
const isLoading = ref(false);

// 用户数据状态
const user = reactive<Partial<UserInfoVO>>({});
const userCopy = reactive<Partial<UserInfoVO>>({
  nickname: undefined,
  slogan: undefined,
  gender: undefined,
  birthday: undefined,
});

// 编辑状态
const isEditSlogan = ref(false);
const isEditNickname = ref(false);

// 表单引用
const avatarRef = ref();
const nicknameInputRef = useTemplateRef("nicknameInputRef");
const sloganInputRef = useTemplateRef("sloganInputRef");

// 计算属性
const avatarUrl = computed({
  get() {
    return user?.avatar;
  },
  set(val) {
    user.avatar = val;
  },
});

const getAgeText = computed(() => calculateAge(user?.birthday));
const getConstellation = computed(() => computeConstellation(user?.birthday));
const getBirthdayText = computed(() => {
  if (!user?.birthday)
    return "未知";
  const date = dayjs(user?.birthday);
  if (!date.isValid() || date.isAfter(dayjs()))
    return "不规范";
  return date.format("YYYY-MM-DD");
});

// 性别配置映射
const genderConfig = computed<GenderConfig>(() => {
  const configs: Record<string, GenderConfig> = {
    [Gender.BOY]: { icon: "i-solar:men-bold", color: "text-blue-500", bg: "bg-blue-100" },
    [Gender.GIRL]: { icon: "i-solar:women-bold", color: "text-pink-500", bg: "bg-pink-100" },
  };
  return configs[user.gender || ""] || { icon: "i-solar:user-bold", color: "text-small-color", bg: "bg-color-2" };
});

// 常量
const imageTypeList = ["image/png", "image/jpg", "image/jpeg", "image/svg"];
const genderList = ["男", "女", "保密"];

// 监听 props.data 变化，处理异步加载
watch(
  () => data,
  (newData) => {
    if (newData && Object.keys(newData).length > 0) {
      initializeUserData(newData);
    }
  },
  { immediate: true, deep: true },
);

// 初始化用户数据
function initializeUserData(userData: Partial<UserInfoVO>) {
  // 清空现有数据
  Object.keys(user).forEach(key => delete user[key as keyof UserInfoVO]);
  Object.keys(userCopy).forEach(key => delete userCopy[key as keyof UpdateInfo]);

  // 设置用户数据
  Object.assign(user, userData);

  // 设置表单副本数据
  userCopy.nickname = userData.nickname;
  userCopy.slogan = userData.slogan;
  userCopy.gender = userData.gender;
  userCopy.birthday = userData.birthday;
}

// 头像上传相关方法
const beforeUpload: UploadProps["beforeUpload"] = (rawFile: File) => {
  isLoading.value = true;

  if (!imageTypeList.includes(rawFile.type)) {
    isLoading.value = false;
    ElMessage.error("文件格式不是图片格式!");
    return false;
  }

  if (rawFile.size / 1024 / 1024 > 2) {
    isLoading.value = false;
    ElMessage.error("头像需要小于2MB!");
    return false;
  }

  formData.append("file", rawFile);
  return true;
};

const updateSuccess: UploadProps["onSuccess"] = async (data: Result<string>) => {
  isLoading.value = false;
  avatarRef.value?.clearFiles();

  if (data.code === StatusCode.SUCCESS) {
    user.avatar = data.data;
    avatarUrl.value = data.data;
    ElMessage.success("更换头像成功！");
  }
};

// 聚焦个签
function onFocusSlogan() {
  if (!isEdit)
    return;
  isEditSlogan.value = true;
  nextTick(() => {
    sloganInputRef.value?.focus();
  });
}
function onBlurSlogan() {
  setTimeout(() => {
    if (!isEditSlogan.value)
      return;
    submitUpdateUser("slogan");
  }, 100);
}

// 用户信息更新方法
async function submitUpdateUser(key: string) {
  if (!Object.keys(userCopy).includes(key))
    return;

  const value = userCopy[key as keyof UpdateInfo];
  if (!value && key !== "slogan") { // 个签可以为空
    ElMessage.error("内容不能为空！");
    return;
  }

  if (isLoading.value)
    return;

  try {
    isLoading.value = true;

    const { code } = await updateInfoByDTO(
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
      // 更新 store 和本地数据
      store.$patch({
        userInfo: { ...userCopy },
      });
      Object.assign(user, userCopy);
    }
    else {
      resetUserCopy();
    }
  }
  catch (error) {
    resetUserCopy();
  }
  finally {
    isLoading.value = false;
    closeEditMode();
  }
}

// 重置表单数据
function resetUserCopy() {
  userCopy.nickname = user?.nickname;
  userCopy.slogan = user?.slogan;
  userCopy.birthday = user?.birthday;
  userCopy.gender = user?.gender;
}

// 关闭编辑模式
function closeEditMode() {
  isEditNickname.value = false;
  isEditSlogan.value = false;
}

// 昵称编辑相关方法
function onFocusNickname() {
  if (!isEdit)
    return;
  isEditNickname.value = true;
  nextTick(() => {
    nicknameInputRef.value?.focus();
  });
}

// 确认更新的通用方法
function confirmUpdate(field: keyof UpdateInfo, message: string) {
  return ElMessageBox.confirm(`是否确认修改${message}？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
    center: true,
  })
    .then(() => submitUpdateUser(field))
    .catch(() => resetUserCopy());
}

function onBlur() {
  setTimeout(() => {
    if (!isEditNickname.value && !isEditSlogan.value)
      return;

    // 检查昵称是否修改
    if (userCopy.nickname !== user?.nickname) {
      confirmUpdate("nickname", "昵称");
      return;
    }

    // 检查个签是否修改
    if (userCopy.slogan !== user?.slogan) {
      confirmUpdate("slogan", "个性签名");
      return;
    }

    closeEditMode();
  }, 100);
}

// 分享相关方法
function showInvitation() {
  useAsyncCopyText(`${document.URL}?id=${user?.id}`)
    .then(() => {
      ElMessage.success("链接已复制到剪切板！");
    })
    .catch(() => {
      ElMessage.error("链接分享失败！");
    });
}
</script>

<template>
  <div class="main-card info-card relative">
    <!-- 头像部分 -->
    <div class="avatar-wrapper">
      <el-upload
        ref="avatarRef"
        :disabled="!isEdit"
        class="avatar-uploader"
        :class="{ 'is-disabled': !isEdit }"
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
        :on-success="updateSuccess"
      >
        <div class="avatar-inner group">
          <CommonAvatar
            :src="BaseUrlImg + avatarUrl"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <div
            v-if="isEdit"
            class="upload-overlay"
          >
            <i class="i-solar:camera-add-bold text-xl text-white" />
          </div>
        </div>
      </el-upload>
    </div>

    <!-- 用户基本信息 -->
    <div class="px-1 pt-8">
      <!-- 昵称和状态 -->
      <div class="mb-4 flex items-center gap-2">
        <div v-if="!isEditNickname" class="max-w-[70%] flex items-center gap-2">
          <h2 class="truncate text-xl text-color font-bold" :class="{ 'cursor-pointer': isEdit }" @click="onFocusNickname">
            {{ user.nickname }}
          </h2>
        </div>

        <!-- 昵称编辑框 -->
        <div v-else-if="isEditNickname">
          <el-input
            ref="nicknameInputRef"
            v-model.lazy="userCopy.nickname"
            class="nickname-input"
            placeholder="修改昵称"
            @blur="onBlur"
            @keyup.enter="submitUpdateUser('nickname')"
          />

          <CommonElButton
            type="primary"
            size="small"
            @click="submitUpdateUser('nickname')"
          >
            <i class="i-solar:check-circle-bold" />
          </CommonElButton>
        </div>

        <!-- 编辑按钮 -->
        <CommonElButton
          v-if="!isEditNickname && isEdit"
          :bg="false"
          text
          size="small"
          @click="onFocusNickname"
        >
          <i class="i-solar:pen-new-square-outline" />
        </CommonElButton>
      </div>

      <!-- ID 徽章 -->
      <div class="mb-4 flex items-center">
        <div class="group flex cursor-pointer items-center gap-1 rounded-1 bg-color-2 px-3 py-1 text-mini font-medium font-mono op-80 transition-colors hover:bg-color-3" @click="showInvitation">
          <span>ID: {{ user?.id }}</span>
          <i v-copying.toast="user?.id" class="i-solar:copy-linear text-mini opacity-50 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      <!-- 标签行 -->
      <div class="mb-2 flex flex-wrap gap-2">
        <!-- 年龄 -->
        <div v-if="getAgeText" class="tag-item">
          <i class="i-ri:cake-2-line text-orange-400" />
          <span>{{ getAgeText }}</span>
        </div>

        <!-- 星座 -->
        <div v-if="getConstellation" class="tag-item">
          <i class="i-solar:stars-minimalistic-bold-duotone text-purple-400" />
          <span>{{ getConstellation }}</span>
        </div>

        <!-- 生日 -->
        <div v-if="user.birthday" class="tag-item group relative flex-row-c-c">
          <i class="i-solar:calendar-date-bold-duotone text-blue-400" />
          <span>{{ getBirthdayText }}</span>
          <!-- 生日编辑 -->
          <el-date-picker
            v-if="isEdit"
            v-model="userCopy.birthday"
            type="date"
            :clearable="false"
            :disabled="!isEdit"
            class="inset-0 left-0 z-99 h-full max-w-24 cursor-pointer op-0 !absolute"
            @change="submitUpdateUser('birthday')"
          />
        </div>

        <!-- 性别选择 -->
        <div class="tag-item relative w-18 flex items-center">
          <i :class="genderConfig.icon" :style="{ color: genderConfig.color.replace('text-', '') }" />
          <el-select
            v-if="isEdit"
            v-model="userCopy.gender"
            class="absolute inset-0 opacity-0 !h-5 !w-0"
            size="small"
            placement="bottom"
            @change="submitUpdateUser('gender')"
          >
            <el-option v-for="item in genderList" :key="item" :label="item" :value="item" />
          </el-select>
          <span>{{ user.gender }}</span>
        </div>
      </div>

      <!-- 签名卡片 -->
      <div class="group relative mt-5 rounded-lg bg-color-2 p-2 shadow-sm shadow-inset transition-colors sm:p-3">
        <div class="flex items-start gap-2">
          <i class="i-ri:double-quotes-l flex-shrink-0 text-mini op-50" />
          <div class="group relative min-w-0 flex-1">
            <el-input
              v-if="isEditSlogan || isEdit"
              ref="sloganInputRef"
              v-model.lazy="userCopy.slogan"
              type="textarea"
              :rows="2"
              resize="none"
              class="w-full"
              placeholder="填写个性签名"
              :readonly="!isEdit"
              @blur="onBlurSlogan"
              @keyup.enter="submitUpdateUser('slogan')"
            />
            <div v-else class="py-1 text-sm text-color op-80">
              {{ user.slogan || '这个人很懒，什么都没留下...' }}
            </div>
            <!-- 编辑图标右上角 -->
            <CommonElButton
              v-if="isEdit"
              :bg="false"
              text
              size="small"
              class="absolute right-2 top-2 transition-opacity group-hover:op-100 sm:op-0"
              @click="onFocusSlogan"
            >
              <i class="i-solar:pen-new-square-outline" />
            </CommonElButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.info-card {
  --at-apply: "rounded-xl bg-color px-4 shadow-sm sm:( border-default-2 border-op-04)";
}

.main-card {
  --at-apply: "p-4 !bg-op-60 backdrop-blur-12";
}

.avatar-wrapper {
  --at-apply: "absolute -top-10 left-4 w-20 h-20 rounded-full p-1 bg-color shadow-md z-10";
}

.avatar-inner {
  --at-apply: "w-full h-full rounded-full overflow-hidden relative border border-default";
}

.avatar-uploader {
  width: 100%;
  height: 100%;

  :deep(.el-upload) {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
}

.nickname-input {
  --at-apply: "w-fit font-bold";
  font-size: 1.25rem;
  font-weight: 700 !important;
  height: 1.75rem;
  :deep(.el-input__wrapper) {
    --at-apply: "w-fit max-w-full";
  }

  :deep(.el-input__inner) {
    --at-apply: "font-700 text-color w-fit max-w-full";
    flex-grow: 0 !important;
  }
}

.upload-overlay {
  --at-apply: "absolute inset-0 bg-menu-color flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer";
}

.tag-item {
  --at-apply: "flex items-center gap-2 h-7 pl-2 pr-3 bg-color-2 rounded-md text-xs text-small-color font-medium transition-colors hover:bg-color-3";
  i {
    --at-apply: "text-3";
  }
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0 !important;
}

:deep(.el-textarea__inner) {
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0 !important;
  color: inherit !important;
}
</style>
