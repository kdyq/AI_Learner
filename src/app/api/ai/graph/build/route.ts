import { NextResponse } from "next/server";
import { buildGraph } from "@/lib/graph/build";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { courseId } = (await req.json()) as { courseId?: string };
  if (!courseId) return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  try {
    const result = await buildGraph(courseId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
