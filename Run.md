<div align=center>
 <div align=center margin="10em" style="margin:4em 0 0 0;font-size: 30px;letter-spacing:0.3em;">
<img src="./.doc/jiwuchat-tauri.png" width="140px" height="140px" alt="图片名称" align=center />
 </div>
 <h2 align=center style="margin: 2em 0;">极物聊天 Tauri APP 运行指南</h2>
 </div>

> 这是一个基于 Tauri + Nuxt.js 开发的跨平台聊天应用项目运行指南。

## 🛠️ 环境要求

### 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Linux
- **内存**: 至少 4GB RAM
- **存储**: 至少 2GB 可用空间

### 必需工具安装

#### 1. Node.js 环境

```bash
# 下载并安装 Node.js 20+ 版本
# 官网: https://nodejs.org/
# 推荐使用 LTS 版本
node --version  # 验证安装 (应该 >= 20.0.0)
npm --version   # 验证 npm
```

#### 2. 包管理器

```bash
# 安装 pnpm (推荐)
npm install -g pnpm
pnpm --version
```

#### 3. Rust 环境 (Tauri 必需)

```bash
# 访问 https://rustup.rs/ 安装 Rust
# Windows 用户可以下载 rustup-init.exe

# 1) 设置国内源的环境变量（临时）：
$ENV:RUSTUP_DIST_SERVER='https://mirrors.ustc.edu.cn/rust-static'
$ENV:RUSTUP_UPDATE_ROOT='https://mirrors.ustc.edu.cn/rust-static/rustup'

# 2） 然后再重新执行 rust 安装程序：
.\rustup-init.exe

# 3）安装完成后验证:
rustc --version
cargo --version
```

## 📥 项目安装

### 1. 克隆项目

```bash
git clone https://github.com/Kiwi233333/JiwuChat.git
cd JiwuChat
```

### 2. 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 3. 环境配置

```bash
# 复制环境配置文件
cp .env.example .env.development
cp .env.example .env.production

# 编辑环境配置文件，填入必要的配置信息
# 如 API 地址、WebSocket 地址等
```

## 🚀 运行项目

### 开发模式

#### 1. 仅运行 Web 端 (Nuxt.js)

```bash
# 开发环境
pnpm run dev:nuxt
# 或指定环境文件
pnpm run dev-local:nuxt

# 生产环境测试
pnpm run prod:nuxt
# 或本地生产环境
pnpm run prod-local:nuxt
```

访问: <http://localhost:3000>

#### 2. 运行桌面应用 (Tauri)

```bash
# 启动 Tauri 开发模式 (同时启动 Nuxt.js 和 Tauri)
pnpm run dev:tauri
# 或
pnpm run dev:desktop
```

#### 3. 移动端开发

```bash
# Android 开发 (需要 Android Studio)
pnpm run dev:android

# iOS 开发 (仅限 macOS，需要 Xcode)
pnpm run dev:ios
```

### 生产构建

#### 1. 构建 Web 应用

```bash
# 构建生产版本
pnpm run build:nuxt

# 本地环境构建
pnpm run build-local:nuxt

# 预览构建结果
pnpm run preview
```

#### 2. 构建桌面应用

```bash
# 完整构建 (Web + Desktop)
pnpm run build

# 仅构建 Tauri 应用
pnpm run build:tauri
```

#### 3. 构建移动应用

```bash
# Android APK
pnpm run build:android

# iOS IPA (仅限 macOS)
pnpm run build:ios
```

## 🧪 开发工具

### 代码质量检查

```bash
# ESLint 检查
pnpm run lint

# 自动修复代码风格问题
pnpm run lint:fix
```

### 移动端初始化

```bash
# 初始化 Android 支持
pnpm run android-init

# 初始化 iOS 支持 (仅限 macOS)
pnpm run ios-init
```

## 📁 项目结构

```tree
JiwuChat/
├── app/                    # Nuxt.js 应用目录
├── assets/                 # 静态资源 (样式、图片等)
├── components/             # Vue 组件
│   ├── Chat/              # 聊天相关组件
│   ├── btn/               # 按钮组件
│   ├── card/              # 卡片组件
│   └── ...
├── composables/           # Vue Composables
├── pages/                 # 页面路由
├── plugins/               # Nuxt.js 插件
├── src-tauri/             # Tauri 后端代码 (Rust)
├── types/                 # TypeScript 类型定义
├── public/                # 公共静态文件
├── package.json           # 项目配置和依赖
├── nuxt.config.ts        # Nuxt.js 配置
├── tauri.conf.json       # Tauri 配置
└── tsconfig.json         # TypeScript 配置
```

## 🔧 常见问题解决

### 1. Rust 编译错误

```bash
# 更新 Rust 工具链
rustup update

# 清理构建缓存
cargo clean
```

### 2. 依赖安装失败

```bash
# 清理 node_modules 和锁文件
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 或强制重新安装
pnpm install --force
```

### 3. Tauri 构建失败

```bash
# 确保安装了正确的系统依赖
# 检查 Tauri 配置
tauri info

# 清理 Tauri 构建缓存
cd src-tauri
cargo clean
cd ..
```

### 4. 端口冲突

```bash
# 修改 nuxt.config.ts 中的端口配置
# 或者使用环境变量
PORT=3001 pnpm run dev:nuxt
```

## 📱 移动端开发额外要求

### Android 开发

- **Android Studio**: 最新稳定版
- **Android SDK**: API Level 24+
- **Java**: JDK 17+

<!--
### iOS 开发 (仅限 macOS)

- **Xcode**: 14.0+
- **iOS SDK**: 13.0+
- **Apple Developer Account**: 用于真机测试和发布 -->

## 🚢 部署

### Web 部署

项目可以部署到任何支持静态文件托管的平台:

- Netlify
- Vercel
- GitHub Pages
- 自建服务器

### 应用分发

- **Windows**: 生成 `.msi` 或 `.exe` 安装包
- **macOS**: 生成 `.dmg` 或 `.app` 应用包
- **Linux**: 生成 `.deb`、`.rpm` 或 `AppImage`
- **Android**: 生成 `.apk` 安装包
- **iOS**: 生成 `.ipa` 安装包

## 📞 技术支持

如果在运行过程中遇到问题，可以:

1. 查看项目 [Issues](https://github.com/Kiwi233333/JiwuChat/issues)
2. 阅读 [Tauri 官方文档](https://tauri.app/zh/)
3. 阅读 [Nuxt.js 官方文档](https://nuxt.com/)
4. 提交新的 Issue 寻求帮助

---

**祝你使用愉快！** 🎉
