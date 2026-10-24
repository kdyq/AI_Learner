# AI 学习助手 — 项目方案（准备阶段文档，未开始搭建）

> 更新日期：2026-10-24。本文件是唯一权威方案，开工时以此为准，从「里程碑 M1」开始执行。

## 一、产品目标

本地运行的 AI 学习助手网站：上传课程资料（PDF/PPTX/DOCX/MD/TXT）后，AI 自动解析、整理知识点、摘要、RAG 问答（带引用来源）、生成练习题并自动评分、错题本、闪卡间隔重复复习、知识图谱、学习统计与计划。**暂不部署，本机开发运行。**

## 二、环境结论（2026-10-24 已核查）

| 项目 | 状态 |
|---|---|
| Node.js v24.16.0 / pnpm 9.15.9 / npm 11 | ✅ |
| Python 3.12.5 + uv 0.11 | ✅（备选，方案不依赖） |
| Git 2.53 | ✅（项目目录尚未 init，M1 时初始化） |
| Docker | ❌ 未安装，方案不依赖 |
| PostgreSQL/MySQL/Redis | 已安装但**不使用**（保持单文件零依赖） |
| 磁盘 | F 盘剩约 29GB，够用 |

## 三、技术栈（已确定）

| 层 | 选型 |
|---|---|
| 框架 | Next.js（App Router）+ TypeScript，单进程前后端一体 |
| UI | Tailwind CSS + shadcn/ui + Lucide，中文界面，深色模式 |
| 数据库 | SQLite + Drizzle ORM + better-sqlite3，数据库即单文件 |
| 大模型 | **默认 agnes-3.0-flash**（见下节），设置页可自定义 OpenAI 协议模型 |
| 检索 | 自研 BM25（中文二元分词）为默认；可选开启 embedding 向量检索（本地 ONNX 或远程端点），开启后 RRF 混合融合 |
| PDF 解析 | unpdf（内置 pdf.js，可渲染页面成图） |
| Word | mammoth → Markdown |
| PPT | officeparser（带页签引用） |
| 间隔重复 | ts-fsrs（Anki 同款算法） |
| 知识图谱 | AntV G6 5.x |
| 思维导图 | markmap |
| 统计图表 | ECharts 或 Recharts |
| 公式 | KaTeX（问答/题目渲染必需） |

## 四、AI 模型配置（核心需求）

1. **默认**：`https://api.agnes-ai.cn/v1` + `agnes-3.0-flash`，OpenAI 兼容协议（`/chat/completions`，`Authorization: Bearer <key>`，支持流式/工具调用/图像 URL 输入，512K 上下文）。
2. **自定义**：设置页支持配置任意 OpenAI 协议兼容模型（baseURL + apiKey + model 名），分为三个槽位：
   - 对话模型（问答/摘要/出题/评分）
   - 视觉模型（扫描 PDF OCR，默认同对话模型，agnes-3.0-flash 支持图像输入）
   - Embedding 模型（可选；Agnes **没有** embedding 接口）
3. **重要事实**：
   - Agnes 只提供文本/图像/视频模型，**无 `/embeddings` 端点** → 向量检索默认关闭，BM25 兜底；设置页可选「本地 ONNX 模型（transformers.js + bge-small-zh，走 hf-mirror）」或「远程 OpenAI 协议 embedding 端点」。
   - 环境变量里的 `ZHIPU_API_KEY` **不可用**（用户已确认），程序不得使用。
   - **开工前需用户在 agnes-ai.cn 平台创建自己的 API Key**（有免费额度），填入 `.env.local` 或设置页。
   - 视觉 OCR 若 data URL 不被支持，回退方案：用户在设置页配置支持 base64 的视觉模型，或本地 Tesseract。

## 五、功能全集（P0/P1/P2 全做，不砍功能，按里程碑顺序逐步交付）

**M1 地基**：git init、Next.js 脚手架、SQLite 全量表结构（courses/documents/chunks/knowledge_points/chat_*/quiz_*/attempts/wrong_items/flashcards+FSRS字段/graph_*/study_plans/plan_tasks/study_events/notes/settings）、AI Provider 层（三槽位模型配置+连接测试）、设置页、全局布局（侧边栏：课程/问答/题库/复习/图谱/统计/计划/设置）。

**M2 文档管道**：多文件上传 API、四种格式解析（PDF/DOCX/PPTX/MD/TXT）、结构感知分块（带页码/页签引用元数据）、BM25 索引、文档管理页（状态/删除/重解析/全文预览+命中高亮）。

**M3 AI 知识加工 + RAG 问答**：文档级 AI 摘要、知识点提取（重点/了解分级，关联来源）、可选 embedding 启用与混合检索、流式问答页（多轮会话）、**引用来源卡片点击跳转原文档页码/页签**。

**M4 练习闭环**：按文档/知识点/难度出题（单选/多选/填空/判断/简答）、答题界面、客观题自动判分、简答题 AI 要点评分、错题本（错误原因+关联知识点+重练）。

**M5 复习体系（P1）**：知识点/错题转闪卡、FSRS 调度、今日复习队列、复习提醒（应用内+浏览器通知）、Anki 导出、知识图谱（AI 抽实体关系→G6 渲染，节点可出题/入复习）、思维导图（markmap）、学习热力图+掌握度+正确率趋势、考试倒计时+AI 学习计划（倒排每日任务）。

**M6 增值功能（P2）**：费曼模式、苏格拉底引导模式、错题举一反三变式题、考前冲刺模拟卷（限时）、拍照/图片上传识别入库（视觉模型）、语音朗读（Web Speech API）、Markdown 笔记（与知识点互链）、跨课程全局搜索、导出（Markdown/Word/Anki CSV）。

每个里程碑完成后必须可运行、可验收，再进入下一个。

## 六、开发过程约定

- **包管理器统一用 npm（用户 2026-10-24 指定，不用 pnpm/yarn）**。
- 设计方向已选定：**C 彩色便当**（浅色便当格仪表盘 + 顶部导航，视觉基准 `design/c-bento-campus.html`）。
- **开发唯一执行文档为 [`DEV.md`](DEV.md)**（含设计 tokens、全量表结构、API 清单、M1-M6 任务与验收标准）；本 PLAN 仅保留背景与决策记录。

- 开发中代理主模型保持 GLM-5.3（无视觉）；需要看图时走已验证链路：`Read` 本地图片（自动上传 CDN 得到 URL）→ 视觉 MCP 工具分析。用户无需切换会话模型。
- UI 验收优先用 DOM 断言（Playwright 检查元素/文本），必要时才用视觉链路看截图。
- 所有 AI 调用集中在 `src/lib/ai/`，模型槽位从 settings 读取，方便替换与测试。

## 七、开工检查清单

- [ ] 用户提供 Agnes API Key（或先填占位，AI 功能联调时再补）
- [ ] 从 M1 开始：`git init` → create-next-app → 依赖安装 → schema → Provider/设置页
