import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  chunks as chunksTable,
  courses,
  graphEdges,
  graphNodes,
  knowledgePoints,
} from "@/db/schema";
import { callJson } from "@/lib/ai/json";
import { GraphSchema } from "@/lib/ai/schemas";
import { GRAPH_PROMPT } from "@/lib/ai/prompts";

/** 图谱构建：知识点 + 资料片段 → AI 抽实体关系 → 入库（同名去重） */
export async function buildGraph(courseId: string): Promise<{ nodes: number; edges: number }> {
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) throw new Error("课程不存在");
  const kps = db.select().from(knowledgePoints).where(eq(knowledgePoints.courseId, courseId)).all();
  const sampleChunks = db
    .select({ content: chunksTable.content })
    .from(chunksTable)
    .where(eq(chunksTable.courseId, courseId))
    .orderBy(asc(chunksTable.seq))
    .all()
    .slice(0, 12)
    .map((c) => c.content.slice(0, 500));

  if (kps.length === 0 && sampleChunks.length === 0) {
    throw new Error("没有知识点或资料分块（先上传资料并提取知识点）");
  }

  const kpText = kps
    .map((k) => `- ${k.title}（${k.importance === "core" ? "核心" : "了解"}）：${k.content.slice(0, 120)}`)
    .join("\n");
  const ctx = `${kpText ? `【知识点】\n${kpText}\n\n` : ""}【资料片段】\n${sampleChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n")}`;

  const g = await callJson(GraphSchema, [{ role: "user", content: `课程：${course.name}\n\n${GRAPH_PROMPT}${ctx}` }]);

  const nameToKpId = new Map(kps.map((k) => [k.title, k.id]));
  const nameToId = new Map<string, string>();

  for (const n of g.nodes) {
    const name = n.name.trim();
    if (!name) continue;
    const id = crypto.randomUUID();
    db.insert(graphNodes)
      .values({
        id,
        courseId,
        name,
        type: n.type ?? "concept",
        description: n.description ?? "",
        knowledgePointId: nameToKpId.get(name) ?? null,
        weight: 1,
      })
      .onConflictDoNothing({ target: [graphNodes.courseId, graphNodes.name] })
      .run();
    const stored = db.select().from(graphNodes).where(eq(graphNodes.name, name)).all().find((r) => r.courseId === courseId);
    if (stored) nameToId.set(name, stored.id);
  }

  let edgeCount = 0;
  for (const e of g.edges) {
    const s = nameToId.get(e.source.trim());
    const t = nameToId.get(e.target.trim());
    if (!s || !t || s === t) continue;
    db.insert(graphEdges)
      .values({
        id: crypto.randomUUID(),
        courseId,
        sourceId: s,
        targetId: t,
        relation: e.relation || "关联",
        weight: 1,
      })
      .onConflictDoNothing({ target: [graphEdges.sourceId, graphEdges.targetId, graphEdges.relation] })
      .run();
    edgeCount++;
  }

  const nodes = db.select().from(graphNodes).where(eq(graphNodes.courseId, courseId)).all();
  const edges = db.select().from(graphEdges).where(eq(graphEdges.courseId, courseId)).all();
  return { nodes: nodes.length, edges: edges.length };
}

export function getGraph(courseId: string) {
  const nodes = db.select().from(graphNodes).where(eq(graphNodes.courseId, courseId)).all();
  const edges = db.select().from(graphEdges).where(eq(graphEdges.courseId, courseId)).all();
  return { nodes, edges };
}
