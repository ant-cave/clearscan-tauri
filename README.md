# ClearScan（Tauri 复刻版）

本地优先的文档扫描应用，用 **Tauri 2 + Vue 3** 复刻 [ant-cave/ClearScan](https://github.com/ant-cave/ClearScan)。
本复刻版**省略实时边缘引导（阶段 A）**，采用「拍后处理」流程——这是与上游最核心的差异，
也是它能用 Tauri 顺滑跨平台（桌面 + 移动端）的原因。

## 功能

| 模块 | 说明 |
| --- | --- |
| 输入 | 导入图片（桌面为文件选择）；移动端用系统相机拍摄（HTML `capture`，零相机插件） |
| 透视校正 | OpenCV 自动检测文档四边形 + Canvas 手动拖四角微调，再透视变换 |
| 滤镜 | 智能灰度 / 魔法彩色（除法归一化）/ 黑白 / 墨水 / 白纸，均带阈值·锐化·降噪·纸张提亮·增强 可调参数 |
| 文档库 | SQLite 存元数据 + 文件系统落盘页面图片（新建/重命名/删除/打开页面） |
| 导出 | 前端 pdf-lib 多页合成 PDF，系统保存对话框落盘 |

## 技术栈

- 前端：Vue 3 + 原生 JavaScript（无 TS）+ Vite，pnpm 管理
- 后端：Rust（Tauri 2），插件 `dialog` / `fs` / `sql` / `shell`
- 视觉计算：OpenCV.js（**单文件 WASM 构建，已内嵌，运行时零外部依赖**）
- 存储：`tauri-plugin-sql`（SQLite）+ `tauri-plugin-fs`（AppData 目录）
- PDF：`pdf-lib`

> 设计要点：所有 OpenCV 视觉计算放在前端 WASM，Rust 后端只做文件落地、SQLite、系统对话框。
> 移动端「拍照」不引入任何相机插件，直接用 `<input capture>` 调系统相机，跨平台一致。

## 目录结构

```
clearscan-tauri/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── opencv.js            # 单文件 OpenCV（WASM 已内嵌，离线）
├── src/
│   ├── main.js
│   ├── App.vue              # 路由壳（5 个页面切换）
│   ├── store.js             # 全局响应式状态
│   ├── style.css
│   ├── lib/
│   │   ├── opencv.js        # OpenCV 加载器 + ImageData↔Mat 互转
│   │   ├── perspective.js   # 四边形检测 + 透视变换
│   │   ├── filters.js       # 5 种滤镜
│   │   ├── db.js            # SQLite 文档库封装
│   │   ├── storage.js       # 文件系统图片落盘
│   │   ├── pdf.js           # pdf-lib 导出
│   │   └── imageio.js       # File→ImageData 工具
│   └── components/
│       ├── ScanView.vue
│       ├── CorrectView.vue
│       ├── FilterView.vue
│       ├── LibraryView.vue
│       └── ExportView.vue
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── capabilities/default.json
    └── src/{main.rs, lib.rs}
```

## 环境要求

- Node 18+ 与 pnpm
- Rust 1.77+ 及系统依赖：
  - **Linux 桌面**：`webkit2gtk-4.1-dev`、`librsvg2-dev`、`libjavascriptcoregtk-4.1-dev`、`build-essential`、`curl`、`wget`、`file`（Tauri 官方 prerequisites）
  - macOS / Windows：参见 [Tauri 文档](https://v2.tauri.app/start/prerequisites/)
- 移动端：Android SDK/NDK（Android）、Xcode（iOS）

## 安装与运行

```bash
pnpm install
pnpm tauri icon      # 首次生成应用图标（bundle 需要）
pnpm tauri dev       # 开发模式（桌面）
pnpm tauri build     # 打包当前平台
pnpm tauri android init && pnpm tauri android dev   # 移动端（需 Android 环境）
pnpm tauri ios init  && pnpm tauri ios dev          # iOS（需 macOS + Xcode）
```

仅验证前端（不需要 Rust 工具链，OpenCV 在浏览器中可直接运行）：

```bash
pnpm dev             # vite dev，浏览器打开即可使用完整扫描流程
pnpm build           # vite build -> dist/
```

## 关于 OpenCV

`public/opencv.js` 为**单文件构建**（OpenCV 4.12.0，WASM 以 base64 内嵌其中），
运行时完全本地、不依赖任何 CDN，契合「本地优先」。来源：`opencv-js-wasm` npm 包。

## 发布到 GitHub（CI/CD）

已内置与上游 ant-cave/ClearScan 同款逻辑的流水线：

| 工作流 | 触发 | 行为 |
| --- | --- | --- |
| `ci.yml` | push main / PR | 安装依赖 → `pnpm build` 验证可构建 |
| `release.yml` | push `v*` 标签 | 校验标签与 `tauri.conf.json` 版本一致 → 构建 **aarch64 APK** → 生成 SHA-256 校验和 → 自动发布 GitHub Release |

一键推送（在能访问 GitHub 的机器上执行；token 从环境变量读取，不会写入任何文件）：

```bash
GITHUB_TOKEN=ghp_xxx bash scripts/push-to-github.sh
# 可选: OWNER=ant-cave REPO=clearscan-tauri TAG=v0.1.0
```

脚本会：创建仓库（如不存在）→ push main → push `v0.1.0` 标签 → 触发 Actions 自动构建 APK（约 20-40 分钟），完成后到 Release 页下载 `app-aarch64-debug.apk` 与 `.sha256`。

> 构建 APK 需要 Rust + JDK 17 + Android SDK/NDK（CI 环境自动安装），本地编译参见上文「环境要求」。

## 已知限制 / 与上游差异

- 省略实时边缘引导（A 阶段），改为拍后处理流程
- 第一版无文档库密码保护（页面明文存于 AppData，后续可加加密）
- 桌面端拍照走系统相机（`capture`）而非原生相机插件
- PDF 导出在桌面走系统保存对话框；移动端分享能力后续补充
- 未含上游的二维码识别与云端 AI 翻译（按需求范围第一版未做）
