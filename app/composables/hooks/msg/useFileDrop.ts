/**
 * 监听全局文件拖拽
 */
export async function useLinterFileDrop() {
  const fileList = ref<File[]>([]);
  // const unlisten = await appWindow.onFileDropEvent((event) => {
  //   if (event.payload.type === "hover")
  //     console.log("User hovering", event.payload.paths);
  //   else if (event.payload.type === "drop")
  //     console.log("User dropped", event.payload.paths);
  //   else
  //     console.log("File drop cancelled");
  // });

  // // 取消监听
  // unlisten();
  // watch(fileDropList, (val) => {
  //   if (val.length) {
  //     ElMessageBox.confirm("是否上传文件？", "上传文件将会覆盖当前消息内容，是否继续？").then(async () => {
  //       // 上传文件
  //       inputOssFileUploadRef.value.resetInput?.();
  //       imgList.value = [];
  //       await inputOssFileUploadRef.value?.onUpload({
  //         id: val[0],
  //         key: undefined,
  //         status: "",
  //         percent: 0,
  //         file: val[0],
  //       });
  //       form.value.msgType = MessageType.IMG; // 图片
  //     });
  //   }
  // });
  return {
    fileList,
  };
}
