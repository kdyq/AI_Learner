import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";

export const runtime = "nodejs";

const COLORS = ["mint", "sky", "peach", "lemon", "rose"] as const;

export async function GET() {
  const list = db.select().from(courses).orderBy(desc(courses.createdAt)).all();
  return NextResponse.json({ courses: list });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    color?: string;
  };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "课程名不能为空" }, { status: 400 });
  const color = COLORS.includes(body.color as (typeof COLORS)[number])
    ? (body.color as (typeof COLORS)[number])
    : COLORS[Math.floor(Math.random() * COLORS.length)];
  const row = {
    id: crypto.randomUUID(),
    name,
    description: body.description?.trim() ?? "",
    color,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.insert(courses).values(row).run();
  return NextResponse.json({ course: row }, { status: 201 });
}
