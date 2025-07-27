
export interface EnvConfigMap {
  VITE_API_BASE_URL: string;
  VITE_API_WS_BASE_URL: string;
  VITE_BASE_OSS_PATH: string;
  VITE_XUN_FEI_WSS_URL: string;
  VITE_XUN_FEI_APP_ID: string;
  VITE_TURN_SERVER_URL?: string;
  VITE_TURN_SERVER_USER?: string;
  VITE_TURN_SERVER_PWD?: string;
}


// 默认环境变量配置
export const DefaultEnvConfigMap: EnvConfigMap = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_WS_BASE_URL: import.meta.env.VITE_API_WS_BASE_URL,
  VITE_BASE_OSS_PATH: import.meta.env.VITE_BASE_OSS_PATH,
  VITE_XUN_FEI_WSS_URL: import.meta.env.VITE_XUN_FEI_WSS_URL,
  VITE_XUN_FEI_APP_ID: import.meta.env.VITE_XUN_FEI_APP_ID,
  VITE_TURN_SERVER_URL: import.meta.env.VITE_TURN_SERVER_URL,
  VITE_TURN_SERVER_USER: import.meta.env.VITE_TURN_SERVER_USER,
  VITE_TURN_SERVER_PWD: import.meta.env.VITE_TURN_SERVER_PWD,
};
const savedConfig = useLocalStorage("env-config", DefaultEnvConfigMap, {
  mergeDefaults: true,
});
export function getEnvConfig() {
  return JSON.parse(JSON.stringify(savedConfig.value));
}
export function setEnvConfig(config: EnvConfigMap) {
  savedConfig.value = config;
}


// http请求
export const BASE_URL = savedConfig.value.VITE_API_BASE_URL;
export const BaseUrl = savedConfig.value.VITE_API_BASE_URL;
export const BaseUrlFont = `${savedConfig.value.VITE_API_BASE_URL}/public/font`;
export const BaseUrlRef = computed(() => savedConfig.value.VITE_API_BASE_URL);

// 图片
export const BASE_OSS_PATH = savedConfig.value.VITE_BASE_OSS_PATH;
export const BaseUrlAppFile = BASE_OSS_PATH;
export const BaseUrlImg = BASE_OSS_PATH;
export const BaseUrlVideo = BASE_OSS_PATH;
export const BaseUrlSound = BASE_OSS_PATH;
export const BaseUrlFile = BASE_OSS_PATH;
export const AuthKey = "Authorization";

// websocket
export const BaseWSUrl = savedConfig.value.VITE_API_WS_BASE_URL;
export const BaseWSUrlRef = computed(() => savedConfig.value.VITE_API_WS_BASE_URL);

export const XUN_FEI_WSS_URL = savedConfig.value.VITE_XUN_FEI_WSS_URL;
export const XUN_FEI_APP_ID = savedConfig.value.VITE_XUN_FEI_APP_ID;

// TURN服务器配置
export const TURN_SERVER_URL = savedConfig.value.VITE_TURN_SERVER_URL;
export const TURN_SERVER_USER = savedConfig.value.VITE_TURN_SERVER_USER;
export const TURN_SERVER_PWD = savedConfig.value.VITE_TURN_SERVER_PWD;
