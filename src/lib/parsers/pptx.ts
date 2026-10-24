import { OfficeParser } from "officeparser";
import { cleanText, type ParsedDocument, type Segment } from "./types";

type Node = {
  type: string;
  text?: string;
  children?: Node[];
  metadata?: { slideNumber?: number };
};

function collectText(node: Node): string {
  const kids = (node.children ?? []).filter((c) => c.type !== "note" && c.type !== "slide");
  if (kids.length > 0) {
    // 有子节点时只用子节点（paragraph.text 会与其内部 text 重复）
    return kids.map((c) => collectText(c)).join("");
  }
  return node.text ? node.text + "\n" : "";
}

/** PPTX：officeparser AST 逐页签抽取 */
export async function parsePptx(filePath: string): Promise<ParsedDocument> {
  const ast = await OfficeParser.parseOffice(filePath);
  const slides = (ast.content as unknown as Node[]).filter((n) => n.type === "slide");
  const segments: Segment[] = [];
  for (const slide of slides) {
    const slideNo = slide.metadata?.slideNumber ?? segments.length + 1;
    const body = cleanText(collectText(slide));
    if (body) segments.push({ text: body, sourceRef: { slide: slideNo } });
  }
  return { segments, pageCount: slides.length, needsOcrPages: [] };
}
