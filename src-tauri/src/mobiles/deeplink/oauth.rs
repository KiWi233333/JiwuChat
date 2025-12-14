use super::types::OAuthCallbackPayload;

pub fn parse_oauth_callback_url(url: &str) -> OAuthCallbackPayload {
    let mut payload = OAuthCallbackPayload {
        raw_url: url.to_string(),
        ..Default::default()
    };

    if let Ok(parsed_url) = url::Url::parse(url) {
        for (key, value) in parsed_url.query_pairs() {
            match key.as_ref() {
                "platform" => payload.platform = Some(value.to_string()),
                "action" => payload.action = Some(value.to_string()),
                "error" => payload.error = Some(value.to_string()),
                "message" => payload.message = Some(value.to_string()),
                "errorCode" => payload.error_code = Some(value.to_string()),
                "needBind" => payload.need_bind = Some(value == "true"),
                "token" => payload.token = Some(value.to_string()),
                "oauthKey" => payload.oauth_key = Some(value.to_string()),
                "nickname" => payload.nickname = Some(value.to_string()),
                "avatar" => payload.avatar = Some(value.to_string()),
                "email" => payload.email = Some(value.to_string()),
                "bindSuccess" => payload.bind_success = Some(value == "true"),
                _ => {}
            }
        }
    }

    payload
}

pub fn is_oauth_callback(url: &str) -> bool {
    url.starts_with("jiwuchat://oauth/callback")
}
