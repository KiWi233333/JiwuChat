pub fn setup_mobile() {
    println!("App from Mobile!");
    tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            super::window::setup_mobile_window(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::mobiles::commands::exist_file,
            crate::desktops::commands::scan_dir_stats,
            crate::mobiles::commands::remove_file,
            crate::mobiles::commands::mkdir_file,
            crate::mobiles::commands::exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
