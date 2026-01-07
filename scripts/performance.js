#!/usr/bin/env node

/**
 * 性能分析和监控脚本
 * 参考: lighthouse, web-vitals, bundle-analyzer 等工具
 */

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

class PerformanceAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "..");
    this.packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"));
    this.reportsDir = path.join(this.projectRoot, "reports");
  }

  /**
   * 确保报告目录存在
   */
  ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * 分析构建产物大小
   */
  async analyzeBundleSize() {
    log.step("分析构建产物大小...");
    this.ensureReportsDir();

    try {
      // 检查是否存在构建产物
      const outputDirs = [
        path.join(this.projectRoot, ".output"),
        path.join(this.projectRoot, "dist"),
      ];

      let buildDir = null;
      for (const dir of outputDirs) {
        if (fs.existsSync(dir)) {
          buildDir = dir;
          break;
        }
      }

      if (!buildDir) {
        log.warning("未找到构建产物，请先运行构建命令");
        return;
      }

      // 分析文件大小
      const analysis = this.analyzeDirSize(buildDir);
      const reportPath = path.join(this.reportsDir, "bundle-size.json");

      fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

      // 显示结果
      log.success("构建产物分析完成:");
      console.log(`  总大小: ${this.formatBytes(analysis.totalSize)}`);
      console.log(`  文件数量: ${analysis.totalFiles}`);
      console.log(`  最大文件: ${analysis.largestFile.name} (${this.formatBytes(analysis.largestFile.size)})`);

      // 检查大文件
      const largeFiles = analysis.files.filter(f => f.size > 1024 * 1024); // > 1MB
      if (largeFiles.length > 0) {
        log.warning("发现大文件 (>1MB):");
        largeFiles.forEach((f) => {
          console.log(`  ${f.path}: ${this.formatBytes(f.size)}`);
        });
      }
    }
    catch (error) {
      log.error(`构建产物分析失败: ${error.message}`);
    }
  }

  /**
   * 分析目录大小
   */
  analyzeDirSize(dirPath) {
    const files = [];
    let totalSize = 0;
    let totalFiles = 0;
    let largestFile = { name: "", size: 0 };

    const scanDir = (currentPath) => {
      const items = fs.readdirSync(currentPath);

      items.forEach((item) => {
        const itemPath = path.join(currentPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          scanDir(itemPath);
        }
        else {
          const relativePath = path.relative(this.projectRoot, itemPath);
          const fileInfo = {
            path: relativePath,
            size: stats.size,
            name: item,
          };

          files.push(fileInfo);
          totalSize += stats.size;
          totalFiles++;

          if (stats.size > largestFile.size) {
            largestFile = { name: relativePath, size: stats.size };
          }
        }
      });
    };

    scanDir(dirPath);

    return {
      totalSize,
      totalFiles,
      largestFile,
      files: files.sort((a, b) => b.size - a.size).slice(0, 20), // 前20个最大文件
    };
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes) {
    if (bytes === 0)
      return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
  }
}

// 命令行参数处理
const command = process.argv[2];
const analyzer = new PerformanceAnalyzer();

switch (command) {
  case "bundle":
    analyzer.analyzeBundleSize();
    break;
  default:
    console.log(`
用法: node scripts/performance.js <command>

命令:
  bundle              分析构建产物大小

示例:
  node scripts/performance.js bundle
    `);
}
