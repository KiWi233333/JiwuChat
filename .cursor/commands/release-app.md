# 发布版本（JiwuChat 发版流程）

按以下步骤执行发版流程。**不要自动执行 git commit / push**，仅在用户明确要求时再执行推送相关命令。

---

## 阶段 0：选择发版类型与目标版本

1. 读取 **根目录 `./package.json`** 中的 `version` 字段，得到当前版本号（如 `1.7.2`）。
2. 向用户确认发版类型（三选一）：
   - **major**：主版本（如 1.7.2 → 2.0.0）
   - **minor**：次版本（如 1.7.2 → 1.8.0）
   - **patch**：修订版本（如 1.7.2 → 1.7.3）
3. 询问是否**本次仅准备发版（不推送）**：
   - 若选「仅准备」：只更新版本号、编写/同步文档与资源，**不执行** `git tag` / `git push`，由用户稍后手动推送。
   - 若选「准备并推送」：在完成阶段 1～4 后，给出需要执行的 `git tag` 与 `git push` 命令，由用户确认后执行。
4. 根据选择计算**新版本号**（如 `1.8.0`），并确认**上一版本 tag**（如 `v1.7.2`），用于后续 git 统计。若本地无该 tag，以当前 `package.json` 的 version 对应的 `v{version}` 作为“上一版本”。

---

## 阶段 1：编写 `.github/releasemd/{version}.md`

1. **模板来源**：参考最近 2～3 个版本的发布说明（如 `.github/releasemd/v1.7.0.md`、`v1.7.1.md`、`v1.7.2.md`），归纳固定结构作为模板。
2. **模板需包含的区块**（与现有 releasemd 一致）：
   - 标题：`# {version} 版本说明`
   - 简短引言（一句或一段）
   - **✨ 新功能**（feat）
   - **🐛 修复了以下问题**（fix）
   - **⚡ 性能优化**（perf）
   - **🎨 界面优化**（style）
   - **🔧 构建优化**（build）
   - **📝 其他优化**（refactor / docs / chore）
   - **🤯 更新说明**（重要功能 + 可选截图路径 `assets/{version}/xxx.png`）
   - **📌 待办**（与最近版本保持一致）
   - **🧪 下载**（表格 + 二维码 + Release / Full Changelog 链接，版本号占位为 `{version}` 与上一版本号）
3. **创建文件**：`.github/releasemd/v{version}.md`（如 `v1.8.0.md`），先按模板写好结构，下载表格中的版本号与链接中的版本号、上一版本号全部替换为本次的 `{version}` 和上一版本 tag（如 `v1.7.2`）。
4. 若本版本需要配图：在 `.github/releasemd/assets/v{version}/` 下创建目录（可放 `.gitkeep`），并在「🤯 更新说明」中注明截图路径格式：`assets/v{version}/xxx.png`。

---

## 阶段 2：用 Git 提交记录填充发布说明

1. **获取提交范围**：从**上一版本 tag** 到 **当前 HEAD** 的提交（不包含 merge commit）：
   ```bash
   git log v{上一版本}..HEAD --oneline --no-merges
   ```
   若有需要，再取完整 hash：
   ```bash
   git log v{上一版本}..HEAD --format='%h %H %s' --no-merges
   ```
2. **筛选与分类**：并不是每一条 feat、fix、perf 等都单独列出，而是将具有关联性或相似内容的变更进行聚合、归纳，形成分组和简要总结，有代表性地说明本次版本在各方面的主要改进和用户价值。按类型归入对应区块：
   - feat → ✨ 新功能
   - fix → 🐛 修复了以下问题
   - perf → ⚡ 性能优化
   - style → 🎨 界面优化
   - build / chore(deps) → 🔧 构建优化
   - refactor / docs / chore → 📝 其他优化
3. **每条条目格式**（与现有 releasemd 一致）：
   - `- [x] type(scope): 描述 ([#short_hash](https://github.com/KiWi233333/JiwuChat/commit/full_hash))`
4. **精简描述**：可适当合并同类项、简化措辞，突出“做了什么”和“对用户的价值”。
5. **额外一轮检查**：完成填充后，自检一遍：
   - 分类是否正确、有无遗漏重要提交；
   - 链接是否使用完整 commit hash、URL 是否正确；
   - 下载表格、Full Changelog 链接中的版本号是否为 `v{version}` 与上一版本 tag。

---

## 阶段 3：同步到官网文档（VitePress）

1. **复制发布说明**：
   - 源：`.github/releasemd/v{version}.md`
   - 目标：`./docs/jiwu-chat-blog/docs/versions/v{version}.md`
   - 可在开头增加一句可选引言（如「更新摘要如下：」），与现有 `v1.7.x` 风格一致；正文结构、列表、链接与 releasemd 保持一致。
2. **图片资源**（若本版本有截图）：
   - 源：`.github/releasemd/assets/v{version}/`
   - 目标：`./docs/jiwu-chat-blog/docs/versions/assets/v{version}/`
   - 复制后，文档内图片路径保持为 `assets/v{version}/xxx.png`（与 blog 中现有版本一致）。
3. **官网版本号**：将 `./docs/jiwu-chat-blog/package.json` 的 `version` 更新为与主仓一致的 `{version}`，这样导航栏「更新日志」会指向 `/versions/v{version}`（theme-config 从该 package.json 读 version）。

---

## 阶段 4：更新各处版本号（完成即可发布）

1. **根目录**
   - `./package.json`：`version` 改为 `{version}`（如 `1.8.0`）。
2. **Tauri**
   - `./src-tauri/Cargo.toml`：`[package]` 下 `version` 改为 `{version}`。
   - `tauri.conf.json` 使用 `"version": "../package.json"`，无需改。
3. **安卓端（Android）**
   - 更新 `./src-tauri/gen/android/app/tauri.properties`（若该文件存在）：
     - `tauri.android.versionName` = `{version}`（如 `1.8.0`）
     - `tauri.android.versionCode` = 按规则计算：主×1000000 + 次×1000 + 修订（如 `1.8.0` → `1008000`）
   - 说明：该文件在 `src-tauri/gen/android/app/.gitignore` 中，可能不存在于工作区；若存在则需同步，否则可在流程最后的命令块中执行 `node scripts/update-version.js {version}`，该脚本会一并更新 `package.json`、`Cargo.toml` 与 `tauri.properties`（若存在）。
4. **博客**
   - 版本号已在阶段 3 更新 `./docs/jiwu-chat-blog/package.json`。
   - 与根目录类似，需在流程最后**通过命令**让用户手动执行：在 `docs/jiwu-chat-blog` 下执行 `pnpm install`（以同步 package.json 变更后的依赖），该命令会写入「总流程结束」时的统一命令代码块。

完成后，发版所需文件与文档即齐备，可以发布该版本。

---

## 阶段 5：总流程结束 — 返回命令代码块（必须执行）

**无论用户选择「仅准备」还是「准备并推送」，在阶段 1～4 全部完成后，都必须输出一个「需用户手动执行的命令」代码块**，供用户复制到终端执行。不要自动执行其中的 git 或 pnpm 命令。

命令块应包含且顺序建议如下（将 `{version}`、`<当前分支名>` 替换为实际值）：

```bash
# 1. 查看变更
git status

# 2. 同步所有版本号（package.json、Cargo.toml、Android tauri.properties 若存在）
node scripts/update-version.js {version}

# 3. 暂存发版相关文件（按需调整路径；若 tauri.properties 存在且已纳入版本管理则一并 add）
git add package.json src-tauri/Cargo.toml .github/releasemd/v{version}.md .github/releasemd/assets/v{version}/
git add docs/jiwu-chat-blog/package.json docs/jiwu-chat-blog/docs/versions/v{version}.md docs/jiwu-chat-blog/docs/versions/assets/v{version}/
# 若 Android tauri.properties 存在且未在 .gitignore 中忽略，可加：git add src-tauri/gen/android/app/tauri.properties

# 4. 博客目录同步依赖（因 package.json version 已更新）
cd docs/jiwu-chat-blog && pnpm install && cd ../..

# 5. 提交（由用户自行执行，不要自动 commit）
git commit -m "chore(release): 发布 v{version}"

# 6. 打 tag（仅当用户选择「准备并推送」时执行下面两行）
git tag -a v{version} -m "Release v{version}"
git push origin <当前分支名> && git push origin v{version}
```

- 若用户选的是**仅准备**：在输出上述代码块时，可注释掉或说明「第 5 步暂不执行，由你稍后手动推送 tag 与分支」。
- 若用户选的是**准备并推送**：保留第 5 步，并将 `<当前分支名>` 替换为实际分支（如 `main`）。
- **提醒**：推送 tag `v{version}` 会触发 `.github/workflows/release.yml`，生成多平台构建并创建 Draft Release；用户需在 GitHub Releases 中编辑 Draft、粘贴 `.github/releasemd/v{version}.md` 内容后发布。

---

## 流程小结（检查清单）

- [ ] 阶段 0：已确认发版类型（major/minor/patch）与是否仅准备不推送；已确定新版本号与上一版本 tag。
- [ ] 阶段 1：已创建 `.github/releasemd/v{version}.md`，结构完整，下载与链接中的版本号已替换。
- [ ] 阶段 2：已用 `git log 上一tag..HEAD` 的提交填充并精简，分类正确，commit 链接有效；已做一轮规范检查。
- [ ] 阶段 3：已同步到 `docs/jiwu-chat-blog/docs/versions/v{version}.md` 及对应 `assets/v{version}/`；已更新 `docs/jiwu-chat-blog/package.json` 的 version。
- [ ] 阶段 4：已更新根目录 `package.json`、`src-tauri/Cargo.toml` 的版本号为 `{version}`；已处理 Android `tauri.properties`（若存在）或已将 `node scripts/update-version.js {version}` 纳入命令块；博客版本号已在阶段 3 更新，博客依赖同步命令已纳入阶段 5 命令块。
- [ ] 阶段 5：已输出**统一命令代码块**（含 `git add`、`git commit`、`docs/jiwu-chat-blog` 下 `pnpm install`、`git tag`、`git push`），供用户手动执行；并根据用户选择标注是否执行推送步骤；已提醒 CI 与 Draft Release 的后续操作。

执行本命令时，从阶段 0 开始，逐步执行并确认，直到用户选择「仅准备」或「准备并推送」并完成对应步骤为止。
