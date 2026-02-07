<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus";

interface Props {
  size?: "default" | "large" | "small"
}

defineProps<Props>();

const emit = defineEmits<{
  configChanged: [config: EnvConfigMap ]
}>();

const user = useUserStore();
const formRef = ref<FormInstance>();
// 环境配置状态
const envConfig = ref<EnvConfigMap>(getEnvConfig());

// 表单验证规则（仅包含可修改的字段）
const rules: FormRules<EnvConfigMap> = {
  VITE_API_BASE_URL: [
    { required: true, message: "请输入API基础URL", trigger: "blur" },
    {
      pattern: /^https?:\/\/.+/,
      message: "URL格式不正确，应以http://或https://开头",
      trigger: "blur",
    },
  ],
  VITE_API_WS_BASE_URL: [
    { required: true, message: "请输入WebSocket URL", trigger: "blur" },
    {
      pattern: /^wss?:\/\/.+/,
      message: "WebSocket URL格式不正确，应以ws://或wss://开头",
      trigger: "blur",
    },
  ],
};

// 添加环境类型选择状态
const envType = ref<"dev" | "prod">("dev");

// 环境选项配置
const envOptions = [
  { label: "开发环境", value: "dev" },
  { label: "生产环境", value: "prod" },
];

// 监听环境类型变化
watch(envType, (newType) => {
  changeDefaultConfig(newType);
});

// 保存配置（仅保存可修改的字段，同时返回完整配置给父组件）
async function saveConfig() {
  if (!formRef.value)
    return;

  try {
    await formRef.value.validate();

    // 只保存可修改的字段到localStorage
    if (import.meta.client) {
      setEnvConfig({
        ...getEnvConfig(),
        // 仅更新可修改的字段
        VITE_API_BASE_URL: envConfig.value.VITE_API_BASE_URL,
        VITE_API_WS_BASE_URL: envConfig.value.VITE_API_WS_BASE_URL,
      });
    }

    // 发送完整配置给父组件
    emit("configChanged", { ...DefaultEnvConfigMap, ...envConfig.value });
    ElMessage.success("环境配置已保存");

    // 返回登录页面
    user.showLoginPageType = "login";
  }
  catch (error) {
    console.error("保存环境配置失败:", error);
    ElMessage.error("保存环境配置失败，请检查输入格式");
  }
}

const DEV_EnvConfig: EnvConfigMap = {
  VITE_API_BASE_URL: "http://localhost:9090/",
  VITE_API_WS_BASE_URL: "ws://localhost:9091/",
};

const PROD_EnvConfig: EnvConfigMap = {
  VITE_API_BASE_URL: "https://api.jiwu.kiwi2333.top/",
  VITE_API_WS_BASE_URL: "wss://api.jiwu.kiwi2333.top/websocket",
};

// 切换默认配置
function changeDefaultConfig(type: "dev" | "prod") {
  if (type === "dev") {
    envConfig.value = { ...DEV_EnvConfig };
  }
  else {
    envConfig.value = { ...PROD_EnvConfig };
  }
}

// 重置配置（仅重置可修改的字段）
function resetConfig() {
  envConfig.value = { ...DefaultEnvConfigMap };
  ElMessage.info("已重置为默认配置");
}

// 加载保存的配置
onMounted(() => {
  envConfig.value = getEnvConfig();
  // 根据当前配置判断环境类型
  if (envConfig.value.VITE_API_BASE_URL === DEV_EnvConfig.VITE_API_BASE_URL) {
    envType.value = "dev";
  }
  else if (envConfig.value.VITE_API_BASE_URL === PROD_EnvConfig.VITE_API_BASE_URL) {
    envType.value = "prod";
  }
});
</script>

<template>
  <div class="env-config-form">
    <!-- 标题 -->
    <div class="form-header mb-4">
      <div class="mb-2 mt-4 text-lg font-500">
        环境配置
      </div>
      <p class="text-mini">
        配置应用的运行环境参数
      </p>
    </div>
    <!-- 配置表单 -->
    <el-form
      ref="formRef"
      :model="envConfig"
      :rules="rules"
      :size="size"
      label-position="top"
      class="form"
    >
      <!-- API配置 -->
      <div class="config-section mb-6">
        <el-form-item label="API基础URL" prop="VITE_API_BASE_URL">
          <el-input
            v-model="envConfig.VITE_API_BASE_URL"
            placeholder="http://localhost:9090/"
            clearable
          />
        </el-form-item>
        <el-form-item label="WebSocket URL" prop="VITE_API_WS_BASE_URL">
          <el-input
            v-model="envConfig.VITE_API_WS_BASE_URL"
            placeholder="ws://localhost:9091/"
            clearable
          />
        </el-form-item>
        <el-form-item label="环境类型">
          <el-segmented
            v-model="envType"
            :options="envOptions"
            size="default"
            class="min-w-fit w-80/100 sm:w-48/100"
          />
        </el-form-item>
      </div>
      <!-- 操作按钮 -->
      <div class="flex pt-4">
        <CommonElButton class="w-full tracking-0.1em" text bg :size="size" @click="resetConfig">
          恢复默认
        </CommonElButton>
        <CommonElButton class="w-full tracking-0.1em" type="primary" :size="size" @click="saveConfig">
          保存配置
        </CommonElButton>
      </div>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.form {
  display: block;
  overflow: hidden;
  animation-delay: 0.1s;

  :deep(.el-input__wrapper) {
    padding: 0.3em 1em;
  }

  :deep(.el-form-item) {
    padding: 0;

    .el-input-group__append {
      --at-apply: "text-theme-primary card-rounded-df op-80 transition-200 cursor-pointer overflow-hidden bg-color p-0 m-0 tracking-0.1em hover:(!text-theme-primary op-100)";
    }
    .code-btn {
      --at-apply: " h-full flex-row-c-c px-4 transition-200 ";
    }

    .el-form-item__error {
      margin-top: 0.2rem;
    }
  }
}

.submit {
  --at-apply: "h-2.6rem transition-200 w-full tracking-0.2em text-4 shadow font-500";
  :deep(.el-icon) {
    --at-apply: "text-5";
  }
}
</style>
