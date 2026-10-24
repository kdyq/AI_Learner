import { NextResponse } from "next/server";
import { getGraph } from "@/lib/graph/build";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  return NextResponse.json(getGraph(courseId));
}
