# ClipNote

本地 Markdown 笔记工具，深度集成 Ollama 本地大模型，支持图片理解与智能分析。

> 所有数据留在本地，无云端依赖，隐私安全。

---

## 功能预览

| 功能 | 说明 |
|------|------|
| **📝 Markdown 编辑** | 左侧文件树 + 右侧编辑器，VSCode 风格布局 |
| **🤖 本地 AI 对话** | 基于 Ollama，无隐私担忧，支持多轮对话 |
| **🖼️ 图片理解** | Markdown 中的图片可被 AI 读取分析 |
| **📖 划词解释** | 选中任意文字，AI 深度解读 |
| **📄 文件总结** | 一键总结当前 Markdown 文件内容 |
| **💬 基于内容问答** | 打开文件或选中文件夹，向 AI 自由提问 |
| **📋 AI 回复复制** | 一键复制 AI 回复，无需手动选中 |
| **📁 文件管理** | 创建、删除、重命名、拖拽移动文件 |
| **🌙 暗色主题** | 护眼设计，开箱即用 |

---

## 快速开始

### 环境要求

- **Node.js** 18+
- **Ollama**（本地运行）

### 1. 安装依赖

```bash
git clone https://github.com/你的用户名/ClipNote.git
cd ClipNote
npm install
```

### 2. 安装 AI 模型

```bash
# 安装 Ollama（如果还没有）：https://ollama.com/download

# 拉取支持图片理解的多模态模型
ollama pull glm-ocr:q8_0
```

### 3. 启动

```bash
# 终端 1：启动 Ollama
ollama serve

# 终端 2：启动应用
npm run dev
```

---

## 项目结构

```
ClipNote/
├── electron/                 # Electron 主进程
│   ├── main.ts                # 主进程入口（窗口、IPC）
│   ├── preload.ts             # 预加载脚本（安全暴露 API）
│   ├── store.ts               # 用户配置持久化
│   ├── clipboard.ts           # 剪贴板监控
│   └── shortcuts.ts           # 全局快捷键
├── src/                       # React 渲染进程
│   ├── App.tsx                # 根组件
│   ├── main.tsx               # 渲染进程入口
│   ├── components/
│   │   ├── AiPanel.tsx        # AI 对话面板
│   │   ├── Editor.tsx         # Markdown 编辑器（CodeMirror）
│   │   ├── FileTree.tsx       # 文件树
│   │   ├── Settings.tsx       # 设置面板
│   │   └── Notification.tsx  # 通知提示
│   ├── store/
│   │   └── appStore.ts        # Zustand 状态管理
│   ├── styles/
│   │   └── global.css         # 全局样式（VSCode 暗色主题）
│   └── utils/
│       └── ollama.ts          # Ollama API 封装
├── assets/                    # 静态资源
├── package.json
├── vite.config.ts
├── tsconfig.json
└── electron-builder.yml       # 打包配置
```

---

## 技术栈

<p align="center">
<img src="https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron"/>
<img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
<img src="https://img.shields.io/badge/CodeMirror-243057?style=flat-square&logo=code&logoColor=white" alt="CodeMirror"/>
<img src="https://img.shields.io/badge/Zustand-5B6C7D?style=flat-square&logo=zustand&logoColor=white" alt="Zustand"/>
</p>

- **Electron** — 跨平台桌面应用框架
- **React 18** — UI 渲染
- **TypeScript** — 类型安全
- **Vite** — 极速构建工具
- **CodeMirror 6** — Markdown 编辑器
- **Zustand** — 轻量状态管理
- **Ollama** — 本地大模型推理引擎

---

## 配置说明

首次启动后，点击右下角 ⚙️ 按钮打开设置：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| Ollama 地址 | `http://localhost:11434` | Ollama 服务地址 |
| 模型 | `glm-ocr:q8_0` | 推荐使用 glm-ocr 支持图片理解 |
| 语言 | English | 界面语言 |

---

## 打包发布

```bash
# 构建 Electron 应用
npm run build:electron

# 打包为可执行文件
npm run package
```

打包后的文件位于 `release/` 目录。

---

## License

MIT
