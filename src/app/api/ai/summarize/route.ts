import { NextResponse } from "next/server";
import { summarizeDocument } from "@/lib/ai/knowledge";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { documentId } = (await req.json()) as { documentId?: string };
  if (!documentId) return NextResponse.json({ error: "缺少 documentId" }, { status: 400 });
  try {
    const summary = await summarizeDocument(documentId);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
