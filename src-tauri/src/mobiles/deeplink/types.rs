#[derive(Clone, Debug, serde::Serialize)]
pub struct OAuthCallbackPayload {
    pub platform: Option<String>,
    pub action: Option<String>,
    pub error: Option<String>,
    pub raw_url: String,
    #[serde(rename = "needBind")]
    pub need_bind: Option<bool>,
    pub token: Option<String>,
    #[serde(rename = "oauthKey")]
    pub oauth_key: Option<String>,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
    pub email: Option<String>,
    pub message: Option<String>,
    #[serde(rename = "errorCode")]
    pub error_code: Option<String>,
    #[serde(rename = "bindSuccess")]
    pub bind_success: Option<bool>,
}

impl Default for OAuthCallbackPayload {
    fn default() -> Self {
        Self {
            platform: None,
            action: None,
            error: None,
            raw_url: String::new(),
            need_bind: None,
            token: None,
            oauth_key: None,
            nickname: None,
            avatar: None,
            email: None,
            message: None,
            error_code: None,
            bind_success: None,
        }
    }
}
