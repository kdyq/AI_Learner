import fs from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { cleanText, type ParsedDocument, type Segment } from "./types";

/** PDF：unpdf 逐页抽取；整页 <20 字符标记 needsOcr */
export async function parsePdf(filePath: string): Promise<ParsedDocument> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await getDocumentProxy(data);
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const segments: Segment[] = [];
  const needsOcrPages: number[] = [];
  pages.forEach((page, i) => {
    const pageNo = i + 1;
    if (page.trim().length < 20) {
      needsOcrPages.push(pageNo);
      return;
    }
    const cleaned = cleanText(page);
    if (cleaned) segments.push({ text: cleaned, sourceRef: { page: pageNo } });
  });
  return { segments, pageCount: totalPages, needsOcrPages };
}
