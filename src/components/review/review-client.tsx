"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, BellRinging, CheckCircle, DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FlipCard } from "@/components/motion/flip-card";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/utils";

type QueueCard = {
  id: string;
  front: string;
  back: string;
  state: "new" | "learning" | "review" | "relearning";
  reps: number;
};

type Stats = {
  dueNow: number;
  total: number;
  new: number;
  learning: number;
  review: number;
};

const STATE_LABEL: Record<QueueCard["state"], string> = {
  new: "新卡",
  learning: "学习中",
  review: "复习",
  relearning: "重学",
};

const RATING_HINT: Record<string, { label: string; cls: string; sub: string }> = {
  again: { label: "重来", cls: "bg-peach-bg text-peach-ink hover:opacity-80", sub: "记不住" },
  hard: { label: "困难", cls: "bg-lemon-bg text-lemon-ink hover:opacity-80", sub: "想起来了" },
  good: { label: "良好", cls: "bg-sky-bg text-sky-ink hover:opacity-80", sub: "记得清楚" },
  easy: { label: "简单", cls: "bg-mint-bg text-mint-ink hover:opacity-80", sub: "秒答" },
};

export function ReviewClient() {
  const [queue, setQueue] = useState<QueueCard[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [idx, setIdx] = useState(0);
  const [flippedKeys, setFlippedKeys] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(0);
  const [notifyOn, setNotifyOn] = useState(false);
  const [rating, setRating] = useState<string | null>(null);

  const current = queue[idx];
  const finished = queue.length > 0 && idx >= queue.length;

  const load = async () => {
    const res = await fetch("/api/review/today");
    if (res.ok) {
      const d = (await res.json()) as { queue: QueueCard[]; stats: Stats };
      setQueue(d.queue);
      setStats(d.stats);
      setIdx(0);
      setDone(0);
    }
  };

  useEffect(() => {
    void load();
    if (typeof Notification !== "undefined") {
      setNotifyOn(Notification.permission === "granted");
    }
  }, []);

  // 浏览器通知：当日有到期卡片时提醒
  useEffect(() => {
    if (
      stats &&
      stats.dueNow > 0 &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      !sessionStorage.getItem("shizhi-notified")
    ) {
      new Notification("拾知 · 今日复习", {
        body: `今天有 ${stats.dueNow} 张卡片到期，趁热打铁来复习吧`,
      });
      sessionStorage.setItem("shizhi-notified", "1");
    }
  }, [stats]);

  const enableNotify = async () => {
    if (typeof Notification === "undefined") return toast.error("浏览器不支持通知");
    const p = await Notification.requestPermission();
    setNotifyOn(p === "granted");
    toast.success(p === "granted" ? "已开启复习提醒" : "未授权通知");
  };

  const rate = async (r: string) => {
    if (!current || rating) return;
    setRating(r);
    const res = await fetch("/api/review/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: current.id, rating: r }),
    });
    if (res.ok) {
      const d = (await res.json()) as { due: number; scheduledDays: number };
      const nextDue = new Date(d.due);
      const gap = d.scheduledDays >= 1 ? `${d.scheduledDays} 天后` : nextDue.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      toast.success(`已安排：${gap}再见`);
    }
    setDone((n) => n + 1);
    setRating(null);
    setIdx((i) => i + 1);
  };

  if (!stats) return <p className="py-20 text-center text-sm text-ink-3">加载复习队列…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">复习</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            卡片总量 <b className="num text-ink">{stats.total}</b> · 新卡{" "}
            <b className="num">{stats.new}</b> · 学习中 <b className="num">{stats.learning}</b> ·
            复习中 <b className="num">{stats.review}</b>
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={enableNotify} disabled={notifyOn}>
            {notifyOn ? <BellRinging size={14} /> : <Bell size={14} />}
            {notifyOn ? "提醒已开启" : "开启复习提醒"}
          </Button>
          <a href="/api/flashcards/export">
            <Button variant="outline" size="sm">
              <DownloadSimple size={14} /> Anki 导出
            </Button>
          </a>
        </div>
      </div>

      {stats.total === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[18px] border-2 border-dashed border-line py-14 text-center">
          <CheckCircle size={26} className="text-mint-ink" />
          <p className="text-sm text-ink-2">还没有闪卡：到课程页把知识点一键转成闪卡</p>
          <Link href="/courses" className="text-[13px] font-semibold text-primary">
            去创建 →
          </Link>
        </div>
      ) : finished ? (
        <div className="grid place-items-center gap-3 rounded-[18px] bg-mint-bg py-16 text-center text-mint-ink">
          <CheckCircle size={34} weight="fill" />
          <p className="text-lg font-bold">今日复习完成</p>
          <p className="text-[13px]">
            本次复习 <b className="num text-[18px]"><CountUp value={done} /></b> 张卡片，FSRS 已安排好下次见面时间
          </p>
          <Button variant="outline" onClick={() => void load()} className="mt-1 border-mint-line bg-white/60 text-mint-ink hover:bg-white">
            刷新队列
          </Button>
        </div>
      ) : current ? (
        <>
          <p className="text-center text-[12.5px] text-ink-3">
            第 <b className="num text-ink">{idx + 1}</b> / <span className="num">{queue.length}</span> 张 ·{" "}
            {STATE_LABEL[current.state]}
            {current.reps > 0 ? ` · 已复习 ${current.reps} 次` : ""}
          </p>
          <FlipCard
            key={current.id}
            className="mx-auto h-[300px] w-full max-w-2xl bg-surface ring-1 ring-line shadow-soft"
            front={
              <div className="text-center">
                <span className="mb-3 inline-block rounded-full bg-mint-bg px-3 py-0.5 text-[11px] font-semibold text-mint-ink">
                  问题
                </span>
                <p className="text-[17px] leading-relaxed font-semibold">{current.front}</p>
                <p className="mt-4 text-[12px] text-ink-3">点击卡片查看答案</p>
              </div>
            }
            back={
              <div className="overflow-y-auto text-center">
                <span className="mb-3 inline-block rounded-full bg-sky-bg px-3 py-0.5 text-[11px] font-semibold text-sky-ink">
                  答案
                </span>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{current.back}</p>
              </div>
            }
          />
          <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2.5">
            {(["again", "hard", "good", "easy"] as const).map((r) => (
              <button
                key={r}
                disabled={rating !== null}
                onClick={() => void rate(r)}
                className={cn(
                  "rounded-[14px] px-3 py-3 text-center transition-all active:scale-95",
                  RATING_HINT[r].cls
                )}
              >
                <span className="block text-[14px] font-bold">{RATING_HINT[r].label}</span>
                <span className="block text-[11px] opacity-75">{RATING_HINT[r].sub}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-[11.5px] text-ink-3">先翻卡看答案，再按记忆程度评分（FSRS 自动排期）</p>
        </>
      ) : stats.dueNow === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[18px] bg-mint-bg py-14 text-center text-mint-ink">
          <CheckCircle size={30} weight="fill" />
          <p className="text-[15px] font-bold">现在没有到期的卡片</p>
          <p className="text-[13px]">过几天 FSRS 会把卡片依次送回来；也可以去题库练题</p>
        </div>
      ) : null}
    </div>
  );
}
