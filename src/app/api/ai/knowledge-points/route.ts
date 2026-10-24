import { NextResponse } from "next/server";
import { extractKnowledgePoints } from "@/lib/ai/knowledge";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const { documentId, courseId } = (await req.json()) as {
    documentId?: string;
    courseId?: string;
  };
  if (!documentId && !courseId) {
    return NextResponse.json({ error: "缺少 documentId 或 courseId" }, { status: 400 });
  }
  try {
    const result = await extractKnowledgePoints({ documentId, courseId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
