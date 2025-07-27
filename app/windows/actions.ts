import { emit } from "@tauri-apps/api/event";

/**
 * @desc 创建新窗口
 * @param args {object} {label: 'new', url: '/new', width: 500, height: 300, ...}
 */
export async function createWin(args: any) {
  await emit("win-create", args);
}

// ...

/**
 * @desc 登录窗口
 */
export async function loginWin() {
  await createWin({
    label: "main_login",
    title: "登录",
    url: "/login",
    width: 400,
    height: 320,
    resizable: false,
    alwaysOnTop: true,
  });
}

export async function mainWin() {
  await createWin({
    label: MAIN_WINDOW_LABEL,
    title: "极物聊天",
    url: "/",
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 340,
  });
}

export async function aboutWindow() {
  await createWin({
    label: "about",
    title: "关于",
    url: "/about",
    width: 450,
    height: 340,
  });
}
