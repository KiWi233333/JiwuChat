export interface ImgSizeOptions {
  maxWidth: number;
  maxHeight: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * 获取图片尺寸
 * @param {number} rawWidth - 原始宽度
 * @param {number} rawWeight - 原始高度
 * @returns {object} 图片尺寸对象
 */
export function getImgSize(rawWidth?: number, rawWeight?: number, options: ImgSizeOptions = { maxWidth: 280, maxHeight: 280, minWidth: 40, minHeight: 40 }) {
  const width = rawWidth || 0;
  const height = rawWeight || 0;
  const { maxWidth = 300, maxHeight = 300, minWidth = 40, minHeight = 40 } = options;

  // 提前返回默认值
  if (!width || !height) {
    return {
      width: "",
      height: "",
    };
  }

  const ratio = width / height;
  const maxRatio = maxWidth / maxHeight;

  // 检查是否接近最小值（阈值设为最小值的1.5倍）
  const minThreshold = 2;
  const isNearMinWidth = width <= minWidth * minThreshold;
  const isNearMinHeight = height <= minHeight * minThreshold;

  let finalWidth: number;
  let finalHeight: number;

  // 如果原始宽高都接近最小值，进行整体放大
  if (isNearMinWidth && isNearMinHeight) {
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY, 4); // 限制最大放大倍数为4倍

    finalWidth = width * scale;
    finalHeight = height * scale;
  }
  else {
    // 原有的缩放逻辑
    if (ratio > maxRatio) {
      // 宽度优先
      finalWidth = Math.min(width, maxWidth);
      finalHeight = finalWidth / ratio;
    }
    else {
      // 高度优先
      finalHeight = Math.min(height, maxHeight);
      finalWidth = finalHeight * ratio;
    }
  }

  return {
    width: `${Math.max(finalWidth, minWidth)}px`,
    height: `${Math.max(finalHeight, minHeight)}px`,
  };
}
