import { NextResponse } from "next/server";
import { generateVariant } from "@/lib/quiz/variant";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/** 错题举一反三：生成一道同知识点变式题 */
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const result = await generateVariant(id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
