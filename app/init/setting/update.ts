/**
 * 初始化版本更新检查
 */
export function useUpdateInit() {
  const setting = useSettingStore();
  const route = useRoute();

  if (route.path !== "/msg") {
    setting.appUploader.isCheckUpdatateLoad = false;
    setting.appUploader.isUpdating = false;
    setting.appUploader.isUpload = false;
    setting.appUploader.version = "";
    setting.appUploader.newVersion = "";
    setting.appUploader.contentLength = 0;
    setting.appUploader.downloaded = 0;
    setting.appUploader.downloadedText = "";
    setting.checkUpdates(false);
  }
}
