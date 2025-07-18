pub fn setup_desktop() {
    println!("App from Desktop!");
    tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        // .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = super::window::show_window(app);
            println!("已开启单例模式");
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            super::tray::setup_tray(app.handle())?;
            super::window::setup_desktop_window(app.handle())?;
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
