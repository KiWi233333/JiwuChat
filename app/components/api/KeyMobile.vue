<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import type {
  ApiKeyCreateDTO,
  ApiKeyPageParams,
  ApiKeyUpdateDTO,
  ApiKeyVO,
} from "@/composables/api/sys/api-key";
import { ElMessage, ElMessageBox } from "element-plus";
import { MdPreview } from "md-editor-v3";

import { nextTick, reactive, ref } from "vue";
import {
  ApiKeyStatus,
  createApiKey,
  deleteApiKey,
  getApiKeyPage,
  toggleApiKeyStatus,
  updateApiKey,
} from "@/composables/api/sys/api-key";
import { useWatchComposition } from "@/composables/hooks/useWatchComposition";

const user = useUserStore();

// 响应式数据
const loading = ref(false);
const tableData = ref<ApiKeyVO[]>([]);
const searchFormRef = ref<FormInstance>();
const dialogFormRef = ref<FormInstance>();

// 搜索表单
const searchForm = reactive<ApiKeyPageParams>({
  keyName: "",
  status: undefined,
  pageNum: 1,
  pageSize: 10,
});

// 分页信息
const pagination = reactive({
  current: 1,
  size: 10,
  total: 0,
});

// 对话框相关
const dialogVisible = ref(false);
const dialogLoading = ref(false);
const dialogMode = ref<"add" | "edit">("add");
const dialogForm = reactive<ApiKeyCreateDTO & { id?: string }>({
  keyName: "",
  expireTime: "",
  remark: "",
});
const expireType = computed({
  get: () => {
    return dialogForm.expireTime ? "expire" : "never";
  },
  set: (value: "never" | "expire") => {
    dialogForm.expireTime = value === "expire" ? new Date().toISOString() : "";
  },
});

// 新建密钥结果对话框
const keyResultDialogVisible = ref(false);
const newApiKey = ref("");

// 表单验证规则
const dialogRules: FormRules = {
  keyName: [
    { required: true, message: "请输入Key名称", trigger: "blur" },
    { max: 100, message: "Key名称不能超过100个字符", trigger: "blur" },
  ],
};

const apiKeyStatusOptions = [
  { label: "全部", value: undefined },
  { label: "启用", value: ApiKeyStatus.ENABLE },
  { label: "停用", value: ApiKeyStatus.DISABLE },
];

// 获取状态标签类型
function getStatusType(status: ApiKeyStatus) {
  switch (status) {
    case ApiKeyStatus.ENABLE:
      return "bg-theme-info";
    case ApiKeyStatus.DISABLE:
      return "bg-gray-2 dark:bg-color-5";
    default:
      return "bg-gray-5";
  }
}

// 获取头像首字母
function getAvatarLetter(keyName: string) {
  return keyName?.charAt(0)?.toUpperCase() || "?";
}

// 获取头像背景色
function getAvatarBgColor(keyName: string) {
  const colors = [
    "bg-blue-400",
    "bg-orange-400",
    "bg-green-400",
    "bg-purple-400",
    "bg-pink-400",
    "bg-indigo-400",
  ];
  const index = (keyName?.charCodeAt(0) || 0) % colors.length;
  return colors[index];
}

// 重置对话框表单
function resetDialogForm() {
  Object.assign(dialogForm, {
    id: "",
    keyName: "",
    expireTime: "",
    remark: "",
  });
  nextTick(() => {
    dialogFormRef.value?.clearValidate();
  });
}

// 是否没有更多数据
const noMore = computed(() => {
  if (pagination.total === 0) {
    return false;
  }
  return tableData.value.length >= pagination.total;
});

// 加载数据
async function loadData(isLoadMore = false) {
  try {
    loading.value = true;
    const params = {
      ...searchForm,
      pageNum: pagination.current,
      pageSize: pagination.size,
    };
    // 补充token
    const token = user.token;
    const result = await getApiKeyPage(params, token);
    if (result.data) {
      if (isLoadMore) {
        // 追加数据
        tableData.value.push(...result.data.records);
      }
      else {
        // 替换数据
        tableData.value = result.data.records;
      }
      pagination.total = result.data.total;
    }
  }
  finally {
    loading.value = false;
  }
}

// 加载更多
function handleLoadMore() {
  if (loading.value || noMore.value) {
    return;
  }
  pagination.current += 1;
  loadData(true);
}

// 搜索
function handleSearch() {
  nextTick(() => {
    pagination.current = 1;
    tableData.value = [];
    loadData(false);
  });
}

// 重置搜索
function handleReset() {
  searchFormRef.value?.resetFields();
  Object.assign(searchForm, {
    keyName: "",
    status: undefined,
    pageNum: 1,
    pageSize: 10,
  });
  pagination.current = 1;
  tableData.value = [];
  loadData(false);
}

// 下拉刷新
async function handleRefresh() {
  pagination.current = 1;
  tableData.value = [];
  await loadData(false);
}

const searchRef = useTemplateRef<HTMLInputElement>("searchRef");
const { isComposing } = useWatchComposition(searchRef);
function handleSearchKeyName(e: KeyboardEvent | Event) {
  if (e instanceof KeyboardEvent) {
    if (isComposing.value) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }
}

// MCP 相关配置
const mcpAppDialogVisible = ref(false);
const mcpDetail = computed(() => `\`\`\`json
{
  "mcpServers": {
    "jiwu-chat-mcp": {
      "type": "streamable_http",
      "url": "${import.meta.env.VITE_MCP_API_BASE_URL || "https://mcp.jiwuchat.top/api/mcp"}",
      "headers": {
        "Authorization": "<你的 API Key>",
      }
    }
  }
}
\`\`\``);

const { base64 } = useBase64(JSON.stringify({
  mcpServers: {
    "JiwuChat MCP": {
      name: "JiwuChat MCP",
      type: "streamableHttp",
      baseUrl: import.meta.env.VITE_MCP_API_BASE_URL || "https://mcp.jiwuchat.top/api/mcp",
      headers: {
        Authorization: "<你的 API Key>",
      },
      isActive: true,
      longRunning: false,
    },
  },
}));
const cherryStudioMCPDeepLink = computed(() => `cherrystudio://mcp/install?servers=${base64.value.replace("data:text/plain;base64,", "")}`);
const cursorMCPDeepLink = computed(() => "cursor://anysphere.cursor-deeplink/mcp/install?name=JiwuChat%20MCP&config=eyJ0eXBlIjoiaHR0cCIsInVybCI6Imh0dHBzOi8vbWNwLmppd3VjaGF0LnRvcC9hcGkvbWNwIiwiaGVhZGVycyI6eyJBdXRob3JpemF0aW9uIjoiPOS9oOeahCBBUEkgS2V5PiJ9fQ%3D%3D");
// 打开
function handleOpen(url: string, e: Event) {
  useOpenUrl(url);
}
// 获取MCP应用
function handleGetMcpApp() {
  // 打开弹窗
  mcpAppDialogVisible.value = true;
}

// 添加Key
function handleAddKey() {
  dialogMode.value = "add";
  dialogVisible.value = true;
  resetDialogForm();
}

// 编辑Key
function handleEdit(row: ApiKeyVO) {
  dialogMode.value = "edit";
  dialogVisible.value = true;
  Object.assign(dialogForm, {
    id: row.id,
    keyName: row.keyName,
    expireTime: row.expireTime || "",
    remark: row.remark || "",
  });
}

// 对话框关闭
function handleDialogClose() {
  resetDialogForm();
}

// 对话框确认
async function handleDialogConfirm() {
  dialogFormRef.value?.validate(async (action) => {
    if (action) {
      try {
        dialogLoading.value = true;
        const token = user.token;
        if (dialogMode.value === "add") {
          const result = await createApiKey(dialogForm as ApiKeyCreateDTO, token);
          if (result.code !== StatusCode.SUCCESS) {
            return;
          }
          if (result.data?.apiKeyRaw) {
            newApiKey.value = result.data.apiKeyRaw;
            keyResultDialogVisible.value = true;
          }
          ElMessage.success("API Key创建成功");
        }
        else {
          await updateApiKey(dialogForm as ApiKeyUpdateDTO, token);
          ElMessage.success("API Key更新成功");
        }

        dialogVisible.value = false;
        loadData();
      }
      catch (error) {
      }
      finally {
        dialogLoading.value = false;
      }
    }
  });
}


// 复制Key
async function copyKey(key: string, msg = "API Key已复制到剪贴板！") {
  const success = await copyText(key);
  if (success) {
    ElMessage.success(msg);
  }
}

// 复制新创建的API Key
async function copyApiKey() {
  if (newApiKey.value) {
    await copyKey(newApiKey.value, "API Key已复制到剪贴板！");
  }
  keyResultDialogVisible.value = false;
}

// 滑动切换逻辑，不能超过边界，到两边停止
function handleSwipeNext() {
  const currentIndex = apiKeyStatusOptions.findIndex(option => option.value === searchForm.status);
  if (currentIndex < apiKeyStatusOptions.length - 1) {
    searchForm.status = apiKeyStatusOptions[currentIndex + 1]?.value;
    handleSearch();
  }
}

function handleSwipePrev() {
  const currentIndex = apiKeyStatusOptions.findIndex(option => option.value === searchForm.status);
  if (currentIndex > 0) {
    searchForm.status = apiKeyStatusOptions[currentIndex - 1]?.value;
    handleSearch();
  }
}

// 命令处理
async function handleCommand(command: string, row: ApiKeyVO) {
  const token = user.token;
  if (command.startsWith("toggle-")) {
    const statusStr = command.split("-")[1];
    if (statusStr) {
      const status = Number.parseInt(statusStr);
      try {
        await toggleApiKeyStatus(row.id, status, token);
        ElMessage.success("状态更新成功");
        loadData();
      }
      catch (error) {
      }
    }
  }
  else if (command === "delete") {
    try {
      await ElMessageBox.confirm(
        `确定要删除该 API Key 吗？`,
        "确认删除",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        },
      );
      await deleteApiKey(row.id, token);
      ElMessage.success("删除成功");
      loadData();
    }
    catch (error) {
    }
  }
}

// 暴露方法给父组件
defineExpose({
  loadData,
});

// 初始化
onMounted(() => {
  loadData();
});
onActivated(() => {
  loadData();
});
</script>

<template>
  <div class="min-w-0 w-full flex flex-1 flex-col bg-color-3 px-4">
    <!-- 页面头部 -->
    <CommonPageHeader
      title="API Key"
      description="管理你的开放接口密钥"
      class="mb-4 mt-6"
    >
      <template #actions>
        <!-- GitHub图标 -->
        <el-tooltip content="安装 Cherry Studio MCP 应用" placement="top">
          <a data-fade class="flex-row-c-c" :href="cherryStudioMCPDeepLink" rel="noreferrer" @click.stop="handleOpen(cherryStudioMCPDeepLink, $event)">
            <ElAvatar
              size="small" class="shadow"
              src="data:image/png;base64,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"
            />
          </a>
        </el-tooltip>
        <!-- 添加按钮 -->
        <i class="i-solar:add-circle-bold block h-7 w-7 cursor-pointer hover:op-80" @click="handleAddKey" />
      </template>
    </CommonPageHeader>

    <!-- 标签页 -->
    <div class="mb-4 flex-row-c-c gap-8">
      <el-segmented
        v-model="searchForm.status"
        class="segmented shadown-none w-full"
        :options="apiKeyStatusOptions"
        @change="handleSearch"
      />

      <!-- 搜索框 -->
      <el-input
        ref="searchRef"
        v-model="searchForm.keyName"
        placeholder="搜索 Key 名称..."
        clearable
        autocomplete="off"
        class="search w-full"
        @keydown="handleSearchKeyName"
      >
        <template #prefix>
          <i class="i-solar:magnifer-linear" />
        </template>
      </el-input>
    </div>

    <!-- API Key 列表 -->
    <el-scrollbar
      v-swipe="{
        sensitivity: 2,
        onlyHorizontal: true,
        onSwipeLeft: handleSwipeNext,
        onSwipeRight: handleSwipePrev,
      }"
      height="calc(100vh - 16.75rem)"
      class="flex flex-1 flex-col pb-4"
    >
      <CommonListAutoIncre
        :no-more="noMore"
        :loading="loading"
        :immediate="false"
        :enable-pull-to-refresh="true"
        :on-refresh="handleRefresh"
        class="flex flex-1 flex-col gap-3"
        loading-class="op-0"
        @load="handleLoadMore"
      >
        <template #default>
          <div data-fades class="flex flex-col gap-4">
            <div
              v-for="item in tableData"
              :key="item.id"
              v-ripple="{ color: 'rgba(var(--el-color-primary-rgb), 0.025)' }"
              class="border border-default-2 rounded-lg bg-color p-4"
            >
              <div class="mb-3 flex items-center gap-3">
                <div class="min-w-0 flex flex-1 items-center gap-2">
                  <div class="truncate text-sm text-color font-500">
                    {{ item.keyName }}
                  </div>
                  <div class="text-color-3 truncate text-xs">
                    创建于 {{ item.createTime?.split(' ')[0] || '-' }}
                  </div>
                </div>
                <!-- 状态 -->
                <div class="flex shrink-0 items-center gap-1">
                  <span class="dot h-2 w-2 rounded-full" :class="getStatusType(item.status)" />
                  <span class="text-color-3 text-xs">{{ item.statusDesc }}</span>
                </div>
              </div>

              <!-- API Key 显示 -->
              <div class="mb-3 border border-default bg-color-2 p-2 rounded">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-color-3 flex-1 truncate text-xs font-mono">{{ item.apiKeyMasked }}</span>
                  <el-button
                    size="small"
                    text
                    class="flex-shrink-0"
                    @click="copyKey(item.apiKeyMasked || '', 'Key已复制')"
                  >
                    <i class="i-solar:copy-bold-duotone mr-1" />
                    复制
                  </el-button>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="flex items-center justify-end gap-2">
                <el-button
                  size="small"
                  text
                  bg
                  @click="handleEdit(item)"
                >
                  <i class="i-solar:edit-bold-duotone mr-1" />
                  编辑
                </el-button>
                <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, item)">
                  <el-button
                    size="small"
                    text
                    bg
                  >
                    <i class="i-solar:menu-dots-bold" />
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        :command="`toggle-${item.status === ApiKeyStatus.ENABLE ? ApiKeyStatus.DISABLE : ApiKeyStatus.ENABLE}`"
                      >
                        {{ item.status === ApiKeyStatus.ENABLE ? '停用' : '启用' }}
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="!loading && tableData.length === 0" key="empty" class="flex flex-col items-center justify-center py-12 op-50">
              <i class="text-color-3 i-solar:key-line-duotone mb-2 text-4xl" />
              <p class="text-color-3 text-sm">
                暂无数据
              </p>
            </div>
          </div>
        </template>
      </CommonListAutoIncre>
    </el-scrollbar>

    <!-- 添加/编辑对话框 -->
    <CommonPopup
      v-model="dialogVisible"
      :duration="300"
      destroy-on-close
      :z-index="1000"
      :overlayer-attrs="{
        class: 'transition-all',
      }"
      content-class="rounded-3 p-4 shadow-lg w-full sm:max-w-400px border-default-2 dialog-bg-color"
      @close="handleDialogClose"
    >
      <template #title>
        <div class="flex-row-c-c">
          <span class="ml-2">{{ dialogMode === 'add' ? '创建 API Key' : '编辑 API Key' }}</span>
        </div>
      </template>
      <el-form
        ref="dialogFormRef"
        class="api-key-dialog"
        :model="dialogForm"
        :rules="dialogRules"
        label-position="top"
      >
        <el-form-item key="keyName" class="mt-4" label="Key名称" prop="keyName">
          <el-input
            v-model="dialogForm.keyName"
            placeholder="请输入Key名称"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item key="expireType" label="有效期">
          <el-segmented
            v-model="expireType"
            :options="[
              { label: '永不过期', value: 'never' },
              { label: '到期有效', value: 'expire' },
            ]"
          />
        </el-form-item>
        <el-form-item
          class="overflow-hidden transition-(all duration-200)"
          :class="{
            'max-h-0 op-0': expireType === 'never',
            'max-h-20 op-100': expireType === 'expire',
          }"
          :style="{
            marginBottom: expireType === 'expire' ? '18px' : '0',
          }"
          label="过期时间"
        >
          <el-date-picker
            v-model="dialogForm.expireTime"
            type="date"
            placeholder="选择过期时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD 23:59:59"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item key="remark" label="备注">
          <el-input
            v-model="dialogForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入备注信息"
            maxlength="500"
            resize="none"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button class="flex-1" @click="dialogVisible = false">
            取消
          </el-button>
          <el-button class="flex-1" type="primary" :loading="dialogLoading" @click="handleDialogConfirm">
            确定
          </el-button>
        </div>
      </template>
    </CommonPopup>

    <!-- MCP应用对话框 -->
    <CommonPopup
      v-model="mcpAppDialogVisible"
      title="MCP应用"
      content-class="rounded-3 p-4 shadow-lg w-full sm:max-w-400px border-default-2 dialog-bg-color"
      width="fit-content"
    >
      <div class="w-full">
        <MdPreview
          language="zh-CN"
          style="font-size: 0.8rem;background-color: transparent;"
          :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
          :code-foldable="false"
          code-theme="github"
          class="mcp-app-markdown bg-color"
          :model-value="mcpDetail"
        />
      </div>
    </CommonPopup>

    <!-- 新密钥展示对话框 -->
    <CommonPopup
      v-model="keyResultDialogVisible"
      title="创建 API key"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      width="fit-content"
      content-class="rounded-3 p-4 shadow-lg w-full sm:max-w-400px border-default-2 dialog-bg-color"
    >
      <div class="w-full space-y-4">
        <!-- 警告信息 -->
        <div class="bg-color p-2 text-sm text-color leading-relaxed rounded">
          请将此 API key 保存在安全且易于访问的地方。出于<br>
          安全原因，你将无法通过 API keys 管理界面再次查<br>
          看它。如果你丢失了这个 key，将需要重新创建。
        </div>

        <!-- API Key 显示区域 -->
        <div class="relative">
          <div class="border border-default rounded-lg bg-color-2 p-3">
            <div class="min-h-4 select-all break-all text-sm text-color font-mono">
              <BtnCopyText :text="newApiKey " icon="i-solar:copy-bold-duotone" />
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-2">
          <el-button
            size="default"
            text
            bg
            class="flex-1"
            @click="keyResultDialogVisible = false"
          >
            关闭
          </el-button>
          <el-button
            bg
            type="primary"
            size="default"
            class="flex-1"
            @click="copyApiKey"
          >
            复制
          </el-button>
        </div>
      </div>
    </CommonPopup>
  </div>
</template>

<style scoped lang="scss">
:deep(.search.el-input) {
  .el-input__wrapper {
    --at-apply: "border-default-2 bg-color py-0 text-xs";
    box-shadow: none;
  }
}

:deep(.api-key-dialog) {
  .el-form {
    .el-form-item {
      margin-bottom: 0;
    }
  }
}

:deep(.segmented.el-segmented) {
  --at-apply: "p-1";

  .el-segmented__item {
    --at-apply: "flex items-center";
  }
}
.mcp-app-markdown {
  background-color: transparent !important;
  :deep(.md-editor-code) {
    margin: 0 !important;
  }
}
.api-key-mobile-enter-active,
.api-key-mobile-leave-active {
  transition: all 0.2s $animate-cubic;
  overflow: hidden;
}
.api-key-mobile-enter-from,
.api-key-mobile-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

