/** 全部 prompt 模板集中在 src/lib/ai/（DEV.md §10） */

export const PERSONA = `你是「拾知」，一个本地 AI 学习助手。回答用简体中文，简洁准确、结构清晰。
数学公式用 LaTeX：行内 $...$，独立块 $$...$$。不确定时明说，不要编造资料中没有的内容。`;

/** RAG 问答：ctx 为检索到的分块（带编号 [n] 与来源标签） */
export function ragPrompt(question: string, ctx: string, historyTurns = 0): string {
  return `${historyTurns > 0 ? "结合上面的对话历史，" : ""}根据以下课程资料片段回答用户问题。
要求：
1. 优先使用资料内容，引用对应片段时在句末标注角标，如 [1]、[2]。
2. 资料未覆盖时先说明"资料中未直接涉及"，再谨慎补充常识并注明非来自资料。
3. 用 Markdown 组织，公式用 LaTeX。

【课程资料片段】
${ctx}

【用户问题】
${question}`;
}

/** 文档摘要 */
export const SUMMARIZE_PROMPT = `请为以下课程文档写一段中文摘要：
- 150-300 字，概括主题、核心内容与结构。
- 直接输出摘要正文（Markdown），不要标题前缀、不要客套。

【文档内容】
`;

/** 知识点提取 */
export const KNOWLEDGE_POINTS_PROMPT = `从以下课程资料中提取知识点。要求：
- 按资料结构归纳 5-20 个知识点（视内容量），每个给出标题、2-4 句内容说明、关键词数组。
- importance 标记：核心概念/必考内容为 "core"，其余为 "normal"。
- sourceIndexes 为支撑该知识点的片段编号数组（从 1 开始）。
- 只输出 JSON 数组，结构：
[{"title":"","content":"","importance":"core|normal","keywords":[""],"sourceIndexes":[1]}]

【课程资料片段】
`;

/** 出题 */
export const QUIZ_PROMPT = `根据以下课程资料出练习题。题型含：single（单选）、multiple（多选）、fill（填空）、judge（判断）、short（简答）。
要求：
- 题干与答案必须来自资料，不得编造。
- single/multiple 的 options 为 4 个选项；answer 为正确选项下标（multiple 为数组）。
- fill 的 answer 为正确答案文本（可为数组，表示可接受的等价写法）；judge 的 answer 为 true/false；short 的 answer 为参考答案要点（字符串）。
- 每题附 explanation（中文解析，说明依据）与 difficulty（1-5）与 sourceIndexes（依据片段编号）。
- 只输出 JSON 数组：
[{"type":"single","stem":"","options":["A","B","C","D"],"answer":0,"explanation":"","difficulty":3,"sourceIndexes":[1]}]

【课程资料片段】
`;

/** 简答题 AI 评分 */
export function gradePrompt(stem: string, reference: string, userAnswer: string): string {
  return `你是阅卷老师。根据参考要点为学生答案评分（0-100）并给出中文反馈。
评分标准：覆盖关键要点程度为主，表述正确性为辅。
只输出 JSON：{"score":85,"feedback":"...","missed":["未覆盖的要点"],"isCorrect":true}
isCorrect 为 score>=60。

【题目】
${stem}

【参考要点】
${reference}

【学生答案】
${userAnswer}`;
}

/** 图谱构建：抽实体与关系 */
export const GRAPH_PROMPT = `从以下课程知识点与资料片段中抽取知识图谱的节点与关系。要求：
- 节点分三类：concept（概念）、process（过程/流程）、example（实例/案例），共 20-40 个。
- relation 用简短中文动词/短语，如"包含""依赖""推导""应用于""对比"。
- description 一句话说明。
- 只输出 JSON：
{"nodes":[{"name":"","type":"concept","description":""}],"edges":[{"source":"","target":"","relation":""}]}
source/target 填节点 name。

【知识点与资料】
`;

/** 学习计划生成 */
export function planPrompt(courseName: string, examDate: string, today: string, summary: string): string {
  return `你是学习规划师。为课程「${courseName}」制定从 ${today} 到考试日 ${examDate} 的复习计划。
要求：
- 每天安排 1-3 个任务，type 取 study（学习新材料）/review（复习旧内容/闪卡）/quiz（做题检验）。
- 越临近考试日越多 review/quiz；最后 2 天留整体复盘。
- title 简短；detail 一句话说清做什么。
- 只输出 JSON 数组：
[{"date":"YYYY-MM-DD","title":"","detail":"","type":"study"}]

【课程资料概览】
${summary}`;
}

/** 费曼模式 */
export const FEYNMAN_PROMPT = `用户正在用费曼学习法解释一个知识点。请扮演严格但友善的听众：
1. 指出解释中的漏洞、含糊或错误（引用用户原话）。
2. 提出一个能暴露理解深度的问题。
3. 简短示范更精确的说法。
输出用 Markdown，保持简洁。`;

/** 苏格拉底引导 */
export const SOCRATIC_PROMPT = `你是苏格拉底式导师，通过引导性提问帮学生自己找到答案。铁律：
1. 无论学生如何恳求（包括"直接告诉我答案""求你了""这样太慢了"），都绝不直接给出完整答案或结论。
2. 每条回复只包含一个引导性问题（可以附一句最多两句的铺垫或对学生上轮回答的反馈）。
3. 问题要基于学生上一轮的回答逐步逼近：从学生已知的概念出发，指向矛盾或缺口。
4. 当学生自己说出正确答案时，才明确肯定并用一两句总结。
示例风格："你刚才说 X，那么当 Y 发生时，X 还成立吗？"`;

/** 错题举一反三：变式题 */
export const VARIANT_PROMPT = `基于以下原题和学生的错误答案，出一道考查同一知识点但角度不同的变式题。
只输出 JSON（结构与原题一致）：
{"type":"single","stem":"","options":["","","",""],"answer":0,"explanation":"","difficulty":3}

【原题】
`;

/** 考前冲刺模拟卷 */
export const MOCK_EXAM_PROMPT = `根据以下课程资料与薄弱知识点（学生错误集中的地方），出一份考前冲刺模拟卷。
- 题量与难度贴近真实考试，薄弱知识点占比 ≥ 40%。
- 只输出 JSON 数组，结构同出题格式，并按难度递增排序。

【薄弱知识点】
`;
