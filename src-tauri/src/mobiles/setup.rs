use tauri_plugin_deep_link::DeepLinkExt;
use super::deeplink::handlers::{handle_startup_urls, handle_runtime_url};

pub fn setup_mobile() {
    println!("App from Mobile!");
    
    // localhost 插件配置
    // 在开发模式下，插件会代理到 devUrl (http://127.0.0.1:3000)
    // 在生产模式下，插件会服务静态文件 (frontendDist)
    let port = portpicker::pick_unused_port().expect("failed to find unused port");
    println!("Using localhost plugin on port: {}", port);
    
    tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(move |app| {
            super::window::setup_mobile_window(app.handle(), port)?;
            
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
            crate::mobiles::commands::exist_file,
            crate::mobiles::commands::scan_dir_stats,
            crate::mobiles::commands::remove_file,
            crate::mobiles::commands::mkdir_file,
            crate::mobiles::commands::exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
