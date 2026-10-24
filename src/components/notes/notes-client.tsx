"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DownloadSimple,
  FileText,
  MicrosoftWordLogo,
  NotePencil,
  TrashSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Markdown } from "@/components/chat/markdown";
import { cn } from "@/lib/utils";

export type NoteRow = {
  id: string;
  courseId: string | null;
  title: string;
  content: string;
  updatedAt: number;
};

export type KpOption = { id: string; title: string; courseId: string };

/** 预览时把 [[知识点]] 渲染为课程页锚点链接 */
function LinkedMarkdown({ content, courseId }: { content: string; courseId: string | null }) {
  const parts = content.split(/(\[\[[^\]]+\]\])/g);
  return (
    <div className="space-y-1">
      {parts.map((p, i) => {
        const m = p.match(/^\[\[([^\]]+)\]\]$/);
        if (m) {
          const href = courseId ? `/courses/${courseId}#kp-${encodeURIComponent(m[1])}` : "#";
          return (
            <a key={i} href={href} className="rounded-[4px] bg-sky-bg px-1 font-semibold text-sky-ink hover:underline">
              {m[1]}
            </a>
          );
        }
        return (
          <div key={i} className="text-[13.5px] leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:ml-4 [&_ul]:list-disc [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-[15px] [&_h2]:font-bold [&_h3]:font-semibold">
            <Markdown content={p} />
          </div>
        );
      })}
    </div>
  );
}

export function NotesClient({
  initialNotes,
  courses,
  knowledgePoints,
}: {
  initialNotes: NoteRow[];
  courses: { id: string; name: string }[];
  knowledgePoints: KpOption[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [title, setTitle] = useState(initialNotes[0]?.title ?? "");
  const [content, setContent] = useState(initialNotes[0]?.content ?? "");
  const [courseId, setCourseId] = useState<string>(initialNotes[0]?.courseId ?? courses[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const openNote = (n: NoteRow) => {
    setActiveId(n.id);
    setTitle(n.title);
    setContent(n.content);
    setCourseId(n.courseId ?? courses[0]?.id ?? "");
  };

  const create = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "无标题笔记", content: "", courseId: courseId || null }),
    });
    if (!res.ok) return toast.error("创建失败");
    const d = (await res.json()) as { note: NoteRow };
    setNotes((ns) => [d.note, ...ns]);
    openNote(d.note);
    router.refresh();
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    const res = await fetch(`/api/notes/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, }),
    });
    if (res.ok) {
      const now = Date.now();
      setNotes((ns) => ns.map((n) => (n.id === active.id ? { ...n, title, content, updatedAt: now } : n)));
      toast.success("已保存");
      router.refresh();
    } else toast.error("保存失败");
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("删除该笔记？")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("删除失败");
    setNotes((ns) => ns.filter((n) => n.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setTitle("");
      setContent("");
    }
    toast.success("已删除");
    router.refresh();
  };

  const insertKp = (kpTitle: string) => {
    setContent((c) => c + (c && !c.endsWith("\n") ? "\n" : "") + `[[${kpTitle}]]`);
  };

  const scopedKps = knowledgePoints.filter((k) => !courseId || k.courseId === courseId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">笔记</h1>
          <p className="mt-1 text-[13px] text-ink-2">Markdown 笔记；输入 [[知识点名]] 与课程知识点互链</p>
        </div>
        <Button size="sm" onClick={create}>
          <NotePencil size={14} /> 新笔记
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-1.5">
          {notes.length === 0 && (
            <p className="rounded-[14px] border-2 border-dashed border-line py-8 text-center text-[12.5px] text-ink-3">
              还没有笔记
            </p>
          )}
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => openNote(n)}
              className={cn(
                "flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left text-[13px] transition-colors",
                activeId === n.id ? "bg-ink text-white" : "hover:bg-surface-hover"
              )}
            >
              <FileText size={14} className="shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate font-medium">{n.title}</span>
              <span
                role="button"
                tabIndex={0}
                aria-label={`删除 ${n.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void remove(n.id);
                }}
                onKeyDown={(e) => e.key === "Enter" && void remove(n.id)}
                className={cn("shrink-0", activeId === n.id ? "text-white/70 hover:text-white" : "text-ink-3 hover:text-danger")}
              >
                <TrashSimple size={13} />
              </span>
            </button>
          ))}
        </aside>

        {active ? (
          <div className="space-y-3 rounded-[18px] bg-surface p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 font-semibold" placeholder="笔记标题" />
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="关联课程" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select onValueChange={insertKp}>
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue placeholder="插入知识点链接" />
                </SelectTrigger>
                <SelectContent>
                  {scopedKps.slice(0, 30).map((k) => (
                    <SelectItem key={k.id} value={k.title}>{k.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-1.5">
                <a href={`/api/notes/${active.id}/export?format=md`}>
                  <Button variant="outline" size="sm"><DownloadSimple size={13} /> MD</Button>
                </a>
                <a href={`/api/notes/${active.id}/export?format=docx`}>
                  <Button variant="outline" size="sm"><MicrosoftWordLogo size={13} /> Word</Button>
                </a>
              </div>
            </div>

            <Tabs defaultValue="edit">
              <TabsList>
                <TabsTrigger value="edit">编辑</TabsTrigger>
                <TabsTrigger value="preview">预览</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-2">
                <Textarea
                  rows={16}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={"# 支持 Markdown\n\n公式 $E=mc^2$，知识点互链 [[多级页表]]"}
                  className="font-mono text-[13px]"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-2 min-h-[300px] rounded-[14px] bg-page px-4 py-3">
                {content ? (
                  <LinkedMarkdown content={content} courseId={courseId || null} />
                ) : (
                  <p className="py-8 text-center text-[13px] text-ink-3">暂无内容</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="grid place-items-center rounded-[18px] border-2 border-dashed border-line py-16 text-[13px] text-ink-3">
            选择左侧笔记或新建
          </div>
        )}
      </div>
    </div>
  );
}
