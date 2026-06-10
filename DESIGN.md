# Squoosh 二次开发设计方案

> 目标:在 Google Squoosh 的压缩引擎基础上,重新设计一个交互与 UI 都更精致的纯前端图片压缩 Web 应用,所有图像处理保留在用户本地浏览器,不上传任何数据。

## 1. 现状摸底

`squoosh-dev/squoosh-dev` 是 Google 官方 Squoosh 仓库的快照,核心能力已经符合「本地处理」要求:

- 编码/解码在 Web Worker 中跑,使用 WASM 编解码器:`mozjpeg` `oxipng` `webp` `avif` `jxl` `qoi` `wp2` `png`
- 客户端用 Preact + TypeScript + Rollup + CSS Modules,UI 偏 Material Design,单图为主
- 入口在 `src/client/lazy-app/Compress/index.tsx`(约 31KB),是主要 UI 容器
- `src/features/encoders` 与 `src/features/decoders` 提供了所有编码器的纯函数实现,可以脱离原 UI 直接复用

需要二次开发的地方:UI 单调、布局固定、缺少批量处理、移动端体验一般、构建链是 Rollup + Preact,与现代 React/Tailwind 生态错位。

## 2. 二次开发策略

保留 Squoosh 最有价值的部分——**编解码 WASM 与 Worker 桥接逻辑**;用现代前端栈重建 UI。

- 复用:`src/features/encoders` `src/features/decoders` `src/features/processors` `src/worker-shared` `codecs/*` 中的 WASM 文件
- 替换:`src/client/*` 整层 UI 重新实现;构建改用 Vite
- 增强:批量上传/导出、键盘快捷键、浅/深主题、动画与空状态、对比交互

## 3. 推荐技术栈

| 角色 | 选型 | 理由 |
| --- | --- | --- |
| 构建 | Vite 5 + TypeScript | HMR 快、零配置、纯客户端 SPA 场景最佳 |
| UI 框架 | React 18 | 生态最熟、社区组件库最丰富 |
| 样式 | Tailwind CSS 3 + CSS 变量主题 | 设计 token 化,深浅色好切 |
| 组件 | shadcn/ui (Radix 原语) | 可访问、可改源码,避免大包体 |
| 图标 | lucide-react | 与 shadcn 配套,线条干净 |
| 动画 | Framer Motion | 入场/列表/状态过渡 |
| 状态 | Zustand | 极轻,适合图像列表+设置 |
| Worker 桥 | Comlink | 与原项目保持一致,Worker 调用像函数一样 |
| 批量下载 | JSZip | 多文件打包 |
| 偏好持久化 | idb-keyval | 记上次设置,可选 |

## 4. 架构总览

`
squoosh-app/
├── public/
│   └── codecs/                  # 复用 Squoosh 编译产物
├── src/
│   ├── app/                     # 顶层 App shell, 路由/视图
│   ├── components/
│   │   └── ui/                  # shadcn 风格原子组件
│   ├── features/
│   │   ├── dropzone/            # 拖拽 / 点击 / 粘贴上传
│   │   ├── compare/             # 前后对比滑块
│   │   ├── compressor/          # Worker 桥、编解码配置
│   │   ├── batch/               # 多图队列、ZIP 导出
│   │   └── settings/            # 格式、质量、高级选项
│   ├── lib/                     # 通用工具 (canvas、文件、debounce)
│   ├── stores/                  # Zustand stores
│   ├── styles/                  # Tailwind 入口与全局变量
│   └── workers/                 # 编码/解码 Worker
├── index.html
├── tailwind.config.ts
├── vite.config.ts
└── package.json
`


Worker 边界:
- `worker.ts` 通过 Comlink 暴露 `decodeImage(file)` `encodeImage(bitmap, options, targetMime)`
- 主线程只持有 Blob/ImageBitmap/URL,所有大对象通过 `transfer` 转移所有权,避免拷贝
- 进程内只跑主线程 UI 编排与 WebGL/Canvas 渲染

## 5. 界面设计

整体走「克制的工具感」,不靠大渐变和卡片堆叠,让图片本身成为视觉主角。

### 5.1 全局
- 顶栏(64px 高):左侧 logo + 产品名(占位,待你定),右侧深浅主题切换、设置入口
- 持久可见的隐私徽标,文案:`Images processed locally. Nothing uploaded.`
- 主内容区固定最大宽度 1280px,左右内边距 24px

### 5.2 空状态(没有图片时)
- 居中的大号虚线拖拽框(高 280px,圆角 16px)
- 框内三行信息:主标题(24px)、副标题(说明支持格式与本地处理)、次级按钮 `Try a sample image`
- 拖拽框下方一行小字:`PNG · JPEG · WebP · AVIF · GIF`
- 不放 hero 图、不放浮动光斑;用克制的细线条 + 单一强调色做提示

### 5.3 工作台(有图片时)
桌面端三栏布局:

`
+--------+----------------------+--------------+
| 缩略图 |     对比预览区       |   格式/参数  |
| 列表   |     (前后滑块)       |   面板       |
| 240px  |     自适应           |   320px      |
+--------+----------------------+--------------+
|       底部操作栏(下载/重置/重编码)            |
+------------------------------------------------+
`


- 左栏:缩略图竖列(64x64),状态徽标(转码中、已完成、失败),右上角删除按钮;底部 `+` 按钮继续添加
- 中间:全高 Canvas,顶部小信息条 `原始 1240x820 · 1.2 MB`;主区为前后滑块,正中央细分割线 + 圆形把手;右下角 `100%` 缩放控件
- 右栏:格式分段控件 `MozJPEG | WebP | AVIF | OxiPNG | JXL`,只显示与所选格式相关的参数(质量/色板数/抖动等);底部固定显示「输入 1.2 MB → 输出 312 KB · 节省 74%」
- 底部操作栏:主按钮 `Download`(单图)/ `Download all (ZIP)`(多图),次按钮 `Reset`,所有改动停止 300ms 后自动重编码

移动端(<768px):
- 顶部 + 拖拽条固定
- 列表折叠为顶部水平 chip
- 参数面板抽为底部抽屉,主按钮置底

### 5.4 状态与微交互
- 上传完成:卡片左下角短暂出现文件名 + 大小,带勾选动画
- 转码中:缩略图覆盖半透明进度条;主预览区右下角出现圆形 indeterminate loader
- 完成后:对比滑块自动从原图切到结果图,参数面板数字使用 count-up 动效
- 错误:Toast 提示,缩略图角标变红,hover 显示原因
- 主题切换:全屏 0.25s 颜色淡入淡出

### 5.5 颜色与字体
- 字体:Inter(西文)+ 系统中文栈(`-apple-system`, `PingFang SC`, `Microsoft YaHei`)
- Light:背景 `#FAFAF9`,文字 `#0F172A`,强调色 `#10B981`(柔和翡翠绿)
- Dark:背景 `#0B0B0F`,文字 `#E5E7EB`,强调色 `#34D399`
- 边线/分隔:`rgba(15,23,42,0.08)`(Light)/ `rgba(229,231,235,0.08)`(Dark)
- 不使用渐变 orbs、不使用单一色系压全场,强调色只用在主操作/对比滑块把手/进度条

## 6. 关键交互细节

- 拖拽:整窗口监听 `dragover` 拖拽反馈,鼠标进入时整页边框高亮;支持文件夹递归(只取图片)
- 粘贴:`Cmd/Ctrl+V` 直接从剪贴板取图
- 对比滑块:`pointer-tracker` 实现,跟随光标;`Space` 键切换「完全显示原图/结果图」;`F` 键全屏预览
- 质量滑块:debounce 300ms 后重编码;拖动时主预览区临时灰显,完成回弹
- 高级选项折叠:点 `Advanced` 展开,默认值折叠,常驻可见的永远是最常用的 1-2 个
- 快捷键面板:`?` 打开列出所有快捷键
- 批量:每个图独立 worker 任务,按完成顺序推入结果列表;下载时统一打包

## 7. 本地处理保障

「图片不上传」需要在 UI 与工程两个层面同时保证:

- UI:首屏与每次上传前显示隐私徽标;README 与「关于」面板写明
- 工程:不引入任何上传/分析/上报依赖(无 GA、无 Sentry、无任何 fetch 上传);若以后想加分析,只统计交互事件,绝不上传图片或像素数据
- 验证:DevTools Network 面板在转码过程中应只见 `codecs/*.wasm` 请求,见不到图片数据外发
- 浏览器能力降级:不支持 OffscreenCanvas/WebAssembly 时给出明确提示并禁用转码,而不是静默失败

## 8. 开发阶段

按「能跑 → 能用 → 好看 → 能交付」递进,每阶段都有可演示产物。

1. **P1 脚手架与单图压缩**
   Vite + React + TS + Tailwind + shadcn 起步;空状态 + 拖拽;Worker 桥通一条 `mozjpeg` 端到端,下载压缩结果。
2. **P2 对比与参数**
   前后滑块、格式分段控件、质量滑块;自动重编码;显示节省比例。
3. **P3 批量与 ZIP**
   多图队列、并发控制(默认 2-3 个 worker)、一键 ZIP 下载。
4. **P4 精修**
   深浅主题、键盘快捷键、移动端适配、错误态、示例图、README 与隐私说明。
5. **P5 可选**
   PWA(manifest + service worker 缓存 codec);更多格式(JXL/QOI/WP2 已就绪);尺寸调整/旋转等预处理。

## 9. 决策待你确认

下列项会在落地时定,先标出来等你点头:

- 产品名(暂用 `Pixshrink` 占位)
- 是否做 PWA(offline 缓存 codec,首页可安装)
- 最低支持的浏览器(建议 chrome/edge/safari/firefox 近 2 年版本,需要 `OffscreenCanvas` + `WebAssembly SIMD`)
- 是否要在导航里加「设置/关于」页(显示快捷键列表与隐私说明)

确认后我会按 P1 起步,先把脚手架与单图压缩跑通,再逐阶段推进。
