use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

// （android、ios）的窗口
pub fn setup_mobile_window(app: &AppHandle, port: u16) -> tauri::Result<()> {
    // 开发模式：直接连接到 Nuxt dev server，避免使用 tauri.localhost
    #[cfg(dev)]
    let webview_url = {
        use tauri::{ipc::CapabilityBuilder, Url};
        // 使用 dev server 地址
        let dev_url: Url = "http://127.0.0.1:3000".parse().unwrap();

        app.add_capability(
            CapabilityBuilder::new("localhost-dev")
                .remote(dev_url.to_string())
                .window("main"),
        )?;

        WebviewUrl::External(dev_url)
    };

    // 生产模式：使用 localhost 插件提供的 URL
    #[cfg(not(dev))]
    let webview_url = WebviewUrl::App("/".into());

    // 主窗口配置
    WebviewWindowBuilder::new(app, "main", webview_url).build()?;
    Ok(())
}
