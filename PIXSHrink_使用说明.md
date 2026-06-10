 # Pixshrink 本地预览使用说明

 一切处理都在你本机的浏览器里完成，图片不会被上传到任何服务器。

 ## 方式 A：一键启动（推荐）

 1. 打开文件资源管理器，进入 `C:\Users\行者270\Documents\考试网站\squoosh-app`
 2. 双击 `启动预览.bat`
    - 如果系统提示 “未检测到 Node.js”，请先到 https://nodejs.org/ 下载安装 Node 18 或更高版本。
 3. 脚本会：
    - 自动用本机 Node 起一个本地 HTTP 服务（端口 4173）
    - 自动在默认浏览器打开 `http://127.0.0.1:4173/static-preview.html`
 4. 在页面里：
    - 拖一张图片到虚线框，或直接 `Ctrl+V` 粘贴
    - 拖动质量滑块，右侧会显示压缩前后大小、节省百分比
    - 点 "下载" 拿到压缩后的文件
 5. 不用时双击 `停止预览.bat`，或在黑色命令行窗口按 `Ctrl+C` 即可。

 ## 方式 B：手动启动

 ```powershell
 cd C:\Users\行者270\Documents\考试网站\squoosh-app
 node scripts\preview-server.mjs 4173
 ```

 然后在浏览器打开 `http://127.0.0.1:4173/static-preview.html`。

 ## 方式 C：完整 React + Vite 开发模式

 需要先 `npm install`：

 ```powershell
 cd C:\Users\行者270\Documents\考试网站\squoosh-app
 npm install
 npm run dev
 ```

 浏览器打开 `http://localhost:5173`。

 ## 常见问题

 - **双击 .bat 之后闪退**：多半是 Node 没装好。打开 PowerShell 跑 `node -v`，应该输出 `v18.x` 或更高。
 - **页面空白 / "Unexpected token"**：浏览器版本太老。本工具需要支持 WebAssembly + `import()` 的现代浏览器（Chrome 94+, Edge 94+, Firefox 110+, Safari 16.4+）。
 - **压缩没生效**：右侧应当实时显示 "已节省 x%" 和文件大小变化；如果一直是 0%，通常是图片已经是 JPEG 极小文件，本身没有压缩空间。
 - **WASM 加载失败**：看浏览器开发者工具的 Console，把第一行错误信息贴出来，按错误信息继续排查。

 ## 隐私确认

 DevTools - Network 面板，所有请求要么是 `data:` URL，要么是 `blob:` URL，没有任何对外部域名的请求。所有压缩、解码、缩放都在你本机浏览器里完成。
