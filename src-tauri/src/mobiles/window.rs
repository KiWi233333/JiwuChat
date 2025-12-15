use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

// （android、ios）的窗口
pub fn setup_mobile_window(app: &AppHandle, port: u16) -> tauri::Result<()> {
    // 开发模式：直接连接到 Nuxt dev server，避免使用 tauri.localhost
    #[cfg(dev)]
    let url = {
        use tauri::{ipc::CapabilityBuilder, Url};
        // 使用 dev server 地址
        let url: Url = "http://127.0.0.1:3000".parse().unwrap();

        app.add_capability(
            CapabilityBuilder::new("localhost-dev")
                .remote(url.to_string())
                .window("main"),
        )?;

        WebviewUrl::External(url)
    };
    // 主窗口配置
    WebviewWindowBuilder::new(app, "main", url).build()?;
    Ok(())
}
