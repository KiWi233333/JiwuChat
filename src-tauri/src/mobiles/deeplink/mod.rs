pub mod types;
pub mod oauth;
pub mod handlers;

use std::sync::Mutex;
use types::OAuthCallbackPayload;

/// 全局缓存：存储待处理的 OAuth 回调数据
/// 用于处理前端监听器未就绪时的 deeplink 回调
static PENDING_OAUTH_CALLBACK: Mutex<Option<OAuthCallbackPayload>> = Mutex::new(None);

/// 保存待处理的 OAuth 回调
pub fn cache_oauth_callback(payload: OAuthCallbackPayload) {
    if let Ok(mut pending) = PENDING_OAUTH_CALLBACK.lock() {
        *pending = Some(payload);
    }
}

/// 获取并清除缓存的 OAuth 回调
pub fn take_cached_oauth_callback() -> Option<OAuthCallbackPayload> {
    PENDING_OAUTH_CALLBACK.lock().ok().and_then(|mut pending| pending.take())
}
