# OAuth 绑定功能 - 后端改动说明

## 方案 B：后端识别 `action` 参数区分登录/注册和绑定

---

## 概述

后端需要在 OAuth 回调处理时识别 `action` 参数：
- `action=login`（或空）：走登录/注册流程
- `action=bind`：走绑定流程，直接将第三方账号绑定到当前用户

---

## 文件改动

### 1. `OAuthStateDTO.java` - 添加 action 和 userId 字段

```java
package com.example.dto;

import lombok.Data;
import lombok.experimental.Accessors;

/**
 * OAuth State 元数据
 * 存储在 Redis 中，用于验证回调请求的合法性
 */
@Data
@Accessors(chain = true)
public class OAuthStateDTO {
    
    /** 随机生成的 state 值 */
    private String state;
    
    /** OAuth 平台代码 */
    private String platform;
    
    /** 前端回调地址 */
    private String clientRedirectUri;
    
    /** 
     * 动作类型：login | bind
     * - login: 登录/注册场景（默认）
     * - bind: 已登录用户绑定第三方账号
     */
    private String action;
    
    /** 
     * 用户ID（绑定场景必填）
     * 用于验证绑定操作的目标用户
     */
    private String userId;
    
    /** 创建时间戳 */
    private Long createTime;
    
    /** 过期时间戳 */
    private Long expireTime;
}
```

---

### 2. `OAuthCallbackVO.java` - 添加绑定相关字段和方法

```java
package com.example.vo;

import lombok.Data;
import lombok.experimental.Accessors;

/**
 * OAuth 回调结果 VO
 */
@Data
@Accessors(chain = true)
public class OAuthCallbackVO {
    
    // ========== 登录/注册场景字段 ==========
    
    /** 登录成功返回的 Token */
    private String token;
    
    /** 是否需要绑定（账号未注册时为 true） */
    private Boolean needBind;
    
    /** OAuth 临时凭证（用于后续绑定或注册） */
    private String oauthKey;
    
    /** OAuth 平台代码 */
    private String platform;
    
    /** 第三方昵称 */
    private String nickname;
    
    /** 第三方头像 */
    private String avatar;
    
    /** 第三方邮箱 */
    private String email;
    
    // ========== 绑定场景字段 ==========
    
    /** 绑定是否成功 */
    private Boolean bindSuccess;
    
    /** 错误码 */
    private String errorCode;
    
    /** 错误消息 */
    private String message;
    
    // ========== 通用字段 ==========
    
    /** 前端回调地址（用于重定向） */
    private String clientRedirectUri;

    // ========== 静态工厂方法 ==========

    /**
     * 登录成功
     */
    public static OAuthCallbackVO loginSuccess(String token) {
        return new OAuthCallbackVO()
                .setToken(token)
                .setNeedBind(false);
    }

    /**
     * 需要绑定（登录场景 - 第三方账号未关联系统用户）
     */
    public static OAuthCallbackVO needBind(String oauthKey, String platform,
                                           String nickname, String avatar, String email) {
        return new OAuthCallbackVO()
                .setNeedBind(true)
                .setOauthKey(oauthKey)
                .setPlatform(platform)
                .setNickname(nickname)
                .setAvatar(avatar)
                .setEmail(email);
    }

    /**
     * 绑定成功
     */
    public static OAuthCallbackVO bindSuccess() {
        return new OAuthCallbackVO()
                .setBindSuccess(true);
    }

    /**
     * 绑定失败
     * @param errorCode 错误码
     * @param message 错误消息
     */
    public static OAuthCallbackVO bindError(String errorCode, String message) {
        return new OAuthCallbackVO()
                .setBindSuccess(false)
                .setErrorCode(errorCode)
                .setMessage(message);
    }
}
```

---

### 3. `OAuthLoginController.java` - 修改获取授权 URL 接口

```java
package com.example.controller;

import com.example.common.Result;
import com.example.common.ResultStatus;
import com.example.service.OAuthLoginService;
import com.example.util.AuthContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class OAuthLoginController {

    private final OAuthLoginService oAuthLoginService;

    /**
     * 获取 OAuth 授权 URL
     * 
     * @param platform    OAuth 平台代码（github/google/gitee/wechat）
     * @param redirectUri 前端回调地址
     * @param action      动作类型：login（默认）| bind
     * @return 授权 URL
     */
    @GetMapping("/authorize/{platform}")
    public Result<String> getAuthorizationUrl(
            @PathVariable String platform,
            @RequestParam String redirectUri,
            @RequestParam(required = false, defaultValue = "login") String action) {
        
        String userId = null;
        
        // 绑定场景需要验证用户身份
        if ("bind".equals(action)) {
            userId = AuthContext.getCurrentUserId();
            if (userId == null) {
                return Result.fail(ResultStatus.TOKEN_ERR, "请先登录后再绑定第三方账号");
            }
        }
        
        String url = oAuthLoginService.getAuthorizationUrl(platform, redirectUri, action, userId);
        return Result.ok(url);
    }

    /**
     * OAuth 回调处理
     * 第三方平台授权后回调此接口
     */
    @GetMapping("/callback/{platform}")
    public void handleCallback(
            @PathVariable String platform,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        
        OAuthCallbackVO result = oAuthLoginService.handleCallback(platform, code, state, request);
        
        // 构建重定向 URL
        String redirectUrl = oAuthLoginService.buildClientRedirectUrl(result);
        
        // 302 重定向到前端
        response.sendRedirect(redirectUrl);
    }
}
```

---

### 4. `OAuthLoginService.java` - 接口定义

```java
package com.example.service;

public interface OAuthLoginService {

    /**
     * 获取 OAuth 授权 URL
     * 
     * @param platform         平台代码
     * @param clientRedirectUri 前端回调地址
     * @param action           动作类型：login | bind
     * @param userId           用户ID（绑定场景必填）
     * @return 授权 URL
     */
    String getAuthorizationUrl(String platform, String clientRedirectUri, 
                               String action, String userId);

    /**
     * 处理 OAuth 回调
     */
    OAuthCallbackVO handleCallback(String platform, String code, String state,
                                   HttpServletRequest request);

    /**
     * 构建前端重定向 URL
     */
    String buildClientRedirectUrl(OAuthCallbackVO result);
}
```

---

### 5. `OAuthLoginServiceImpl.java` - 核心实现

```java
package com.example.service.impl;

import cn.hutool.core.net.URLEncodeUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.cache.OAuthCache;
import com.example.dto.OAuthStateDTO;
import com.example.dto.OAuthTokenDTO;
import com.example.dto.OAuthUserInfoDTO;
import com.example.entity.User;
import com.example.entity.UserOAuth;
import com.example.mapper.UserMapper;
import com.example.mapper.UserOAuthMapper;
import com.example.service.OAuthLoginService;
import com.example.strategy.OAuthStrategy;
import com.example.strategy.OAuthStrategyFactory;
import com.example.util.AssertUtil;
import com.example.vo.OAuthCallbackVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.servlet.http.HttpServletRequest;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthLoginServiceImpl implements OAuthLoginService {

    private final OAuthStrategyFactory strategyFactory;
    private final OAuthCache oAuthCache;
    private final UserMapper userMapper;
    private final UserOAuthMapper userOAuthMapper;

    @Override
    public String getAuthorizationUrl(String platform, String clientRedirectUri,
                                      String action, String userId) {
        OAuthStrategy strategy = strategyFactory.getStrategy(platform);
        
        // 生成带元数据的 state
        String state = generateStateWithMetadata(platform, clientRedirectUri, action, userId);
        
        // 后端回调地址
        String backendCallbackUrl = buildBackendCallbackUrl(platform);
        
        return strategy.buildAuthorizationUrl(backendCallbackUrl, state);
    }

    /**
     * 生成带元数据的 state
     */
    private String generateStateWithMetadata(String platform, String clientRedirectUri,
                                             String action, String userId) {
        String state = UUID.randomUUID().toString().replace("-", "");

        long now = System.currentTimeMillis();
        OAuthStateDTO stateDTO = new OAuthStateDTO()
                .setState(state)
                .setPlatform(platform)
                .setClientRedirectUri(clientRedirectUri)
                .setAction(action != null ? action : "login")  // 默认 login
                .setUserId(userId)  // 绑定场景传入用户ID
                .setCreateTime(now)
                .setExpireTime(now + 5 * 60 * 1000);  // 5分钟过期

        // 存储到 Redis
        oAuthCache.setOAuthStateWithMetadata(state, JSONUtil.toJsonStr(stateDTO));
        
        log.info("生成 OAuth state: platform={}, action={}, userId={}", 
                platform, action, userId);
        
        return state;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OAuthCallbackVO handleCallback(String platform, String code, String state,
                                          HttpServletRequest request) {
        // 1. 获取并验证 state 元数据
        String stateJson = oAuthCache.getOAuthStateMetadata(state);
        AssertUtil.isNotEmpty(stateJson, "状态码无效或已过期");
        
        OAuthStateDTO stateDTO = JSONUtil.toBean(stateJson, OAuthStateDTO.class);
        
        // 删除已使用的 state（防止重放攻击）
        oAuthCache.deleteOAuthState(state);

        // 2. 获取策略并获取访问令牌
        OAuthStrategy strategy = strategyFactory.getStrategy(platform);
        String backendRedirectUri = buildBackendCallbackUrl(platform);
        OAuthTokenDTO tokenDTO = strategy.getAccessToken(code, backendRedirectUri);
        AssertUtil.isNotEmpty(tokenDTO != null ? tokenDTO.getAccessToken() : null, 
                "获取访问令牌失败");

        // 3. 获取第三方用户信息
        OAuthUserInfoDTO oauthUserInfo = strategy.getUserInfo(tokenDTO.getAccessToken());
        AssertUtil.isNotEmpty(oauthUserInfo != null ? oauthUserInfo.getOpenId() : null, 
                "获取用户信息失败");

        // 4. 根据 action 区分处理
        String action = stateDTO.getAction();
        OAuthCallbackVO callbackVO;

        if ("bind".equals(action)) {
            // ========== 绑定场景 ==========
            log.info("处理 OAuth 绑定回调: platform={}, userId={}", 
                    platform, stateDTO.getUserId());
            callbackVO = handleBindCallback(stateDTO, platform, oauthUserInfo, tokenDTO);
        } else {
            // ========== 登录/注册场景 ==========
            log.info("处理 OAuth 登录回调: platform={}", platform);
            callbackVO = handleLoginCallback(platform, oauthUserInfo, tokenDTO, request);
        }

        callbackVO.setClientRedirectUri(stateDTO.getClientRedirectUri());
        callbackVO.setPlatform(platform);
        
        return callbackVO;
    }

    /**
     * 处理绑定回调
     */
    private OAuthCallbackVO handleBindCallback(OAuthStateDTO stateDTO, String platform,
                                               OAuthUserInfoDTO oauthUserInfo,
                                               OAuthTokenDTO tokenDTO) {
        String userId = stateDTO.getUserId();

        // 1. 验证用户ID
        if (!StringUtils.hasText(userId)) {
            log.warn("绑定失败：用户ID为空");
            return OAuthCallbackVO.bindError("TOKEN_INVALID", "用户身份无效，请重新登录");
        }

        // 2. 验证用户是否存在
        User user = userMapper.selectById(userId);
        if (user == null) {
            log.warn("绑定失败：用户不存在, userId={}", userId);
            return OAuthCallbackVO.bindError("USER_NOT_FOUND", "用户不存在");
        }

        // 3. 检查该第三方账号是否已被其他用户绑定
        UserOAuth existingBinding = userOAuthMapper.selectOne(
                new LambdaQueryWrapper<UserOAuth>()
                        .eq(UserOAuth::getPlatform, platform)
                        .eq(UserOAuth::getOpenId, oauthUserInfo.getOpenId()));

        if (existingBinding != null) {
            if (existingBinding.getUserId().equals(userId)) {
                // 已绑定到当前用户，视为成功
                log.info("OAuth 账号已绑定到当前用户: userId={}, platform={}", userId, platform);
                return OAuthCallbackVO.bindSuccess();
            }
            // 已绑定到其他用户
            log.warn("绑定失败：OAuth 账号已被其他用户绑定, platform={}, openId={}",
                    platform, oauthUserInfo.getOpenId());
            return OAuthCallbackVO.bindError("OAUTH_ACCOUNT_ALREADY_BOUND",
                    "该第三方账号已被其他用户绑定");
        }

        // 4. 检查用户是否已绑定该平台的其他账号
        UserOAuth platformBinding = userOAuthMapper.selectOne(
                new LambdaQueryWrapper<UserOAuth>()
                        .eq(UserOAuth::getUserId, userId)
                        .eq(UserOAuth::getPlatform, platform));

        if (platformBinding != null) {
            log.warn("绑定失败：用户已绑定该平台的其他账号, userId={}, platform={}", 
                    userId, platform);
            return OAuthCallbackVO.bindError("OAUTH_PLATFORM_ALREADY_BOUND",
                    "您已绑定该平台的其他账号，请先解绑");
        }

        // 5. 创建绑定记录
        UserOAuth userOAuth = buildUserOAuth(userId, platform, oauthUserInfo, tokenDTO);
        userOAuthMapper.insert(userOAuth);

        log.info("用户绑定 OAuth 成功: userId={}, platform={}, openId={}",
                userId, platform, oauthUserInfo.getOpenId());

        return OAuthCallbackVO.bindSuccess();
    }

    /**
     * 处理登录回调（原有逻辑）
     */
    private OAuthCallbackVO handleLoginCallback(String platform, 
                                                OAuthUserInfoDTO oauthUserInfo,
                                                OAuthTokenDTO tokenDTO,
                                                HttpServletRequest request) {
        // ... 原有的登录/注册逻辑保持不变 ...
        
        // 查询是否已绑定
        UserOAuth existingBinding = userOAuthMapper.selectOne(
                new LambdaQueryWrapper<UserOAuth>()
                        .eq(UserOAuth::getPlatform, platform)
                        .eq(UserOAuth::getOpenId, oauthUserInfo.getOpenId()));

        if (existingBinding != null) {
            // 已绑定 - 直接登录
            String token = generateToken(existingBinding.getUserId());
            return OAuthCallbackVO.loginSuccess(token);
        } else {
            // 未绑定 - 返回 needBind
            String oauthKey = generateOAuthKey(platform, oauthUserInfo, tokenDTO);
            return OAuthCallbackVO.needBind(
                    oauthKey,
                    platform,
                    oauthUserInfo.getNickname(),
                    oauthUserInfo.getAvatar(),
                    oauthUserInfo.getEmail()
            );
        }
    }

    /**
     * 构建前端重定向 URL
     */
    @Override
    public String buildClientRedirectUrl(OAuthCallbackVO result) {
        String clientRedirectUri = result.getClientRedirectUri();
        StringBuilder url = new StringBuilder(clientRedirectUri);
        
        // 判断是否已有查询参数
        url.append(clientRedirectUri.contains("?") ? "&" : "?");

        // 添加 platform
        if (StringUtils.hasText(result.getPlatform())) {
            url.append("platform=").append(result.getPlatform()).append("&");
        }

        // ========== 绑定场景 ==========
        if (result.getBindSuccess() != null) {
            if (Boolean.TRUE.equals(result.getBindSuccess())) {
                url.append("bindSuccess=true");
            } else {
                url.append("error=true");
                if (StringUtils.hasText(result.getErrorCode())) {
                    url.append("&errorCode=").append(URLEncodeUtil.encode(result.getErrorCode()));
                }
                if (StringUtils.hasText(result.getMessage())) {
                    url.append("&message=").append(URLEncodeUtil.encode(result.getMessage()));
                }
            }
            
            log.info("OAuth 绑定回调重定向: {}", url);
            return url.toString();
        }

        // ========== 登录/注册场景 ==========
        if (Boolean.TRUE.equals(result.getNeedBind())) {
            url.append("needBind=true");
            url.append("&oauthKey=").append(URLEncodeUtil.encode(result.getOauthKey()));
            if (StringUtils.hasText(result.getNickname())) {
                url.append("&nickname=").append(URLEncodeUtil.encode(result.getNickname()));
            }
            if (StringUtils.hasText(result.getAvatar())) {
                url.append("&avatar=").append(URLEncodeUtil.encode(result.getAvatar()));
            }
            if (StringUtils.hasText(result.getEmail())) {
                url.append("&email=").append(URLEncodeUtil.encode(result.getEmail()));
            }
        } else {
            url.append("needBind=false");
            url.append("&token=").append(result.getToken());
        }

        log.info("OAuth 登录回调重定向: {}", url);
        return url.toString();
    }

    /**
     * 构建 UserOAuth 实体
     */
    private UserOAuth buildUserOAuth(String userId, String platform,
                                     OAuthUserInfoDTO userInfo, OAuthTokenDTO tokenDTO) {
        return new UserOAuth()
                .setUserId(userId)
                .setPlatform(platform)
                .setOpenId(userInfo.getOpenId())
                .setUnionId(userInfo.getUnionId())
                .setNickname(userInfo.getNickname())
                .setAvatar(userInfo.getAvatar())
                .setEmail(userInfo.getEmail())
                .setAccessToken(tokenDTO.getAccessToken())
                .setRefreshToken(tokenDTO.getRefreshToken())
                .setExpiresIn(tokenDTO.getExpiresIn())
                .setScope(tokenDTO.getScope());
    }

    /**
     * 构建后端回调 URL
     */
    private String buildBackendCallbackUrl(String platform) {
        // 返回后端的 OAuth 回调地址
        return "https://api.example.com/oauth/callback/" + platform;
    }

    // ... 其他辅助方法 ...
}
```

---

## 错误码定义

| 错误码 | 描述 | 场景 |
|-------|------|------|
| `OAUTH_ACCOUNT_ALREADY_BOUND` | 该第三方账号已被其他用户绑定 | 绑定时，同一 OpenID 已关联其他用户 |
| `OAUTH_PLATFORM_ALREADY_BOUND` | 用户已绑定该平台的其他账号 | 绑定时，用户已有该平台的绑定记录 |
| `TOKEN_INVALID` | 用户身份无效 | state 中的 userId 为空 |
| `TOKEN_EXPIRED` | 登录已过期 | JWT Token 验证失败 |
| `USER_NOT_FOUND` | 用户不存在 | userId 对应的用户记录不存在 |

---

## 重定向 URL 示例

### 绑定成功

```
http://localhost:3000/user/safe?platform=gitee&action=bind&bindSuccess=true
```

或深度链接（桌面端）：

```
jiwuchat://oauth/callback?platform=gitee&action=bind&bindSuccess=true
```

### 绑定失败 - 账号已被绑定

```
http://localhost:3000/user/safe?platform=gitee&action=bind&error=true&errorCode=OAUTH_ACCOUNT_ALREADY_BOUND&message=%E8%AF%A5%E7%AC%AC%E4%B8%89%E6%96%B9%E8%B4%A6%E5%8F%B7%E5%B7%B2%E8%A2%AB%E5%85%B6%E4%BB%96%E7%94%A8%E6%88%B7%E7%BB%91%E5%AE%9A
```

### 登录成功（原有逻辑不变）

```
http://localhost:3000/oauth/callback?platform=gitee&needBind=false&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 流程图

### 绑定流程

```
前端调用 GET /oauth/authorize/gitee?redirectUri=xxx&action=bind
（请求头携带 JWT Token）
    ↓
后端验证 Token，获取 userId
    ↓
生成 state，存储到 Redis：
{
    "state": "abc123",
    "platform": "gitee",
    "clientRedirectUri": "http://localhost:3000/user/safe?platform=gitee&action=bind",
    "action": "bind",
    "userId": "user_123",
    "createTime": 1702454400000,
    "expireTime": 1702454700000
}
    ↓
返回 Gitee 授权 URL
    ↓
用户在 Gitee 授权
    ↓
Gitee 回调 GET /oauth/callback/gitee?code=xxx&state=abc123
    ↓
后端从 Redis 获取 state 元数据
    ↓
识别 action=bind
    ↓
handleBindCallback()：
  1. 验证 userId 有效性
  2. 检查 OAuth 账号是否已被绑定
  3. 检查用户是否已绑定该平台
  4. 创建绑定记录
    ↓
302 重定向到前端：
/user/safe?platform=gitee&action=bind&bindSuccess=true
```

---

## 检查清单

- [ ] 添加 `OAuthStateDTO` 的 `action` 和 `userId` 字段
- [ ] 添加 `OAuthCallbackVO` 的绑定相关字段和静态方法
- [ ] 修改 `getAuthorizationUrl` 接口，支持 `action` 参数
- [ ] 绑定场景下验证 JWT Token 并获取 userId
- [ ] 修改 `handleCallback` 方法，根据 action 区分处理
- [ ] 实现 `handleBindCallback` 方法
- [ ] 修改 `buildClientRedirectUrl` 方法，支持绑定结果重定向
- [ ] 添加错误码枚举
- [ ] 编写单元测试
- [ ] 更新 API 文档
