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
      userCopy.nickname = user?.nickname;
      userCopy.slogan = user?.slogan;
      userCopy.birthday = user?.birthday;
      userCopy.gender = user?.gender;
    }
    // 关闭
    isEditNickname.value = false;
    isEditSlogan.value = false;
  }
}

const { share, isSupported } = useShare();
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
  if (isSupported.value) {
    share({
      title: "邀请你加入 Kiwi23333 的个人中心",
      text: `点击链接访问：${document.URL}?id=${user?.id}`,
      url: `${document.URL}?id=${user?.id}`,
    });
  }
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
        .catch(() => {
          // 恢复所有表单
          userCopy.nickname = user?.nickname;
          userCopy.slogan = user?.slogan;
          userCopy.birthday = user?.birthday;
          userCopy.gender = user?.gender;
        });
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

// 年龄
const bgUrl = computed(() => localStorage.getItem("jiwu_user_bg") || "/image/user-bg/kiwi-bg-4.jpg");
const getAgeText = computed(() => calculateAge(user?.birthday));
const getConstellation = computed(() => computeConstellation(user?.birthday));
const getBirthdayCount = computed(() => calculateBirthdayCount(user?.birthday));
</script>

<template>
  <div class="top">
    <div
      v-loading="isLoading"
      class="avatar"
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
            class="avatar-mark h-6em w-6em select-none overflow-hidden overflow-hidden rounded-1/2 object-cover p-0 transition-300 group-hover:filter-blur-4"
            size="2em"
          />
        </div>
      </el-upload>
    </div>
    <div class="px-2">
      <!-- 原 -->
      <h2
        v-show="!isEditNickname"
        key="nickname1"
        class="group h-2rem flex-row-bt-c flex-1"
      >
        <span flex-1 truncate title="点击编辑" @click="onFocusNickname()">{{ user.nickname }}</span>
        <i i-solar:share-bold ml-a btn-info text-4 @click="showInvitation" />
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
          style="font-size: 0.9em; font-weight: 500"
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
      <!-- id -->
      <div class="group mt-2 block text-small">
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
      </div>
    </div>
  </div>
  <!-- 详情 -->
  <div class="detail-info">
    <p class="user-props truncate text-sm">
      <i mr-3 inline-block h-4 w-4 :class="user.gender === Gender.BOY ? 'i-tabler:gender-male text-blue' : user.gender === Gender.GIRL ? 'i-tabler:gender-female text-pink' : 'i-tabler:gender-transgender text-yellow'" />
      <span class="mr-2 pr-2">
        {{ user.gender }}
      </span>
      <template v-if="user.birthday">
        <span class="mr-2 border-default-l pr-2">
          {{ getAgeText }}
        </span>
        <span class="mr-2 border-default-l pr-2">
          {{ user.birthday || ' - ' }}
        </span>
        <span>
          {{ getConstellation }}
        </span>
      </template>
    </p>
    <p class="user-props">
      <i class="i-carbon:send mr-3 inline-block h-4 w-4" />
      签名：
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
    </p>
    <p class="user-props">
      <i class="i-tabler:calendar mr-3 inline-block h-4 w-4" />
      生日：
      <el-date-picker
        v-if="isEdit"
        v-model.lazy="userCopy.birthday"
        type="date"
        placeholder="选择生日"
        size="small"
        :disabled="!isEdit"
        @change="submitUpdateUser('birthday')"
      />
      <span v-else class="pl-2 text-xs">
        距离生日还有：{{ getBirthdayCount || ' - ' }}天
      </span>
    </p>
    <!-- 性别 -->
    <div class="user-props">
      <i i-solar:adhesive-plaster-linear mr-3 inline-block h-4 w-4 />
      性别：
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
    <p class="user-props">
      <i class="i-carbon:user mr-3 inline-block h-4 w-4" />
      上次在线：
      {{ user.lastLoginTime || ' - ' }}
    </p>
  </div>
  <!-- 他的朋友圈 -->
  <div class="detail-info pb-4">
    <div class="user-props flex cursor-pointer items-center" @click="ElMessage.info('未完善，敬请期待！')">
      <i class="i-solar:fire-line-duotone mr-3 p-2" />
      TA的朋友圈
      <i class="i-carbon:chevron-right ml-a p-2" />
    </div>
    <div class="user-props flex cursor-pointer items-center" @click="ElMessage.info('未完善，敬请期待！')">
      <i class="i-solar:gallery-wide-line-duotone mr-3 p-2" />
      精选图集
      <i class="i-carbon:chevron-right ml-a p-2" />
    </div>
    <div class="img-list">
      <!-- TODO: 后期添加 -->
      <CardElImage
        class="my-2 mr-2 h-18 w-18 rounded-md bg-color-2 object-cover shadow"
        :default-src="user.avatar"
        fit="cover"
        :preview-src-list="[BaseUrlImg + user.avatar]"
      />
      <!-- TODO: 后期添加 -->
      <CardElImage
        class="my-2 mr-2 h-18 w-18 rounded-md bg-color-2 object-cover shadow"
        :default-src="bgUrl"
        fit="cover"
        :preview-src-list="[BaseUrlImg + bgUrl]"
      />
    </div>
    <div>
      <div class="user-props flex cursor-pointer items-center" @click="ElMessage.info('未完善，敬请期待！')">
        <i class="i-solar:heart-line-duotone mr-3 inline-block h-4 w-4" />
        TA的收藏
        <i class="i-carbon:chevron-right ml-a p-2" />
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
  // width: 100%;
  // height: 100%;
  // border-radius: 50%;
  // overflow: hidden;
  --at-apply: "overflow-hidden w-6em h-6em rounded-1/2 flex-shrink-0 shadow-md";

    :deep(.el-upload) {
      --at-apply: "card-default-br";
      overflow: hidden;
      width: 100%;
      height: 100%;
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
.small-input {
  --at-apply: "pb-2 mb-2 flex items-center justify-start";
}
:deep(.el-input__wrapper) {
  & {
    box-shadow: none;
  }
  &.is-focus {
    box-shadow: 0 0 0 1px var(--el-input-foucs-border-color) inset;
  }
}
:deep(.el-input.el-date-editor) {

  .el-input__wrapper {
    padding: 0;
  }

  .el-input__prefix {
    display: none;
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

.top {
  --at-apply: "!bg-op-50 backdrop-blur-20 rounded-t-4 w-full flex items-center gap-2 p-4 pb-8 -mt-16 sm:( px-8 pt-8)";
  background: linear-gradient(to bottom, #ffffff85, #FFFFFF);
}
.dark {
  .top {
    background: linear-gradient(to bottom, #1f1f1f3d, #1f1f1f);
  }
}

.detail-info {
  --at-apply: "w-full px-4 sm:px-8 gap-6 shadow-sm sm:shadow-none bg-color";

  .user-props {
    --at-apply: "flex items-center py-3 max-w-full sm:w-30rem truncate text-sm";
  }
  .user-props:nth-last-child(1) {
    --at-apply: "mb-0";
  }
}
</style>
