use tauri::{AppHandle, Emitter};
use super::oauth::{is_oauth_callback, parse_oauth_callback_url};

pub fn handle_runtime_url(app: &AppHandle, url: &str) {
    if is_oauth_callback(url) {
        let payload = parse_oauth_callback_url(url);
        let _ = app.emit("oauth-callback", payload);
    }
}
