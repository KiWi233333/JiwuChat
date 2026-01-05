<script setup lang="ts">
import emojiData from "@/assets/emoji.json";
import { useOssFileUpload } from "@/composables/hooks/oss/useOssFileUpload";
import { buildEmojiGroups, genCdnUrl, genEmojiUrl } from "@/composables/utils/emoji";

const props = withDefaults(defineProps<{
  modelValue?: string;
  modelValueMode?: "image" | "raw";
  size?: "small" | "default" | "large";
  enableSearch?: boolean;
  enableCategoryTitle?: boolean;
}>(), {
  modelValue: "",
  modelValueMode: "image",
  size: "default",
  enableSearch: true,
  enableCategoryTitle: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "uploadStateChange": [uploading: boolean];
}>();

// @unocss-include
const CATEGORY_ICON_MAP: Record<string, string> = {
  "Smileys & People": "i-ri-emotion-happy-line",
  "Animals & Nature": "i-ri-bear-smile-line",
  "Food & Drink": "i-ri-restaurant-line",
  "Travel & Places": "i-ri-map-pin-line",
  "Activities": "i-ri-football-line",
  "Objects": "i-ri-lightbulb-line",
  "Symbols": "i-ri-asterisk",
  "Flags": "i-ri-flag-line",
};

interface EmojiItem {
  id: string;
  name: string;
  emoji: string;
  keywords: string[];
}

interface EmojiGroup {
  category: string;
  emojis: EmojiItem[];
}

const vModel = computed({
  get: () => props.modelValue,
  set: (val: string) => emit("update:modelValue", val),
});

const allEmojiGroups = ref<EmojiGroup[]>([]);
const emojiGroups = ref<EmojiGroup[]>([]);
const categoryList = ref<string[]>([]);
const currentCategory = ref("");
const isLoading = ref(false);
const searchText = ref("");
const underlineStyle = ref<Record<string, string> | null>(null);
const isScrolling = ref(false);

const tabRefs = ref<HTMLElement[]>([]);
const categoryRefs = ref<Record<string, HTMLElement>>({});
const scrollContainerRef = useTemplateRef<HTMLElement>("scrollContainerRef");

const { uploadFile } = useOssFileUpload();

/**
 * 更新下划线位置
 */
function updateUnderline() {
  const idx = categoryList.value.indexOf(currentCategory.value);
  if (tabRefs.value[idx]) {
    const el = tabRefs.value[idx];
    const { offsetLeft, offsetWidth } = el;
    // 使用 CSS 变量而不是硬编码颜色
    underlineStyle.value = {
      left: `${offsetLeft}px`,
      width: `${offsetWidth}px`,
      height: "2px",
      bottom: "0px",
      position: "absolute",
      background: "var(--el-text-color-primary)",
      borderRadius: "0.25rem",
      transition: "left 0.25s cubic-bezier(.4,0,.2,1), width 0.25s cubic-bezier(.4,0,.2,1)",
    };
  }
}

function scrollToCategory(category: string) {
  currentCategory.value = category;
  isScrolling.value = true;

  nextTick(() => {
    const el = categoryRefs.value[category];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isScrolling.value = false;
      }, 500);
    }
  });
}

/**
 * 处理搜索输入
 */
function handleSearchInput() {
  if (!searchText.value) {
    emojiGroups.value = allEmojiGroups.value;
    return;
  }
  const keyword = searchText.value.toLowerCase();
  emojiGroups.value = allEmojiGroups.value
    .map((group) => {
      const filtered = group.emojis.filter(
        item =>
          (item.name && item.name.toLowerCase().includes(keyword))
          || (item.keywords && item.keywords.some(k => k.toLowerCase().includes(keyword))),
      );
      return { ...group, emojis: filtered };
    })
    .filter(group => group.emojis.length > 0);
}

/**
 * 处理点击表情
 */
async function handleClick(item: EmojiItem) {
  if (isLoading.value)
    return;
  isLoading.value = true;
  emit("uploadStateChange", true);
  try {
    if (props.modelValueMode === "raw") {
      vModel.value = item.emoji;
    }
    else if (props.modelValueMode === "image") {
      const emojiUrlObject = genEmojiUrl(item.emoji, "anim");
      if (!emojiUrlObject)
        return;
      const emojiUrl = genCdnUrl(emojiUrlObject);
      const response = await fetch(emojiUrl);
      const blob = await response.blob();
      const file = new File([blob], `${item.emoji}.png`, { type: "image/png" });
      const ossFile = shallowReactive({
        id: URL.createObjectURL(file),
        key: "",
        status: "" as "" | "success" | "warning" | "exception",
        percent: 0,
        file,
      });
      const res = await uploadFile(ossFile);
      if (res.success && res.file?.key) {
        vModel.value = res.file.key;
      }
    }
  }
  finally {
    isLoading.value = false;
    emit("uploadStateChange", false);
  }
}

/**
 * 设置分类引用
 */
function setCategoryRef(category: string, el: HTMLElement | null) {
  if (el) {
    categoryRefs.value[category] = el;
  }
}

/**
 * 监听当前分类变化
 */
watch(currentCategory, () => {
  nextTick(updateUnderline);
});

useResizeObserver(tabRefs, updateUnderline);

useIntersectionObserver(
  () => Object.values(categoryRefs.value),
  (entries) => {
    if (isScrolling.value)
      return;
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const category = entry.target.getAttribute("data-category");
        if (category && category !== currentCategory.value) {
          currentCategory.value = category;
          break;
        }
      }
    }
  },
  {
  },
);

onMounted(() => {
  const groups = buildEmojiGroups(emojiData as any);
  emojiGroups.value = groups;
  allEmojiGroups.value = groups;
  categoryList.value = groups.map(g => g.category);
  currentCategory.value = categoryList.value[0] || "";
  updateUnderline();
});
</script>

<template>
  <div class="emoji-avatar-box h-full flex flex-col">
    <div class="relative w-full flex justify-between">
      <span
        v-for="(cat, index) in categoryList"
        :key="cat"
        :ref="(el) => { if (el) tabRefs[index] = el as HTMLElement }"
        class="relative flex cursor-pointer items-center justify-center p-1 text-xl text-small-color transition-200"
        :class="{ 'text-dark dark:text-light font-bold': cat === currentCategory }"
        @click="scrollToCategory(cat)"
      >
        <i class="text-lg" :class="[CATEGORY_ICON_MAP[cat]]" />
      </span>
      <div v-if="underlineStyle" class="pointer-events-none z-2" :style="underlineStyle" />
    </div>

    <!-- 搜索 -->
    <div v-if="enableSearch" class="mt-2.5 w-full">
      <el-input
        v-model="searchText"
        type="text"
        placeholder="搜索表情"
        :size="size"
        class="input-weak"
        clearable
        @input="handleSearchInput"
      />
    </div>

    <el-scrollbar v-if="emojiGroups.length" ref="scrollContainerRef" class="emoji-list-group h-0 flex-1">
      <div
        v-for="group in emojiGroups"
        :key="group.category"
        :ref="(el) => setCategoryRef(group.category, el as HTMLElement)"
        :data-category="group.category"
      >
        <div v-if="group.emojis.length && enableCategoryTitle" class="category-title sticky top-0 z-1 bg-color py-2 text-xs text-color font-bold">
          {{ group.category }}
        </div>
        <div class="category-list grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
          <div
            v-for="item in group.emojis"
            :key="item.id"
            class="box-border h-9 w-9 flex cursor-pointer items-center justify-center rounded-lg p-2 text-2xl hover:(bg-color-2 filter-brightness-150)"
            @click="handleClick(item)"
          >
            {{ item.emoji }}
          </div>
        </div>
      </div>
    </el-scrollbar>

    <div v-else data-fades class="flex flex-1 flex-col items-center justify-center text-small-color">
      <i class="i-ri-emotion-sad-line text-4xl" />
      <p class="text-sm text-small-color">
        暂无表情
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-empty) {
  --el-empty-padding: 10px;
}
// 隐藏滚动条
:deep(.el-scrollbar__bar) {
  opacity: 0.2;
  z-index: 0;
}
</style>
