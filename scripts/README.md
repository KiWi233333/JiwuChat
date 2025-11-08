# 前端工程化脚本

本项目提供了一套完整的前端工程化脚本，并通过交互式命令行界面（CLI）统一管理，参考了Vue、Nuxt、Vite、Element Plus等知名开源项目的最佳实践。

## 🚀 快速开始

只需要一个命令即可启动所有工程化功能：

```bash
# 启动工程化工具
pnpm tools
```

## 🎯 功能概览

### 📱 交互式命令行界面

```md
╔══════════════════════════════════════════╗
║ 🛠️ 前端工程化工具 v1.0 ║
║ 📦 依赖管理 🔍 代码质量 🏗️ 构建管理 🚀 开发服务 ║
║ 📝 Git工作流 ⚡ 性能分析 🔧 环境管理 ⚡ 快速操作 ║
╚══════════════════════════════════════════╝
```

### 统一入口的优势

1. **简化操作**：只需记住一个命令 `pnpm tools`
2. **交互友好**：清晰的菜单导航和彩色输出
3. **功能分类**：按功能模块组织，易于查找
4. **快速操作**：提供常用工作流的一键执行

## 📁 文件结构

```
scripts/
├── tools.js       # 🎯 统一工程化入口 (主要)
├── check-env.js      # 环境检查
├── deps-check.js     # 依赖管理
├── build.js          # 构建管理
├── quality.js        # 代码质量
├── dev.js            # 开发服务器
├── git.js            # Git 工作流
└── performance.js    # 性能分析

package.json          # 只保留 "tools" 一个入口命令
```

这套工程化脚本将显著提升你的开发效率和代码质量！

## 🎯 新增脚本功能

### 1. 依赖管理脚本 (`deps-check.js`)

- ✅ 检查过时的依赖包
- ✅ 安全漏洞扫描
- ✅ 重复依赖检测
- ✅ 依赖清理和重装

### 2. 构建管理脚本 (`build.js`)

- ✅ 智能构建环境检查
- ✅ 多环境构建支持
- ✅ 构建产物分析
- ✅ 桌面应用构建

### 3. 代码质量脚本 (`quality.js`)

- ✅ ESLint 代码检查
- ✅ TypeScript 类型检查
- ✅ 代码复杂度分析
- ✅ 自动化测试运行

### 4. 开发服务器脚本 (`dev.js`)

- ✅ 多平台开发服务器管理
- ✅ 端口冲突检测
- ✅ 系统信息展示
- ✅ 健康检查

### 5. Git 工作流脚本 (`git.js`)

- ✅ Conventional Commits 规范
- ✅ 自动变更日志生成
- ✅ 版本发布流程
- ✅ Git Hooks 配置

### 6. 性能分析脚本 (`performance.js`)

- ✅ 构建产物大小分析
- ✅ Lighthouse 性能评估
- ✅ 内存使用监控
- ✅ 网络性能测试

## 🚀 快速使用

```bash
# 依赖管理
pnpm deps:check          # 检查所有依赖问题
pnpm deps:outdated       # 检查过时依赖
pnpm deps:security       # 安全检查

# 代码质量
pnpm quality:check       # 完整质量检查
pnpm quality:fix         # 自动修复代码格式

# 构建管理
pnpm build:clean         # 清理构建产物
pnpm build:desktop       # 构建桌面应用
pnpm build:analyze       # 分析构建产物

# 开发服务器
pnpm dev:health          # 健康检查
pnpm dev:info            # 系统信息

# Git 工作流
pnpm git:release         # 版本发布
pnpm git:setup-hooks     # 设置 Git Hooks

# 性能分析
pnpm perf:bundle         # 分析构建大小
pnpm perf:lighthouse     # Lighthouse 分析
pnpm perf:report         # 生成性能报告
```

## 📋 参考的开源项目

- **Vue.js**: Git 工作流、发布流程
- **Nuxt.js**: 构建策略、多目标构建
- **Vite**: 开发服务器、构建优化
- **Element Plus**: 代码质量标准
- **Lerna**: 依赖管理策略
- **Angular**: Conventional Commits 规范
- **Lighthouse**: 性能分析标准

## 🎁 核心优势

1. **开箱即用**: 所有脚本都已配置好，直接运行即可
2. **专业标准**: 参考知名开源项目的最佳实践
3. **完整覆盖**: 从开发到部署的全流程工程化
4. **智能检测**: 自动发现问题并提供解决建议
5. **彩色输出**: 友好的终端界面，易于阅读

## 📁 文件结构

```t
scripts/
├── check-env.js      # 环境检查 (原有)
├── deps-check.js     # 依赖管理 (新增)
├── build.js          # 构建管理 (新增)
├── quality.js        # 代码质量 (新增)
├── dev.js            # 开发服务器 (新增)
├── git.js            # Git 工作流 (新增)
└── performance.js    # 性能分析 (新增)

docs/
└── scripts-guide.md  # 详细使用指南

reports/             # 生成的报告目录
├── bundle-size.json
├── lighthouse-report.html
└── performance-report.json
```

这套工程化脚本将显著提升你的开发效率和代码质量！
