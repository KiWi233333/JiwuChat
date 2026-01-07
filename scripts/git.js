#!/usr/bin/env node

/**
 * Git Hooks 和版本管理脚本
 * 参考: vue-next, element-plus, conventional-changelog 等项目
 */

const { execSync } = require("node:child_process");
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

class GitManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "..");
    this.packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"));
  }

  /**
   * 检查 Git 状态
   */
  checkGitStatus() {
    try {
      const status = execSync("git status --porcelain", {
        encoding: "utf8",
        cwd: this.projectRoot,
      });

      if (status.trim()) {
        const lines = status.trim().split("\n");
        log.warning(`发现 ${lines.length} 个未提交的文件:`);
        lines.forEach(line => console.log(`  ${line}`));
        return false;
      }

      log.success("工作目录干净");
      return true;
    }
    catch (error) {
      log.error("检查 Git 状态失败，请确保在 Git 仓库中");
      return false;
    }
  }

  /**
   * 检查提交信息格式
   */
  validateCommitMessage(message) {
    // Conventional Commits 格式: type(scope): description
    const conventionalCommitRegex = /^(?:feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(?:\(.+\))?: .{1,72}$/;

    if (!conventionalCommitRegex.test(message)) {
      log.error("提交信息格式不正确");
      log.info("正确格式: type(scope): description");
      log.info("类型: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert");
      log.info("示例: feat(chat): add real-time messaging");
      return false;
    }

    return true;
  }

  /**
   * 预提交检查
   */
  async preCommitCheck() {
    log.title("执行预提交检查...");

    let passed = true;

    // 1. 代码格式检查
    log.step("检查代码格式...");
    try {
      execSync("pnpm lint", {
        cwd: this.projectRoot,
        stdio: "pipe",
      });
      log.success("代码格式检查通过");
    }
    catch (error) {
      log.error("代码格式检查失败，尝试自动修复...");
      try {
        execSync("pnpm lint:fix", {
          cwd: this.projectRoot,
          stdio: "inherit",
        });
        log.success("代码格式已自动修复");
      }
      catch (fixError) {
        log.error("自动修复失败，请手动修复后重新提交");
        passed = false;
      }
    }

    // 2. TypeScript 类型检查
    log.step("TypeScript 类型检查...");
    try {
      execSync("pnpm vue-tsc --noEmit", {
        cwd: this.projectRoot,
        stdio: "pipe",
      });
      log.success("TypeScript 类型检查通过");
    }
    catch (error) {
      log.error("TypeScript 类型检查失败");
      passed = false;
    }

    // 3. 测试检查（如果有测试）
    if (this.packageJson.scripts?.test) {
      log.step("运行测试...");
      try {
        execSync("pnpm test", {
          cwd: this.projectRoot,
          stdio: "pipe",
        });
        log.success("测试通过");
      }
      catch (error) {
        log.error("测试失败");
        passed = false;
      }
    }

    return passed;
  }

  /**
   * 生成变更日志
   */
  generateChangelog() {
    log.step("生成变更日志...");

    try {
      // 获取上一个版本标签
      let lastTag;
      try {
        lastTag = execSync("git describe --tags --abbrev=0", {
          encoding: "utf8",
          cwd: this.projectRoot,
        }).trim();
      }
      catch {
        lastTag = ""; // 如果没有标签，从头开始
      }

      // 获取提交历史
      const gitLogCommand = lastTag ? `git log ${lastTag}..HEAD --oneline --no-merges` : "git log --oneline --no-merges";

      const commits = execSync(gitLogCommand, {
        encoding: "utf8",
        cwd: this.projectRoot,
      }).trim();

      if (!commits) {
        log.warning("没有新的提交，跳过变更日志生成");
        return;
      }

      // 解析提交
      const commitLines = commits.split("\n");
      const changelog = this.parseCommits(commitLines);

      // 写入变更日志
      const changelogPath = path.join(this.projectRoot, "CHANGELOG.md");
      const currentDate = new Date().toISOString().split("T")[0];
      const version = this.packageJson.version;

      let changelogContent = `## [${version}] - ${currentDate}\n\n${changelog}\n\n`;

      if (fs.existsSync(changelogPath)) {
        const existingContent = fs.readFileSync(changelogPath, "utf8");
        changelogContent += existingContent;
      }

      fs.writeFileSync(changelogPath, changelogContent);
      log.success("变更日志已生成");
    }
    catch (error) {
      log.error(`生成变更日志失败: ${error.message}`);
    }
  }

  /**
   * 解析提交信息
   */
  parseCommits(commitLines) {
    const categories = {
      feat: "✨ 新功能",
      fix: "🐛 Bug 修复",
      docs: "📝 文档",
      style: "💄 样式",
      refactor: "♻️ 重构",
      perf: "⚡ 性能优化",
      test: "✅ 测试",
      chore: "🔧 其他",
      ci: "👷 CI/CD",
      build: "📦 构建",
      revert: "⏪ 回滚",
    };

    const grouped = {};

    commitLines.forEach((line) => {
      const match = line.match(/^([a-f0-9]+) (feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: (.+)$/);

      if (match) {
        const [, hash, type, scope, description] = match;
        const category = categories[type] || categories.chore;

        if (!grouped[category]) {
          grouped[category] = [];
        }

        const scopeText = scope || "";
        grouped[category].push(`- ${description}${scopeText} ([${hash.substring(0, 7)}])`);
      }
      else {
        // 不符合规范的提交放入其他分类
        if (!grouped[categories.chore]) {
          grouped[categories.chore] = [];
        }
        grouped[categories.chore].push(`- ${line}`);
      }
    });

    let changelog = "";
    Object.entries(grouped).forEach(([category, items]) => {
      changelog += `### ${category}\n\n`;
      changelog += `${items.join("\n")}\n\n`;
    });

    return changelog.trim();
  }

  /**
   * 版本发布
   */
  async release(type = "patch") {
    log.title(`开始版本发布 (${type})...`);

    // 1. 检查 Git 状态
    if (!this.checkGitStatus()) {
      log.error("请先提交所有更改");
      return;
    }

    // 2. 运行测试
    log.step("运行预发布检查...");
    const preCheckPassed = await this.preCommitCheck();
    if (!preCheckPassed) {
      log.error("预发布检查失败，请修复后重试");
      return;
    }

    // 3. 计算新版本号
    log.step(`计算新版本号 (${type})...`);
    let newVersion;
    try {
      // 先使用 npm version 计算新版本号（不实际更新文件）
      const currentVersion = this.packageJson.version;
      const versionParts = currentVersion.split(".").map(Number);

      let newVersionParts;
      switch (type) {
        case "major":
          newVersionParts = [versionParts[0] + 1, 0, 0];
          break;
        case "minor":
          newVersionParts = [versionParts[0], versionParts[1] + 1, 0];
          break;
        case "patch":
        default:
          newVersionParts = [versionParts[0], versionParts[1], versionParts[2] + 1];
          break;
      }

      newVersion = newVersionParts.join(".");
      log.info(`当前版本: ${currentVersion}`);
      log.info(`新版本: ${newVersion}`);
    }
    catch (error) {
      log.error(`计算版本号失败: ${error.message}`);
      return;
    }

    // 4. 使用 update-version.js 更新所有版本号
    log.step(`更新所有版本号到 ${newVersion}...`);
    try {
      const updateVersionScript = path.join(this.projectRoot, "scripts", "update-version.js");
      if (!fs.existsSync(updateVersionScript)) {
        log.warning("update-version.js 脚本不存在，使用 npm version 更新");
        execSync(`npm version ${type} --no-git-tag-version`, {
          cwd: this.projectRoot,
          stdio: "inherit",
        });
      }
      else {
        execSync(`node "${updateVersionScript}" ${newVersion}`, {
          cwd: this.projectRoot,
          stdio: "inherit",
        });
      }
      log.success(`版本已更新到: ${newVersion}`);
    }
    catch (error) {
      log.error(`更新版本号失败: ${error.message}`);
      return;
    }

    // 5. 生成变更日志
    this.generateChangelog();

    // 6. 提交更改
    log.step("提交版本更改...");
    try {
      execSync("git add package.json src-tauri/Cargo.toml src-tauri/gen/android/app/tauri.properties", {
        cwd: this.projectRoot,
        stdio: "pipe",
      });
      execSync(
        `git commit -m "chore(release): 更新版本号至 ${newVersion}

- 更新 package.json 版本号
- 更新 Cargo.toml 版本号
- 更新 Android 版本配置"`,
        {
          cwd: this.projectRoot,
          stdio: "inherit",
        },
      );
    }
    catch (error) {
      log.warning("提交更改时出错，可能没有需要提交的文件");
    }

    // 7. 创建标签
    log.step("创建 Git 标签...");
    try {
      execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
    }
    catch (error) {
      log.error(`创建标签失败: ${error.message}`);
      return;
    }

    // 8. 推送到远程
    log.step("推送到远程仓库...");
    try {
      execSync("git push", { cwd: this.projectRoot, stdio: "inherit" });
      execSync("git push --tags", { cwd: this.projectRoot, stdio: "inherit" });
    }
    catch (error) {
      log.error(`推送到远程失败: ${error.message}`);
      log.warning("请手动推送: git push && git push --tags");
      return;
    }

    log.success(`🎉 版本 v${newVersion} 发布成功!`);
    log.info(`\n下一步:`);
    log.info(`  1. 创建 GitHub Release: https://github.com/KiWi233333/JiwuChat/releases/new`);
    log.info(`  2. 选择标签: v${newVersion}`);
    log.info(`  3. 复制 .github/releasemd/v${newVersion}.md 的内容作为 Release 说明`);
  }

  /**
   * 设置 Git Hooks
   */
  setupGitHooks() {
    log.step("设置 Git Hooks...");

    const hooksDir = path.join(this.projectRoot, ".git", "hooks");
    if (!fs.existsSync(hooksDir)) {
      log.error("Git hooks 目录不存在");
      return;
    }

    // Pre-commit hook
    const preCommitHook = `#!/bin/sh
# 预提交检查
node scripts/git.js pre-commit
`;

    // Commit-msg hook
    const commitMsgHook = `#!/bin/sh
# 检查提交信息格式
commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\\(.+\\))?: .{1,72}$'

if ! grep -qE "$commit_regex" "$1"; then
  echo "❌ 提交信息格式不正确"
  echo "正确格式: type(scope): description"
  echo "类型: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert"
  echo "示例: feat(chat): add real-time messaging"
  exit 1
fi
`;

    fs.writeFileSync(path.join(hooksDir, "pre-commit"), preCommitHook, { mode: 0o755 });
    fs.writeFileSync(path.join(hooksDir, "commit-msg"), commitMsgHook, { mode: 0o755 });

    log.success("Git Hooks 设置完成");
  }
}

// 命令行参数处理
const command = process.argv[2];
const option = process.argv[3];
const gitManager = new GitManager();

switch (command) {
  case "status":
    gitManager.checkGitStatus();
    break;
  case "pre-commit":
    gitManager.preCommitCheck().then((passed) => {
      if (!passed)
        process.exit(1);
    });
    break;
  case "changelog":
    gitManager.generateChangelog();
    break;
  case "release":
    gitManager.release(option || "patch");
    break;
  case "setup-hooks":
    gitManager.setupGitHooks();
    break;
  default:
    console.log(`
用法: node scripts/git.js <command> [option]

命令:
  status              检查 Git 状态
  pre-commit          执行预提交检查
  changelog           生成变更日志
  release [type]      版本发布 [patch|minor|major]
  setup-hooks         设置 Git Hooks

示例:
  node scripts/git.js status
  node scripts/git.js pre-commit
  node scripts/git.js release minor
  node scripts/git.js setup-hooks
    `);
}
