import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, chatSessions, type Citation } from "@/db/schema";
import { PERSONA, ragPrompt, FEYNMAN_PROMPT, SOCRATIC_PROMPT } from "@/lib/ai/prompts";
import { chatStream, sseStream } from "@/lib/ai/chat";
import { retrieve } from "@/lib/retrieval/hybrid";
import { buildNumberedContext } from "@/lib/retrieval/context";
import { recordEvent } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const rows = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt))
    .all();
  return NextResponse.json({ messages: rows });
}

/** SSE 流式问答：检索 → RAG prompt → 流式回答 → 落库（含引用） */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { content } = (await req.json()) as { content?: string };
  const question = content?.trim();
  if (!question) return NextResponse.json({ error: "内容为空" }, { status: 400 });

  const session = db.select().from(chatSessions).where(eq(chatSessions.id, id)).get();
  if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  // 历史（最近 6 条 = 3 轮）
  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt))
    .all()
    .slice(-6);

  const startedAt = Date.now();
  const userMsg = {
    id: crypto.randomUUID(),
    sessionId: id,
    role: "user" as const,
    content: question,
    citations: [],
    createdAt: startedAt,
  };
  db.insert(chatMessages).values(userMsg).run();

  // 检索（仅 RAG 模式；费曼/苏格拉底不需要资料上下文）
  let contextText = "";
  let citations: Citation[] = [];
  if (session.courseId && session.mode === "rag") {
    const chunks = await retrieve(session.courseId, question, 6);
    const built = buildNumberedContext(chunks);
    contextText = built.text;
    citations = built.citations;
  }

  const systemPrompt =
    session.mode === "feynman"
      ? `${PERSONA}\n\n${FEYNMAN_PROMPT}`
      : session.mode === "socratic"
        ? `${PERSONA}\n\n${SOCRATIC_PROMPT}`
        : PERSONA;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    {
      role: "user" as const,
      content:
        session.courseId && session.mode === "rag"
          ? ragPrompt(question, contextText || "（未检索到相关资料片段）", history.length)
          : question,
    },
  ];

  const gen = (async function* () {
    let full = "";
    try {
      for await (const delta of chatStream(messages)) {
        full += delta;
        yield delta;
      }
    } finally {
      // 最终落库：只保留回答中实际引用的 [n]
      const used = new Set<number>();
      for (const m of full.matchAll(/\[(\d{1,2})\]/g)) {
        used.add(Number(m[1]));
      }
      const finalCitations = citations.filter((c) => used.has(c.n));
      db.insert(chatMessages)
        .values({
          id: crypto.randomUUID(),
          sessionId: id,
          role: "assistant",
          content: full || "（模型未返回内容）",
          citations: finalCitations,
          createdAt: Date.now(),
        })
        .run();
      db.update(chatSessions)
        .set({
          title:
            session.title === "新会话" ? question.slice(0, 20) || "新会话" : session.title,
          updatedAt: Date.now(),
        })
        .where(eq(chatSessions.id, id))
        .run();
      recordEvent("chat", {
        courseId: session.courseId,
        durationSec: Math.round((Date.now() - startedAt) / 1000),
        meta: { sessionId: id },
      });
    }
  })();

  return new Response(sseStream(gen), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
