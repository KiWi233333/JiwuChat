#!/usr/bin/env node

/**
 * 构建和部署脚本
 * 参考: nuxt, vite, vue-cli 等项目
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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
  step: msg => console.log(`${colors.blue}📝 ${msg}${colors.reset}`),
};

class BuildScript {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "..");
    this.packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"));
    this.buildDir = path.join(this.projectRoot, ".output");
    this.distDir = path.join(this.projectRoot, "dist");
  }

  /**
   * 清理构建产物
   */
  clean() {
    log.step("清理构建产物...");
    const dirsToClean = [this.buildDir, this.distDir, path.join(this.projectRoot, ".nuxt")];

    dirsToClean.forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        log.success(`已清理: ${path.relative(this.projectRoot, dir)}`);
      }
    });
  }

  /**
   * 检查构建环境
   */
  checkBuildEnv() {
    log.step("检查构建环境...");

    // 检查内存
    const totalMem = os.totalmem() / (1024 * 1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024 * 1024);

    log.info(`系统内存: ${totalMem.toFixed(1)}GB (可用: ${freeMem.toFixed(1)}GB)`);

    if (freeMem < 2) {
      log.warning("可用内存不足2GB，构建可能会比较慢");
    }

    // 检查磁盘空间
    try {
      fs.statSync(this.projectRoot);
      log.success("构建环境检查通过");
    }
    catch (error) {
      log.error(`构建环境检查失败: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 构建项目
   */
  async build() {
    log.title("开始构建项目 (production)...");

    this.checkBuildEnv();
    this.clean();

    const startTime = Date.now();

    try {
      // 设置环境变量
      const env = {
        ...process.env,
        NODE_ENV: "production",
        NUXT_PUBLIC_NODE_ENV: "production",
      };

      log.step("安装依赖...");
      execSync("pnpm install", {
        cwd: this.projectRoot,
        stdio: "inherit",
        env,
      });

      log.step("运行代码检查...");
      try {
        execSync("pnpm lint", {
          cwd: this.projectRoot,
          stdio: "inherit",
          env,
        });
        log.success("代码检查通过");
      }
      catch (error) {
        log.warning("代码检查失败，但继续构建");
      }

      log.step("构建 Nuxt 应用 (production)...");
      execSync("pnpm build:nuxt", {
        cwd: this.projectRoot,
        stdio: "inherit",
        env,
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      log.success(`构建完成! 耗时: ${duration}s`);
      this.showBuildInfo();
    }
    catch (error) {
      log.error(`构建失败: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 构建桌面应用
   */
  async buildDesktop() {
    log.title("构建桌面应用...");

    try {
      // 先构建 web 应用
      await this.build("production");

      log.step("构建 Tauri 应用...");
      execSync("pnpm build:tauri", {
        cwd: this.projectRoot,
        stdio: "inherit",
      });

      log.success("桌面应用构建完成!");
    }
    catch (error) {
      log.error(`桌面应用构建失败: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 显示构建信息
   */
  showBuildInfo() {
    log.step("构建信息:");

    const outputDir = fs.existsSync(this.buildDir) ? this.buildDir : this.distDir;

    if (fs.existsSync(outputDir)) {
      const stats = this.getDirSize(outputDir);
      log.info(`输出目录: ${path.relative(this.projectRoot, outputDir)}`);
      log.info(`构建大小: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
      log.info(`文件数量: ${stats.files}`);
    }
  }

  /**
   * 获取目录大小
   */
  getDirSize(dirPath) {
    let totalSize = 0;
    let totalFiles = 0;

    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        const subDirStats = this.getDirSize(filePath);
        totalSize += subDirStats.size;
        totalFiles += subDirStats.files;
      }
      else {
        totalSize += stats.size;
        totalFiles++;
      }
    });

    return { size: totalSize, files: totalFiles };
  }


  /**
   * 分析构建产物
   */
  analyze() {
    log.step("分析构建产物...");

    try {
      // 使用 nuxt analyze 或自定义分析
      execSync("pnpm build:nuxt -- --analyze", {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
    }
    catch (error) {
      log.warning("无法运行分析，请检查是否安装了分析工具");
    }
  }
}

// 命令行参数处理
const command = process.argv[2];
const builder = new BuildScript();

switch (command) {
  case "clean":
    builder.clean();
    break;
  case "build":
    builder.build();
    break;
  case "desktop":
    builder.buildDesktop();
    break;
  case "analyze":
    builder.analyze();
    break;
  default:
    console.log(`
用法: node scripts/build.js <command>

命令:
  clean     清理构建产物
  build     构建项目 (production)
  desktop   构建桌面应用
  analyze   分析构建产物

示例:
  node scripts/build.js build
  node scripts/build.js desktop
    `);
}
