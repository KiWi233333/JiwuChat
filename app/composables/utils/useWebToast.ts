
/**
 * 发送Web通知
 * @param title 标题
 * @param body 内容
 * @param opts 其他参数
 */
export function sendWebNotification(title: string, body?: string, opts?: any) {
  const windToast = useWebNotification({
    title,
    body,
    icon: "/logo.png",
    ...opts,
  });
  if (windToast.isSupported)
    windToast.show();
}
