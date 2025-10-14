#!/usr/bin/env node

// 在生产环境不运行
if (process.env.NODE_ENV === "production") {
  console.log("🚫 当前为生产环境，跳过环境检查。");
  process.exit(0);
}

// 检查是否跳过环境检查
if (process.env.SKIP_CHECK_ENV === "true" || process.env.SKIP_CHECK_ENV === 1 || process.env.SKIP_CHECK_ENV === "1") {
  console.log(`🔇 环境变量 SKIP_CHECK_ENV=${process.env.SKIP_CHECK_ENV}，跳过环境检查`);
  process.exit(0);
}

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

/**
 * 彩色日志工具
 */
const colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
};

const log = {
  info: msg => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: msg => console.log(`${colors.bright}${colors.magenta}🚀 ${msg}${colors.reset}`),
  result: msg => console.log(`${colors.bright}${colors.blue}📋 ${msg}${colors.reset}`),
  celebrate: msg => console.log(`${colors.bright}${colors.green}🎉 ${msg}${colors.reset}`),
};

/**
 * 检查开发环境是否满足要求
 */
class EnvironmentChecker {
  constructor() {
    this.errors = [];
    this.projectRoot = path.resolve(__dirname, "..");
  }

  /**
   * 检查并创建 .env.local 文件
   */
  checkAndCreateEnvFiles() {
    log.info("检查 .env.local 文件");
    const envFiles = [
      { source: ".env.development", dest: ".env.development.local" },
      { source: ".env.production", dest: ".env.production.local" },
    ];

    for (const { source, dest } of envFiles) {
      const sourcePath = path.join(this.projectRoot, source);
      const destPath = path.join(this.projectRoot, dest);

      if (fs.existsSync(destPath)) {
        log.success(`文件 ${dest} 已存在，跳过创建。`);
      }
      else {
        if (fs.existsSync(sourcePath)) {
          try {
            fs.copyFileSync(sourcePath, destPath);
            log.success(`已从 ${source} 创建 ${dest} 文件。`);
          }
          catch (error) {
            const errorMessage = `创建 ${dest} 文件失败: ${error.message}`;
            this.errors.push(errorMessage);
            log.error(errorMessage);
          }
        }
        else {
          log.warning(`源文件 ${source} 不存在，无法创建 ${dest}。`);
        }
      }
    }
  }

  /**
   * 检查 Node.js 版本
   */
  checkNodeVersion() {
    try {
      const nodeVersion = process.version;
      const currentVersion = nodeVersion.substring(1); // 移除 'v' 前缀

      log.info(`检查 Node.js 版本: ${nodeVersion}`);

      if (this.compareVersions(currentVersion, "20.0.0") < 0) {
        this.errors.push(`Node.js 版本过低！当前: ${nodeVersion}，要求: >= 20.0.0`);
        log.error(`Node.js 版本过低！当前: ${nodeVersion}，要求: >= 20.0.0`);
      }
      else {
        log.success("Node.js 版本符合要求");
      }
    }
    catch (error) {
      this.errors.push(`无法检查 Node.js 版本: ${error}`);
      log.error(`无法检查 Node.js 版本: ${error}`);
    }
  }

  /**
   * 检查 Rust 是否安装
   */
  checkRustInstallation() {
    try {
      const rustcOutput = execSync("rustc --version", { encoding: "utf8" }).trim();
      const cargoOutput = execSync("cargo --version", { encoding: "utf8" }).trim();

      log.info("检查 Rust 工具链");
      log.success(`rustc: ${rustcOutput}`);
      log.success(`cargo: ${cargoOutput}`);
    }
    catch (error) {
      this.errors.push("Rust 工具链未安装或不可用");
      log.error("Rust 工具链未安装或不可用");
      log.warning("请访问 https://rustup.rs/ 安装 Rust");
    }
  }

  /**
   * 比较版本号
   */
  compareVersions(version1, version2) {
    const v1parts = version1.split(".").map(Number);
    const v2parts = version2.split(".").map(Number);
    const maxLength = Math.max(v1parts.length, v2parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part > v2part)
        return 1;
      if (v1part < v2part)
        return -1;
    }

    return 0;
  }

  /**
   * 运行所有检查
   */
  async check() {
    log.title("开始检查开发环境...\n");

    this.checkAndCreateEnvFiles();
    this.checkNodeVersion();
    this.checkRustInstallation();

    log.result("\n检查结果:");

    // 显示错误
    if (this.errors.length > 0) {
      console.log("");
      this.errors.forEach(error => log.error(error));
      console.log("");
      log.warning("💡 建议:");
      console.log("   1. 请升级 Node.js 到 20.0.0 或更高版本");
      console.log("   2. 请安装 Rust 工具链: https://rustup.rs/");
      console.log("   3. 参考项目 README.md 获取详细的环境配置说明\n");
      return false;
    }

    log.celebrate("\n开发环境检查通过！所有必需工具都已正确安装。\n");

    // 运行命令
    log.title("运行命令:");
    console.log("");
    console.log(`${colors.bright}${colors.blue}📦 生产环境 Nuxt 服务:${colors.reset}`);
    console.log(`   ${colors.cyan}pnpm run prod:nuxt${colors.reset}`);
    console.log("");
    console.log(`${colors.bright}${colors.blue}🔧 开发环境 Tauri 应用:${colors.reset}`);
    console.log(`   ${colors.cyan}pnpm run dev:tauri${colors.reset}`);
    console.log("");
    console.log(`${colors.bright}${colors.blue}🛠️ 开发工具:${colors.reset}`);
    console.log(`   ${colors.cyan}pnpm run tools${colors.reset}`);
    console.log("");
    return true;
  }
}

// 主函数
async function main() {
  const checker = new EnvironmentChecker();
  const success = await checker.check();

  if (!success) {
    // process.exit(1);
  }
}

// 仅在直接运行时执行
if (require.main === module) {
  main().catch((error) => {
    log.error(`环境检查失败: ${error}`);
    process.exit(1);
  });
}

module.exports = EnvironmentChecker;
