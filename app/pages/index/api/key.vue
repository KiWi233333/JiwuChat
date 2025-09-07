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
const setting = useSettingStore();
const size = computed(() => setting.isMobileSize ? "small" : "default");
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

// 加载数据
async function loadData() {
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
      tableData.value = result.data.records;
      pagination.total = result.data.total;
    }
  }
  finally {
    loading.value = false;
  }
}

// 搜索
function handleSearch() {
  nextTick(() => {
    pagination.current = 1;
    loadData();
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
  loadData();
}

// 分页变化
function handleSizeChange(size: number) {
  pagination.size = size;
  pagination.current = 1;
  loadData();
}

function handleCurrentChange(current: number) {
  pagination.current = current;
  loadData();
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

const mcpAppDialogVisible = ref(false);
const mcpDetail = computed(() => `\`\`\`json
{
    "JiwuChatMCP": {
      "name": "JiwuChat MCP",
      "type": "streamableHttp",
      "description": "",
      "isActive": true,
      "longRunning": false,
      "baseUrl": "${import.meta.env.VITE_MCP_API_BASE_URL || "https://mcp.jiwuchat.com/api/mcp"}",
      "headers": {
        "Authorization": "<你的API Key>"
      }
    }
  }
}
\`\`\``);
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


// 复制新创建的Key
async function copyKey(key: string, msg = "API Key已复制到剪贴板！") {
  try {
    useCopyText(key);
    ElMessage.success(msg);
  }
  catch (error) {
  }
}

// 复制新创建的API Key
async function copyApiKey() {
  if (newApiKey.value) {
    await copyKey(newApiKey.value, "API Key已复制到剪贴板！");
  }
  keyResultDialogVisible.value = false;
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


// 初始化
onActivated(() => {
  loadData();
});
</script>

<template>
  <div class="min-w-0 w-full flex flex-1 flex-col card-bg-color-2 px-4 sm:px-6">
    <!-- 页面头部 -->
    <div class="mb-4 mt-12 flex select-none items-end">
      <div>
        <h2 class="text-xl text-color font-500">
          API Key
        </h2>
        <p class="mt-1 text-mini">
          管理你的开放 API 密钥
        </p>
      </div>
      <!-- 获取mcp应用 -->
      <el-button bg class="ml-a" :size="size" @click="handleGetMcpApp">
        MCP 应用
      </el-button>
      <!-- 添加 -->
      <el-button type="primary" :size="size" @click="handleAddKey">
        创建 API key
      </el-button>
    </div>
    <div class="flex items-center pb-4">
      <!-- 搜索表单 -->
      <el-input
        ref="searchRef"
        v-model="searchForm.keyName"
        :size="size"
        placeholder="搜索 Key 名称"
        clearable
        autocomplete="off"
        class="search mr-2 w-10em sm:w-14rem"
        @keydown="handleSearchKeyName"
      />
      <el-segmented v-model="searchForm.status" :size="size" class="segmented !bg-color" :options="apiKeyStatusOptions" @change="handleSearch" />
      <el-button style="padding: 0 0.8em 0 0.6em;" :icon="ElIconSearch" type="info" plain :size="size" class="ml-a" @click="handleSearch">
        搜索
      </el-button>
      <el-button v-show="searchForm.keyName !== '' || searchForm.status !== undefined" :size="size" @click="handleReset">
        重置
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="min-w-0 w-full flex flex-1 flex-col">
      <div class="overflow-hidden border-default card-rounded-df bg-color-3">
        <el-table
          v-loading="loading"
          :data="tableData"
          :border="false"
          max-height="100%"
          header-cell-class-name="!font-400 !bg-color"
          class="w-full"
          empty-text="暂无数据"
        >
          <el-table-column prop="keyName" label="Key名称" min-width="110" />
          <el-table-column prop="apiKeyMasked" label="Key" min-width="110" show-overflow-tooltip>
            <!-- <template #default="scope"> -->
            <!-- <BtnCopyText :text="scope.row.apiKeyMasked" icon="i-solar:copy-bold-duotone" /> -->
            <!-- </template> -->
          </el-table-column>
          <el-table-column prop="status" align="center" label="状态" width="80">
            <template #default="scope">
              <div class="flex-row-c-c gap-2">
                <span class="dot h-2 w-2 rounded-full" :class="getStatusType(scope.row.status)" />
                <span>{{ scope.row.statusDesc }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" show-overflow-tooltip />
          <el-table-column prop="expireTime" label="过期时间" width="180">
            <template #default="scope">
              {{ scope.row.expireTime || '永不过期' }}
            </template>
          </el-table-column>
          <el-table-column prop="lastUsedTime" label="最近使用" width="180" />
          <el-table-column prop="createTime" label="创建时间" width="180" />
          <el-table-column align="center" label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button
                size="small"
                :icon="ElIconEdit"
                class="mr-2 btn-info-border overflow-hidden border-default-3 card-rounded-df bg-color"
                @click="handleEdit(scope.row)"
              />
              <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, scope.row)">
                <el-button
                  class="mr-2 btn-primary-border overflow-hidden border-default-3 card-rounded-df bg-color"
                  size="small" :icon="ElIconMore"
                />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      :command="`toggle-${scope.row.status === ApiKeyStatus.ENABLE ? ApiKeyStatus.DISABLE : ApiKeyStatus.ENABLE}`"
                    >
                      {{ scope.row.status === ApiKeyStatus.ENABLE ? '停用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="mt-a flex shrink-0 justify-end py-4">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          background
          size="small"
          layout="total, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 添加/编辑对话框，使用 dialog-popup 组件 -->
    <dialog-popup
      v-model="dialogVisible"
      :duration="300"
      destroy-on-close
      :z-index="1000"
      :overlayer-attrs="{
        class: 'transition-all',
      }"
      content-class="rounded-3 p-4 shadow-lg w-fit border-default-2 dialog-bg-color"
      @close="handleDialogClose"
    >
      <template #title>
        <div class="flex-row-c-c">
          <span class="ml-2">{{ dialogMode === 'add' ? '创建 API Key' : '编辑 API Key' }}</span>
        </div>
      </template>
      <el-form
        ref="dialogFormRef"
        class="api-key-dialog max-w-90vw w-360px"
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
        <div class="flex justify-end">
          <el-button class="mr-4 w-5rem" @click="dialogVisible = false">
            取消
          </el-button>
          <el-button class="w-5rem" type="primary" :loading="dialogLoading" @click="handleDialogConfirm">
            确定
          </el-button>
        </div>
      </template>
    </dialog-popup>

    <!-- MCP应用对话框 -->
    <dialog-popup
      v-model="mcpAppDialogVisible"
      title="MCP应用"
      content-class="rounded-3 p-4 shadow-lg w-fit border-default-2 dialog-bg-color"
      width="fit-content"
    >
      <div class="max-w-90vw w-400px">
        <MdPreview
          language="zh-CN"
          style="font-size: 0.8rem;background-color: transparent;"
          :theme="$colorMode.value === 'dark' ? 'dark' : 'light'"
          :code-foldable="false"
          code-theme="a11y"
          class="mcp-app-markdown bg-color"
          :model-value="mcpDetail"
        />
      </div>
    </dialog-popup>

    <!-- 新密钥展示对话框 -->
    <DialogPopup
      v-model="keyResultDialogVisible"
      title="创建 API key"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      width="fit-content"
      content-class="rounded-3 p-4 shadow-lg w-fit border-default-2 dialog-bg-color"
    >
      <div class="max-w-90vw w-fit space-y-4">
        <!-- 警告信息 -->
        <div class="text-sm text-color leading-relaxed">
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
        <div class="flex justify-end pt-2 space-x-3">
          <el-button
            size="default"
            text
            bg
            @click="keyResultDialogVisible = false"
          >
            关闭
          </el-button>
          <el-button
            bg
            type="primary"
            size="default"
            @click="copyApiKey"
          >
            复制
          </el-button>
        </div>
      </div>
    </DialogPopup>
  </div>
</template>

<style scoped lang="scss">
:deep(.search.el-input) {
  .el-input__wrapper {
    --at-apply: "border-default-hover py-0 text-xs";
    box-shadow: none;
  }
}

:deep(.el-table) {
  // 清除所有border
  .el-table__body-wrapper {
    border: none;
  }
  .el-table__header-wrapper {
    border: none;
  }

  .el-table__body {
    tbody {
      .el-table__row {
        &:last-child {
          td {
            border: 0 !important;
          }
        }
      }
    }
  }
}
:deep(.api-key-dialog) {
  .el-form {
    .el-form-item {
      margin-bottom: 0;
    }
  }
}
</style>

<style lang="scss">
.mcp-app-markdown {
  background-color: transparent !important;
  .md-editor-code {
    margin: 0 !important;
  }
}
</style>
