// tray.rs
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use tauri_plugin_opener::open_url;
// use tauri_plugin_window_state::{AppHandleExt, StateFlags};

#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

const HOST_URL: &str = "https://blog.jiwuchat.top";
// msgbox宽高
// const MSGBOX_WIDTH: f64 = 240.0;
// const MSGBOX_HEIGHT: f64 = 300.0;

pub fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let main_window = MenuItemBuilder::with_id("main_window", "主页").build(app)?;
    let setting = MenuItemBuilder::with_id("setting", "设置").build(app)?;
    let to_host = MenuItemBuilder::with_id("to_host", "官网").build(app)?;
    let restart = MenuItemBuilder::with_id("restart", "重启").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&main_window, &setting, &to_host, &restart, &quit])
        .build()?;

    TrayIconBuilder::with_id("tray_icon")
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone())
        // .title("极物聊天")
        .tooltip("极物聊天")
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "main_window" => {
                show_main_window(&app);
            }
            "setting" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.unminimize().unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                    window
                        .emit(
                            "router",
                            Payload {
                                message: "/setting".into(),
                            },
                        )
                        .unwrap();
                }
            }
            "to_host" => {
                open_url(HOST_URL, None::<&str>).unwrap_or_else(|e| {
                        eprintln!("打开官网时出错: {:?}", e);
                    });
            }
            "quit" => {
                // app.clone()
                //     .save_window_state(StateFlags::all())
                //     .unwrap_or_else(|e| eprintln!("保存窗口状态时出错: {:?}", e));
                std::process::exit(0);
            }
            "restart" => {
                app.restart();
            }
            _ => (),
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                id: _,
                rect: _,
                button,
                button_state: MouseButtonState::Up,
                ..
            } => match button {
                MouseButton::Left {} => {
                    let app = tray.app_handle();
                    if let Some(webview_window) = app.get_webview_window("main") {
                        let _ = webview_window.unminimize();
                        let _ = webview_window.show();
                        let _ = webview_window.set_focus();
                    } else {
                        show_window(&app);
                    }
                    app.emit("tray_click", ()).unwrap();
                }
                MouseButton::Right {} => {}
                _ => {}
            },
            TrayIconEvent::Enter {
                id: _,
                position,
                rect: _,
            } => {
                let app = tray.app_handle();
                app.emit("tray_mouseenter", position).unwrap();
                // if let Some(msgbox) = app.get_webview_window("msgbox") {
                //     msgbox.set_focus().unwrap();
                // }
            }
            TrayIconEvent::Move {
                id: _,
                position: _,
                rect: _,
            } => {
                // let app: &AppHandle = tray.app_handle();
                // if let Some(msgbox) = app.get_webview_window("msgbox") {
                //     // 是否可见
                //     if msgbox.is_visible().unwrap() {
                //         msgbox.set_focus().unwrap();
                //     }
                // }
            }
            TrayIconEvent::Leave {
                id: _,
                position,
                rect: _,
            } => {
                let app = tray.app_handle();
                // if let Some(webview_window) = app.get_webview_window("msgbox") {
                //     std::thread::sleep(std::time::Duration::from_millis(300));
                //     if webview_window.is_visible().unwrap() {
                //         webview_window.hide().unwrap();
                //     }
                // }
                app.emit("tray_mouseleave", position).unwrap();
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg(desktop)]
pub fn show_window(app: &AppHandle) {
    use crate::desktops::window::setup_desktop_window;

    if let Some(window) = app.webview_windows().get("main") {
        window
            .unminimize()
            .unwrap_or_else(|e| eprintln!("取消最小化窗口时出错: {:?}", e));
        window
            .show()
            .unwrap_or_else(|e| eprintln!("显示窗口时出错: {:?}", e));
        window
            .set_focus()
            .unwrap_or_else(|e| eprintln!("聚焦窗口时出错: {:?}", e));
    } else if let Some(window) = app.webview_windows().get("login") {
        window
            .unminimize()
            .unwrap_or_else(|e| eprintln!("取消最小化窗口时出错: {:?}", e));
        window
            .show()
            .unwrap_or_else(|e| eprintln!("显示窗口时出错: {:?}", e));
        window
            .set_focus()
            .unwrap_or_else(|e| eprintln!("聚焦窗口时出错: {:?}", e));
    } else {
        setup_desktop_window(app).unwrap_or_else(|e| eprintln!("创建窗口时出错: {:?}", e));
    }
}

#[cfg(desktop)]
fn show_main_window(app: &AppHandle) {
    use crate::desktops::window::setup_desktop_window;

    // 优先显示主窗口
    if let Some(window) = app.webview_windows().get("main") {
        window
            .unminimize()
            .unwrap_or_else(|e| eprintln!("取消最小化主窗口时出错: {:?}", e));
        window
            .show()
            .unwrap_or_else(|e| eprintln!("显示主窗口时出错: {:?}", e));
        window
            .set_focus()
            .unwrap_or_else(|e| eprintln!("聚焦主窗口时出错: {:?}", e));
        return;
    }

    // 如果主窗口不存在，显示登录窗口
    if let Some(window) = app.webview_windows().get("login") {
        window
            .unminimize()
            .unwrap_or_else(|e| eprintln!("取消最小化登录窗口时出错: {:?}", e));
        window
            .show()
            .unwrap_or_else(|e| eprintln!("显示登录窗口时出错: {:?}", e));
        window
            .set_focus()
            .unwrap_or_else(|e| eprintln!("聚焦登录窗口时出错: {:?}", e));
        return;
    }

    // 如果都不存在，创建新的登录窗口
    setup_desktop_window(app).unwrap_or_else(|e| eprintln!("创建新窗口时出错: {:?}", e));
}
