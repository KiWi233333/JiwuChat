use tauri::Listener;

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
            
            // 注册 deep-link 事件监听器
            let app_handle = app.handle().clone();
            app.listen("deep-link://new-url", move |event| {
                let url = event.payload();
                super::deeplink::handlers::handle_runtime_url(&app_handle, url);
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
