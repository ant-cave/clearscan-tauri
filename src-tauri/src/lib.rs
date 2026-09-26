// ClearScan Tauri 后端入口
//
// 设计原则（对应已确认需求）：
// - 视觉计算（OpenCV 检测/校正/滤镜）全部放在前端 OpenCV.js (WASM)，Rust 后端只做
//   文件落地、SQLite 文档库、系统对话框与分享。这样跨平台构建成本最低。
// - 移动端“拍照”不引入相机插件：前端用 <input capture> 调系统相机，返回图片文件。

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! 来自 ClearScan 后端", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running ClearScan")
}
