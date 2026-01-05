<script lang="ts" setup>
import type { ComputedRef } from "vue";
import { computed, useAttrs } from "vue";

interface Props {
  menuList?: MenuItem[];
}
interface MenuItem {
  label: string;
  icon?: string;
  component?: any; // 添加自定义组件支持
  componentProps?: Record<string, any>; // 自定义组件的 props
  hidden?: boolean | ComputedRef<boolean>;
  customClass?: string;
  customIconClass?: string;
  attrs?: Record<string, any>;
  divider?: boolean;
  dividerClass?: string;
  onClick?: () => any;
}

const { menuList } = defineProps<Props>();

// 使用 defineModel 处理 visible 的双向绑定
const visibleModel = defineModel<boolean>("visible", { default: false });

// 获取 attrs，排除 visible 和 onUpdate:visible 以避免冲突
const attrs = useAttrs();
const filteredAttrs = computed(() => {
  // 排除 visible 属性和 onUpdateVisible 事件处理器，避免与 defineModel 冲突
  const { visible, onUpdateVisible, ...rest } = attrs;
  return rest;
});

const list = computed(() => menuList?.filter(p => p.hidden !== true));

// 点击菜单项，无论自定义组件还是默认项都支持关闭
function handleMenuItemClick(p: MenuItem) {
  if (typeof p.onClick === "function") {
    p.onClick();
  }
  visibleModel.value = false;
}

// 处理 visible 更新
function handleVisibleUpdate(value: boolean) {
  visibleModel.value = value;
}
</script>

<template>
  <el-popover
    v-bind="filteredAttrs"
    :visible="attrs.trigger === 'click' ? visibleModel : undefined"
    width="fit-content"
    popper-class="!border-default-2 !border-op-15"
    popper-style="padding:0;min-width: 0;"
    transition="popper-fade"
    :teleported="true"
    append-to-body
    @update:visible="handleVisibleUpdate"
  >
    <template #reference>
      <span class="select-none">
        <slot name="reference" />
      </span>
    </template>
    <slot name="default" :data="menuList">
      <div class="menu-list">
        <template
          v-for="(p, i) in list" :key="i"
        >
          <!-- 自定义组件渲染：需代理点击 -->
          <component
            :is="p.component"
            v-if="p.component"
            v-bind="{ ...p.componentProps, ...p.attrs }"
            @click="() => handleMenuItemClick(p)"
          />
          <!-- 默认菜单项渲染 -->
          <div
            v-else
            class="menu-item"
            v-bind="p.attrs"
            @click="() => handleMenuItemClick(p)"
          >
            <div
              v-if="p.icon && (p.icon as string)?.startsWith?.('i-')"
              :title="p.label"
              class="icon mr-2"
              :class="{
                [`${p.icon}`]: p.icon,
                [`${p.customClass}`]: p.customClass,
              }"
            />
            <CardElImage
              v-else-if="p.icon"
              class="icon mr-2"
              :class="p.customIconClass"
              :src="p.icon"
              :alt="p.label || 'X'"
            />
            <span truncate text-sm>{{ p.label }}</span>
          </div>
          <!-- 分割线 -->
          <div v-if="p.divider" :class="p.dividerClass" class="mx-a w-9/10 border-default-2-b" />
        </template>
      </div>
    </slot>
  </el-popover>
</template>

<style lang="scss" scoped>
.menu-list {
  --at-apply: "p-1.5 sm:p-1";

  .menu-item {
    --at-apply: "flex items-center pl-4 pr-6 py-2.5 tracking-0.1em text-1em sm:(py-1.5 pl-1em pr-1.2em text-sm)  cursor-pointer hover:(bg-color-3 op-80) transition-150 card-rounded-df";
    .icon {
      --at-apply: "h-5 w-5 sm:(h-4.5 w-4.5)";
    }
  }
}
</style>
