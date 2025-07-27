<script lang="ts" setup>
interface Props {
  menuList?: MenuItem[]
}
interface MenuItem {
  label: string
  icon?: string
  component?: any // 添加自定义组件支持
  componentProps?: Record<string, any> // 自定义组件的 props
  hidden?: boolean | ComputedRef<boolean>
  customClass?: string
  customIconClass?: string
  attrs?: Record<string, any>
  divider?: boolean
  dividerClass?: string
  onClick?: () => any
}
const {
  menuList,
} = defineProps<Props>();
const list = computed(() => menuList?.filter(p => p.hidden !== true));
</script>

<template>
  <el-popover
    width="fit-content"
    popper-class="!border-default-2 !border-op-15"
    popper-style="padding:0;min-width: 0;"
    transition="popper-fade"
    :teleported="true"
    append-to-body
    v-bind="$attrs"
  >
    <template #reference>
      <slot name="reference" />
    </template>
    <slot name="default" :data="menuList">
      <div class="menu-list">
        <template
          v-for="(p, i) in list" :key="i"
        >
          <!-- 自定义组件渲染 -->
          <component
            :is="p.component"
            v-if="p.component"
            v-bind="{ ...p.componentProps, ...p.attrs }"
            @click="p.onClick"
          />
          <!-- 默认菜单项渲染 -->
          <div
            v-else
            class="menu-item"
            v-bind="p.attrs"
            @click="p.onClick"
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
    --at-apply: "flex items-center pl-1.5em pr-1.65em py-2.5 tracking-0.1em text-1em sm:(py-1.5 pl-1em pr-1.2em text-sm)  cursor-pointer hover:(bg-color-3 op-80) transition-150 card-rounded-df";
    .icon {
      --at-apply: "h-5 w-5 sm:(h-4.5 w-4.5)";
    }
  }
}
</style>
