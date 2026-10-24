# 拾知（ShiZhi）开发文档

> 本文件是**开发的唯一执行依据**，由 PLAN.md（技术方案）+ 方案 C「彩色便当」视觉稿（`design/c-bento-campus.html`）合并而成。任何偏离先改本文档再写代码。
>
> 更新：2026-10-24 · 状态：待开工（从里程碑 M1 开始）

---

## 1. 产品概述

本地运行的 AI 学习助手网站。上传课程资料（PDF/PPTX/DOCX/MD/TXT）→ 解析分块 → AI 摘要与知识点提取 → RAG 问答（带引用来源）→ 自动出题与评分 → 错题本 → 闪卡间隔重复复习 → 知识图谱 → 学习统计与计划。**不部署，本机运行；单用户，无登录体系。**

产品名：**拾知**。界面语言：中文。

## 2. 技术栈（锁定，不再讨论）

| 层 | 选型 | 备注 |
|---|---|---|
| 框架 | Next.js（App Router）+ TypeScript，`src/` 目录 | Server Components 默认，交互组件标 `'use client'` |
| 包管理 | **npm（禁止 pnpm/yarn）** | |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss`） | tokens 见 §3，写入 `@theme` |
| 组件 | shadcn/ui（CLI 添加，按 §3 定制 radius/色板） | 不用默认样式直接出厂 |
| 图标 | `@phosphor-icons/react`（regular，`strokeWidth` 统一） | 全项目一个图标族 |
| 动效 | GSAP core（`gsap` npm 包，前端本地打包） | 封装成 `'use client'` 组件，见 §3.4 |
| 数据库 | SQLite：`better-sqlite3` + `drizzle-orm` + `drizzle-kit` | 单文件 `data/shizhi.db`；开发期用 `drizzle-kit push` |
| AI 调用 | `openai` SDK 指向自定义 baseURL | 默认 Agnes，见 §5 |
| PDF | `unpdf` | 文本抽取 + 页数 |
| Word | `mammoth` | 转 Markdown（保留标题层级） |
| PPT | `officeparser` | 逐页抽取，带页签号 |
| 公式 | `katex` + `remark-math`/`rehype-katex` | 问答/题目渲染 |
| 间隔重复 | `ts-fsrs` | |
| 图谱 | `@antv/g6` 5.x | |
| 思维导图 | `markmap-lib` + `markmap-view` | |
| 图表 | `echarts`（按需注册模块） | 热力图/趋势/掌握度 |

**Node 24 + npm。** 依赖若装不上先查网络换 registry，不轻易降级。

## 3. 前端设计规范（方案 C「彩色便当」）

视觉基准：`design/c-bento-campus.html`（交互稿，含动效）。布局 = **顶部水平导航 + 便当格内容区**（不用侧边栏）。

### 3.1 色板 tokens

```css
/* 中性 */
--bg: #F3F4F9;          /* 页面底 */
--surface: #FFFFFF;     /* 卡片/白格 */
--ink: #22242D;         /* 主文字 */
--ink-2: #5D6170;       /* 次级文字 */
--ink-3: #9A9EAD;       /* 弱文字/占位 */
--line: #E6E8F1;        /* 边框/分割线 */

/* 主操作色（唯一强调色，用于主按钮/链接/选中态） */
--accent: #D8503A;  --accent-deep: #C4432E;  /* 白字可过 AA */

/* 功能分区色：模块底色/深色文字/边线 三件套 */
--mint-bg:#E1F2E8;  --mint-ink:#1E6B4B;  --mint-line:#C4E2D1;   /* 复习 */
--sky-bg:#E3EDFF;   --sky-ink:#2C5CC5;   --sky-line:#C7D9F8;    /* 问答 */
--peach-bg:#FFE8DD; --peach-ink:#B44E2A; --peach-line:#F8D2C1;  /* 错题/坚持 */
--lemon-bg:#FFF2D4; --lemon-ink:#8A6A12; --lemon-line:#F2E0AE;  /* 学习时长/热力 */
--rose-bg:#FFE2EC;  --rose-ink:#B44E68;  --rose-line:#F8C7D8;   /* 图谱 */

/* 语义色 */
--ok: #2FA372;  --warn: #C7902B;  --danger: #C4432E;
```

规则：一个格子只用一种分区色（底 + 同系深色文字），强调色珊瑚橙**只**用于主操作，不做装饰。课程用 `color` 字段绑定五种分区色作为课程识别色。首版**仅浅色**；tokens 全部走 CSS 变量，深色模式列为后续增强。

### 3.2 形状与字体

- **圆角体系（写死）**：便当格/页面卡片 18px；输入框、内嵌元素（气泡、文件条、闪卡）12-14px；按钮与状态芯片全圆（999px）。禁止混用其他值。
- 字体：系统栈 `"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif`；**所有数字用等宽** `"Cascadia Code", "Consolas", ui-monospace, monospace`（`font-variant-numeric: tabular-nums`）。
- 阴影：白底上 `0 10px 28px rgba(34,36,45,.09)` 级别的柔和投影，悬浮时出现；不用彩色发光。

### 3.3 顶部导航（全局布局）

```
[◎拾知] 概览 课程 问答 题库 错题本 复习 图谱 统计 计划        [🔥连续N天] [＋上传资料] [⚙]
```

当前项：深色胶囊（`--ink` 底白字）。右侧：坚持天数（peach 芯片）、上传资料（accent 主按钮，点击打开上传对话框并选课程）、设置图标入口。窄屏（<1024px）折叠为汉堡菜单。

### 3.4 动效规范（GSAP，全部要有动机）

| 动效 | 实现 | 用在 |
|---|---|---|
| 格子入场 | `y:16, scale:.96, autoAlpha:0` → `back.out(1.4)`，stagger 0.07 | 概览页便当格、列表页卡片 |
| 数字滚动 | proxy 对象插值 0→N，`power1.out` 0.9-1.1s | 所有统计大数字 |
| 进度环描边 | `strokeDashoffset` 从周长→目标值，`power2.inOut` | 课程掌握度 |
| 热力格浮现 | `scale:0`→`back.out(2)`，stagger `from:"random"` | 学习热力图 |
| 闪卡翻转 | `rotationY:"+=180"`，0.6s `power2.inOut`，preserve-3d | 复习页（点击卡片） |
| 悬浮 | CSS `translateY(-3px)` + 阴影过渡（不用 GSAP） | 格子/卡片 hover |

工程约定：封装 `<BentoIn>`（入场编排）、`<CountUp>`、`<FlipCard>` 等 `'use client'` 组件；内部用 `gsap.matchMedia()` 包 `(prefers-reduced-motion: no-preference)`，减动效时直接渲染终态；`useEffect` 内建动画必须 `gsap.context()` + cleanup revert。**禁止** `window.addEventListener('scroll')`。

### 3.5 关键页面结构（对照设计稿）

- **/（概览）**：问候行 + 7 格便当（复习 mint 大格含翻卡演示与 CTA、问答 sky、课程进度白格含进度环、错题 peach、本周热力 lemon、最近资料白格、图谱入口 rose）。格宽栅格 `repeat(12,1fr)`，span 分配 7/5、4/4/4、8/4。
- **/chat（问答）**：左会话列表 + 主对话区（流式回答、`[n]` 角标、来源芯片点击打开文档定位抽屉）+ 输入框（模型芯片、`/出题` 快捷指令）。
- **/review（复习）**：今日队列 → 闪卡翻转流（again/hard/good/easy 四键）→ 完成态统计。
- 其余页面在对应里程碑细化，风格遵循 §3.1-3.4。

## 4. 项目结构

```
AI_learner/
├─ DEV.md / PLAN.md / design/          # 文档与设计稿（design/ 保留作视觉基准）
├─ data/                               # 运行期数据（gitignore）：shizhi.db、uploads/
├─ src/
│  ├─ app/                             # 路由
│  │  ├─ layout.tsx  globals.css       # @theme tokens、顶部导航
│  │  ├─ page.tsx                      # 概览
│  │  ├─ courses/ chat/ quiz/ wrong-book/ review/ graph/ stats/ plan/ notes/ settings/
│  │  └─ api/                          # 见 §7
│  ├─ components/                      # ui/(shadcn) + motion/ + 业务组件
│  ├─ db/                              # schema.ts、index.ts(连接)、seed.ts
│  └─ lib/
│     ├─ ai/                           # client.ts、settings.ts、prompts.ts、chat.ts、embeddings.ts、json.ts
│     ├─ retrieval/                    # tokenizer.ts、bm25.ts、hybrid.ts、chunker.ts
│     ├─ parsers/                      # pdf.ts、docx.ts、pptx.ts、md.ts、index.ts
│     └─ fsrs.ts、study.ts(事件记录)、utils.ts
├─ drizzle.config.ts
└─ .env.local                          # AGNES_API_KEY 等（gitignore）
```

## 5. AI 层

### 5.1 模型槽位（存 `settings` 表，设置页可改）

| 槽位 | 默认 | 说明 |
|---|---|---|
| `chat` | `baseUrl=https://api.agnes-ai.cn/v1`，`model=agnes-3.0-flash` | 问答/摘要/知识点/出题/评分/计划 |
| `vision` | 继承 chat | OCR 兜底（Agnes 支持图像输入，data URL 可用性在 M6 实测，不可用则让用户配其他 OpenAI 协议视觉端点） |
| `embedding` | **关闭** | Agnes 无 /embeddings。可配远程 OpenAI 协议端点（baseUrl+model+apiKey+dims）；开启后向量检索+RRF 混合，未开启仅 BM25 |

Key 读取优先级：settings 表 → `.env.local`（`AGNES_API_KEY`）。设置页必须有「测试连接」（发一条 1 token 请求验证 baseUrl/key/model）。

### 5.2 调用约定

- 统一走 `openai` SDK；流式回答用 SSE（`stream:true`），Next route handler 返回 `ReadableStream`，`runtime='nodejs'`。
- 结构化输出（知识点/题目/图谱）：prompt 约定 JSON → `extractJson()` 容错解析（剥 markdown 围栏）→ **zod 校验**，校验失败带原文重试一次。
- 超时/重试：单次调用 60s 超时，429/5xx 指数退避重试 2 次；错误信息原样透传到 UI（中文提示）。
- 环境变量 `ZHIPU_API_KEY` 存在但**禁止使用**。

## 6. 数据库 schema（drizzle，全量一次性建好）

> 类型：id 一律 uuid（`crypto.randomUUID()`）；时间戳存 integer ms。表名/字段名 snake_case。

- **courses**：id, name, description, color(`mint|sky|peach|lemon|rose`), createdAt, updatedAt
- **documents**：id, courseId→courses, title, fileName, fileType(`pdf|docx|pptx|md|txt`), filePath, fileSize, pageCount, charCount, status(`pending|parsing|ready|error`), errorMessage, summary, meta(json), createdAt, updatedAt
- **chunks**：id, documentId→documents, courseId, seq, content, charCount, sourceRef(json: `{page?, slide?, heading?}`), embedding(blob 可空), createdAt。索引：documentId、courseId
- **knowledge_points**：id, courseId, documentId 可空, title, content, importance(`core|normal`), keywords(json), sourceChunkIds(json), mastery(int 0-100 默认 0), createdAt, updatedAt
- **chat_sessions**：id, courseId 可空, title, createdAt, updatedAt
- **chat_messages**：id, sessionId, role(`user|assistant`), content, citations(json: `[{n, chunkId, documentId, label, page?}]`), createdAt
- **quiz_sets**：id, courseId, title, config(json `{types[], count, difficulty, scope}`), createdAt
- **questions**：id, quizSetId, courseId, knowledgePointId 可空, type(`single|multiple|fill|judge|short`), stem, options(json), answer(json), explanation, difficulty(1-5), sourceChunkIds(json), createdAt
- **attempts**：id, questionId, quizSetId 可空, userAnswer(json), isCorrect 可空, score 可空(0-100), aiFeedback 可空, createdAt
- **wrong_items**：id, questionId 唯一, courseId, wrongCount, lastWrongAt, reason, resolved(默认0), createdAt, updatedAt
- **flashcards**：id, courseId, knowledgePointId 可空, questionId 可空, front, back；**FSRS 字段**：due, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state(`new|learning|review|relearning`), lastReviewAt 可空, createdAt
- **review_logs**：id, cardId→flashcards, rating(`again|hard|good|easy`), reviewedAt, scheduledDays, elapsedDays
- **graph_nodes**：id, courseId, name, type(`concept|process|example`), description, knowledgePointId 可空, weight。唯一约束 (courseId,name)
- **graph_edges**：id, courseId, sourceId, targetId, relation, weight。唯一约束 (sourceId,targetId,relation)
- **study_plans**：id, courseId, title, examDate 可空, startDate, content(json), createdAt
- **plan_tasks**：id, planId, date, title, detail, type(`study|review|quiz`), done, doneAt 可空
- **study_events**：id, type(`chat|quiz|review|upload|flashcard`), courseId 可空, durationSec, meta(json), createdAt（热力图/统计索引 createdAt）
- **notes**：id, courseId 可空, documentId 可空, knowledgePointId 可空, title, content(md), createdAt, updatedAt
- **settings**：key 主键, value(json), updatedAt

## 7. API 路由

```
课程    POST/GET /api/courses · PATCH/DELETE /api/courses/[id]
文档    POST /api/documents/upload (multipart 多文件, courseId)
        GET /api/documents?courseId= · GET /api/documents/[id]（含分块预览与检索高亮）
        POST /api/documents/[id]/reparse · DELETE /api/documents/[id]
AI 加工  POST /api/ai/summarize {documentId}
        POST /api/ai/knowledge-points {documentId | courseId}
        POST /api/ai/graph/build {courseId}
问答    POST /api/chat/sessions · GET /api/chat/sessions · DELETE /api/chat/sessions/[id]
        POST /api/chat/sessions/[id]/messages  (SSE 流式) · GET .../messages
题库    POST /api/quiz/generate {courseId, scope, types, count, difficulty}
        GET /api/quiz/sets · GET /api/quiz/sets/[id] · POST /api/quiz/submit
错题    GET /api/wrong-items · POST /api/wrong-items/repractice · POST /api/wrong-items/[id]/resolve
复习    POST /api/flashcards/from-knowledge {knowledgePointIds[]}
        GET /api/review/today · POST /api/review/answer {cardId, rating} · GET /api/review/stats
图谱    GET /api/graph?courseId=
计划    POST /api/plan/generate {courseId, examDate} · GET /api/plans · POST /api/plans/[id]/tasks/[taskId]/toggle
统计    POST /api/events · GET /api/stats/overview
设置    GET/PUT /api/settings · POST /api/settings/test {slot}
搜索    GET /api/search?q=&courseId=   (M6)
```

## 8. 解析与检索管道

**上传**：`data/uploads/{courseId}/{uuid}-{原名}` → documents 记录 `pending` → 服务端串行队列逐个 `parsing`（Next 内进程级简单队列即可，无需 BullMQ）→ 完成置 `ready|error`。

**分块**：按文档结构（PDF 页/页码、PPTX 页签、DOCX/MD 标题层级）优先切；目标块 600 字 ±200，相邻重叠 80 字；每块带 `sourceRef`（页码/页签/标题），引用定位靠它。

**BM25（默认检索，自研）**：分词 = CJK 二元组 + 拉丁词；k1=1.5, b=0.75；启动时按 courseId 建内存索引（chunks 全量载入，课程级数据量 <5 万块无压力），文档增删后增量更新。

**混合（embedding 开启时）**：`openai` SDK 调 `/embeddings` → 向量存 chunks.embedding（Float32Array BLOB）→ 查询时 topK 余弦 + topK BM25 → RRF（k=60）融合 → 取前 6-8 块作上下文。回答附引用角标，点击芯片打开文档抽屉并滚动到对应页/页签高亮。

**扫描件**：unpdf 抽取后若整页文本 < 20 字符标记 `needsOcr`；OCR 属 M6（视觉槽位），未配置时 UI 提示"该页为扫描件，暂无法引用"。

## 9. 里程碑计划（顺序执行，每个完成必须可运行、可验收，再进下一个）

### M1 地基
任务：`git init` → create-next-app（TS/Tailwind/App/src 目录，npm）→ 装 §2 全部依赖 → `@theme` 写入 §3 tokens + globals.css → shadcn init + 定制 → 顶部导航布局 → drizzle schema 全表 + push 建库 → AI 层（client/settings/test 连接）→ 设置页（三槽位 + 测试连接）→ 概览页静态骨架（便当格 + 入场/数字动效组件）。
验收：`npm run dev` 起服务；设置页改 baseUrl/model 保存入库并测试连接返回明确成功/失败；概览页静态呈现 §3.5 结构与动效；DB 文件生成且全部表存在。

### M2 文档管道
任务：上传 API + 上传对话框（拖拽多文件）→ 四格式解析器 → 分块器 → BM25 索引 → 课程页（文档列表：状态/重析/删除，色带绑定课程色）→ 文档详情页（全文预览 + 关键词命中高亮）。
验收：4 种格式各传 1 个真实文件全部 `ready`；搜索接口返回正确块与 sourceRef；解析中状态与错误状态在 UI 正确流转。

### M3 AI 知识加工 + RAG 问答
任务：摘要 + 知识点提取（zod 结构化）入库 → 问答页（会话列表、SSE 流式回答、KaTeX、`[n]` 角标、来源芯片 → 文档定位抽屉）→ study_events 埋点。
验收：对已解析文档提问，回答基于检索内容、至少 1 条可点击引用且定位正确；摘要/知识点在课程页可见；连续 3 轮多轮对话上下文正确。

### M4 练习闭环
任务：出题（5 题型、按文档/知识点/难度配置）→ 答题页 → 客观题自动判分、简答题 AI 要点评分（给分+反馈）→ 错题本（原因、关联知识点、重练生成）→ 正确率入统计。
验收：一套混合题答完得分正确；错一道题后错题本出现且可重练；简答题收到中文反馈与评分。

### M5 复习体系
任务：知识点/错题一键转闪卡 → FSRS 调度 → 今日队列 + 四键评分交互（翻卡动效）→ 完成态统计 → 浏览器通知提醒（当日有到期卡片时）→ Anki CSV 导出 → 图谱构建（AI 抽实体关系）+ G6 渲染（节点点击：详情/出题/入复习）→ markmap 思维导图 → 统计页（热力图/掌握度/正确率趋势）→ 学习计划（考试日倒排每日任务）→ 概览页接真实数据。
验收：复习一张卡后 due 按 FSRS 推移；图谱 ≥30 节点且点击可交互；热力图与真实学习事件一致；生成计划后每日任务可勾选。

### M6 增值功能
任务：费曼模式（用户解释→AI 找漏洞）→ 苏格拉底引导问答 → 错题举一反三（变式题）→ 考前冲刺模拟卷（限时+汇总薄弱点）→ 图片上传（拍照/截图 → 视觉槽位 OCR 入库）→ 语音朗读（Web Speech）→ 笔记（Markdown 编辑 + 知识点互链）→ 跨课程全局搜索 → 导出（笔记 MD/Word、卡片 Anki）。
验收：逐项功能演示通过；视觉 OCR 若 data URL 不通，设置页可配自定义视觉端点并验证。

## 10. 开发约定

- **npm**；中文 UI 文案；组件目录遵守 §4；动效遵守 §3.4（动机 + matchMedia + cleanup）。
- GSAP 动效组件与所有交互组件必须 `'use client'`；数据获取用 Server Components + route handlers。
- 运行期数据只在 `data/`（gitignore）；`.env.local` 只放 AGNES_API_KEY 等密钥。
- AI 一切调用集中 `src/lib/ai/`；结构化输出必过 zod；解析器只在 `src/lib/parsers/`。
- 提交规范：`M1: xxx`、`feat(quiz): xxx`；每里程碑完成打 tag。
- 验收方式：按 §9 验收条目手动过一遍 + 截图记录；BM25/分块器/FSRS 交互写 vitest 单测（可选但推荐）。

## 11. 风险与预案

| 风险 | 预案 |
|---|---|
| better-sqlite3 在 Node 24 Windows 无预编译 | `npm rebuild` 或装 VS Build Tools；仍失败则换 `@libsql/client`（file: 协议），drizzle 同 schema 迁移成本低 |
| Agnes 视觉接口不接受 data URL | 设置页允许单独配置视觉槽位（任意 OpenAI 协议端点）；OCR 标记降级提示 |
| 本地 embedding 需求出现 | 预留 `embedding.mode=local`（transformers.js + hf-mirror），默认不实现，M5 后按需 |
| 大 PDF（>200 页）解析阻塞 | 队列串行 + 分页流式抽取，UI 显示进度（已解析页数） |

## 12. 开工检查清单

- [x] 设计方向已选定（C 彩色便当，2026-10-24）
- [ ] 用户提供 Agnes API Key（填 `.env.local`，开发期可先占位，M3 联调前必须就位）
- [ ] 按 DEV.md §9 M1 开始执行
