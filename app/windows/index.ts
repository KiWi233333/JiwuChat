/**
 * @desc    Tauri2多窗口封装管理
 * @author: Kiwi2333
 * @time    2024.10
 */

import type { WindowOptions } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getAllWindows } from "@tauri-apps/api/window";

export class CustomWindows {
  mainWin: WebviewWindow | null;

  constructor() {
    // 主窗口
    this.mainWin = null;
  }

  // 创建新窗口
  async createWin(label: string, options: WindowOptions) {
    console.log("------+开始创建窗口+------");

    // 判断窗口是否存在
    const existWin = await this.getWin(label);
    if (existWin) {
      console.log("窗口已存在>>", existWin);
      existWin.setFocus();
      return existWin;
    }
    // ...

    // 创建窗口对象
    const win = new WebviewWindow(label, options);

    // 窗口创建完毕/失败
    win.once("tauri://created", async () => {
      console.log(label, "窗口创建成功");
    });

    win.once("tauri://error", async (error) => {
      console.log(label, "窗口创建失败", error);
    });
  }

  // 获取窗口
  async getWin(label: string) {
    return await WebviewWindow.getByLabel(label);
  }

  // 获取全部窗口
  async getAllWin() {
    //  return getAll()
    return await getAllWindows();
  }

  // 开启主进程监听事件
  async listen() {
    console.log("——+——+——+——+——+开始监听窗口");

    // // 创建新窗体
    // await listen("win-create", (event) => {
    // });

    // // 显示窗体
    // await listen("win-show", async (event) => {
    //   if (!appWindow.label.includes("main"))
    //     return;
    //   await appWindow.show();
    //   await appWindow.unminimize();
    //   await appWindow.setFocus();
    // });

    // // 隐藏窗体
    // await listen("win-hide", async (event) => {
    //   if (!appWindow.label.includes("main"))
    //     return;
    //   await appWindow.hide();
    // });

    // // 关闭窗体
    // await listen("win-close", async (event) => {
    //   await appWindow.close();
    // });
  }
}

