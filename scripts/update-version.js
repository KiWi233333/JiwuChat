#!/usr/bin/env node

/**
 * 版本更新脚本
 * 自动更新 package.json、Cargo.toml 和 Android 版本配置
 *
 * 使用方法:
 *   node scripts/update-version.js <version>
 *   例如: node scripts/update-version.js 1.8.0
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

/**
 * 验证版本号格式
 */
function validateVersion(version) {
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(version)) {
    log.error(`版本号格式不正确: ${version}`);
    log.info("正确格式: X.Y.Z (例如: 1.8.0)");
    return false;
  }
  return true;
}

/**
 * 计算 Android versionCode
 * 格式: MMMNNNPPP (主版本号.次版本号.修订号)
 * 例如: 1.8.0 -> 1008000
 */
function calculateVersionCode(version) {
  const parts = version.split(".").map(Number);
  return parts[0] * 1000000 + parts[1] * 1000 + parts[2];
}

/**
 * 更新 package.json 版本号
 */
function updatePackageJson(projectRoot, version) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  log.step(`更新 package.json: ${packageJson.version} -> ${version}`);
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  log.success(`package.json 版本已更新到 ${version}`);
}

/**
 * 更新 Cargo.toml 版本号
 */
function updateCargoToml(projectRoot, version) {
  const cargoTomlPath = path.join(projectRoot, "src-tauri", "Cargo.toml");
  let cargoContent = fs.readFileSync(cargoTomlPath, "utf8");

  log.step(`更新 Cargo.toml: 查找当前版本...`);

  // 匹配 [package] 部分的 version 字段
  const versionRegex = /^(\s*version\s*=\s*")[^"]+(".*)$/m;
  if (versionRegex.test(cargoContent)) {
    cargoContent = cargoContent.replace(versionRegex, `$1${version}$2`);
    fs.writeFileSync(cargoTomlPath, cargoContent);
    log.success(`Cargo.toml 版本已更新到 ${version}`);
  }
  else {
    log.warning("未找到 Cargo.toml 中的 version 字段");
  }
}

/**
 * 更新 Android 版本配置
 * 注意: tauri.properties 是自动生成的，但我们可以通过 Tauri CLI 来更新
 * 实际上，Tauri 会根据 package.json 的版本自动生成 Android 版本
 * 但为了确保一致性，我们也可以手动更新 tauri.properties（如果存在）
 */
function updateAndroidVersion(projectRoot, version) {
  const versionCode = calculateVersionCode(version);
  const tauriPropertiesPath = path.join(projectRoot, "src-tauri", "gen", "android", "app", "tauri.properties");

  log.step(`更新 Android 版本配置...`);
  log.info(`  versionName: ${version}`);
  log.info(`  versionCode: ${versionCode}`);

  // 如果文件存在，更新它（虽然它是自动生成的）
  if (fs.existsSync(tauriPropertiesPath)) {
    let propertiesContent = fs.readFileSync(tauriPropertiesPath, "utf8");

    // 更新 versionName
    propertiesContent = propertiesContent.replace(/^tauri\.android\.versionName=.*$/m, `tauri.android.versionName=${version}`);

    // 更新 versionCode
    propertiesContent = propertiesContent.replace(/^tauri\.android\.versionCode=.*$/m, `tauri.android.versionCode=${versionCode}`);

    fs.writeFileSync(tauriPropertiesPath, propertiesContent);
    log.success(`Android 版本配置已更新`);
  }
  else {
    log.warning(`tauri.properties 文件不存在，将在下次构建时自动生成`);
    log.info("Android 版本会在 Tauri 构建时根据 package.json 自动生成");
  }
}

/**
 * 主函数
 */
function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const version = process.argv[2];

  if (!version) {
    log.error("请提供版本号");
    console.log(`
用法: node scripts/update-version.js <version>

示例:
  node scripts/update-version.js 1.8.0
  node scripts/update-version.js 1.8.1
    `);
    process.exit(1);
  }

  if (!validateVersion(version)) {
    process.exit(1);
  }

  log.title(`开始更新版本到 ${version}...`);

  try {
    // 1. 更新 package.json
    updatePackageJson(projectRoot, version);

    // 2. 更新 Cargo.toml
    updateCargoToml(projectRoot, version);

    // 3. 更新 Android 版本配置
    updateAndroidVersion(projectRoot, version);

    log.success(`\n🎉 版本更新完成!`);
    log.info(`\n已更新文件:`);
    log.info(`  - package.json`);
    log.info(`  - src-tauri/Cargo.toml`);
    log.info(`  - src-tauri/gen/android/app/tauri.properties (如果存在)`);
    log.info(`\n注意: tauri.conf.json 使用 "../package.json" 作为版本源，会自动同步`);

    log.warning(`\n⚠️  请手动检查以下文件:`);
    log.info(`  - src-tauri/tauri.conf.json (version 字段应指向 "../package.json")`);
    log.info(`  - .github/releasemd/v${version}.md (版本更新文档)`);
  }
  catch (error) {
    log.error(`版本更新失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { updatePackageJson, updateCargoToml, updateAndroidVersion, calculateVersionCode };
