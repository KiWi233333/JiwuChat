<script lang="ts" setup>
import type { ExtendItem } from "@/composables/tauri/extension";
import { useOpenExtendWind } from "@/composables/tauri/extension";

/**
 * 扩展菜单弹窗W
 */
const props = defineProps<{
  show: boolean | undefined | null
}>();
const emit = defineEmits<{
  (e: "update:show", value: boolean | undefined | null): void
  (e: "submit", value: ChatMessageDTO): void
}>();
const isShow = computed({
  get: () => props.show !== undefined && props.show === true,
  set: value => emit("update:show", value),
});
const setting = useSettingStore();
const {
  open,
} = useOpenExtendWind();
  // 扩展菜单列表 (已全部更换为 remix icon)
const extendMenuAllList = ref<ExtendItem[]>([
  {
    url: "/extend/shop",
    title: "极物圈商城",
    icon: "i-ri:shopping-bag-3-line group-hover:(i-ri:shopping-bag-3-fill bg-[#5d33f6] transition-200 p-3)",
    activeIcon: "i-ri:shopping-bag-3-fill",
    loading: false,
    saveTime: undefined,
    disabled: false,
  },
  {
    url: "/extend/readjoy",
    title: "悦读时光",
    icon: "i-ri:book-3-line group-hover:(i-ri:book-3-fill transition-200 p-3 color-[#2f7efd])",
    activeIcon: "i-ri:book-3-fill",
    loading: false,
    saveTime: undefined,
    disabled: false,
  },
  {
    url: "/extend/blog",
    title: "博客",
    icon: "i-ri:article-line p-2.6 group-hover:(i-ri:article-fill transition-200 p-3 color-[#add7da])",
    activeIcon: "i-ri:article-fill",
    loading: false,
    saveTime: undefined,
    disabled: false,
  },
  {
    url: "/extend/doc",
    title: "极物文档",
    icon: "i-ri:file-list-3-line",
    activeIcon: "i-ri:file-list-3-fill",
    loading: false,
    saveTime: undefined,
    disabled: true,
  },
  // 其他
  {
    title: "建设中",
    icon: "i-ri:settings-3-line",
    saveTime: undefined,
    disabled: true,
  },
]);

// 暂存的扩展菜单
const extendMenuSaveList = ref<ExtendItem[]>([]);
const filterMenuList = computed(() => extendMenuAllList.value.filter(item => !extendMenuSaveList.value.includes(item)));

// 添加
function onAdd(item: ExtendItem) {
  if (extendMenuSaveList.value.findIndex(menu => menu.title === item.title) !== -1) {
    return;
  }
  item.saveTime = Date.now();
  extendMenuSaveList.value.push(item);
}
// 移除
function onRemove(item: ExtendItem) {
  const index = extendMenuSaveList.value.findIndex(menu => menu.title === item.title);
  if (index > -1) {
    extendMenuSaveList.value[index]!.saveTime = undefined;
    extendMenuSaveList.value.splice(index, 1);
  }
}

// 加载扩展菜单
onMounted(() => {
  extendMenuSaveList.value = setting.selectExtendMenuList.map(item => extendMenuAllList.value.find(menu => menu.title === item.title)).filter(item => item).map(item => ({ ...item, loading: false })) as ExtendItem[];
});
// 保存菜单设置
function saveMenu(list: ExtendItem[]) {
  setting.selectExtendMenuList = JSON.parse(JSON.stringify(list.sort((a, b) => (a.saveTime || 0) - (b.saveTime || 0)))).map((item: ExtendItem) => ({ ...item, loading: false }));
  isShow.value = false;
}
// @unocss-include
// 菜单列表动画
// const el = useTemplateRef("listRef");
function createItem() {
  ElMessage.warning("功能暂未开放");
  // ElMessageBox.prompt("",{
  //   title: "添加私人扩展",
  //   inputType: "text",
  //   inputPlaceholder: "请输入扩展名称",
  //   inputValue: "",
  //   confirmButtonText: "确定",
  //   cancelButtonText: "取消",
  //   inputValidator: (value: string) => {
  //     if (value.trim() === "") {
  //       return "请输入扩展名称";
  //     }
  //     if (extendMenuSaveList.value.findIndex(menu => menu.title === value.trim()) !== -1) {
  //       return "扩展名称已存在";
  //     }
  //     return true;
  //   },
  //   callback: (value: string) => {
  //     if (value) {
  //       const item: ExtendItem = {
  //         url: "",
  //         title: value.trim(),
  //         icon: "",
  //         activeIcon: "",
  //         loading: false,
  //         saveTime: undefined,
  //         disabled: false,
  //       };
  //       onAdd(item);
  //     }
  //   },
  // });
}
</script>

<template>
  <CommonPopup
    v-model="isShow"
    :duration="200"
    :min-scale="0.98"
    content-class="w-full rounded-3 p-4 sm:w-420px border-default-2 !bg-color-2"
  >
    <template #title>
      <h3 :data-tauri-drag-region="setting.isDesktop" mb-1 flex-row-c-c text-center font-500>
        <i i-ri-apps-2-ai-line mr-2 p-2.5 text-small />
        扩展菜单
      </h3>
    </template>
    <!-- 合并后的菜单 -->
    <CommonListTransitionGroup
      tag="div"
      name="pop-list"
      class="auto-fill-grid mb-4 mt-1 min-h-14em select-none items-start gap-3 sm:gap-4"
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(6em, 1fr)); justify-content: space-between;"
    >
      <!-- 固定菜单标题 -->
      <small v-if="extendMenuSaveList.length" key="fix-title" class="col-span-full block text-mini">
        固定菜单
      </small>
      <template v-for="item in extendMenuSaveList" :key="item.title">
        <div
          v-loading="item.loading"
          :element-loading-spinner="defaultLoadingIcon"
          element-loading-custom-class="text-.5em"
          class="group item"
          :title="item.title"
          :class="{
            'not-link': item.disabled,
            [`${item.class || ''}`]: item.class,
          }"
          @click.capture="!item.disabled && open(item)"
        >
          <i
            class="mx-a block h-6 w-6"
            :class="item.icon"
          />
          <div
            class="absolute right-1 top-1 transition-200 hover:bg-color-2 group-hover:(op-100) sm:op-0 !rounded-xs"
            @click.stop.prevent="onRemove(item)"
          >
            <i class="i-carbon:subtract p-2 p-2.2" />
          </div>
          <div
            class="mx-a mt-2 text-center text-xs"
          >
            {{ item.title }}
          </div>
        </div>
      </template>
      <!-- 其他菜单标题 -->
      <small key="pop-title" class="col-span-full block text-mini">
        已折叠菜单
      </small>
      <!-- 其他菜单项 -->
      <template v-for="item in filterMenuList" :key="item.title">
        <div
          v-loading="item.loading"
          :element-loading-spinner="defaultLoadingIcon"
          element-loading-custom-class="text-.5em"
          class="group item"
          :title="item.title"
          :class="{
            'not-link': item.disabled,
            [`${item.class || ''}`]: item.class,
          }"
          @click.stop="!item.disabled && open(item)"
        >
          <i
            class="mx-a block h-6 w-6" :class="item.icon"
            @click.stop="!item.disabled && open(item)"
          />
          <div
            v-if="!item.disabled && !setting.isMobileSize"
            class="add !rounded-xs"
            @click.stop="onAdd(item)"
          >
            <i class="i-carbon:add p-2 p-2.2" />
          </div>
          <div
            class="mx-a mt-2 text-center text-xs"
          >
            {{ item.title }}
          </div>
        </div>
      </template>
      <div
        key="add-item"
        class="group relative aspect-square w-full flex-row-c-c flex-col cursor-pointer border-default-hover bg-color text-center rounded hover:shadow"
        title="添加私人扩展"
        @click.stop="createItem()"
      >
        <i
          class="i-carbon:add mx-a block h-6 w-6"
        />
        <div
          class="mx-a mt-2 text-center text-xs"
        >
          自定义
        </div>
      </div>
    </CommonListTransitionGroup>
    <template #footer>
      <div class="flex justify-center pb-2 sm:justify-end">
        <!-- 是否新开窗口（系统配置，仅桌面端有意义） -->
        <el-checkbox
          v-if="!setting.isMobileSize"
          v-model="setting.extendOpenInNewWindow"
          class="mr-2"
          :size="setting.isMobileSize ? 'large' : 'small'"
        >
          新开窗口
        </el-checkbox>
        <el-button
          class="ml-a w-1/2 sm:w-fit"
          :size="setting.isMobileSize ? 'large' : 'small'"
          @click="isShow = false"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          class="w-1/2 sm:w-fit"
          :size="setting.isMobileSize ? 'large' : 'small'"
          @click="saveMenu(extendMenuSaveList)"
        >
          确定
        </el-button>
      </div>
      <div class="mt-2 text-center text-mini" data-fade style="--start: 0.3s;">
        此为预览功能，正式上线前将调整。
      </div>
    </template>
  </CommonPopup>
</template>

  <style lang="scss" scoped>
  /* 新增拖拽样式 */
.ghost {
  --at-apply: "op-50 bg-color-3";
}
.chosen {
  --at-apply: "cursor-grabbing";
}
.drag {
  --at-apply: "shadow-lg transform scale-105 z-10";
}

.text-input {
  :deep(.el-textarea__inner) {
    resize: none;
    box-shadow: none !important;
    background-color: transparent;
    caret-color: var(--el-color-primary);
  }
}
.item {
  --at-apply: "relative aspect-square w-full flex-row-c-c flex-col cursor-pointer card-rounded-df text-center transition-shadow bg-color hover:shadow-sm";
}
.add {
  --at-apply: "absolute right-1 top-1 hidden op-0 sm:block btn-primary-bg group-hover:(op-100)";
}
.not-link {
  &,
  &:hover {
    --at-apply: "!border-color-transparent cursor-not-allowed dark:op-60 shadow-none";
  }
}
</style>

