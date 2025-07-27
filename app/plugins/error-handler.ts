export default defineNuxtPlugin((nuxtApp) => {
  // 也可以这样
  nuxtApp.hook("vue:error", (error, instance, info) => {
    // 处理错误，例如上报到一个服务
  });
});
