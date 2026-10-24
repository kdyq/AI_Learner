import { describe, expect, it } from "vitest";
import { tokenize } from "../src/lib/retrieval/tokenizer";
import { chunkSegments } from "../src/lib/retrieval/chunker";
import type { Segment } from "../src/lib/parsers/types";

describe("tokenizer", () => {
  it("CJK 串切二元组", () => {
    expect(tokenize("死锁")).toEqual(["死锁"]);
    expect(tokenize("处理机调度")).toEqual(["处理", "理机", "机调", "调度"]);
  });

  it("拉丁词整词小写", () => {
    expect(tokenize("FCFS 和 SRTN")).toEqual(["fcfs", "srtn", "和"]);
  });

  it("单字 CJK 保留", () => {
    expect(tokenize("图")).toEqual(["图"]);
  });

  it("混合文本", () => {
    const t = tokenize("使用 RR 时间片");
    expect(t).toContain("rr");
    expect(t).toContain("时间");
    expect(t).toContain("间片");
  });
});

describe("chunker", () => {
  it("短段直接成块且保留 sourceRef", () => {
    const segs: Segment[] = [{ text: "短内容", sourceRef: { page: 3 } }];
    const chunks = chunkSegments(segs);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].sourceRef).toEqual({ page: 3 });
  });

  it("超长段按 ~600 字切分且相邻重叠 80 字", () => {
    const sentence = "这是用于测试的一个完整句子，长度适中。";
    const long = sentence.repeat(80); // ~1280 字
    const chunks = chunkSegments([{ text: long, sourceRef: { slide: 2 } }]);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(800);
    }
    // 后一块开头 = 前一块结尾的重叠尾巴
    const tail = chunks[0].content.slice(-80);
    expect(chunks[1].content.startsWith(tail)).toBe(true);
    expect(chunks.every((c) => c.sourceRef.slide === 2)).toBe(true);
  });

  it("多段各自成块", () => {
    const segs: Segment[] = [
      { text: "第一页内容。", sourceRef: { page: 1 } },
      { text: "第二页内容。", sourceRef: { page: 2 } },
    ];
    expect(chunkSegments(segs)).toHaveLength(2);
  });
});
