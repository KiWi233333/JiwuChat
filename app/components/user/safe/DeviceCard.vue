<script lang="ts">
import type { DeviceInfo } from "@/composables/api/user/safe";

export interface DeviceCardProps {
  data: DeviceInfo;
}
</script>

<script setup lang="ts">
const { data } = defineProps<DeviceCardProps>();

// 解析操作系统名称和版本
const osInfo = computed(() => {
  const os = data.operatingSystem || "";
  // 尝试提取版本号（如 "macOS 14.0" -> ["macOS", "14.0"]）
  const match = os.match(/^(\S+)\s+([\d.]+)$/);
  if (match) {
    return {
      name: match[1],
      version: match[2],
    };
  }
  return {
    name: os || "未知系统",
    version: "",
  };
});

// 解析浏览器名称和版本
const browserInfo = computed(() => {
  const browser = data.browser || "";
  // 尝试提取版本号（如 "Chrome 114.0" -> ["Chrome", "114.0"]）
  const match = browser.match(/^(\S+)\s+([\d.]+)$/);
  if (match) {
    return {
      name: match[1],
      version: match[2],
    };
  }
  // 如果没有版本号，尝试从 browserVersion 获取
  if (data.browserVersion?.version) {
    return {
      name: browser || "未知浏览器",
      version: data.browserVersion.version,
    };
  }
  return {
    name: browser || "未知浏览器",
    version: "",
  };
});

// 判断是否为内网 IP
const isInternalIP = computed(() => {
  const ip = data.ip || "";
  return (
    ip.startsWith("127.")
    || ip.startsWith("192.168.")
    || ip.startsWith("10.")
    || ip.startsWith("172.16.")
    || ip.startsWith("172.17.")
    || ip.startsWith("172.18.")
    || ip.startsWith("172.19.")
    || ip.startsWith("172.20.")
    || ip.startsWith("172.21.")
    || ip.startsWith("172.22.")
    || ip.startsWith("172.23.")
    || ip.startsWith("172.24.")
    || ip.startsWith("172.25.")
    || ip.startsWith("172.26.")
    || ip.startsWith("172.27.")
    || ip.startsWith("172.28.")
    || ip.startsWith("172.29.")
    || ip.startsWith("172.30.")
    || ip.startsWith("172.31.")
    || ip === "localhost"
    || ip === "::1"
  );
});

// 位置信息
const locationStr = computed(() => {
  const { country, province, city } = data.ipInfo || {};
  const parts = [];
  if (country && country !== "0")
    parts.push(country);
  if (province && province !== "0")
    parts.push(province);
  if (city && city !== "0")
    parts.push(city);
  if (parts.length > 0)
    return parts.join(" ");
  return isInternalIP.value ? "未知地区 (Local)" : "未知地区";
});

// @unocss-include
// 根据设备类型选取图标
const deviceIconName = computed(() => {
  // 规则说明可扩展，也可根据更多字段细化
  const agent = (data.userAgentString || "").toLowerCase();
  // 尽量兼容常见值
  // 优先 deviceType 再 fallback 操作系统
  if (
    agent.includes("ipad")
    || agent.includes("tablet")
  ) {
    return "i-carbon:tablet";
  }
  if (
    agent.includes("iphone") || agent.includes("ios")
    || agent.includes("android phone")
    || agent.includes("mobile") || agent.includes("phone")
  ) {
    return "i-carbon:mobile";
  }
  if (
    agent.includes("android")
    && !agent.includes("phone")
    && !agent.includes("mobile")
    && !agent.includes("tablet")
  ) {
    // 普通安卓设备 fallback
    return "i-carbon:tablet";
  }
  if (
    agent.includes("windows")
    || agent.includes("macos")
    || agent.includes("linux")
    || agent.includes("desktop")
    || agent.includes("pc")
  ) {
    return "i-carbon:laptop";
  }
  if (agent.includes("watch")) {
    return "i-carbon:watch";
  }
  // fallback: 再考虑操作系统字段
  const os = (data.operatingSystem || "").toLowerCase();
  if (os.includes("windows") || os.includes("macos") || os.includes("linux")) {
    return "i-carbon:laptop";
  }
  if (os.includes("android") || os.includes("ios")) {
    return "i-carbon:mobile";
  }

  // 最后默认
  return "i-carbon:devices";
});
</script>

<template>
  <div class="device-card">
    <!-- 装饰背景 -->
    <div class="deco-bg" />

    <!-- 顶部区域 -->
    <div class="device-header">
      <!-- 左侧图标，跟设备类型联动 -->
      <div class="device-icon">
        <i :class="`${deviceIconName} text-color`" />
      </div>

      <!-- 中间设备信息 -->
      <div class="device-info">
        <div class="os-info">
          <span class="os-name">{{ osInfo.name }}</span>
          <span v-if="osInfo.version" class="os-version">{{ osInfo.version }}</span>
        </div>
        <div class="browser-info">
          <span class="browser-name">{{ browserInfo.name }}</span>
          <span v-if="browserInfo.version" class="browser-version">{{ browserInfo.version }}</span>
        </div>
      </div>

      <!-- 右侧标签 -->
      <el-tag
        v-if="data.isLocal"
        class="local-tag"
        type="success"
        size="small"
        effect="dark"
      >
        本机
      </el-tag>
    </div>

    <!-- 底部区域 -->
    <div class="device-footer">
      <!-- 内网 IP 信息 -->
      <div class="info-item">
        <i class="i-carbon:earth text-small-color" />
        <span class="info-label">内网 IP:</span>
        <span class="ip-value">{{ data.ip || "未知" }}</span>
      </div>

      <!-- 地理位置信息 -->
      <div class="info-item">
        <i class="i-carbon:location text-small-color" />
        <span class="location-text">{{ locationStr }}</span>
      </div>
    </div>

    <!-- 操作按钮插槽 -->
    <div class="action-buttons">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.device-card {
  --at-apply: "relative overflow-hidden bg-color dark:bg-dark-7 rounded-xl p-0.75rem transition-shadow border-default-2 !border-op-08 hover:shadow-sm";

  .deco-bg {
    --at-apply: "absolute w-16 dark:op-50 op-20 h-16 top-0 right-0 z-1 pointer-events-none transition-transform duration-500 ease-out";
  }

  .device-header {
    --at-apply: "flex items-center gap-0.75rem mb-3 relative z-2";

    .device-icon {
      --at-apply: "flex-shrink-0 w-1.75rem h-1.75rem flex items-center justify-center bg-color-2 rounded-0.375rem text-1rem";
    }

    .device-info {
      --at-apply: "flex-1 min-w-0";

      .os-info {
        --at-apply: "flex items-baseline gap-0.25rem mb-0.25rem";

        .os-name {
          --at-apply: "text-color text-0.75rem font-600";
        }

        .os-version {
          --at-apply: "text-small-color text-0.6rem";
        }
      }

      .browser-info {
        --at-apply: "flex items-baseline gap-0.25rem";

        .browser-name {
          --at-apply: "text-small-color text-0.6rem";
        }

        .browser-version {
          --at-apply: "text-small-color text-0.6rem";
        }
      }
    }

    .local-tag {
      --at-apply: "flex-shrink-0";
    }
  }

  .divider {
    --at-apply: "border-default-b mb-0.75rem relative z-2";
  }

  .device-footer {
    --at-apply: "flex flex-col gap-0.5rem relative z-2 border-default-2-t pt-2";

    .info-item {
      --at-apply: "flex items-center gap-0.25rem text-0.6rem";

      i {
        --at-apply: "text-0.75rem flex-shrink-0";
      }

      .info-label {
        --at-apply: "text-small-color";
      }

      .ip-value {
        --at-apply: "text-color font-600 px-0.25rem py-0.03125rem bg-color-2 rounded-0.125rem";
      }

      .location-text {
        --at-apply: "text-small-color";
      }
    }
  }

  .action-buttons {
    --at-apply: "absolute bottom-0.5rem right-0.5rem opacity-0 transition-opacity duration-300 z-3";
  }

  &:hover {
    .action-buttons {
      --at-apply: "opacity-100";
    }
  }
}
</style>
