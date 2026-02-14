use tauri_plugin_deep_link::DeepLinkExt;
use super::deeplink::handlers::{handle_startup_urls, handle_runtime_url};

pub fn setup_desktop() {
    tauri::Builder::default()
        // ⚠️ single-instance 插件必须首先注册（官方文档要求）
        // 当使用 deep-link feature 时，深度链接会自动触发已运行的实例
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let _ = super::window::show_window(app);
        }))
        // deep-link 插件
        .plugin(tauri_plugin_deep_link::init())
        // 其他插件
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            super::window::setup_desktop_window(app.handle())?;
            super::tray::setup_tray(app.handle())?;

            // Linux/Windows 开发模式下注册深度链接（macOS 不支持运行时注册）
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                let _ = app.deep_link().register_all();
            }

            // 检查应用是否由深度链接启动
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                handle_startup_urls(app.handle(), urls);
            }

            // 注册深度链接监听（应用运行时收到的深度链接）
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    handle_runtime_url(&handle, url.as_str());
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::desktops::commands::exist_file,
            crate::desktops::commands::scan_dir_stats,
            crate::desktops::commands::remove_file,
            crate::desktops::commands::mkdir_file,
            crate::desktops::commands::exit_app,
            crate::desktops::commands::create_window,
            crate::desktops::commands::animate_window_resize,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            // macOS 独有：点击程序坞恢复应用时，若无可见窗口则显示主窗口
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    let _ = super::window::show_window(app_handle);
                }
            }
        });
}
