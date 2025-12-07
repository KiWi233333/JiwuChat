use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub fn setup_desktop_window(app: &AppHandle) -> tauri::Result<()> {
    // 只创建登录窗口
    let mut login_builder =
        WebviewWindowBuilder::new(app, "login", WebviewUrl::App("/login".into()))
            .title("极物聊天 - 登录")
            .resizable(false)
            .center()
            .shadow(false)
            .decorations(false)
            .inner_size(340.0, 480.0)
            .visible(true);

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        login_builder = login_builder.transparent(true);
    }

    #[cfg(target_os = "macos")]
    {
        use tauri::{utils::TitleBarStyle, LogicalPosition};
        login_builder = login_builder.title_bar_style(TitleBarStyle::Overlay);
        login_builder = login_builder.decorations(true);
        login_builder = login_builder.hidden_title(true);
        login_builder = login_builder.shadow(true);
        login_builder = login_builder.traffic_light_position(LogicalPosition::new(16.0, 22.0));
    }

    let login_window = login_builder.build()?;

    // 监听登录窗口事件
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    login_window
        .clone()
        .on_window_event(move |event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
            }
            _ => {}
        });
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
