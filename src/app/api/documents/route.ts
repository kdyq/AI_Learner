import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  const rows = courseId
    ? db.select().from(documents).where(eq(documents.courseId, courseId)).orderBy(desc(documents.createdAt)).all()
    : db.select().from(documents).orderBy(desc(documents.createdAt)).all();
  return NextResponse.json({ documents: rows });
}
