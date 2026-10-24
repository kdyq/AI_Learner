/** M6 验收：费曼/苏格拉底/变式/模拟卷/OCR/笔记/全局搜索 */
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
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      const d = JSON.parse(payload);
      if (d.delta) full += d.delta;
      if (d.error) full = "[ERR] " + d.error;
    }
  }
  return full;
}

// 1. 费曼模式
console.log("== 费曼模式 ==");
const fyn = await post(`${BASE}/api/chat/sessions`, { courseId: course.id, mode: "feynman", title: "费曼练习" });
const fynReply = await ask(fyn.data.session.id, "我来给你讲讲死锁：死锁就是电脑坏了，程序跑不动了，重启就好。两个程序抢内存抢不到就都停了。");
console.log("回复(节选):", fynReply.slice(0, 180).replace(/\n/g, " "));

// 2. 苏格拉底
console.log("\n== 苏格拉底 ==");
const soc = await post(`${BASE}/api/chat/sessions`, { courseId: course.id, mode: "socratic", title: "苏格拉底练习" });
const socReply = await ask(soc.data.session.id, "银行家算法是什么？直接告诉我答案。");
console.log("回复(节选):", socReply.slice(0, 180).replace(/\n/g, " "));
console.log("以问号结尾(引导式):", socReply.trim().endsWith("？") || socReply.includes("？"));

// 3. 举一反三
console.log("\n== 举一反三 ==");
const wrongs = await fetch(`${BASE}/api/wrong-items`).then((r) => r.json());
const variant = await post(`${BASE}/api/wrong-items/${wrongs.items[0].id}/variant`, {});
console.log("变式:", variant.status, JSON.stringify(variant.data));
if (variant.data.quizSetId) {
  const vq = await fetch(`${BASE}/api/quiz/sets/${variant.data.quizSetId}`).then((r) => r.json());
  console.log("变式题干:", vq.questions[0]?.stem.slice(0, 70));
}

// 4. 模拟卷
console.log("\n== 模拟卷 ==");
const mock = await post(`${BASE}/api/quiz/mock-exam`, { courseId: course.id, count: 10, timeLimitMin: 45 });
console.log("模拟卷:", mock.status, JSON.stringify(mock.data));
if (mock.data.quizSetId) {
  const mq = await fetch(`${BASE}/api/quiz/sets/${mock.data.quizSetId}`).then((r) => r.json());
  console.log("题数:", mq.questions.length, "· 限时:", mq.set.config.timeLimitMin, "分钟 · 标题:", mq.set.title);
}

// 5. 图片 OCR（Agnes 视觉 data URL 实测）
console.log("\n== 图片 OCR（视觉槽位实测）==");
const png = fs.readFileSync("test/assets/scan-page-1.png");
const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
const ocr = await post(`${BASE}/api/documents/ocr`, { courseId: course.id, dataUrl, fileName: "scan-page-1.png" });
console.log("OCR:", ocr.status, ocr.status === 201 ? `识别 ${ocr.data.charCount} 字，文档已入库` : ocr.data.error);
if (ocr.status === 201) {
  const s = await fetch(`${BASE}/api/search?q=${encodeURIComponent("索引分配 磁盘")}&courseId=${course.id}`).then((r) => r.json());
  const fromOcr = s.results.filter((r) => r.documentId === ocr.data.documentId);
  console.log("OCR 内容可检索:", fromOcr.length > 0 ? `命中 ${fromOcr.length} 块 ✓` : "未命中 ✗");
}

// 6. 笔记
console.log("\n== 笔记 ==");
const note = await post(`${BASE}/api/notes`, { title: "M6 验收笔记", content: "# 要点\n死锁四条件见 [[处理机调度的定义与三级调度模型]]", courseId: course.id });
console.log("创建:", note.status);
const mdExport = await fetch(`${BASE}/api/notes/${note.data.note.id}/export?format=md`);
const docxExport = await fetch(`${BASE}/api/notes/${note.data.note.id}/export?format=docx`);
console.log("MD 导出:", mdExport.status, "· Word 导出:", docxExport.status, docxExport.headers.get("content-type")?.slice(0, 60));

// 7. 跨课程全局搜索
console.log("\n== 全局搜索（跨课程）==");
const g = await fetch(`${BASE}/api/search?q=${encodeURIComponent("调度算法")}`).then((r) => r.json());
console.log("命中:", g.results.length, "块；来源文档:", [...new Set(g.results.map((r) => r.documentTitle))].join("、"));

// 8. 页面
for (const p of ["/notes", "/chat", "/quiz"]) {
  const r = await fetch(`${BASE}${p}`);
  console.log(`GET ${p} -> ${r.status}`);
}
