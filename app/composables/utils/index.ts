import { dayjs } from "element-plus";

export function useCheckXXSText(text: string): string {
  //  https://github.com/leizongmin/js-xss/blob/master/README.zh.md
  text = text
    .replace(/(<br[^>]*>| |\s*)/g, "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return text;
}
/**
 * 通过积分 计算等级
 * @param ponits 积分
 * @returns 等级
 */
export function getUserLeave(ponits: number = 0): number {
  let leave = 0;
  if (ponits > 0 && ponits < 3000)
    leave = 0;
  else if (ponits < 10000)
    leave = 1;
  else if (ponits < 20000)
    leave = 1;
  else if (ponits < 30000)
    leave = 3;
  else if (ponits < 40000)
    leave = 4;
  else if (ponits < 50000)
    leave = 5;
  else
    leave = 6;

  return leave;
}
/**
 * 根据所给日期获取当月的第一天和最后一天
 * @param date
 * @returns {Date[]} 日期
 */
export function getMonthStartEnd(date: Date = new Date()): Date[] {
  return [new Date(date.getFullYear(), date.getMonth(), 0), new Date(date.getFullYear(), date.getMonth() + 1, 0)];
};
/**
 * 获取开始时间
 * @param date
 * @returns {Date} 开始时间
 */
export function getDayStartEnd(date: Date = new Date()): Date[] {
  return [new Date(date.getFullYear(), date.getMonth(), date.getDay()), new Date(date.getFullYear(), date.getMonth(), date.getDay() + 1)];
};

/**
 * 复制文字
 * @param text 复制的文本
 */
export function useCopyText(text: string) {
  // 动态创建 textarea 标签
  const textarea: HTMLTextAreaElement = document.createElement("textarea");
  // 将该 textarea 设为 readonly 防止 iOS 下自动唤起键盘，同时将 textarea 移出可视区域
  textarea.readOnly = true;
  textarea.style.position = "absolute";
  textarea.style.opacity = "0";
  textarea.style.left = "-500px";
  // 将要 copy 的值赋给 textarea 标签的 value 属性
  textarea.value = text;
  // 将 textarea 插入到 body 中
  document.body.appendChild(textarea);
  // 选中值并复制
  textarea.select();
  const result = document.execCommand("Copy");
  document.body.removeChild(textarea);
  return result;
}
/**
 *
 * 复制文本（异步）
 * @param text 复制的文本
 * @returns promise
 */
export function useAsyncCopyText(text: string): Promise<boolean> {
  // 新语法
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    return Promise.resolve(true);
  }
  else {
    // 兼容移动端版本
    return new Promise((resolve, reject) => {
      if (useCopyText(text))
        return resolve(true);
      else
        return resolve(false);
    });
  }
}

/**
 * 比对对象生成(表层级)
 * @param oldObj
 * @param newObj
 * @returns {T} 差异对象
 */
export function compareObjects<T extends object>(oldObj: T, newObj: T) {
  const updatedObj = {};
  // 遍历newObj的属性
  for (const key in newObj) {
    // 检查newObj是否有该属性，并且其值与oldObj中的值不相等
    if (Object.prototype.hasOwnProperty.call(newObj, key) && newObj[key] !== oldObj[key])
      // @ts-expect-error
      updatedObj[key] = newObj[key]; // 将更改的参数添加到updatedObj中
  }
  return updatedObj as T;
}

export function deepCompareObj<T extends object>(oldObj: T, newObj: T): Partial<T> {
  const updatedObj: Partial<T> = {};

  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      const oldValue = oldObj[key];
      const newValue = newObj[key];

      if (typeof oldValue === "object" && typeof newValue === "object") {
        // @ts-expect-error
        const nestedUpdates = compareObjects(oldValue, newValue);
        if (Object.keys(nestedUpdates).length > 0)
          // @ts-expect-error
          updatedObj[key] = nestedUpdates;
      }
      else if (oldValue !== newValue) {
        updatedObj[key] = newValue;
      }
    }
  }

  return updatedObj;
}

/**
 * 拖拽移动Dom
 */
export function moveDom(target: HTMLDivElement, options: {
  startCallback?: () => void
  moveingCallback?: (x: number, y: number) => void
  endCalllback?: (x: number, y: number) => void
}) {
  const { startCallback, moveingCallback, endCalllback } = options;
  let startEvt: string, moveEvt: string, endEvt: string;
  // 判断是否支持触摸事件
  if ("ontouchstart" in window) {
    startEvt = "touchstart";
    moveEvt = "touchmove";
    endEvt = "touchend";
  }
  else {
    startEvt = "mousedown";
    moveEvt = "mousemove";
    endEvt = "mouseup";
  }
  // 获取元素
  target.style.position = "absolute";
  target.style.cursor = "move";
  // 标记是拖曳还是点击
  let isClick = true;
  let disX: number, disY: number, left: number, top: number, starX: number, starY: number;

  target.addEventListener(startEvt, (e: any) => {
    // 阻止页面的滚动，缩放
    e.preventDefault();
    // 兼容IE浏览器
    e = e || window.event;
    isClick = true;
    // 手指按下时的坐标
    starX = e.touches ? e.touches[0].clientX : e.clientX;
    starY = e.touches ? e.touches[0].clientY : e.clientY;
    // 手指相对于拖动元素左上角的位置
    disX = starX - target.offsetLeft;
    disY = starY - target.offsetTop;
    startCallback && startCallback();
    // 按下之后才监听后续事件
    document.addEventListener(moveEvt, moveFun);
    document.addEventListener(endEvt, endFun);
  });

  function moveFun(e: any) {
    // 兼容IE浏览器
    e = e || window.event;
    // 防止触摸不灵敏，拖动距离大于20像素就认为不是点击，小于20就认为是点击跳转
    if (
      Math.abs(starX - (e.touches ? e.touches[0].clientX : e.clientX)) > 20
      || Math.abs(starY - (e.touches ? e.touches[0].clientY : e.clientY)) > 20
    ) {
      isClick = false;
    }

    left = (e.touches ? e.touches[0].clientX : e.clientX) - disX;
    top = (e.touches ? e.touches[0].clientY : e.clientY) - disY;
    // 限制拖拽的X范围，不能拖出屏幕
    if (left < 0)
      left = 0;
    else if (left > document.documentElement.clientWidth - target.offsetWidth)
      left = document.documentElement.clientWidth - target.offsetWidth;

    // 限制拖拽的Y范围，不能拖出屏幕
    if (top < 0)
      top = 0;
    else if (top > document.documentElement.clientHeight - target.offsetHeight)
      top = document.documentElement.clientHeight - target.offsetHeight;
    moveingCallback && moveingCallback(left, top);

    target.style.left = `${left}px`;
    target.style.top = `${top}px`;
  }

  function endFun(e: any) {
    // 兼容IE浏览器
    e = e || window.event;
    // 防止触摸不灵敏，拖动距离大于20像素就认为不是点击，小于20就认为是点击跳转
    if (
      Math.abs(starX - (e.touches ? e.touches[0].clientX : e.clientX)) > 20
      || Math.abs(starY - (e.touches ? e.touches[0].clientY : e.clientY)) > 20
    ) {
      isClick = false;
    }

    left = (e.touches ? e.touches[0].clientX : e.clientX) - disX;
    top = (e.touches ? e.touches[0].clientY : e.clientY) - disY;
    // 限制拖拽的X范围，不能拖出屏幕
    if (left < 0)
      left = 0;
    else if (left > document.documentElement.clientWidth - target.offsetWidth)
      left = document.documentElement.clientWidth - target.offsetWidth;

    // 限制拖拽的Y范围，不能拖出屏幕
    if (top < 0)
      top = 0;
    else if (top > document.documentElement.clientHeight - target.offsetHeight)
      top = document.documentElement.clientHeight - target.offsetHeight;
    endCalllback && endCalllback(left, top);
    document.removeEventListener(moveEvt, moveFun);
    document.removeEventListener(endEvt, endFun);
  }
}

let cachedToday: Date | null = null;
// 格式化时间
export function formatFriendlyDate(date: Date | number | string): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  if (typeof date === "number") {
    date = new Date(date);
  }
  if (!(date instanceof Date)) {
    date = dayjs(date).toDate();
  }
  const now = new Date();
  if (!cachedToday || now.getDate() !== cachedToday.getDate()) {
    cachedToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((cachedToday.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  if (diff < 1) {
    return `今天 ${hours}:${minutes}`;
  }
  else if (diff === 1) {
    return `昨天 ${hours}:${minutes}`;
  }
  else if (diff === 2) {
    return `前天 ${hours}:${minutes}`;
  }
  else {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  }
}

/**
 * 格式化会话日期
 *
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export function formatContactDate(date: Date | number | string): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  if (typeof date === "number") {
    date = new Date(date);
  }
  if (!(date instanceof Date)) {
    date = dayjs(date).toDate();
  }
  const now = new Date();
  if (!cachedToday || now.getDate() !== cachedToday.getDate()) {
    cachedToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((cachedToday.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  if (diff < 1) {
    return `今天 ${hours}:${minutes}`;
  }
  else if (diff === 1) {
    return `昨天 ${hours}:${minutes}`;
  }
  else if (diff === 2) {
    return `前天 ${hours}:${minutes}`;
  }
  else {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
// 格式化版本更新日期
export function formatVersionDate(date: Date | string | number): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  if (typeof date === "number") {
    date = new Date(date);
  }
  if (!(date instanceof Date)) {
    date = dayjs(date).toDate();
  }

  const now = new Date();
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffInDays = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

  // 如果是未来日期
  if (diffInDays < 0) {
    const futureDays = Math.abs(diffInDays);
    if (futureDays === 1) {
      return "明天发布";
    }
    else if (futureDays <= 7) {
      return `${futureDays}天后发布`;
    }
    else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day} 发布`;
    }
  }

  // 历史版本日期
  if (diffInDays === 0) {
    return "今天";
  }
  else if (diffInDays === 1) {
    return "昨天";
  }
  else if (diffInDays <= 7) {
    return `${diffInDays}天前`;
  }
  else if (diffInDays <= 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? "1周前" : `${weeks}周前`;
  }
  else if (diffInDays <= 365) {
    const months = Math.floor(diffInDays / 30);
    return months === 1 ? "1个月前" : `${months}个月前`;
  }
  else {
    const years = Math.floor(diffInDays / 365);
    return years === 1 ? "1年前" : `${years}年前`;
  }
}


const supportFetch = typeof window !== "undefined" && "fetch" in window;

/**
 * 获取图片的 Blob 对象
 * @param imgUrl 图片 URL
 * @returns Blob 对象
 */
export async function getImgBlob(imgUrl: string): Promise<Blob | null> {
  try {
    if (supportFetch) {
      // 使用 fetch 请求图片资源
      const response = await fetch(imgUrl);
      // 检查响应是否成功
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      // 将响应转换为 Blob 对象
      const blob = await response.blob();
      // 返回 Blob 对象
      return blob;
    }
    else {
      // 不支持 fetch 时，使用 XMLHttpRequest 作为回退方案
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", imgUrl, true);
        xhr.responseType = "blob";

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          }
          else {
            reject(new Error(`Failed to fetch image: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error while fetching image"));
        };

        xhr.send();
      }); ;
    }
  }
  catch (error) {
    console.error("Error converting image to Blob:", error);
    return null;
  }
}


/**
 * 将图片转换为 PNG 格式
 * @param imgBlob 图片的 Blob 对象
 * @param quality 图片质量（0-1，1 为最高质量）
 * @returns 转换后的 PNG 格式的 Blob 对象，如果失败则返回 null
 */
export async function convertImgToPng(
  imgBlob: Blob,
  quality: number = 0.8, // 默认质量（0.8 足够满足大多数需求）
  maxWidthOrHeight: number = 2048, // 最大宽度或高度（防止生成过大的图片）
): Promise<Blob | null> {
  try {
    // 检查输入是否为有效的 Blob 对象
    if (!(imgBlob instanceof Blob)) {
      console.error("Invalid input: Expected a Blob object");
      return null;
    }
    const img = await createImageBitmap(imgBlob);
    const max = maxWidthOrHeight;
    let newWidth = img.width;
    let newHeight = img.height;
    // 如果原始图片的宽或高超过 max，按比例缩小
    if (img.width > img.height && img.width > max) {
      newWidth = max;
      newHeight = (img.height / img.width) * max;
    }
    else if (img.height > img.width && img.height > max) {
      newHeight = max;
      newWidth = (img.width / img.height) * max;
    }
    // 创建 Canvas 并绘制图片
    const canvas = document.createElement("canvas");
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context");
      return null;
    }

    // 绘制时设置图像质量和抗锯齿（如果需要更高质量可以保留）
    ctx.imageSmoothingEnabled = true; // 保持高质量抗锯齿
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // 调用 toBlob，并指定 quality 参数以进一步压缩文件大小
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          }
          else {
            console.error("Failed to convert canvas to Blob");
            resolve(null);
          }
          canvas.remove(); // 释放 canvas 节点
        },
        "image/png", // 指定输出格式为 PNG
        Math.min(1, Math.max(0, quality)), // 确保 quality 在 0-1 范围内
      );
    });
  }
  catch (error) {
    console.error("Error converting image to PNG:", error);
    return null;
  }
}
export function computedImgScaleSize(
  originalWidth: number,
  originalHeight: number,
  options: ImageScaleOptions,
): { width: number; height: number } {
  const { maxWidth, maxHeight } = options;

  // 如果没有指定最大宽度或最大高度，则直接返回原始尺寸
  if (!maxWidth && !maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  // 计算宽度和高度的缩放比例
  const widthScale = maxWidth ? maxWidth / originalWidth : 1;
  const heightScale = maxHeight ? maxHeight / originalHeight : 1;
  // 选择最小的缩放比例，以确保图像不会超出限制
  const scale = Math.min(widthScale, heightScale);
  // 根据缩放比例计算新的宽度和高度
  const newWidth = originalWidth * scale;
  const newHeight = originalHeight * scale;

  return {
    width: newWidth,
    height: newHeight,
  };
}
export interface ImageScaleOptions {
  maxWidth?: number; // 最大宽度
  maxHeight?: number; // 最大高度
};


// 计算年龄的函数
export function calculateAge(birthday?: string) {
  if (!birthday) {
    return "未知";
  }
  return `${dayjs().diff(dayjs(birthday), "years")}岁`;
}

// 计算星座的函数
export function computeConstellation(birthday?: number | string | Date | null) {
  if (!birthday) {
    return "未知";
  }
  const date = dayjs(birthday);
  const month = date.month() + 1;
  const day = date.date();
  const constellationArr = [
    "摩羯座",
    "水瓶座",
    "双鱼座",
    "白羊座",
    "金牛座",
    "双子座",
    "巨蟹座",
    "狮子座",
    "处女座",
    "天秤座",
    "天蝎座",
    "射手座",
  ];
  const constellation = constellationArr[(month * 10 + day) % 12];
  return constellation;
}

// 计算生日还有多少天的函数
export function calculateBirthdayCount(birthday?: number | string | Date | null) {
  if (!birthday) {
    return undefined;
  }
  const today = dayjs(); // 当前日期
  const birthDay = dayjs(birthday); // 生日日期
  const thisYearBirthday = birthDay.set("year", today.year());
  let nextBirthday = thisYearBirthday;
  if (today.isAfter(thisYearBirthday)) {
    nextBirthday = birthDay.set("year", today.year() + 1);
  }
  return nextBirthday.diff(today, "day");
}


export function useDateFadeAnimation(initVal: boolean = true) {
  const isAnimated = ref(initVal);
  onActivated(() => {
    isAnimated.value = false;
  });
  return isAnimated;
}
