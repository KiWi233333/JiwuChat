// commands.rs
use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct DirStats {
    pub total_size: u64,
    pub file_count: u64,
    pub dir_count: u64,
}

/// 扫描目录统计信息
#[command]
pub async fn scan_dir_stats(path: PathBuf) -> Result<DirStats, String> {
    use std::fs;

    if !path.exists() {
        return Err("路径不存在".to_string());
    }

    if !path.is_dir() {
        return Err("路径不是目录".to_string());
    }

    let mut total_size = 0u64;
    let mut file_count = 0u64;
    let mut dir_count = 0u64;

    /// 递归扫描目录统计信息
    fn scan_recursive(
        dir: &std::path::Path,
        total_size: &mut u64,
        file_count: &mut u64,
        dir_count: &mut u64,
    ) -> Result<(), String> {
        let entries = fs::read_dir(dir).map_err(|e| format!("读取目录失败: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
            let path = entry.path();
            let metadata = fs::metadata(&path).map_err(|e| format!("获取文件元数据失败: {}", e))?;

            if metadata.is_file() {
                *total_size += metadata.len();
                *file_count += 1;
            } else if metadata.is_dir() {
                *dir_count += 1;
                scan_recursive(&path, total_size, file_count, dir_count)?;
            }
        }
        Ok(())
    }

    scan_recursive(&path, &mut total_size, &mut file_count, &mut dir_count)?;

    Ok(DirStats {
        total_size,
        file_count,
        dir_count,
    })
}

#[tauri::command]
pub async fn exist_file(path: PathBuf) -> bool {
    path.exists()
}

#[tauri::command]
pub async fn remove_file(path: PathBuf) -> bool {
    std::fs::remove_file(path).is_ok()
}

#[tauri::command]
pub async fn mkdir_file(path: PathBuf) -> bool {
    std::fs::create_dir(path).is_ok()
}

#[tauri::command]
pub async fn exit_app() {
    std::process::exit(0);
}
