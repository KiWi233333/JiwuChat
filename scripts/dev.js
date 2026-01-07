#!/usr/bin/env node

/**
 * 开发服务器管理脚本
 * 参考: vite, nuxt, webpack-dev-server 等项目
 */

const { spawn } = require("node:child_process");
const fs = require("node:fs");
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

class DevServer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "..");
    this.packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"));
    this.processes = new Map();
  }

  /**
   * 检查端口是否被占用
   */
  async checkPort(port) {
    return new Promise((resolve) => {
      const { createServer } = require("node:net");
      const server = createServer();

      server.listen(port, (err) => {
        if (err) {
          resolve(false);
        }
        else {
          server.once("close", () => resolve(true));
          server.close();
        }
      });

      server.on("error", () => resolve(false));
    });
  }

  /**
   * 查找可用端口
   */
  async findAvailablePort(startPort = 3000) {
    let port = startPort;
    while (port < startPort + 100) {
      if (await this.checkPort(port)) {
        return port;
      }
      port++;
    }
    throw new Error(`无法找到可用端口 (尝试范围: ${startPort}-${port})`);
  }

  /**
   * 启动 Nuxt 开发服务器
   */
  async startNuxt() {
    log.step("启动 Nuxt 开发服务器...");

    const envLocalFile = ".env.development.local";

    // 检查环境文件
    if (!fs.existsSync(path.join(this.projectRoot, envLocalFile))) {
      log.warning(`环境文件 ${envLocalFile} 不存在`);
      if (fs.existsSync(path.join(this.projectRoot, ".env.development"))) {
        log.info("将使用默认环境文件");
      }
    }

    try {
      const nuxtProcess = spawn("pnpm", ["dev:nuxt"], {
        cwd: this.projectRoot,
        stdio: "inherit",
        shell: true,
      });

      this.processes.set("nuxt", nuxtProcess);

      nuxtProcess.on("close", (code) => {
        if (code !== 0) {
          log.error(`Nuxt 服务器退出，代码: ${code}`);
        }
        this.processes.delete("nuxt");
      });

      nuxtProcess.on("error", (error) => {
        log.error(`Nuxt 服务器启动失败: ${error.message}`);
        this.processes.delete("nuxt");
      });

      log.success("Nuxt 开发服务器启动成功");
    }
    catch (error) {
      log.error(`启动 Nuxt 服务器失败: ${error.message}`);
    }
  }

  /**
   * 启动 Tauri 开发服务器
   */
  async startTauri() {
    log.step("启动 Tauri 开发服务器...");

    try {
      const tauriProcess = spawn("pnpm", ["dev:tauri"], {
        cwd: this.projectRoot,
        stdio: "inherit",
        shell: true,
      });

      this.processes.set("tauri", tauriProcess);

      tauriProcess.on("close", (code) => {
        if (code !== 0) {
          log.error(`Tauri 开发服务器退出，代码: ${code}`);
        }
        this.processes.delete("tauri");
      });

      tauriProcess.on("error", (error) => {
        log.error(`Tauri 开发服务器启动失败: ${error.message}`);
        this.processes.delete("tauri");
      });

      log.success("Tauri 开发服务器启动成功");
    }
    catch (error) {
      log.error(`启动 Tauri 服务器失败: ${error.message}`);
    }
  }

  /**
   * 启动移动端开发
   */
  async startMobile(platform = "android") {
    log.step(`启动 ${platform} 开发服务器...`);

    const validPlatforms = ["android", "ios"];
    if (!validPlatforms.includes(platform)) {
      log.error(`不支持的平台: ${platform}. 支持的平台: ${validPlatforms.join(", ")}`);
      return;
    }

    try {
      const command = `dev:${platform}`;
      const mobileProcess = spawn("pnpm", [command], {
        cwd: this.projectRoot,
        stdio: "inherit",
        shell: true,
      });

      this.processes.set(platform, mobileProcess);

      mobileProcess.on("close", (code) => {
        if (code !== 0) {
          log.error(`${platform} 开发服务器退出，代码: ${code}`);
        }
        this.processes.delete(platform);
      });

      mobileProcess.on("error", (error) => {
        log.error(`${platform} 开发服务器启动失败: ${error.message}`);
        this.processes.delete(platform);
      });

      log.success(`${platform} 开发服务器启动成功`);
    }
    catch (error) {
      log.error(`启动 ${platform} 服务器失败: ${error.message}`);
    }
  }


  /**
   * 停止所有服务
   */
  stopAll() {
    log.step("停止所有开发服务器...");

    this.processes.forEach((process, name) => {
      log.info(`停止 ${name} 服务器...`);
      process.kill("SIGTERM");
    });

    this.processes.clear();
    log.success("所有服务器已停止");
  }

  /**
   * 设置信号处理
   */
  setupSignalHandlers() {
    process.on("SIGINT", () => {
      log.info("\n收到 SIGINT 信号，正在停止服务器...");
      this.stopAll();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      log.info("收到 SIGTERM 信号，正在停止服务器...");
      this.stopAll();
      process.exit(0);
    });
  }
}

// 命令行参数处理
const command = process.argv[2];
const option = process.argv[3];
const devServer = new DevServer();

// 设置信号处理
devServer.setupSignalHandlers();

switch (command) {
  case "nuxt":
    devServer.startNuxt();
    break;
  case "tauri":
    devServer.startTauri();
    break;
  case "mobile":
    devServer.startMobile(option || "android");
    break;
  case "stop":
    devServer.stopAll();
    break;
  default:
    console.log(`
用法: node scripts/dev.js <command> [option]

命令:
  nuxt             启动 Nuxt 开发服务器
  tauri            启动 Tauri 开发服务器
  mobile [platform] 启动移动端开发 [android|ios]
  stop             停止所有服务器

示例:
  node scripts/dev.js nuxt
  node scripts/dev.js tauri
  node scripts/dev.js mobile android
    `);
}
