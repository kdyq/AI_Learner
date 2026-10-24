/** M4 验收：出题（5 题型混合）→ 判分 → 错题本 → 重练 */
import fs from "node:fs";
import Database from "better-sqlite3";

const BASE = "http://localhost:3000";
const course = JSON.parse(fs.readFileSync("test/_course.json", "utf8")).course;
const db = new Database("data/shizhi.db");

// 1. 生成混合题组
console.log("== 出题（5 题型混合 × 5 题）==");
const gen = await fetch(`${BASE}/api/quiz/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    courseId: course.id,
    scope: "course",
    types: ["single", "multiple", "fill", "judge", "short"],
    count: 5,
    difficulty: 3,
  }),
});
const genData = await gen.json();
if (!gen.ok) throw new Error(genData.error);
console.log("generated:", genData.created, "setId:", genData.quizSetId);

// 2. 拉取题组（验证不下发 answer）
const set = await fetch(`${BASE}/api/quiz/sets/${genData.quizSetId}`).then((r) => r.json());
const leak = set.questions.some((q) => "answer" in q || "explanation" in q);
console.log("questions:", set.questions.length, "| answer 泄露:", leak);
const byType = {};
for (const q of set.questions) byType[q.type] = (byType[q.type] ?? 0) + 1;
console.log("题型分布:", JSON.stringify(byType));
console.log("示例题干:", set.questions[0].stem.slice(0, 60), "…");

// 3. 提交：short 认真答（保证有 AI 反馈），其余瞎答（保证有错题）
const SHORT_SAMPLE = {
  single: 0,
  multiple: [0],
  fill: "不知道",
  judge: true,
};
const answers = set.questions.map((q) => ({
  questionId: q.id,
  answer:
    q.type === "short"
      ? "银行家算法就是先假装把资源分给进程，然后检查能不能找到一个安全序列，如果找不到就拒绝分配让进程等待，找到才真正分配。"
      : SHORT_SAMPLE[q.type],
}));

console.log("\n== 提交批改 ==");
const sub = await fetch(`${BASE}/api/quiz/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ quizSetId: genData.quizSetId, answers }),
});
const subData = await sub.json();
if (!sub.ok) throw new Error(subData.error);
const { total, score, correctCount, results } = subData;
const expectScore = Math.round((correctCount / total) * 100);
console.log(`得分 ${score}（答对 ${correctCount}/${total}，校验算式 ${expectScore === score ? "一致 ✓" : "不一致 ✗"}）`);
for (const r of results) {
  const q = set.questions.find((x) => x.id === r.questionId);
  console.log(
    `  [${q.type}] correct=${r.isCorrect} score=${r.score}${r.aiFeedback ? " AI反馈:" + r.aiFeedback.slice(0, 60).replace(/\n/g, " ") + "…" : ""}`
  );
}

// 4. 错题本
const wrongBefore = db.prepare("SELECT count(*) n FROM wrong_items WHERE resolved=0").get().n;
console.log("\n待处理错题数:", wrongBefore);

// 5. 重练组卷
const rep = await fetch(`${BASE}/api/wrong-items/repractice`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
const repData = await rep.json();
console.log("重练:", rep.status, repData.count ? `${repData.count} 题` : repData.error);

// 6. 错题列表 API + 标记掌握
const list = await fetch(`${BASE}/api/wrong-items`).then((r) => r.json());
console.log("错题列表条数:", list.items.length);
if (list.items.length > 0) {
  const one = list.items[0];
  const res = await fetch(`${BASE}/api/wrong-items/${one.id}/resolve`, { method: "POST" });
  console.log("标记掌握:", res.status, "| 剩余待处理:", db.prepare("SELECT count(*) n FROM wrong_items WHERE resolved=0").get().n);
}

// 7. quiz 埋点
const ev = db.prepare("SELECT meta FROM study_events WHERE type='quiz' ORDER BY created_at DESC LIMIT 1").get();
console.log("quiz 埋点:", ev?.meta);
