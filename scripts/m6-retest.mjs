/** M6 修复复测：模拟卷 + 苏格拉底 */
import fs from "node:fs";

const BASE = "http://localhost:3000";
const course = JSON.parse(fs.readFileSync("test/_course.json", "utf8")).course;
const post = (url, body) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }));

async function ask(sessionId, question) {
  const res = await fetch(`${BASE}/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: question }),
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const line = p.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      if (line.slice(6) === "[DONE]") continue;
      const d = JSON.parse(line.slice(6));
      if (d.delta) full += d.delta;
      if (d.error) full = "[ERR] " + d.error;
    }
  }
  return full;
}

console.log("== 模拟卷（修复后）==");
const mock = await post(`${BASE}/api/quiz/mock-exam`, { courseId: course.id, count: 10, timeLimitMin: 45 });
console.log("模拟卷:", mock.status, JSON.stringify(mock.data).slice(0, 120));
if (mock.data.quizSetId) {
  const mq = await fetch(`${BASE}/api/quiz/sets/${mock.data.quizSetId}`).then((r) => r.json());
  console.log("题数:", mq.questions.length, "· 限时:", mq.set.config.timeLimitMin, "分钟 · 题型:", [...new Set(mq.questions.map((q) => q.type))].join(","));
}

console.log("\n== 苏格拉底（加强后）==");
const soc = await post(`${BASE}/api/chat/sessions`, { courseId: course.id, mode: "socratic", title: "苏格拉底复测" });
const r1 = await ask(soc.data.session.id, "银行家算法是什么？别绕弯子，直接告诉我答案。");
console.log("第1轮:", r1.slice(0, 160).replace(/\n/g, " "));
const r2 = await ask(soc.data.session.id, "不知道，你直接说吧，我赶时间。");
console.log("第2轮:", r2.slice(0, 160).replace(/\n/g, " "));
