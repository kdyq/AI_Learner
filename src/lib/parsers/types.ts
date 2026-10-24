/** 解析产物：带结构引用的文本段（页/页签/标题） */
export type SourceRef = { page?: number; slide?: number; heading?: string };

export type Segment = {
  text: string;
  sourceRef: SourceRef;
};

export type ParsedDocument = {
  segments: Segment[];
  pageCount: number | null;
  /** 文本长度 < 20 字符的页（疑似扫描件，需 OCR） */
  needsOcrPages: number[];
};

/** 清理抽出的文本：去多余空白但保留段落结构 */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
