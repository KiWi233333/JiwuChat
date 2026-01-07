#!/usr/bin/env node
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

/**
 * 交互式脚本：从远程分支同步 commit 到当前项目
 *
 * 使用示例：
 *   node scripts/sync-commits.js
 *   node scripts/sync-commits.js --mode=count
 *   node scripts/sync-commits.js --mode=custom
 *   或
 *   pnpm sync-commits
 *   pnpm sync-commits -- --mode=custom
 *
 * 模式：
 *   - count (默认): 按 commit 数量同步
 *   - custom: 自定义指定 commit 范围或 hash 值
 *
 * 功能：
 *   1. 自动获取远程仓库列表，交互式选择
 *   2. 自动获取指定仓库的分支列表，交互式选择
 *   3. 获取并显示最近的 commit 列表
 *   4. 根据模式选择同步方式：
 *      - count 模式: 选择要同步的 commit 数量
 *      - custom 模式: 自定义指定 commit 范围或 hash 值
 *   5. 执行 git fetch 和 git cherry-pick
 */

const { execSync } = require('child_process')
const readline = require('readline')

// 模式枚举
const MODE = {
  COUNT: 'count', // 默认模式：按 commit 数量
  CUSTOM: 'custom' // 自定义模式：指定 commit 范围或 hash
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  let mode = MODE.COUNT // 默认模式

  args.forEach((arg) => {
    if (arg.startsWith('--mode=')) {
      const modeValue = arg.split('=')[1]
      if (modeValue === MODE.COUNT || modeValue === MODE.CUSTOM) {
        mode = modeValue
      } else {
        console.warn(`⚠️  警告: 未知的模式 "${modeValue}"，使用默认模式 "${MODE.COUNT}"`)
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
用法: node scripts/sync-commits.js [选项]

选项:
  --mode=<mode>    设置同步模式
                    - count (默认): 按 commit 数量同步
                    - custom: 自定义指定 commit 范围或 hash 值
  --help, -h       显示帮助信息

行为说明:
  1. 脚本启动时会自动 stash 暂存区和工作区的变更
  2. 脚本退出时(无论成功或失败)会尝试自动恢复(pop)之前的 stash
  3. 如果 cherry-pick 过程中发生冲突且你手动修改了文件，pop 可能会产生冲突

使用建议:
  1. 尽量同步连续的 commits，避免因中间状态缺失导致冲突
  2. 避免同步 Merge Commits，除非清楚具体影响
  3. 保持本地分支 clean，没有未提交的更改
  4. 先 fetch 最新代码，减少冲突概率

示例:
  node scripts/sync-commits.js
  node scripts/sync-commits.js --mode=count
  node scripts/sync-commits.js --mode=custom
`)
      process.exit(0)
    }
  })

  return { mode }
}

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// 工具函数：执行命令并返回结果
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    })
    return { success: true, output: result }
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' }
  }
}

// 工具函数：询问用户输入
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim())
    })
  })
}

// 获取远程仓库列表
function getRemoteList() {
  const result = execCommand('git remote', { silent: true })
  if (!result.success) {
    return []
  }
  return result.output
    .trim()
    .split('\n')
    .filter((name) => name)
}

// 获取远程分支列表
function getRemoteBranches(remote) {
  // 方法1: 使用 git ls-remote (需要网络，但更准确)
  const lsRemoteResult = execCommand(`git ls-remote --heads ${remote}`, { silent: true })
  if (lsRemoteResult.success && lsRemoteResult.output.trim()) {
    const branches = lsRemoteResult.output
      .trim()
      .split('\n')
      .map((line) => {
        const parts = line.split('\t')
        return parts[1] ? parts[1].replace(/^refs\/heads\//, '') : null
      })
      .filter((branch) => branch)
      .sort()
    return branches
  }

  // 方法2: 使用 git branch -r (从本地缓存的远程分支)
  const branchResult = execCommand(`git branch -r`, { silent: true })
  if (branchResult.success && branchResult.output.trim()) {
    const branches = branchResult.output
      .trim()
      .split('\n')
      .map((line) => {
        const trimmed = line.trim()
        // 只返回匹配指定 remote 的分支
        if (trimmed.startsWith(`${remote}/`) && !trimmed.includes('HEAD')) {
          // 移除 remote 前缀，获取分支名
          const branch = trimmed.replace(new RegExp(`^${remote}/`), '')
          return branch
        }
        return null
      })
      .filter((branch) => branch)
      .sort()
    return [...new Set(branches)] // 去重
  }

  return []
}

// 交互式选择列表项
async function selectFromList(items, title, allowCustom = false) {
  if (items.length === 0) {
    return null
  }

  console.log(`\n${title}:`)
  items.forEach((item, index) => {
    console.log(`  ${(index + 1).toString().padStart(2)}. ${item}`)
  })
  if (allowCustom) {
    console.log(`  ${(items.length + 1).toString().padStart(2)}. 手动输入`)
  }
  console.log()

  const maxChoice = allowCustom ? items.length + 1 : items.length
  const choiceInput = await question(`请选择 (1-${maxChoice}): `)
  const choice = parseInt(choiceInput)

  if (isNaN(choice) || choice < 1 || choice > maxChoice) {
    console.error(`\n❌ 错误: 请输入 1-${maxChoice} 之间的数字`)
    return null
  }

  if (allowCustom && choice === items.length + 1) {
    const custom = await question('请输入自定义值: ')
    return custom.trim() || null
  }

  return items[choice - 1]
}

// 获取最近的 commit 列表
function getRecentCommits(remote, branch, count = 10) {
  const ref = `${remote}/${branch}`
  const command = `git log ${ref} --oneline -n ${count} --no-decorate`

  const result = execCommand(command, { silent: true })
  if (!result.success) {
    return []
  }

  const lines = result.output
    .trim()
    .split('\n')
    .filter((line) => line)
  return lines.map((line, index) => {
    const [hash, ...messageParts] = line.split(' ')
    return {
      index: index + 1,
      hash,
      message: messageParts.join(' ')
    }
  })
}

// 检查并执行 stash
function autoStash() {
  const status = execCommand('git status --porcelain', { silent: true })
  if (status.success && status.output.trim().length > 0) {
    console.log('\n📦 检测到工作区有未提交的更改，正在自动 stash (包含未跟踪文件)...')
    const stashResult = execCommand('git stash push --include-untracked -m "Auto-stash by sync-commits"', {
      silent: true
    })
    if (stashResult.success) {
      console.log('✅ 已保存更改到 stash')
      return true
    } else {
      console.warn('⚠️  自动 stash 失败:', stashResult.error)
      return false
    }
  }
  return false
}

// 恢复 stash
function popStash(stashed) {
  if (stashed) {
    console.log('\n📦 正在恢复之前 stash 的更改...')
    const popResult = execCommand('git stash pop', { silent: true })
    if (popResult.success) {
      console.log('✅ 已恢复工作区更改')
    } else {
      console.warn('⚠️  恢复 stash 失败(可能有冲突)，请手动执行 git stash pop')
    }
  }
}

// 主函数
async function main() {
  // 解析命令行参数
  const { mode } = parseArgs()

  console.log('\n====================================')
  console.log('  Git Commit 同步工具')
  if (mode === MODE.CUSTOM) {
    console.log(`  模式: ${MODE.CUSTOM} (自定义)`)
  } else {
    console.log(`  模式: ${MODE.COUNT} (按数量)`)
  }
  console.log('====================================\n')

  // 0. 自动 stash
  const stashed = autoStash()

  try {
    // 1. 获取并选择远程仓库
    console.log('[步骤 1/5] 正在获取远程仓库列表...')
    const remotes = getRemoteList()

    if (remotes.length === 0) {
      console.error('\n❌ 错误: 未找到任何远程仓库')
      console.error('   请先添加远程仓库: git remote add <name> <url>')
      return
    }

    const remote = await selectFromList(remotes, '📦 可用的远程仓库', true)
    if (!remote) {
      console.error('\n❌ 错误: 必须选择一个远程仓库')
      return
    }

    console.log(`\n✅ 已选择远程仓库: ${remote}\n`)

    // 2. 获取并选择分支
    console.log(`[步骤 2/5] 正在获取 ${remote} 的远程分支列表...`)

    // 先尝试 fetch 远程仓库以获取最新分支信息
    console.log('   正在更新远程分支信息...')
    execCommand(`git fetch ${remote}`, { silent: true })

    const branches = getRemoteBranches(remote)

    if (branches.length === 0) {
      console.warn('\n⚠️  警告: 无法获取远程分支列表')
      console.log('   尝试手动输入分支名...\n')
      const branch = await question('请输入分支名: ')
      if (!branch) {
        console.error('\n❌ 错误: 分支名不能为空！')
        return
      }
      await proceedWithSync(remote, branch, mode)
    } else {
      const branch = await selectFromList(branches, `🌿 ${remote} 的远程分支`, true)
      if (!branch) {
        console.error('\n❌ 错误: 必须选择一个分支')
        return
      }

      console.log(`\n✅ 已选择分支: ${branch}\n`)

      await proceedWithSync(remote, branch, mode)
    }
  } finally {
    // 无论成功还是失败，都尝试恢复 stash
    popStash(stashed)
    rl.close()
  }
}

// 检查范围内是否包含 Merge Commit
function hasMergeCommits(range) {
  // 使用 git rev-list 检查范围内是否有 merge commits
  const result = execCommand(`git rev-list --merges ${range}`, { silent: true })
  return result.success && result.output.trim().length > 0
}

// 处理 cherry-pick 冲突
async function handleCherryPickConflict() {
  console.error(`\n❌ Cherry-pick 遇到冲突！`)
  console.log('   Git 已在文件中生成冲突标记 (<<<<<<< / ======= / >>>>>>>)')
  console.log(`\n💡 请选择操作:`)
  console.log(`   [c]ontinue: 冲突解决并 git add 后，继续执行`)
  console.log(`   [a]bort:    放弃操作，回退到执行前状态`)
  console.log(`   [q]uit:     直接退出脚本 (保留当前状态)`)

  while (true) {
    const action = await question('\n请输入操作 (c/a/q): ')
    const choice = action.toLowerCase()

    if (choice === 'c' || choice === 'continue') {
      console.log('\n🔄 正在继续 cherry-pick...')
      // 检查是否有未合并的文件
      const status = execCommand('git status --porcelain', { silent: true })
      if (status.success && status.output.includes('UU ')) {
        // UU 表示双方修改（冲突）
        console.warn('⚠️  检测到仍有未解决的冲突文件(UU)，请先解决并 git add')
        continue
      }

      const result = execCommand('git cherry-pick --continue')
      if (result.success) {
        console.log('✅ 继续执行成功')
        return true
      } else {
        console.error('❌ 继续执行失败')
        console.log('错误信息:', result.error)
        console.log('💡 提示: 请确保已解决冲突并执行了 git add <file>')
      }
    } else if (choice === 'a' || choice === 'abort') {
      console.log('\n⚠️ 正在放弃 cherry-pick...')
      execCommand('git cherry-pick --abort')
      console.log('已回退操作')
      throw new Error('用户放弃操作')
    } else if (choice === 'q' || choice === 'quit') {
      console.log('\n已退出脚本')
      throw new Error('用户退出')
    }
  }
}

// 执行同步流程
async function proceedWithSync(remote, branch, mode = MODE.COUNT) {
  const ref = `${remote}/${branch}`
  console.log(`📦 准备从 ${ref} 同步 commit...\n`)

  // 3. 执行 git fetch
  console.log(`[步骤 3/5] 正在获取远程分支信息...`)
  const fetchResult = execCommand(`git fetch ${remote} ${branch}`)
  if (!fetchResult.success) {
    throw new Error(`无法获取远程分支 ${ref}\n   请检查远程仓库名和分支名是否正确`)
  }
  console.log('✅ 获取成功\n')

  // 4. 根据模式选择同步方式
  let range = ''
  let commitInfo = ''

  if (mode === MODE.CUSTOM) {
    // 自定义模式：允许用户输入 commit 范围或 hash
    console.log(`[步骤 4/5] 自定义模式：请输入要同步的 commit`)

    // 先显示最近的 commit 列表作为参考
    console.log(`\n📋 最近的 commit 列表 (作为参考):\n`)
    const commits = getRecentCommits(remote, branch, 10)
    if (commits.length > 0) {
      commits.forEach((commit) => {
        console.log(`  ${commit.hash.substring(0, 7)} - ${commit.message}`)
      })
      console.log()
    }

    console.log('💡 支持的格式:')
    console.log('   - 单个 commit hash: 4aa5faa')
    console.log('   - 多个 commit hash (空格分隔): 4aa5faa 6422f0c')
    console.log('   - commit 范围: 6422f0c^..4aa5faa 或 6422f0c..4aa5faa')
    console.log(`   - 相对引用 (基于 ${ref}): ${ref}~2..${ref} 或 ${ref}~1^..${ref}`)
    console.log('   - 其他 git cherry-pick 支持的格式')
    console.log(`\n⚠️  注意: 相对引用（如 HEAD~2）基于当前分支，建议使用 ${ref}~2 等格式\n`)

    const customInput = await question('请输入 commit 范围或 hash: ')
    if (!customInput) {
      throw new Error('必须输入 commit 范围或 hash')
    }

    range = customInput.trim()

    // 如果用户输入的是相对引用（如 HEAD~2），尝试转换为基于远程分支的引用
    // 但保留用户原始输入，因为可能是有意的
    if (range.includes('HEAD') && !range.includes(ref)) {
      console.warn(`\n⚠️  警告: 检测到相对引用 "HEAD"，这基于当前分支而非远程分支 ${ref}`)
      console.warn(`   如果这是有意的，请继续；否则建议使用 ${ref}~N 格式\n`)
    }

    commitInfo = `自定义范围: ${range}`
  } else if (mode === MODE.COUNT) {
    // 默认模式：按 commit 数量
    console.log(`[步骤 4/5] 正在获取最近的 commit 列表...`)
    const commits = getRecentCommits(remote, branch, 20)

    if (commits.length === 0) {
      throw new Error(`无法获取 commit 列表\n   请检查分支 ${ref} 是否存在`)
    }

    console.log(`\n📋 最近的 commit 列表 (共 ${commits.length} 个):\n`)
    commits.forEach((commit) => {
      console.log(`  ${commit.index.toString().padStart(2)}. ${commit.hash.substring(0, 7)} - ${commit.message}`)
    })
    console.log()

    // 询问要同步的 commit 数量
    const countInput = await question(`请输入要同步的 commit 数量 (1-${commits.length}, 默认: 1): `)
    const count = parseInt(countInput) || 1

    if (isNaN(count) || count < 1 || count > commits.length) {
      throw new Error(`请输入 1-${commits.length} 之间的数字`)
    }

    // 构建 cherry-pick 范围：从倒数第 count 个 commit 到最新的 commit
    // git cherry-pick 的 A..B 语法不包含 A，所以要使用 A^..B 来包含起始点
    // 例如：如果要同步 2 个，则使用 ~1^..HEAD (从倒数第2个到最新，共2个，包含起始点)
    // 如果要同步 1 个，则直接使用 ref (最新的1个)
    range = count === 1 ? ref : `${ref}~${count - 1}^..${ref}`

    // 显示将要同步的 commit
    const selectedCommits = commits.slice(0, count)
    console.log(`\n📌 将同步以下 ${count} 个 commit:`)
    selectedCommits.forEach((commit) => {
      console.log(`   - ${commit.hash.substring(0, 7)} - ${commit.message}`)
    })
    console.log()
    commitInfo = `${count} 个 commit`
  } else {
    throw new Error(`未知的模式 "${mode}"`)
  }

  // 5. 检查 Merge Commit
  const hasMerges = hasMergeCommits(range)
  let extraArgs = ''

  if (hasMerges) {
    console.warn('\n⚠️  检测到选中的范围内包含 Merge Commit (合并提交)')
    console.log('   Cherry-pick 合并提交需要指定父节点 (通常是 -m 1)')

    const useMainline = await question('是否添加 -m 1 参数? (Y/n): ')
    if (useMainline.toLowerCase() !== 'n') {
      extraArgs = ' -m 1'
      console.log('👉 已添加 -m 1 参数')
    }
  }

  // 6. 确认操作
  console.log('\n📝 将要执行的命令:')
  console.log(`   git cherry-pick ${range}${extraArgs}`)
  console.log()

  const confirm = await question('确认执行 cherry-pick? (y/N): ')
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ 已取消操作')
    return
  }

  // 7. 执行 cherry-pick
  console.log(`\n[步骤 5/5] 正在执行 cherry-pick...`)

  const cherryPickResult = execCommand(`git cherry-pick ${range}${extraArgs}`)

  if (!cherryPickResult.success) {
    await handleCherryPickConflict()
  }

  console.log('\n✅ 同步完成！')
  if (mode === MODE.CUSTOM) {
    console.log(`\n✨ 已成功同步自定义范围到当前分支\n`)
  } else {
    console.log(`\n✨ 已成功同步 ${commitInfo} 到当前分支\n`)
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 发生错误:', error.message)
  rl.close()
  process.exit(1)
})
