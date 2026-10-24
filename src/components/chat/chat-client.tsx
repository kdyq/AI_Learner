"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChatCircleText,
  FileText,
  PaperPlaneTilt,
  Plus,
  SpinnerGap,
  TrashSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Markdown } from "./markdown";
import type { Citation } from "@/db/schema";
import { cn } from "@/lib/utils";

export type ChatSession = {
  id: string;
  courseId: string | null;
  title: string;
  updatedAt: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  createdAt: number;
};

type CourseOption = { id: string; name: string; color: string };

const SUGGESTIONS = [
  "多级页表为什么能节省内存？",
  "对比 FCFS 和 SJF 的适用场景",
  "银行家算法如何判断安全状态？",
];

export function ChatClient({
  initialSessions,
  courses,
  model,
}: {
  initialSessions: ChatSession[];
  courses: CourseOption[];
  model: string;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [newCourse, setNewCourse] = useState(courses[0]?.id ?? "none");
  const [drawerCitation, setDrawerCitation] = useState<Citation | null>(null);
  const [drawerChunk, setDrawerChunk] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const courseName = (id: string | null) =>
    courses.find((c) => c.id === id)?.name ?? "未绑定课程";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const loadMessages = async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
    if (res.ok) {
      const d = (await res.json()) as { messages: ChatMessage[] };
      setMessages(d.messages);
    }
  };

  const createSession = async () => {
    if (courses.length === 0) {
      toast.error("请先在「课程」页创建课程并上传资料");
      return;
    }
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: newCourse === "none" ? null : newCourse }),
    });
    if (!res.ok) return toast.error("创建会话失败");
    const d = (await res.json()) as { session: ChatSession };
    setSessions((s) => [d.session, ...s]);
    setActiveId(d.session.id);
    setMessages([]);
  };

  const removeSession = async (id: string) => {
    const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setSessions((s) => s.filter((x) => x.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const openDrawer = async (c: Citation) => {
    setDrawerCitation(c);
    setDrawerChunk(null);
    const res = await fetch(`/api/documents/${c.documentId}`);
    if (res.ok) {
      const d = (await res.json()) as {
        chunks: { id: string; content: string }[];
      };
      setDrawerChunk(d.chunks.find((ch) => ch.id === c.chunkId)?.content ?? "（未找到原文块）");
    } else {
      setDrawerChunk("（原文块加载失败）");
    }
  };

  const send = async () => {
    const content = input.trim();
    if (!content || streaming) return;
    if (content.startsWith("/出题")) {
      toast.info("「/出题」将在 M4 题库模块可用，当前版本请直接提问");
      return;
    }
    let sessionId = activeId;
    if (!sessionId) {
      // 无会话时自动用所选课程创建
      if (courses.length === 0) {
        toast.error("请先创建课程并上传资料");
        return;
      }
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: newCourse === "none" ? null : newCourse }),
      });
      const d = (await res.json()) as { session: ChatSession };
      setSessions((s) => [d.session, ...s]);
      sessionId = d.session.id;
      setActiveId(sessionId);
    }

    setInput("");
    setStreaming(true);
    setStreamText("");
    setMessages((m) => [
      ...m,
      { id: `tmp-${Date.now()}`, role: "user", content, citations: null, createdAt: Date.now() },
    ]);

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(d.error ?? `请求失败（${res.status}）`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const d = JSON.parse(payload) as { delta?: string; error?: string };
            if (d.error) throw new Error(d.error);
            if (d.delta) setStreamText((t) => t + d.delta);
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStreaming(false);
      setStreamText("");
      if (sessionId) await loadMessages(sessionId);
      setSessions((s) =>
        s.map((x) =>
          x.id === sessionId
            ? { ...x, title: x.title === "新会话" ? content.slice(0, 20) : x.title, updatedAt: Date.now() }
            : x
        )
      );
    }
  };

  return (
    <div className="grid h-[calc(100vh-140px)] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      {/* 会话列表 */}
      <aside className="hidden flex-col gap-3 rounded-[18px] bg-surface p-3.5 ring-1 ring-line lg:flex">
        <div className="flex items-center gap-2">
          <Select value={newCourse} onValueChange={setNewCourse}>
            <SelectTrigger size="sm" className="min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.length === 0 && <SelectItem value="none">暂无课程</SelectItem>}
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon-sm" onClick={createSession} aria-label="新建会话">
            <Plus size={14} weight="bold" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-[12px] px-3 py-2.5 text-[13px] transition-colors",
                activeId === s.id ? "bg-ink text-white" : "hover:bg-surface-hover"
              )}
              onClick={() => {
                setActiveId(s.id);
                void loadMessages(s.id);
              }}
            >
              <ChatCircleText size={15} className="shrink-0 opacity-70" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.title}</p>
                <p className={cn("truncate text-[11px]", activeId === s.id ? "text-white/60" : "text-ink-3")}>
                  {courseName(s.courseId)}
                </p>
              </div>
              <button
                aria-label={`删除会话 ${s.title}`}
                className={cn(
                  "shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
                  activeId === s.id ? "text-white/70 hover:text-white" : "text-ink-3 hover:text-danger"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void removeSession(s.id);
                }}
              >
                <TrashSimple size={13} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="px-2 py-6 text-center text-[12.5px] text-ink-3">
              还没有会话，点右上 ＋ 新建
            </p>
          )}
        </div>
      </aside>

      {/* 对话区 */}
      <section className="flex min-h-0 flex-col rounded-[18px] bg-surface ring-1 ring-line">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-bold">
            {activeId ? sessions.find((s) => s.id === activeId)?.title : "新对话"}
          </h2>
          <span className="rounded-full bg-sky-bg px-2.5 py-0.5 text-[11px] font-semibold text-sky-ink">
            {activeId ? courseName(sessions.find((s) => s.id === activeId)?.courseId ?? null) : courseName(newCourse === "none" ? null : newCourse)}
          </span>
          <span className="ml-auto rounded-full bg-surface-hover px-2.5 py-0.5 text-[11px] font-medium text-ink-2">
            {model}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !streaming && (
            <div className="grid h-full place-items-center">
              <div className="max-w-md space-y-3 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-sky-bg text-sky-ink">
                  <ChatCircleText size={22} />
                </span>
                <p className="text-[14px] font-semibold">向课程资料提问</p>
                <p className="text-[12.5px] text-ink-2">回答基于你上传的资料，附引用来源可定位原文</p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full border border-line px-3.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-surface-hover"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "user" ? (
                <div className="max-w-[78%] rounded-[14px] bg-sky-bg px-4 py-2.5 text-[13.5px] leading-relaxed text-sky-ink">
                  {m.content}
                </div>
              ) : (
                <div className="w-full max-w-[92%]">
                  <div className="rounded-[14px] bg-page px-4 py-3">
                    <Markdown content={m.content} />
                  </div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.citations.map((c) => (
                        <button
                          key={c.n}
                          onClick={() => void openDrawer(c)}
                          className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-3 py-1 text-[11.5px] font-medium text-ink-2 ring-1 ring-line transition-colors hover:bg-sky-bg hover:text-sky-ink"
                        >
                          <span className="num font-bold">[{c.n}]</span>
                          <FileText size={11} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {streaming && (
            <div className="flex justify-start">
              <div className="w-full max-w-[92%]">
                <div className="rounded-[14px] bg-page px-4 py-3">
                  {streamText ? (
                    <Markdown content={streamText + " ▍"} />
                  ) : (
                    <p className="flex items-center gap-2 text-[13px] text-ink-3">
                      <SpinnerGap className="animate-spin" size={14} /> 正在检索资料并思考…
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 输入区 */}
        <div className="border-t border-line p-3">
          <div className="flex items-end gap-2 rounded-[14px] bg-page p-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-sky-line">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="向资料提问…（/出题 生成练习题 · Enter 发送）"
              className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] outline-none placeholder:text-ink-3"
            />
            <Button onClick={() => void send()} disabled={streaming || !input.trim()} size="icon" aria-label="发送">
              {streaming ? <SpinnerGap className="animate-spin" size={15} /> : <PaperPlaneTilt size={15} weight="fill" />}
            </Button>
          </div>
        </div>
      </section>

      {/* 来源抽屉 */}
      <Sheet open={!!drawerCitation} onOpenChange={(o) => !o && setDrawerCitation(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 pr-8 text-left">
              <FileText size={16} className="shrink-0 text-sky-ink" />
              <span className="truncate">{drawerCitation?.label}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            <div className="rounded-[14px] bg-page px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap">
              {drawerChunk ?? "加载中…"}
            </div>
            {drawerCitation && (
              <Link
                href={`/documents/${drawerCitation.documentId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-ink px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                onClick={() => setDrawerCitation(null)}
              >
                在文档中查看
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
