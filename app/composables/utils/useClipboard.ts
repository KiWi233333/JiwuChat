/**
 * 统一剪贴板工具
 *
 * 桌面端（Tauri）走原生 clipboard-manager 插件，Web 端走 navigator.clipboard + execCommand 回退。
 * 所有函数 try/catch 保护，失败返回 false / "" / null。
 */

import { readText as readTextFromClipboard, writeImage as writeImageToClipboard, writeText as writeTextToClipboard } from "@tauri-apps/plugin-clipboard-manager";
import { useSettingStore } from "@/composables/store/useSettingStore";

/** 剪贴板读取结果 */
export interface ClipboardReadResult {
  type: "text" | "image";
  text?: string;
  blob?: Blob;
}

function isEnableClipboardPlugin() {
  const setting = useSettingStore();
  // 桌面端 Tauri 插件只在非 Windows 系统上可用
  return (setting.isDesktop && setting.osType !== "windows") || setting.isMobile;
}

/**
 * 写入文本到剪贴板
 * @param text 要写入的文本
 * @returns 是否成功
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (isEnableClipboardPlugin()) {
      await writeTextToClipboard(text);
      return true;
    }
    // Web 端
    return await webWriteText(text);
  }
  catch (err) {
    console.warn("[clipboard] writeText failed:", err);
    // 桌面端 Tauri 失败时回退到 Web 方式
    try {
      return await webWriteText(text);
    }
    catch {
      return false;
    }
  }
}

/**
 * 读取剪贴板文本
 * @returns 文本内容，失败返回空字符串
 */
export async function readText(): Promise<string> {
  try {
    if (isEnableClipboardPlugin()) {
      return await readTextFromClipboard();
    }
    // Web 端
    if (navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
    return "";
  }
  catch (err) {
    console.warn("[clipboard] readText failed:", err);
    return "";
  }
}

/**
 * 写入图片到剪贴板
 * @param image 图片 Blob（需为 image/png 格式，非 png 请先转换）
 * @returns 是否成功
 */
export async function writeImage(image: Blob | null): Promise<boolean> {
  if (!image) {
    return false;
  }
  try {
    if (isEnableClipboardPlugin()) {
      const buffer = new Uint8Array(await image.arrayBuffer());
      await writeImageToClipboard(buffer);
      return true;
    }
    // Web 端 / 移动端：使用 ClipboardItem
    if (navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ [image.type]: image }),
      ]);
      return true;
    }
    return false;
  }
  catch (err) {
    console.warn("[clipboard] writeImage failed:", err);
    return false;
  }
}

/**
 * 读取剪贴板内容（图片优先，否则文本）
 * @returns 读取结果，失败返回 null
 */
export async function clipboardRead(): Promise<ClipboardReadResult | null> {
  try {
    // 桌面端仅做文本读取（图片粘贴由 @paste 事件处理）
    if (isEnableClipboardPlugin()) {
      const text = await readTextFromClipboard();
      if (text) {
        return { type: "text", text };
      }
      return null;
    }

    // Web 端：尝试 read() 获取图片
    if (navigator.clipboard?.read) {
      const clipboardData = await navigator.clipboard.read();
      for (const item of clipboardData) {
        const imageType = item.types.find(type => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          return { type: "image", blob };
        }
      }
      // 无图片，尝试读取文本
      for (const item of clipboardData) {
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          const text = await blob.text();
          if (text) {
            return { type: "text", text };
          }
        }
      }
    }

    // 回退：仅读文本
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text) {
        return { type: "text", text };
      }
    }

    return null;
  }
  catch (err) {
    console.warn("[clipboard] read failed:", err);
    // 降级：仅读文本
    try {
      const text = await readText();
      if (text) {
        return { type: "text", text };
      }
    }
    catch {
      // ignore
    }
    return null;
  }
}

/**
 * Web 端写入文本（navigator.clipboard + execCommand 回退）
 */
async function webWriteText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // execCommand 回退
  return execCommandCopy(text);
}

/**
 * execCommand("Copy") 回退方案
 */
function execCommandCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.readOnly = true;
  textarea.style.position = "absolute";
  textarea.style.opacity = "0";
  textarea.style.left = "-9999px";
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  const result = document.execCommand("Copy");
  document.body.removeChild(textarea);
  return result;
}
