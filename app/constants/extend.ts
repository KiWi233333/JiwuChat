/**
 * 扩展页配置：/extend/[type] 动态路由使用
 * 与 Extension.vue 菜单中的 url 保持一致（/extend/shop | readjoy | blog）
 */
/** 扩展路由前缀，桌面端中间件与窗口逻辑共用 */
export const EXTEND_ROUTE_PREFIX = "/extend";

export const EXTEND_PAGE_TYPES = ["shop", "readjoy", "blog"] as const;
export type ExtendPageType = (typeof EXTEND_PAGE_TYPES)[number];

export interface ExtendPageWindowSize {
  minWidth: number;
  minHeight: number;
  width: number;
  height: number;
}

export interface ExtendPageConfig {
  title: string;
  description?: string;
  /** 页面/菜单用图标 (UnoCSS i-{collection}:{name}) */
  icon?: string;
  /** 固定地址 */
  url?: string;
  /** 需登录态的动态地址，传入 user 获取 URL */
  getUrl?: (user: { getToken: string }) => string;
  windowSize: ExtendPageWindowSize;
}

export const EXTEND_PAGE_CONFIG: Record<ExtendPageType, ExtendPageConfig> = {
  shop: {
    title: "极物圈商城",
    icon: "i-ri:shopping-bag-3-line",
    description: "极物圈商城，专注于购物分享，记录美好生活！",
    getUrl: user =>
      user.getToken ? `https://jiwu.kiwi2333.top/?token=${user.getToken}` : "",
    windowSize: {
      minWidth: 1500,
      minHeight: 960,
      width: 1500,
      height: 960,
    },
  },
  readjoy: {
    title: "悦读时光",
    icon: "i-ri:book-3-line",
    description: "悦读时光，专注于分享生活点滴，记录美好生活！",
    url: "https://readjoy.kiwi2333.top/",
    windowSize: {
      minWidth: 375,
      minHeight: 780,
      width: 1080,
      height: 780,
    },
  },
  blog: {
    title: "博客",
    icon: "i-ri:article-line",
    description: "分享极物聊天的心得与经验",
    url: "https://kiwi2333.top/",
    windowSize: {
      minWidth: 375,
      minHeight: 780,
      width: 1200,
      height: 800,
    },
  },
};

export function isExtendPageType(type: string): type is ExtendPageType {
  return EXTEND_PAGE_TYPES.includes(type as ExtendPageType);
}

/** 判断路径是否为扩展页（供桌面端中间件等使用） */
export function isExtendRoute(path: string): boolean {
  return path === EXTEND_ROUTE_PREFIX
    || path.startsWith(`${EXTEND_ROUTE_PREFIX}/`)
    || path.startsWith(`${EXTEND_ROUTE_PREFIX}?`);
}
