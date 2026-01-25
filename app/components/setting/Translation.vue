<script lang="ts" setup>
const setting = useSettingStore();
</script>

<template>
  <div class="group h-8 flex-row-bt-c">
    翻译厂商
    <el-select
      id="translation-tool"
      v-model="setting.settingPage.translation.value"
      :teleported="false"
      placement="bottom"
      :show-arrow="false"
      class="inputs !w-10rem !sm:w-12rem"
      v-bind="$attrs"
      fit-input-width
      :filterable="!setting.isMobileSize"
      default-first-option
      placeholder="请选择翻译厂商！"
    >
      <el-option
        v-for="tool in setting.settingPage.translation.list"
        :key="tool.value"
        :value="tool.value"
        :label="tool.label"
      >
        {{ tool.label }}
      </el-option>
    </el-select>
  </div>
  <div class="group h-8 flex-row-bt-c">
    翻译目标语言
    <el-select
      v-bind="$attrs"
      id="translation-target-lang"
      v-model="setting.settingPage.translation.targetLang"
      :teleported="false"
      placement="bottom"
      :show-arrow="false"
      class="inputs !w-10rem !sm:w-12rem"
      fit-input-width
      :filterable="!setting.isMobileSize"
      default-first-option
      placeholder="请选择翻译目标语言"
    >
      <el-option
        v-for="lang in translationLangList"
        :key="lang.label"
        :value="lang.value"
        :label="lang.label"
      >
        {{ lang.label }}（{{ lang.value }}）
      </el-option>
    </el-select>
  </div>
  <div class="group h-8 flex-row-bt-c">
    流式翻译
    <el-switch
      v-model="setting.settingPage.translation.stream"
      :active-value="true"
      :inactive-value="false"
      :inactive-color="false"
      :active-color="false"
      class="inputs"
      v-bind="$attrs"
    />
  </div>
</template>

<style scoped lang="scss">
:deep(.inputs.el-select) {
  position: relative;
  width: fit-content;

  .el-select__wrapper {
    border-radius: 2rem;
    background-color: transparent;
    box-shadow: none;
    font-size: 0.8rem;
    --at-apply: "!border-default";
  }
}
</style>
