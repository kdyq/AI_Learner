import mammoth from "mammoth";
import { parseMarkdownSource } from "./md";
import type { ParsedDocument } from "./types";

/** 极简 HTML → Markdown（只保留标题层级/段落/列表，供按标题切段） */
function htmlToMd(html: string): string {
  return html
    .replace(/<h1[^>]*>/g, "\n# ")
    .replace(/<h2[^>]*>/g, "\n## ")
    .replace(/<h3[^>]*>/g, "\n### ")
    .replace(/<h4[^>]*>/g, "\n#### ")
    .replace(/<h5[^>]*>/g, "\n##### ")
    .replace(/<h6[^>]*>/g, "\n###### ")
    .replace(/<\/h[1-6]>/g, "\n")
    .replace(/<li[^>]*>/g, "- ")
    .replace(/<\/li>/g, "\n")
    .replace(/<\/p>/g, "\n\n")
    .replace(/<\/tr>/g, "\n")
    .replace(/<\/td>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** DOCX：mammoth 转 HTML（保留标题层级）→ 轻量 Markdown 化 → 按标题切段 */
export async function parseDocx(filePath: string): Promise<ParsedDocument> {
  const { value: html } = await mammoth.convertToHtml({ path: filePath });
  return parseMarkdownSource(htmlToMd(html), false);
}
