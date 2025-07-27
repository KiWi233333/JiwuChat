<script lang="ts" setup>
import type { FormInstance } from "element-plus/es/components/form";

const emits = defineEmits(["close"]);
const [formAnimateRef, enter] = useAutoAnimate({
  duration: 200,
});

const setting = useSettingStore();
const user = useUserStore();

enum CheckTypeEnum {
  PHONE = DeviceType.PHONE,
  EMAIL = DeviceType.EMAIL,
  OLD_PASSWORD = 2,
}

// 状态变量
const isLoading = ref<boolean>(false);
const codeStorage = ref<number>(0);
const userFormRefs = ref();

// 根据用户验证状态选择默认验证方式
const chooseType = ref<CheckTypeEnum | undefined>(
  user.userInfo.isEmailVerified
    ? CheckTypeEnum.EMAIL
    : user.userInfo.isPhoneVerified
      ? CheckTypeEnum.PHONE
      : CheckTypeEnum.OLD_PASSWORD,
);

// 显示当前选择的验证方式对应的值
const checkTypeValue = computed(() =>
  chooseType.value === CheckTypeEnum.PHONE ? user.userInfo.phone : user.userInfo.email,
);

// 表单数据
const userForm = reactive({
  code: "", // 验证码
  password: "", // 旧密码
  newPassword: "", // 新密码
});

// 是否使用二步验证（邮箱或手机号）
const isSecondCheck = computed(() =>
  chooseType.value === CheckTypeEnum.EMAIL || chooseType.value === CheckTypeEnum.PHONE,
);

// 密码验证规则
const passwordRules = [
  { required: true, message: "密码不能为空！", trigger: "blur" },
  {
    pattern: /^\w{6,20}$/,
    message: "密码字母数字下划线组成",
    trigger: "change",
  },
  { min: 6, max: 20, message: "密码长度6-20字符！", trigger: "blur" },
  {
    validator: () => userForm.password !== userForm.newPassword,
    message: "新旧密码相同！",
    trigger: "change",
  },
  {
    validator: () => userForm.password !== userForm.newPassword,
    message: "新旧密码相同！",
    trigger: "blur",
  },
];

// 表单验证规则
const rules = computed(() => isSecondCheck.value
  ? {
      code: [
        { required: true, message: "请输入验证码", trigger: "blur" },
        { min: 6, max: 6, message: "验证码长度错误", trigger: "blur" },
      ],
      newPassword: passwordRules,
    }
  : {
      password: passwordRules,
      newPassword: passwordRules,
    },
);

/**
 * 修改密码
 */
async function onUpdatePwd(formEl: FormInstance | undefined) {
  if (!formEl || isLoading.value)
    return;

  await formEl.validate(async (valid) => {
    if (valid) {
      isLoading.value = true;
      try {
        const action = await ElMessageBox.confirm("是否确认修改密码?", "修改密码", {
          confirmButtonText: "确认修改",
          cancelButtonText: "取消",
          lockScroll: false,
        });

        if (action === "confirm")
          await toUpdate();
      }
      finally {
        setTimeout(() => {
          isLoading.value = false;
        }, 300);
      }
    }
  });
}

/**
 * 执行密码更新
 */
async function toUpdate() {
  if (chooseType.value === undefined)
    return;

  let res;
  if (chooseType.value === CheckTypeEnum.OLD_PASSWORD) {
    res = await updatePwdByToken(
      { oldPassword: userForm.password, newPassword: userForm.newPassword },
      user.getToken,
    );
  }
  else {
    res = await updatePwdByCode(
      chooseType.value as any,
      { code: userForm.code, newPassword: userForm.newPassword },
      user.getToken,
    );
  }

  if (res && res.code === StatusCode.SUCCESS) {
    ElMessage.success({
      message: "修改成功，下次登录请用新密码！",
      duration: 2000,
    });
    emits("close");
    return true;
  }

  return false;
}

/**
 * 获取验证码
 */
async function getCheckCodeReq(type?: CheckTypeEnum) {
  if (type === undefined || codeStorage.value > 0)
    return;

  const key = type === CheckTypeEnum.EMAIL ? user.userInfo.email : user.userInfo.phone;
  if (!key || (type !== CheckTypeEnum.PHONE && type !== CheckTypeEnum.EMAIL))
    return;

  const res = await getCheckCode(key, type as any, user.getToken);
  if (res.code === StatusCode.SUCCESS) {
    ElMessage({
      message: "发送成功，请查收！",
      type: "success",
      duration: 2000,
    });

    codeStorage.value = 60;
    const timer = setInterval(() => {
      codeStorage.value--;
      if (codeStorage.value === 0)
        clearInterval(timer);
    }, 1000);
  }
}

onMounted(() => {
  enter(!setting.settingPage.isCloseAllTransition);
});
</script>

<template>
  <el-form
    ref="userFormRefs"
    :disabled="isLoading"
    label-position="top"
    hide-required-asterisk
    :rules="rules"
    :model="userForm"
    class="form"
  >
    <div my-2 text-center text-lg font-bold tracking-0.2em>
      密码修改
    </div>
    <transition-group :name="setting.settingPage.isCloseAllTransition ? '' : 'group-list'" mode="ease-in-out" class="relative">
      <!-- 二步验证 -->
      <el-form-item v-if="isSecondCheck" key="code-1" type="password" :label="`${chooseType === CheckTypeEnum.PHONE ? '手机号' : '邮箱'}`" prop="password" class="animated">
        <el-input
          v-model:model-value="checkTypeValue"
          disabled
          :prefix-icon="ElIconUser"
          size="large"
          :placeholder="`请输入${chooseType === CheckTypeEnum.PHONE ? '手机号' : '邮箱'}`"
          required
          :type="chooseType === CheckTypeEnum.PHONE ? 'phone' : 'email'"
          @keyup.enter="onUpdatePwd(userFormRefs)"
        >
          <template #append>
            <el-button type="primary" class="code-btn" :disabled="codeStorage > 0" @click="getCheckCodeReq(chooseType)">
              {{ codeStorage > 0 ? `${codeStorage}s后重新发送` : "获取验证码" }}
            </el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item
        v-if="isSecondCheck"
        key="code-2"
        type="text" label="验证码" prop="code" class="animated"
      >
        <el-input
          v-model.trim="userForm.code"
          :prefix-icon="ElIconUnlock"
          :maxlength="6"
          :minlength="6"
          size="large"
          placeholder="请输入验证码"
          required
          type="text"
          @keyup.enter="onUpdatePwd(userFormRefs)"
        />
      </el-form-item>
      <!-- 新旧密码 -->
      <el-form-item
        v-else
        key="code-3"
        type="password"
        label="旧密码"
        prop="password"
        class="animated"
      >
        <el-input
          v-model.trim="userForm.password"
          :prefix-icon="ElIconUnlock"
          size="large"
          placeholder="请输入旧密码"
          required
          show-password
          type="password"
          @keyup.enter="onUpdatePwd(userFormRefs)"
        />
      </el-form-item>
      <el-form-item
        type="password" label="新密码" prop="newPassword" class="animated"
      >
        <el-input
          v-model.trim="userForm.newPassword"
          :prefix-icon="ElIconUnlock"
          size="large"
          placeholder="请输入新密码"
          required
          show-password
          type="password"
          @keyup.enter="onUpdatePwd(userFormRefs)"
        />
      </el-form-item>
      <el-radio-group v-model="chooseType" size="small" class="check-type-list w-full pt-2">
        <el-radio v-if="user.userInfo.isPhoneVerified" :value="CheckTypeEnum.PHONE">
          手机号
        </el-radio>
        <el-radio v-if="user.userInfo.isEmailVerified" :value="CheckTypeEnum.EMAIL">
          邮箱
        </el-radio>
        <el-radio v-if="user.userInfo.isPasswordVerified" :value="CheckTypeEnum.OLD_PASSWORD">
          原密码
        </el-radio>
      </el-radio-group>
      <el-form-item mt-1em>
        <el-button
          type="danger"
          class="submit"
          style="padding: 1.2em 0"
          @keyup.enter="onUpdatePwd(userFormRefs)"
          @click="onUpdatePwd(userFormRefs)"
        >
          修 改
        </el-button>
      </el-form-item>
    </transition-group>
  </el-form>
</template>

<style scoped lang="scss">
.form {
  --at-apply: "sm:w-360px w-95vw block overflow-hidden border-default-2 backdrop-blur-5px card-default rounded-2 py-2em";

  :deep(.el-input-group__append) {
    .el-button {
      --at-apply: "h-full text-[--el-color-danger]";
    }
  }

	:deep(.el-input__wrapper) {
		padding: 0 1em;
	}
   :deep(.check-type-list.el-radio-group) {
    display: flex;
    justify-content: right;
    margin-left: auto;
    .el-radio {
      height: fit-content;
      --at-apply: "border-default-r";
      padding-right: 1em;
      &.is-checked {
        .el-radio__label {
          color: var(--el-color-danger);
        }
      }
      &:nth-last-child(1) {
        border: none;
        padding-right: 2.4em;
    }
      margin-right: 0;
        .el-radio__input {
          display: none;
        }
      }
    }

	:deep(.el-form-item) {
		padding: 0.2em 2em;
    width: 100%;
    box-sizing: border-box;
    // 报错信息
		.el-form-item__error {
      position: static;
      padding-top: 0.2em;
		}
	}
}

:deep(.el-button) {
	padding: 0 1em;
}

.dark .form {
	background-color: #161616d8;
}

.animate__animated {
	animation-duration: 0.5s;
}

// label总体
:deep(.el-form-item) {
	margin-bottom: 0;
}

// 切换登录
.toggle-login {
	position: relative;
	border-radius: var(--el-border-radius-base);
	backdrop-filter: blur(10px);
	background-color: #b3b3b32a;
	padding: 0.3em;
	display: flex;

	:deep(.el-button) {
		background-color: transparent;
		transition: 0.3s;
		padding: 0em 0.6em;
		border: none;
	}

	.active {
		transition: 0.3s;
		background-color: #ffffff;
		z-index: 1;
		box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 4px;
		color: var(--el-text-color);
	}
}

.dark .active {
	background-color: var(--el-color-primary);
}

.submit {
  --at-apply: "mb-4 w-full shadow-sm text-1em transition-300 "

	:deep(.el-input__wrapper) {
		background-color: var(--el-color-danger);
		cursor: pointer;

		* {
			color: #fff;
			font-weight: 600;
			letter-spacing: 0.3em;
		}
	}
}

.dark .submit :deep(.el-input__wrapper) {
	background-color: var(--el-color-danger);
	cursor: pointer;
	color: #fff;
}
</style>
