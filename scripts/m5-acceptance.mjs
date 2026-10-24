/** M5 验收：闪卡 FSRS / 图谱 / 计划 / 统计 */
import fs from "node:fs";
import Database from "better-sqlite3";

const BASE = "http://localhost:3000";
const course = JSON.parse(fs.readFileSync("test/_course.json", "utf8")).course;
const db = new Database("data/shizhi.db");

const post = (url, body) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }));

// 1. 知识点 → 闪卡
console.log("== 闪卡 ==");
const kpIds = db.prepare("SELECT id FROM knowledge_points").all().map((r) => r.id);
const mk = await post(`${BASE}/api/flashcards/from-knowledge`, { knowledgePointIds: kpIds });
console.log("转卡:", mk.status, "新增", mk.data.created);

const today = await fetch(`${BASE}/api/review/today`).then((r) => r.json());
console.log("今日队列:", today.queue.length, "张；stats:", JSON.stringify(today.stats));

// 2. FSRS 评分 → due 推移
const card = today.queue[0];
const before = db.prepare("SELECT due, reps, state FROM flashcards WHERE id=?").get(card.id);
const ans = await post(`${BASE}/api/review/answer`, { cardId: card.id, rating: "good" });
const after = db.prepare("SELECT due, reps, state FROM flashcards WHERE id=?").get(card.id);
const logRow = db.prepare("SELECT rating, scheduled_days FROM review_logs WHERE card_id=? ORDER BY reviewed_at DESC LIMIT 1").get(card.id);
console.log(`评分 good：due ${new Date(before.due).toISOString().slice(0, 16)} → ${new Date(after.due).toISOString().slice(0, 16)}（+${Math.round((after.due - before.due) / 60000)} 分钟）reps ${before.reps}→${after.reps} state=${after.state}`);
console.log("review_log:", JSON.stringify(logRow));

// 3. 图谱构建（可能需要两轮凑 30+ 节点）
console.log("\n== 图谱 ==");
let g = await post(`${BASE}/api/ai/graph/build`, { courseId: course.id });
console.log("构建1:", g.status, JSON.stringify(g.data));
if ((g.data.nodes ?? 0) < 30) {
  g = await post(`${BASE}/api/ai/graph/build`, { courseId: course.id });
  console.log("构建2:", g.status, JSON.stringify(g.data));
}
const graph = await fetch(`${BASE}/api/graph?courseId=${course.id}`).then((r) => r.json());
console.log("最终节点:", graph.nodes.length, "边:", graph.edges.length);
const sample = graph.nodes.slice(0, 5).map((n) => `${n.name}(${n.type})`);
console.log("节点示例:", sample.join("、"));
const sampleEdge = graph.edges[0];
console.log("边示例:", JSON.stringify(sampleEdge ? { relation: sampleEdge.relation } : null));

// 4. 学习计划（考试 2026-12-20）
console.log("\n== 计划 ==");
const plan = await post(`${BASE}/api/plan/generate`, { courseId: course.id, examDate: "2026-12-20" });
console.log("生成:", plan.status, JSON.stringify(plan.data));
const plans = await fetch(`${BASE}/api/plans`).then((r) => r.json());
const p0 = plans.plans[0];
console.log("任务数:", p0.tasks.length, "· 日期范围:", p0.tasks[0].date, "→", p0.tasks[p0.tasks.length - 1].date);
const t0 = p0.tasks[0];
const tog = await post(`${BASE}/api/plans/${p0.id}/tasks/${t0.id}/toggle`, {});
console.log("勾选任务:", tog.status, JSON.stringify(tog.data));

// 5. 统计一致性
console.log("\n== 统计 ==");
const stats = await fetch(`${BASE}/api/stats/overview`).then((r) => r.json());
const dbEvents = db.prepare("SELECT count(*) n FROM study_events").get().n;
const heatTotal = stats.heatmap.reduce((s, h) => s + h.count, 0);
console.log(`events 总数: API热力=${heatTotal} DB=${dbEvents} ${heatTotal === dbEvents ? "一致 ✓" : "不一致 ✗"}`);
console.log("streak:", stats.streak, "· 卡片:", stats.totals.cards, "· 做题:", stats.totals.quizAttempts, "· 知识点:", stats.totals.knowledgePoints);
console.log("掌握度 Top3:", stats.mastery.slice(0, 3).map((m) => `${m.title}:${m.mastery}%`).join("、"));

// 6. Anki 导出
const csv = await fetch(`${BASE}/api/flashcards/export`).then((r) => r.text());
console.log("\nAnki CSV 行数:", csv.split("\n").length, "首行:", csv.split("\n")[0]);

// 7. 页面可达
for (const p of ["/review", "/graph", "/stats", "/plan", "/"]) {
  const r = await fetch(`${BASE}${p}`);
  console.log(`GET ${p} -> ${r.status}`);
}
