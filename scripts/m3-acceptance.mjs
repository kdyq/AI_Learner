/** M3 验收：摘要 / 知识点 / SSE 流式 RAG 问答（含 3 轮多轮上下文） */
import fs from "node:fs";

const BASE = "http://localhost:3000";
const course = JSON.parse(fs.readFileSync("test/_course.json", "utf8")).course;

const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }));

// 1. 文档摘要
const docsRes = await fetch(`${BASE}/api/documents?courseId=${course.id}`).then((r) => r.json());
const pdfDoc = docsRes.documents.find((d) => d.fileType === "pdf" && d.status === "ready");
console.log("== 摘要 ==");
const sum = await post(`${BASE}/api/ai/summarize`, { documentId: pdfDoc.id });
console.log("status:", sum.status, "\nsummary:", String(sum.data.summary ?? sum.data.error ?? "").slice(0, 120), "…");

// 2. 知识点（课程级）
console.log("\n== 知识点 ==");
const kp = await post(`${BASE}/api/ai/knowledge-points`, { courseId: course.id });
console.log("status:", kp.status, "created:", kp.data.created, kp.data.error ?? "");

// 3. RAG 问答（SSE 流式 + 引用 + 多轮）
console.log("\n== 问答（3 轮）==");
const session = await post(`${BASE}/api/chat/sessions`, { courseId: course.id });
const sessionId = session.data.session.id;

async function ask(question) {
  const res = await fetch(`${BASE}/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: question }),
  });
  if (!res.ok) {
    console.log(`Q: ${question}\n  !! HTTP ${res.status}`, await res.text());
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  let err = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const line = p.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      const d = JSON.parse(payload);
      if (d.delta) full += d.delta;
      if (d.error) err = d.error;
    }
  }
  const msgs = await fetch(`${BASE}/api/chat/sessions/${sessionId}/messages`).then((r) => r.json());
  const last = msgs.messages[msgs.messages.length - 1];
  console.log(`Q: ${question}`);
  console.log(`  A(${full.length}字${err ? " ERR:" + err : ""}): ${full.slice(0, 110).replace(/\n/g, " ")}…`);
  console.log(`  引用: ${JSON.stringify((last?.citations ?? []).map((c) => `[${c.n}] ${c.label}`))}`);
}

await ask("银行家算法如何判断系统是否处于安全状态？");
await ask("它和死锁预防的区别是什么？"); // 上下文依赖上一轮
await ask("再给出一个教材中的具体例子说明计算过程"); // 上下文依赖前两轮

// 4. 埋点确认
import Database from "better-sqlite3";
const db = new Database("data/shizhi.db");
const events = db.prepare("SELECT type, count(*) n FROM study_events GROUP BY type").all();
console.log("\nstudy_events:", JSON.stringify(events));
const kpCount = db.prepare("SELECT count(*) n FROM knowledge_points").get();
console.log("knowledge_points:", kpCount.n);
const summary = db.prepare("SELECT title, length(summary) s FROM documents WHERE summary IS NOT NULL").all();
console.log("doc summaries:", JSON.stringify(summary));
