import type { ParsedDocument } from "./types";

export type { ParsedDocument, Segment, SourceRef } from "./types";

export async function parseDocument(
  fileType: "pdf" | "docx" | "pptx" | "md" | "txt",
  filePath: string
): Promise<ParsedDocument> {
  switch (fileType) {
    case "pdf":
      return (await import("./pdf")).parsePdf(filePath);
    case "docx":
      return (await import("./docx")).parseDocx(filePath);
    case "pptx":
      return (await import("./pptx")).parsePptx(filePath);
    case "md":
      return (await import("./md")).parseMd(filePath);
    case "txt":
      return (await import("./md")).parseTxt(filePath);
  }
}
