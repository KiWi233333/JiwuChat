#!/usr/bin/env node

/**
 * 代码质量检查脚本
 * 参考: vue-next, element-plus, vite 等项目
 */

const { execSync, spawn } = require("node:child_process");
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

class QualityChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "..");
    this.packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"));
    this.results = {
      lint: false,
      typecheck: false,
    };
  }

  /**
   * 运行 ESLint 检查
   */
  async runLint(fix = false) {
    log.step("运行 ESLint 检查...");
    try {
      const command = fix ? "pnpm lint:fix" : "pnpm lint";
      execSync(command, {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
      log.success("ESLint 检查通过");
      this.results.lint = true;
    }
    catch (error) {
      log.error("ESLint 检查失败");
      this.results.lint = false;
      if (!fix) {
        log.info("提示: 运行 `node scripts/quality.js lint --fix` 自动修复部分问题");
      }
    }
  }

  /**
   * 运行 TypeScript 类型检查
   */
  async runTypeCheck() {
    log.step("运行 TypeScript 类型检查...");
    try {
      execSync("pnpm vue-tsc --noEmit", {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
      log.success("TypeScript 类型检查通过");
      this.results.typecheck = true;
    }
    catch (error) {
      log.error("TypeScript 类型检查失败");
      this.results.typecheck = false;
    }
  }


  /**
   * 运行所有检查
   */
  async runAll(options = {}) {
    log.title("开始代码质量检查...");

    const startTime = Date.now();

    await this.runLint(options.fix);
    await this.runTypeCheck();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    this.showSummary(duration);
  }

  /**
   * 显示检查结果摘要
   */
  showSummary(duration) {
    log.title("检查结果摘要:");

    const checks = [
      { name: "ESLint", result: this.results.lint },
      { name: "TypeScript", result: this.results.typecheck },
    ];

    checks.forEach(({ name, result }) => {
      if (result === true) {
        log.success(`${name}: 通过`);
      }
      else if (result === false) {
        log.error(`${name}: 失败`);
      }
      else {
        log.warning(`${name}: 跳过`);
      }
    });

    const passed = checks.filter(c => c.result === true).length;
    const total = checks.filter(c => c.result !== null).length;

    console.log(`\n检查完成! 耗时: ${duration}s`);
    console.log(`通过率: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)\n`);

    if (passed === total) {
      log.success("🎉 所有检查都通过了！");
    }
    else {
      log.error("❌ 部分检查未通过，请修复后重试");
      process.exit(1);
    }
  }

  /**
   * 观察模式
   */
  watch() {
    log.title("启动观察模式...");

    const watcher = spawn("pnpm", ["lint", "--watch"], {
      cwd: this.projectRoot,
      stdio: "inherit",
    });

    watcher.on("close", (code) => {
      if (code !== 0) {
        log.error(`观察模式退出，代码: ${code}`);
      }
    });

    process.on("SIGINT", () => {
      log.info("停止观察模式");
      watcher.kill();
      process.exit(0);
    });
  }
}

// 命令行参数处理
const command = process.argv[2];
const hasFixFlag = process.argv.includes("--fix");
const checker = new QualityChecker();

switch (command) {
  case "lint":
    checker.runLint(hasFixFlag);
    break;
  case "typecheck":
    checker.runTypeCheck();
    break;
  case "watch":
    checker.watch();
    break;
  default:
    checker.runAll({ fix: hasFixFlag });
}
