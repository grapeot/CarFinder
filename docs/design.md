# Dream Car Finder: 全栈技术设计文档 (Engineering Design)

本项目是一个基于 FastAPI 和 React 的高性能汽车设计探索工具。

## 1. 架构概览

### 1.1 前端 (React + Vite)
- **品牌**: 重塑为 **Dream Car Finder**。
- **状态管理**: 
    - 采用 **Stateless Backend** 模式。全量的设计基因组（Design Genome）由前端 React State 维护。
    - 每次反馈时，前端将完整的 DNA 状态传回后端，确保系统具备长短期记忆。
- **渲染引擎**: 
    - 集成 `react-markdown` 渲染 AI 生成的**设计人格总结 (AI Summary)**。
    - 采用非侵入性 **HUD (Status Overlay)**，通过右下角浮窗展示生成的并行进度（Analyzing -> Generating）。
- **交互优化**: 
    - 快捷键支持：`Enter` 发送，`Shift+Enter` 换行。
    - 渐进式加载：新一轮生成时保留旧图，直到新图就绪。

### 1.2 后端 (FastAPI)
- **AI 规划层**: 使用 **Gemini 3 Flash (Thinking Mode)** 进行语义纠偏 (Rectify) 和 7+2 提示词规划。
- **图像渲染层**: 使用并行协程 (`asyncio.gather`) 发起图像生成请求。
- **鲁棒性**: 实现了带**指数退避 (Exponential Backoff)** 的自动重试机制，有效应对 API 模型过载 (503) 错误。
- **存储管理**: 
    - 图片统一存储在 `outputs/images/`。
    - **Image GC**: 按照 `MAX_IMAGE_COUNT` 约束，采用 FIFO 策略自动清理过期缓存。

## 2. 核心数据接口

- `POST /api/feedback`: 接收用户反馈和当前 DNA，触发后台异步生成任务。
- `GET /api/status/{task_id}`: 轮询任务状态（包含 AI 纠偏后的 DNA 和新生成的图片 URL）。
- `GET /api/images/{filename}`: 静态资源服务。

## 3. 安装与运行

1.  安装依赖：`pip install -r requirements.txt`
2.  构建前端：`./scripts/build-frontend.sh`
3.  运行项目：`python3 main.py`
