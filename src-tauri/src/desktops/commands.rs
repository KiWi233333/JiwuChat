// commands.rs
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

#[command]
pub async fn exist_file(path: PathBuf) -> bool {
    path.exists()
}

#[command]
pub async fn remove_file(path: PathBuf) -> bool {
    std::fs::remove_file(path).is_ok()
}

#[command]
pub async fn mkdir_file(path: PathBuf) -> bool {
    std::fs::create_dir(path).is_ok()
}

#[command]
pub async fn exit_app() {
    std::process::exit(0);
}
#[command]
pub async fn create_window(
    app_handle: AppHandle,
    label: String,
    url: String,
    title: String,
    shadow: Option<bool>
) -> tauri::Result<()> {
    let shadow = shadow.unwrap_or(true);
    println!("创建窗口：{}, {}", title, url);
    // 映射对应fn
    match label.as_str() {
        "main" => create_main_window(app_handle, shadow).await?,
        "msgbox" => create_msgbox_window(app_handle, shadow).await?,
        "login" => create_login_window(app_handle, shadow).await?,
        "extend" => create_extend_window(app_handle, title, url, shadow).await?,
        _ => {}
    }
    Ok(())
}

// 窗口大小渐变动画
#[command]
pub async fn animate_window_resize(
    app_handle: AppHandle,
    window_label: String,
    to_width: f64,
    to_height: f64,
    duration: Option<u64>,
    steps: Option<u64>,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&window_label)
        .ok_or_else(|| format!("找不到窗口: {}", window_label))?;

    let duration = duration.unwrap_or(300);
    let steps = steps.unwrap_or(30);

    let size = window.inner_size().map_err(|e| e.to_string())?;
    let from_width = size.width as f64;
    let from_height = size.height as f64;

    // 如果尺寸相同，无需动画
    if (from_width - to_width).abs() < 1.0 && (from_height - to_height).abs() < 1.0 {
        return Ok(());
    }

    let delay = duration / steps;

    for i in 0..=steps {
        let progress = i as f64 / steps as f64;
        // 使用缓动函数使动画更自然 (ease-out-quad)
        let eased_progress = progress * (2.0 - progress);

        let w = from_width + (to_width - from_width) * eased_progress;
        let h = from_height + (to_height - from_height) * eased_progress;

        window
            .set_size(tauri::LogicalSize::new(w.round(), h.round()))
            .map_err(|e| e.to_string())?;

        std::thread::sleep(std::time::Duration::from_millis(delay));
    }

    Ok(())
}

pub async fn create_main_window(app_handle: AppHandle, shadow: bool) -> tauri::Result<()> {
    // 主窗口配置
    let mut wind_builder =
        WebviewWindowBuilder::new(&app_handle, "main", WebviewUrl::App("/".into()))
            .title("极物聊天")
            .resizable(true)
            .center()
            .shadow(shadow)
            .decorations(false)
            .min_inner_size(375.0, 780.0)
            .max_inner_size(1920.0, 1080.0)
            .inner_size(1280.0, 860.0)
            .visible(false);

    // Windows 和 Linux 平台特定配置
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        wind_builder = wind_builder.transparent(true);
        // wind_builder = wind_builder.effects(
        //     tauri::window::EffectsBuilder::new()
        //         .effects(vec![tauri::window::Effect::Acrylic, tauri::window::Effect::Blur])
        //         .build(),
        // );
    }

    // macOS 平台特定配置
    #[cfg(target_os = "macos")]
    {
        use tauri::utils::TitleBarStyle;
        wind_builder = wind_builder.title_bar_style(TitleBarStyle::Overlay);
        wind_builder = wind_builder.shadow(shadow);
    }

    let main_window = wind_builder.build()?;

    let _app = app_handle.app_handle().clone();

    // 监听窗口事件
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    main_window
        .clone()
        .on_window_event(move |event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                println!("关闭请求，窗口将最小化而不是关闭。");
                api.prevent_close();
                #[cfg(any(target_os = "windows", target_os = "linux"))]
                main_window
                    .clone()
                    .hide()
                    .unwrap_or_else(|e| eprintln!("隐藏窗口时出错: {:?}", e));
            }
            WindowEvent::Destroyed => {
                println!("窗口已销毁，检查剩余窗口。");
                let webview_windows = _app.webview_windows();
                let remaining_windows: Vec<_> = webview_windows.keys().collect();
                
                if remaining_windows.len() == 1 && remaining_windows.iter().any(|&label| label == "main") {
                    println!("仅剩main窗口，保存窗口状态。");
                    _app.save_window_state(StateFlags::all())
                        .unwrap_or_else(|e| eprintln!("保存窗口状态时出错: {:?}", e));
                }
            }
            _ => {}
        });

    // 仅在构建 macOS 时设置背景颜色
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSColor, NSWindow};
        use cocoa::base::{id, nil};

        let ns_window_main = main_window.ns_window().unwrap() as id;
        unsafe {
            let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                nil,
                50.0 / 255.0,
                158.0 / 255.0,
                163.5 / 255.0,
                0.0,
            );
            ns_window_main.setBackgroundColor_(bg_color);
        }
    }
    Ok(())
}

async fn create_msgbox_window(app_handle: AppHandle, shadow: bool) -> tauri::Result<()> {
    #[cfg(desktop)]
    let mut wind_builder =
        WebviewWindowBuilder::new(&app_handle, "msgbox", WebviewUrl::App("/msg".into()))
            .title("消息通知")
            .inner_size(240.0, 300.0)
            .skip_taskbar(true)
            .decorations(false)
            .resizable(false)
            .always_on_top(true)
            .shadow(shadow)
            .position(-240.0, -300.0)
            .focused(false)
            .visible(false);

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        wind_builder = wind_builder.transparent(true);
    }

    #[cfg(target_os = "macos")]
    {
        use tauri::utils::TitleBarStyle;
        wind_builder = wind_builder.title_bar_style(TitleBarStyle::Overlay);
    }

    let msgbox_window = wind_builder.build()?;

    msgbox_window
        .clone()
        .on_window_event(move |event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                println!("关闭请求，窗口将最小化而不是关闭。");
                api.prevent_close();
            }
            WindowEvent::Focused(focused) => {
                if !*focused {
                    msgbox_window
                        .hide()
                        .unwrap_or_else(|e| eprintln!("隐藏窗口时出错: {:?}", e));
                }
            }
            _ => {}
        });

    Ok(())
}

async fn create_login_window(app_handle: AppHandle, shadow: bool) -> tauri::Result<()> {
    // 只创建登录窗口
    let mut wind_builder =
        WebviewWindowBuilder::new(&app_handle, "login", WebviewUrl::App("/login".into()))
            .title("极物聊天 - 登录")
            .resizable(false)
            .center()
            .shadow(shadow)
            .decorations(false)
            .inner_size(340.0, 480.0)
            .visible(true);

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        wind_builder = wind_builder.transparent(true);
    }

    #[cfg(target_os = "macos")]
    {
        use tauri::utils::TitleBarStyle;
        wind_builder = wind_builder.title_bar_style(TitleBarStyle::Overlay);
    }

    let login_window = wind_builder.build()?;

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

    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSColor, NSWindow};
        use cocoa::base::{id, nil};

        let ns_window_login = login_window.ns_window().unwrap() as id;
        unsafe {
            let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                nil,
                50.0 / 255.0,
                158.0 / 255.0,
                163.5 / 255.0,
                0.0,
            );
            ns_window_login.setBackgroundColor_(bg_color);
        }
    }

    Ok(())
}

/**
 * 扩展窗口
 */
async fn create_extend_window(
    app_handle: AppHandle,
    title: String,
    url: String,
    shadow: bool,
) -> tauri::Result<()> {
    // 主窗口配置
    let mut wind_builder =
        WebviewWindowBuilder::new(&app_handle, "extend", WebviewUrl::App(url.into()))
            .title(title)
            .resizable(true)
            .center()
            .shadow(shadow)
            .decorations(false)
            .min_inner_size(375.0, 780.0)
            .max_inner_size(1920.0, 1080.0)
            .inner_size(1024.0, 960.0)
            .visible(false);

    // Windows 和 Linux 平台特定配置
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        wind_builder = wind_builder.transparent(true);
        wind_builder.build()?;
    }

    // macOS 平台特定配置
    #[cfg(target_os = "macos")]
    {
        use tauri::utils::TitleBarStyle;
        wind_builder = wind_builder.title_bar_style(TitleBarStyle::Overlay);
        wind_builder = wind_builder.shadow(true);
        use cocoa::appkit::{NSColor, NSWindow};
        use cocoa::base::{id, nil};
        let main_window = wind_builder.build()?;

        let ns_window_main = main_window.ns_window().unwrap() as id;
        unsafe {
            let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                nil,
                50.0 / 255.0,
                158.0 / 255.0,
                163.5 / 255.0,
                0.0,
            );
            ns_window_main.setBackgroundColor_(bg_color);
        }
    }
    Ok(())
}
