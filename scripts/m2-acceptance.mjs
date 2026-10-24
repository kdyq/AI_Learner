/** M2 验收：上传 5 个测试文件并轮询至稳定状态 */
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const course = JSON.parse(fs.readFileSync("test/_course.json", "utf8")).course;

const files = [
  "Chapter3-4-调度与死锁.pdf",
  "第4-5讲-调度与死锁.docx",
  "第5讲-死锁.pptx",
  "操作系统-处理机调度笔记.md",
  "扫描件-文件管理笔记.pdf",
].map((f) => path.join("test", f));

const fd = new FormData();
fd.set("courseId", course.id);
for (const f of files) {
  const buf = fs.readFileSync(f);
  fd.append("files", new Blob([buf]), path.basename(f));
}
const up = await fetch(`${BASE}/api/documents/upload`, { method: "POST", body: fd });
const upData = await up.json();
console.log("upload status:", up.status, "created:", upData.documents?.length, "rejected:", JSON.stringify(upData.rejected ?? []));

// 轮询直至全部稳定
let docs;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  const res = await fetch(`${BASE}/api/documents?courseId=${course.id}`);
  docs = (await res.json()).documents;
  const busy = docs.filter((d) => d.status === "pending" || d.status === "parsing");
  process.stdout.write(`poll ${i}: busy=${busy.length}\r`);
  if (busy.length === 0) break;
}
console.log("\nfinal states:");
for (const d of docs) {
  console.log(
    `  ${d.fileName} | ${d.status} | pages=${d.pageCount ?? "-"} chars=${d.charCount ?? "-"} chunks=${d.meta?.chunkCount ?? "-"} err=${d.errorMessage ?? "-"} ocr=${JSON.stringify(d.meta?.needsOcrPages ?? [])}`
  );
}

// 检索验证
const queries = ["银行家算法 安全状态", "时间片轮转 调度算法", "文件控制块 FCB"];
for (const q of queries) {
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}&courseId=${course.id}`);
  const { results } = await res.json();
  console.log(`\nsearch "${q}":`);
  for (const r of results.slice(0, 3)) {
    console.log(`  [${r.documentTitle}] ref=${JSON.stringify(r.sourceRef)} :: ${r.content.slice(0, 50).replace(/\n/g, " ")}…`);
  }
}
