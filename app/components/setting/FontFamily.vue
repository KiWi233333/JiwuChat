<script lang="ts" setup>
const setting = useSettingStore();

// 创建临时变量用于滑块实时显示
const fontSize = computed({
  get() {
    return setting.settingPage.fontSize.value;
  },
  set(value) {
    setting.settingPage.fontSize.value = value;
  },
});
</script>

<template>
  <!-- 字体 -->
  <div class="group h-8 flex-row-bt-c">
    字体设置
    <el-select
      v-model="setting.settingPage.fontFamily.value"
      :teleported="false"
      placement="bottom"
      :show-arrow="false"
      v-bind="$attrs"
      class="inputs"
      fit-input-width
      allow-create
      filterable
      placeholder="选择系统字体"
    >
      <el-option
        v-for="item in setting.settingPage.fontFamily.list"
        :key="item.value"
        :value="item.value"
        :label="item.name"
      >
        {{ item.name }}
      </el-option>
    </el-select>
  </div>
  <!-- 字体大小 -->
  <div class="group h-8 flex-row-bt-c">
    字体大小
    <el-slider
      v-model="fontSize"
      :min="10"
      title="双击重置"
      :max="24"
      :step="1"
      v-bind="$attrs"
      class="inputs px-1"
      @dblclick.stop="fontSize = 16"
    />
  </div>
</template>


<style scoped lang="scss">
:deep(.inputs.el-select) {
  position: relative;
  z-index: 99;
  width: fit-content;

  .el-select__wrapper {
    border-radius: 2rem;
    background-color: transparent;
    box-shadow: none;
    font-size: 0.8rem;
    --at-apply: "!border-default";
  }

  .el-select-dropdown__list {
    padding: 0.4rem;
  }
  .el-popper.el-select__popper {
    border-radius: 0.5rem;
    overflow: hidden;
  }
  .el-input__inner {
    padding-left: 2rem;
  }
  .el-select-dropdown__item {
    border-radius: 0.25rem;
  }
}
</style>
