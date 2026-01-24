
<script lang="ts" setup>
import { SettingAppearance, SettingAudioDevice, SettingFunction, SettingNotification, SettingShortcuts, SettingStorage, SettingSystem, SettingTools } from "#components";

const setting = useSettingStore();
const route = useRoute();
const type = computed(() => route.params.type as string);

const size = computed<"small" | "default" | "large">(() => {
  const fontSize = setting.settingPage?.fontSize?.value || 16;
  if (fontSize < 16) {
    return "small";
  }
  else if (fontSize >= 16 && fontSize <= 20) {
    return "default";
  }
  else {
    return "large";
  }
});

const settingComponents = {
  "appearance": SettingAppearance,
  "audio-device": SettingAudioDevice,
  "function": SettingFunction,
  "notification": SettingNotification,
  "shortcut": SettingShortcuts,
  "storage": SettingStorage,
  "system": SettingSystem,
  "tools": SettingTools,
};

const currentComponent = computed(() => settingComponents[type.value as keyof typeof settingComponents] as Component);
</script>

<template>
  <component :is="currentComponent" :size="size" />
</template>
