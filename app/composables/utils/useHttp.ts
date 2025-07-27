import type { Result } from "~/types/result";

type FetchType = typeof $fetch;
type ReqType = Parameters<FetchType>[0];
type FetchOptions = Parameters<FetchType>[1];

export function httpRequest<T = unknown>(
  method: any,
  url: ReqType,
  bodyOrParams?: any,
  opts?: FetchOptions,
) {
  let msg = "";
  const user = useUserStore();
  const defaultOpts = {
    method,
    baseURL: BaseUrlRef.value,
    headers: {} as { Authoriztion?: string },
    // 请求拦截器
    onRequest: (config: any) => {
      // 需要登录操作
      // if (config.options.headers?.Authorization !== undefined) {
      //   // @ts-expect-error
      //   if (config.options.headers?.Authorization === "")
      //     user.showLoginForm = true;
      // }
    },
    onResponse: (config: any) => {
      // 续签
      if (config.response.headers?.Authorization) {
        user.token = config.response.headers?.Authorization;
      }
      checkResponse(config.response._data);
    },
    // 请求错误
    onRequestError() {
      (() => {
        // ElMessage.error({
        //   grouping: true,
        //   repeatNum: 0,
        //   message: "请求出错，请稍后重试！",
        // });
        // console.error("请求出错，请稍后重试！", e);
      })();
    },
    // 不同响应码
    onResponseError({ response }: any) {
      switch (response.status) {
        case 400:
          msg = "请求参数错误，请稍后重试！";
          break;
        case 401:
          msg = "没有权限，拒绝访问！";
          break;
        case 403:
          msg = "没有权限，拒绝访问！";
          break;
        case 404:
          msg = "请求地址错误！";
          break;
        case 500:
          msg = "服务器故障，稍后重试！";
          break;
      }
      // 客户端报错
      if (msg && document && ElMessage) {
        ElMessage.error(msg);
      }
    },
  } as FetchOptions;
  if (defaultOpts) {
    if (method === "post" || method === "put")
      defaultOpts.body = bodyOrParams;
    else if (method === "delete" || method === "get")
      defaultOpts.params = bodyOrParams;
    else
      defaultOpts.body = bodyOrParams;
  }
  // @ts-ignore
  return $fetch(url, { ...defaultOpts, ...opts } as any) as Promise<T>;
}

export const useHttp = {
  post<T = unknown>(
    request: ReqType,
    body?: any | null | object,
    opts?: FetchOptions,
  ) {
    return httpRequest<T>("post", request, body, opts);
  },

  get<T = unknown>(
    request: ReqType,
    body?: any | null | object,
    opts?: FetchOptions,
  ) {
    return httpRequest<T>("get", request, body, opts);
  },


  deleted<T = unknown>(
    request: ReqType,
    body?: any | null | object,
    opts?: FetchOptions,
  ) {
    return httpRequest<T>("DELETE", request, body, opts);
  },


  put<T = unknown>(
    request: ReqType,
    body?: any | null | object,
    opts?: FetchOptions,
  ) {
    return httpRequest<T>("put", request, body, opts);
  },

};

const isNavigator = ref(false);

export function checkResponse(data: Result<unknown>, showErrorMsg = true) {
  let msg = "";
  const type = "error";
  const code: StatusCode = data.code;
  if (data.code !== StatusCode.SUCCESS)
    msg = StatusCodeText[code] || "";
  const user = useUserStore();
  if (data.code === StatusCode.TOKEN_ERR || data.code === StatusCode.TOKEN_EXPIRED_ERR || data.code === StatusCode.TOKEN_DEVICE_ERR) {
    showErrorMsg && ElMessage.closeAll();
    if (isNavigator.value) {
      return false;
    }
    isNavigator.value = true;
    // 登录失效，清除用户信息，跳转登录页
    user.clearUserStore();
    if (useRoute().path !== "/msg") {
      isNavigator.value = false;
      navigateTo("/login", { replace: true });
    }
    return false;
  }
  else if (data.code === StatusCode.STATUS_OFF_ERR) {
    // 用户被禁用
    showErrorMsg && ElMessage.error("账号被禁用，请联系管理员！");
    return false;
  }
  if (msg !== "") {
    showErrorMsg && ElMessage.closeAll("error");
    // 组件
    showErrorMsg && ElMessage.error({
      grouping: true,
      type,
      message: data.message.length > 50 ? msg : data.message,
    });
    return false;
  }
  return true;
}
