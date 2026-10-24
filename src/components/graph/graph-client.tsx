"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Graph as G6Graph, NodeData, EdgeData } from "@antv/g6";
import { Graph as GraphIcon, ListChecks, Cards, Sparkle, SpinnerGap, TreeStructure } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type GNode = {
  id: string;
  name: string;
  type: "concept" | "process" | "example";
  description: string;
  knowledgePointId: string | null;
};
type GEdge = { id: string; sourceId: string; targetId: string; relation: string };

type CourseOption = { id: string; name: string };

const TYPE_COLOR: Record<GNode["type"], string> = {
  concept: "#2C5CC5",
  process: "#1E6B4B",
  example: "#B44E68",
};

const TYPE_LABEL: Record<GNode["type"], string> = {
  concept: "概念",
  process: "过程",
  example: "实例",
};

export function GraphClient({
  courses,
  initialCourseId,
}: {
  courses: CourseOption[];
  initialCourseId: string | null;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(initialCourseId ?? courses[0]?.id ?? "");
  const [nodes, setNodes] = useState<GNode[]>([]);
  const [edges, setEdges] = useState<GEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [acting, setActing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const markmapRef = useRef<HTMLDivElement>(null);

  const load = async (cid: string) => {
    setLoading(true);
    setSelected(null);
    const res = await fetch(`/api/graph?courseId=${cid}`);
    if (res.ok) {
      const d = (await res.json()) as { nodes: GNode[]; edges: GEdge[] };
      setNodes(d.nodes);
      setEdges(d.edges);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) void load(courseId);
  }, [courseId]);

  const build = async () => {
    if (!courseId) return;
    setBuilding(true);
    try {
      const res = await fetch("/api/ai/graph/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const d = (await res.json()) as { nodes?: number; edges?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "构建失败");
      toast.success(`图谱已构建：${d.nodes} 节点 / ${d.edges} 关系`);
      void load(courseId);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBuilding(false);
    }
  };

  const genQuiz = async (node: GNode) => {
    setActing(true);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          scope: node.knowledgePointId ? "knowledge" : "course",
          targetId: node.knowledgePointId ?? undefined,
          types: ["single", "short"],
          count: 3,
          difficulty: 3,
        }),
      });
      const d = (await res.json()) as { quizSetId?: string; error?: string };
      if (!res.ok) throw new Error(d.error ?? "出题失败");
      router.push(`/quiz/${d.quizSetId}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const toReview = async (node: GNode) => {
    if (!node.knowledgePointId) {
      toast.info("该节点未关联知识点，无法直接入复习");
      return;
    }
    setActing(true);
    try {
      const res = await fetch("/api/flashcards/from-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgePointIds: [node.knowledgePointId] }),
      });
      const d = (await res.json()) as { created?: number };
      toast.success(d.created ? `已转闪卡 ${d.created} 张，去复习页可见` : "该知识点已有闪卡");
    } finally {
      setActing(false);
    }
  };

  // G6 渲染
  useEffect(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    let graph: G6Graph | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { Graph } = await import("@antv/g6");
        if (cancelled || !containerRef.current) return;
        const el = containerRef.current;
        graph = new Graph({
        container: el,
        width: el.clientWidth,
        height: 640,
        autoFit: "view",
        padding: 30,
        data: {
          nodes: nodes.map((n) => ({ id: n.id, data: { label: n.name, type: n.type } })),
          edges: edges.map((e) => ({ id: e.id, source: e.sourceId, target: e.targetId, data: { label: e.relation } })),
        },
        node: {
          style: {
            size: (d: NodeData) => ((d.data as { type?: string })?.type === "concept" ? 22 : 15),
            fill: (d: NodeData) =>
              TYPE_COLOR[((d.data as { type?: string })?.type as GNode["type"]) ?? "concept"] ?? "#5D6170",
            lineWidth: 1.5,
            lineFallWidth: 3,
            labelText: (d: NodeData) => String((d.data as { label?: string })?.label ?? ""),
            labelFill: "#3A3D49",
            labelFontSize: 10,
            labelPlacement: "bottom" as const,
            labelOffsetY: 2,
            labelWordWrap: true,
            labelMaxLength: 12,
            labelBackground: true,
            labelBackgroundFill: "rgba(255,255,255,.92)",
            labelBackgroundRadius: 4,
            labelBackgroundLineWidth: 0,
            labelPadding: [1, 3],
          },
          state: {
            active: { halo: true, haloStroke: "#9A9EAD", labelFontSize: 11 },
          },
        },
        edge: {
          style: {
            stroke: "#C9CCD9",
            lineWidth: 1,
            endArrow: true,
            endArrowSize: 6,
            endArrowFill: "#C9CCD9",
            // 关系文字默认隐藏，悬停该边时显示
            labelText: (d: EdgeData) => String((d.data as { label?: string })?.label ?? ""),
            labelFontSize: 8.5,
            labelFill: "#7A7E8E",
            labelOpacity: 0,
            labelBackground: true,
            labelBackgroundFill: "#FFFFFF",
            labelBackgroundOpacity: 0,
            labelBackgroundRadius: 4,
            labelPadding: [1, 3],
          },
          state: {
            active: {
              stroke: "#8A8FA3",
              lineWidth: 1.6,
              labelOpacity: 1,
              labelBackgroundOpacity: 0.95,
            },
          },
        },
        layout: {
          type: "force",
          linkDistance: 150,
          nodeStrength: -160,
          edgeStrength: 50,
          gravity: 5,
          preventOverlap: true,
          nodeSize: 34,
          alphaDecay: 0.028,
          alphaMin: 0.01,
        },
        behaviors: [
          "drag-canvas",
          "zoom-canvas",
          "drag-element",
          { type: "hover-activate", degree: 0 },
        ],
        });
        graph.on("node:click", (ev: unknown) => {
          const id = (ev as { target?: { id?: string } }).target?.id;
          const n = nodes.find((x) => x.id === id);
          if (n) setSelected(n);
        });
        await graph.render();
      } catch (err) {
        console.error("[G6]", err);
        toast.error(`图谱渲染失败：${(err as Error).message?.slice(0, 120)}`);
      }
    })();
    return () => {
      cancelled = true;
      graph?.destroy();
    };
  }, [nodes, edges]);

  // markmap 思维导图（知识点层级）
  useEffect(() => {
    if (nodes.length === 0 || !markmapRef.current) return;
    let cancelled = false;
    (async () => {
      const { Transformer } = await import("markmap-lib");
      const { Markmap } = await import("markmap-view");
      if (cancelled || !markmapRef.current) return;
      const core = nodes.filter((n) => n.type === "concept");
      const md = [
        `# ${courses.find((c) => c.id === courseId)?.name ?? "课程"}`,
        ...core.slice(0, 40).map((n) => `## ${n.name}\n${n.description.slice(0, 100)}`),
      ].join("\n");
      const { root } = new Transformer().transform(md);
      Markmap.create(markmapRef.current, { duration: 400, maxWidth: 260 }, root);
    })();
    return () => {
      cancelled = true;
    };
  }, [nodes, courseId, courses]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">知识图谱</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {nodes.length > 0 ? (
              <>
                <span className="num">{nodes.length}</span> 节点 · <span className="num">{edges.length}</span> 关系 · 点击节点可出题/入复习
              </>
            ) : (
              "AI 从知识点与资料中抽取实体关系"
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={courses.length ? "选择课程" : "暂无课程"} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={build} disabled={building || !courseId}>
            {building ? <SpinnerGap className="animate-spin" size={14} /> : <Sparkle size={14} />}
            {building ? "构建中…" : nodes.length > 0 ? "重新构建" : "AI 构建图谱"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="graph">
        <TabsList>
          <TabsTrigger value="graph">
            <GraphIcon size={14} /> 关系图谱
          </TabsTrigger>
          <TabsTrigger value="mindmap">
            <TreeStructure size={14} /> 思维导图
          </TabsTrigger>
        </TabsList>
        <TabsContent value="graph" className="mt-3">
          {loading ? (
            <p className="py-20 text-center text-sm text-ink-3">加载图谱…</p>
          ) : nodes.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-[18px] border-2 border-dashed border-line py-16 text-center">
              <GraphIcon size={26} className="text-ink-3" />
              <p className="text-sm text-ink-2">还没有图谱数据，点右上「AI 构建图谱」</p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[18px] bg-surface ring-1 ring-line">
              <div ref={containerRef} className="h-[640px] w-full" />
              <div className="absolute top-3 left-3 flex gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold ring-1 ring-line">
                {(["concept", "process", "example"] as const).map((t) => (
                  <span key={t} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />
                    {TYPE_LABEL[t]}
                  </span>
                ))}
              </div>
              <div className="absolute right-3 bottom-3 rounded-full bg-white/85 px-3 py-1.5 text-[10.5px] text-ink-3 ring-1 ring-line">
                悬停连线看关系 · 滚轮缩放 · 拖拽平移
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-3 rounded-[18px] bg-surface p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-bold">{selected.name}</h3>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                  style={{ background: TYPE_COLOR[selected.type] }}
                >
                  {TYPE_LABEL[selected.type]}
                </span>
                {selected.knowledgePointId && (
                  <span className="rounded-full bg-mint-bg px-2.5 py-0.5 text-[11px] font-semibold text-mint-ink">已关联知识点</span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{selected.description || "（无描述）"}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => void genQuiz(selected)} disabled={acting}>
                  <ListChecks size={13} /> 围绕出题
                </Button>
                <Button variant="outline" size="sm" onClick={() => void toReview(selected)} disabled={acting}>
                  <Cards size={13} /> 入复习
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="mindmap" className="mt-3">
          {nodes.length === 0 ? (
            <p className="rounded-[18px] border-2 border-dashed border-line py-16 text-center text-sm text-ink-3">
              先构建图谱，思维导图按概念节点展开
            </p>
          ) : (
            <div className="overflow-hidden rounded-[18px] bg-surface ring-1 ring-line">
              <div ref={markmapRef} className={cn("h-[640px] w-full")} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
