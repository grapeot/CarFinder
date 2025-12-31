# Car Finder 分层架构技术设计文档

本文档详细说明了将原型脚本升级为基于 FastAPI + React 的全栈 Web 应用的工程设计。

## 1. 架构总览

系统采用前后端分离架构，通过异步工作流处理耗时较长的图像生成任务。

- **前端 (Frontend)**: React + Vite.js + Vanilla CSS.
- **后端 (Backend)**: FastAPI (Python).
- **AI 引擎**: Gemini 3 Flash Preview (用于规划与思考) + Nano Banana (用于图像生成).
- **构建管理**: Shell 脚本自动化前端编译。

## 2. 核心组件设计

### 2.1 状态管理 (Session & State)
- **无状态后端**: 后端不做复杂的 Session 持久化，大部分交互状态保存在前端内存中。
- **浏览器存储**: 用户当前的 Round 数、历史选择记录、当前 DNA 概况通过 React State 维护，刷新页面即重置。
- **图像存储**: 图像统一保存在 `outputs/images/` 目录下。具体的轮次（Round/Run）归属通过每个 Session 的 Metadata 维护。
- **静态资源**: 前端通过 API 获取 `/api/images/{filename}` 静态资源。

### 2.2 图像清理机制 (Image GC)
- **触发逻辑**: 每次生成新轮次时，后端会检查 `outputs/images/`。
- **约束**: 总图像文件数量限制在环境变量 `MAX_IMAGE_COUNT`（默认 1000）以内。
- **策略**: 采用 FIFO 策略，按文件创建时间删除最早的图片文件。

### 2.3 异步生成流
- 用户提交反馈后，后端立即返回“正在生成中”的状态。
- 后端使用 `FastAPI.BackgroundTasks` 依次调用 LLM 规划器和图像生成 API。
- 前端通过长轮询或状态检查接口更新图片。

## 3. API 接口设计

- `GET /`: 返回编译后的前端静态页面。
- `POST /api/restart`: 重置对话，生成 Round 1。
- `POST /api/feedback`: 
    - 输入：`feedback_text` (语音/文本内容)。
    - 输出：任务 ID，触发异步 7+2 生成。
- `GET /api/status/{round_id}`: 检查当前轮次的图片生成完成度。
- `GET /api/images/{path}`: 代理返回 output 目录下的图片。

## 4. 工程细节

### 4.1 环境变量 (.env)
- `GEMINI_API_KEY`: 必填。
- `MAX_IMAGE_COUNT`: 限制磁盘占用。
- `PORT`: 后端服务端口（默认 8000）。

### 4.2 构建脚本 (`scripts/build-frontend.sh`)
```bash
#!/bin/bash
cd frontend
npm install
npm run build
cp -r dist/* ../static/
```

## 5. 实现计划

### 第一阶段：后端骨架 (Current Turn)
1. 建立 FastAPI 基础，配置 `.env` 加载。
2. 移植 `design_engine.py` 逻辑到 FastAPI Endpoint。
3. 实现异步图片生成与 Cleanup 机制。

### 第二阶段：前端开发
1. 使用 Vite 初始化前端。
2. 实现九宫格展示、反馈输入框、历史记录滑块。
3. 接入语音识别 API (Web Speech API)。

### 第三阶段：收敛与打磨
1. 优化 CSS 视觉效果，确保“高级感”。
2. 实现 Gemini 3 Flash 的 Thinking 模式规划 Prompts。
