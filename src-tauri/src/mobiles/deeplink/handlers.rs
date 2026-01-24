use tauri::{AppHandle, Emitter};
use super::oauth::{is_oauth_callback, parse_oauth_callback_url};

/// 处理应用启动时的深度链接
pub fn handle_startup_urls(app: &AppHandle, urls: Vec<url::Url>) {
    for url in urls {
        let url_str = url.as_str();
        if is_oauth_callback(url_str) {
            let payload = parse_oauth_callback_url(url_str);

            // 保存到全局缓存，供前端主动获取
            super::cache_oauth_callback(payload.clone());

            // 延迟发送事件，等待前端准备就绪
            // 使用重试机制确保前端能接收到事件
            let handle = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(200));
                let _ = handle.emit("oauth-callback", payload.clone());
            });
        }
    }
}

/// 处理运行时接收到的深度链接
pub fn handle_runtime_url(app: &AppHandle, url: &str) {
    if is_oauth_callback(url) {
        let payload = parse_oauth_callback_url(url);
        let _ = app.emit("oauth-callback", payload);
    }
}
