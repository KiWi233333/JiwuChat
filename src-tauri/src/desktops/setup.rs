use tauri_plugin_deep_link::DeepLinkExt;
use tauri::Emitter;

/// OAuth 深度链接回调数据
#[derive(Clone, serde::Serialize)]
struct OAuthCallbackPayload {
    code: Option<String>,
    state: Option<String>,
    platform: Option<String>,
    action: Option<String>,
    error: Option<String>,
    raw_url: String,
}

/// 解析深度链接 URL 参数
fn parse_oauth_callback_url(url: &str) -> OAuthCallbackPayload {
    let mut payload = OAuthCallbackPayload {
        code: None,
        state: None,
        platform: None,
        action: None,
        error: None,
        raw_url: url.to_string(),
    };

    // 解析 URL: jiwuchat://oauth/callback?code=xxx&state=xxx&platform=github&action=login
    if let Ok(parsed_url) = url::Url::parse(url) {
        for (key, value) in parsed_url.query_pairs() {
            match key.as_ref() {
                "code" => payload.code = Some(value.to_string()),
                "state" => payload.state = Some(value.to_string()),
                "platform" => payload.platform = Some(value.to_string()),
                "action" => payload.action = Some(value.to_string()),
                "error" => payload.error = Some(value.to_string()),
                _ => {}
            }
        }
    }

    payload
}

pub fn setup_desktop() {
    println!("App from Desktop!");
    tauri::Builder::default()
        // ⚠️ single-instance 插件必须首先注册（官方文档要求）
        // 当使用 deep-link feature 时，深度链接会自动触发已运行的实例
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("单实例模式触发，参数: {:?}", argv);
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
                if let Err(e) = app.deep_link().register_all() {
                    eprintln!("注册深度链接失败: {:?}", e);
                } else {
                    println!("深度链接已注册（开发模式）");
                }
            }

            // 检查应用是否由深度链接启动
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                println!("应用由深度链接启动: {:?}", urls);
                for url in urls {
                    let url_str = url.as_str();
                    if url_str.starts_with("jiwuchat://oauth/callback") {
                        let payload = parse_oauth_callback_url(url_str);
                        // 延迟发送事件，等待前端准备就绪
                        let handle = app.handle().clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(500));
                            if let Err(e) = handle.emit("oauth-callback", payload) {
                                eprintln!("发送启动时 OAuth 回调事件失败: {:?}", e);
                            }
                        });
                    }
                }
            }

            // 注册深度链接监听（应用运行时收到的深度链接）
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                println!("深度链接触发: {:?}", urls);
                
                for url in urls {
                    let url_str = url.as_str();
                    
                    // 检查是否为 OAuth 回调
                    if url_str.starts_with("jiwuchat://oauth/callback") {
                        let payload = parse_oauth_callback_url(url_str);
                        println!("OAuth 回调参数: code={:?}, state={:?}, platform={:?}", 
                            payload.code, payload.state, payload.platform);
                        
                        // 发送事件到前端
                        if let Err(e) = handle.emit("oauth-callback", payload) {
                            eprintln!("发送 OAuth 回调事件失败: {:?}", e);
                        }
                        
                        // 聚焦窗口
                        super::window::show_window(&handle);
                    }
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
