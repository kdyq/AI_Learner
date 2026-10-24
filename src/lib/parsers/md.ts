import fs from "node:fs";
import { cleanText, type ParsedDocument, type Segment } from "./types";

/** Markdown/TXT：按标题层级切段（无标题则整篇一段，交给分块器细切） */
export function parseMarkdownSource(raw: string, isPlain = false): ParsedDocument {
  const text = cleanText(raw);
  if (isPlain || !/^#{1,6}\s/m.test(text)) {
    return { segments: text ? [{ text, sourceRef: {} }] : [], pageCount: null, needsOcrPages: [] };
  }
  const segments: Segment[] = [];
  let heading = "";
  let buf: string[] = [];
  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) segments.push({ text: body, sourceRef: { heading: heading || undefined } });
    buf = [];
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      flush();
      heading = m[2].trim();
      buf.push(line);
    } else {
      buf.push(line);
    }
  }
  flush();
  return { segments, pageCount: null, needsOcrPages: [] };
}

export async function parseMd(filePath: string): Promise<ParsedDocument> {
  return parseMarkdownSource(fs.readFileSync(filePath, "utf8"), false);
}

export async function parseTxt(filePath: string): Promise<ParsedDocument> {
  return parseMarkdownSource(fs.readFileSync(filePath, "utf8"), true);
}
