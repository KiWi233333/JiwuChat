/**
 * 消息相关常量定义
 */

// 消息撤回超时时间 (5分钟)
export const RECALL_TIME_OUT = 300000;

// 支持复制的图片类型
export const COPY_IMAGE_TYPES = ["image/png", "image/jpg", "image/svg+xml"];

// Token 优先级
export const MENTION_PRIORITY = 1; // @提及优先级高于链接
export const URL_PRIORITY = 2; // URL链接优先级

// 默认图片尺寸配置
export const DEFAULT_IMG_SIZE_OPTIONS = {
  maxWidth: 280,
  maxHeight: 280,
  minWidth: 40,
  minHeight: 40,
};

// 最小尺寸阈值倍数
export const MIN_SIZE_THRESHOLD = 2;

// 最大放大倍数
export const MAX_SCALE_RATIO = 4;
