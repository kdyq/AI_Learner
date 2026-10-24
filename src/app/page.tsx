import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  Cards,
  ChartBar,
  ChatCircleText,
  FilePdf,
  FileDoc,
  FilePpt,
  FileText,
  Graph,
  Lightning,
  Notebook,
  Play,
  Target,
} from "@/components/icons";
import { db } from "@/db";
import {
  chatMessages,
  chatSessions,
  courses,
  documents,
  flashcards,
  graphNodes,
  knowledgePoints,
  studyEvents,
  studyPlans,
  wrongItems,
} from "@/db/schema";
import { BentoIn } from "@/components/motion/bento-in";
import { CountUp } from "@/components/motion/count-up";
import { ProgressRing } from "@/components/motion/progress-ring";
import { FlipCard } from "@/components/motion/flip-card";
import { Tile, TileLabel } from "@/components/bento/tile";
import { COURSE_STYLES } from "@/lib/course-colors";
import { calcStreak } from "@/lib/stats";

export const dynamic = "force-dynamic";

function dayKey(t: number) {
  const d = new Date(t);
  return d.toISOString().slice(0, 10);
}

export default async function OverviewPage() {
  const now = Date.now();
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 · 周${"日一二三四五六"[today.getDay()]}`;

  const streak = calcStreak();

  // 今日复习
  const cards = db.select().from(flashcards).all();
  const dueCards = cards.filter((c) => c.due <= now);
  const firstDue = dueCards[0];

  // 问答：最近一轮
  const lastSession = db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt)).limit(1).all()[0];
  const lastTurn = lastSession
    ? db.select().from(chatMessages).where(eq(chatMessages.sessionId, lastSession.id)).orderBy(desc(chatMessages.createdAt)).limit(2).all().reverse()
    : [];

  // 课程进度（最近课程）
  const course = db.select().from(courses).orderBy(desc(courses.createdAt)).limit(1).all()[0];
  const kps = course ? db.select().from(knowledgePoints).where(eq(knowledgePoints.courseId, course.id)).all() : [];
  const mastery = kps.length ? Math.round(kps.reduce((s, k) => s + k.mastery, 0) / kps.length) : 0;

  // 错题
  const wrongPending = db.select().from(wrongItems).where(eq(wrongItems.resolved, false)).all().length;

  // 本周热力（7 天 × 5 格）
  const events = db.select({ createdAt: studyEvents.createdAt }).from(studyEvents).all();
  const weekCells: number[] = [];
  let weekCount = 0;
  for (let d = 6; d >= 0; d--) {
    const key = dayKey(now - d * 86400000);
    const c = events.filter((e) => dayKey(e.createdAt) === key).length;
    weekCount += c;
    const lv = c === 0 ? 0 : c <= 2 ? 1 : c <= 5 ? 2 : 3;
    for (let i = 0; i < 5; i++) weekCells.push(i < lv ? lv : 0);
  }

  // 最近资料
  const fileIcons = { pdf: FilePdf, docx: FileDoc, pptx: FilePpt, md: FileText, txt: FileText };
  const recentDocs = db
    .select()
    .from(documents)
    .where(eq(documents.status, "ready"))
    .orderBy(desc(documents.createdAt))
    .limit(3)
    .all();

  // 图谱
  const graphCount = course ? db.select().from(graphNodes).where(eq(graphNodes.courseId, course.id)).all().length : 0;

  // 考试倒计时
  const plan = db.select().from(studyPlans).orderBy(desc(studyPlans.createdAt)).limit(1).all()[0];
  const examLeft = plan?.examDate ? Math.max(0, Math.ceil((plan.examDate - now) / 86400000)) : null;

  const hasData = Boolean(course);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[21px] font-bold tracking-wide">
          {greeting()}，{hasData ? `继续${course.name}` : "开始你的学习"}
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {dateStr}
          {examLeft !== null && ` · ${course?.name}考试还有 ${examLeft} 天`}
          {dueCards.length > 0 && ` · 今天还有 ${dueCards.length} 张卡待复习`}
        </p>
      </div>

      <BentoIn className="grid grid-cols-2 gap-4 md:grid-cols-12">
        {/* 今日复习 */}
        <Tile zone="mint" span="col-span-2 md:col-span-7">
          <TileLabel icon={<Cards size={15} weight="fill" />}>今日复习</TileLabel>
          {cards.length > 0 ? (
            <>
              <div className="flex items-end gap-2">
                <span className="text-[34px] leading-none font-bold">
                  <CountUp value={dueCards.length} />
                </span>
                <span className="pb-1 text-[13px] opacity-80">张待复习</span>
              </div>
              <p className="mt-1 text-[12.5px] opacity-80">
                总卡片 <b>{cards.length}</b> · 学习中 <b>{cards.filter((c) => c.state === "learning" || c.state === "relearning").length}</b> · 复习中{" "}
                <b>{cards.filter((c) => c.state === "review").length}</b>
              </p>
              <div className="mt-3 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                {firstDue ? (
                  <FlipCard
                    className="h-[150px]"
                    front={
                      <div className="text-center">
                        <span className="mb-2 inline-block rounded-full bg-white/70 px-3 py-0.5 text-[11px] font-semibold">闪卡预览</span>
                        <p className="text-[15px] font-semibold">{firstDue.front.slice(0, 60)}</p>
                        <p className="mt-2 flex items-center justify-center gap-1 text-[11.5px] opacity-70">
                          <Cards size={12} /> 点击卡片查看答案
                        </p>
                      </div>
                    }
                    back={
                      <div className="overflow-y-auto text-center">
                        <span className="mb-2 inline-block rounded-full bg-white/70 px-3 py-0.5 text-[11px] font-semibold">答案</span>
                        <p className="text-[13px] leading-relaxed">{firstDue.back.slice(0, 120)}</p>
                      </div>
                    }
                  />
                ) : (
                  <div className="grid place-items-center rounded-[14px] bg-white/40 text-[13px] font-medium">
                    {dueCards.length === 0 && cards.length > 0 ? "当前没有到期卡片，休息一下 ☕" : ""}
                  </div>
                )}
                <div className="flex flex-row gap-2 sm:flex-col sm:justify-end">
                  <Link
                    href="/review"
                    className="inline-flex items-center gap-1.5 self-start rounded-full bg-mint-ink px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Play size={13} weight="fill" /> 开始复习
                  </Link>
                  <Link
                    href="/wrong-book"
                    className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/70 px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-white"
                  >
                    只练错题
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <EmptyHint text="还没有闪卡：到课程页把知识点转成闪卡" href="/courses" link="去创建" />
          )}
        </Tile>

        {/* 继续问答 */}
        <Tile zone="sky" span="col-span-2 md:col-span-5">
          <TileLabel icon={<ChatCircleText size={15} weight="fill" />}>继续问答</TileLabel>
          {lastTurn.length > 0 ? (
            <div className="space-y-2 text-[13px]">
              <div className="self-end rounded-[14px] bg-white/80 px-3.5 py-2 font-medium">
                {lastTurn[0]?.content.slice(0, 50)}
              </div>
              <div className="rounded-[14px] bg-white/50 px-3.5 py-2 leading-relaxed">
                {(lastTurn[1]?.content ?? "").slice(0, 90)}
                {lastTurn[1]?.citations && lastTurn[1].citations.length > 0 && (
                  <sup className="ml-0.5 font-semibold">[{lastTurn[1].citations[0].n}]</sup>
                )}
                ……
              </div>
            </div>
          ) : (
            <p className="text-[13px] opacity-80">向你的课程资料提问，回答带可定位的引用来源。</p>
          )}
          <Link
            href="/chat"
            className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-sky-ink px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {lastSession ? "继续提问" : "开始提问"}
          </Link>
        </Tile>

        {/* 课程进度 */}
        <Tile zone="plain" span="col-span-2 md:col-span-4">
          <TileLabel icon={<Target size={15} weight="fill" />}>{course?.name ?? "课程"}</TileLabel>
          {hasData ? (
            <div className="flex flex-1 items-center gap-4">
              <ProgressRing value={mastery} color={COURSE_STYLES[course.color].text ? "var(--accent)" : "var(--accent)"} />
              <div>
                <h3 className="text-[15px] font-semibold">
                  知识点掌握 {kps.filter((k) => k.mastery >= 60).length}/{kps.length}
                </h3>
                <p className="mt-1 text-[12.5px] text-ink-2">
                  平均掌握度 <b className="text-ink">{mastery}%</b>
                </p>
                <p className="text-[12.5px] text-ink-3">
                  {recentDocs.length > 0 ? `最近上传 · ${timeAgo(recentDocs[0].createdAt)}` : "还没有资料"}
                </p>
              </div>
            </div>
          ) : (
            <EmptyHint text="创建第一个课程开始" href="/courses" link="去创建课程" />
          )}
        </Tile>

        {/* 错题本 */}
        <Tile zone="peach" span="col-span-2 md:col-span-4">
          <TileLabel icon={<Notebook size={15} weight="fill" />}>错题本</TileLabel>
          <div className="flex items-end gap-2">
            <span className="text-[34px] leading-none font-bold">
              <CountUp value={wrongPending} />
            </span>
            <span className="pb-1 text-[13px] opacity-80">道待攻克</span>
          </div>
          <p className="mt-1 text-[12.5px] opacity-80">
            {wrongPending > 0 ? "错题重练 + 标记掌握，清空它们" : "暂无待处理错题，保持！"}
          </p>
          <Link
            href="/wrong-book"
            className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-peach-ink px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Lightning size={13} weight="fill" /> 去重练
          </Link>
        </Tile>

        {/* 本周热力 */}
        <Tile zone="lemon" span="col-span-2 md:col-span-4">
          <TileLabel icon={<ChartBar size={15} weight="fill" />}>本周学习</TileLabel>
          <div className="grid flex-1 grid-flow-col grid-rows-5 gap-1">
            {weekCells.map((lv, i) => (
              <span
                key={i}
                className="rounded-[4px]"
                style={{ backgroundColor: lv === 0 ? "rgba(138,106,18,.12)" : `rgba(138,106,18,${0.2 + lv * 0.22})` }}
              />
            ))}
          </div>
          <p className="mt-2 text-[12.5px] opacity-80">
            本周学习 <b>{weekCount}</b> 次 · 连续 <b>{streak}</b> 天
          </p>
        </Tile>

        {/* 最近资料 */}
        <Tile zone="plain" span="col-span-2 md:col-span-8">
          <TileLabel icon={<FileDoc size={15} weight="fill" />}>最近资料</TileLabel>
          {recentDocs.length > 0 ? (
            <div className="flex-1 space-y-1">
              {recentDocs.map((d) => {
                const Icon = fileIcons[d.fileType];
                return (
                  <Link
                    key={d.id}
                    href={`/documents/${d.id}`}
                    className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-surface-hover"
                  >
                    <Icon size={20} className="shrink-0 text-ink-2" />
                    <span className="truncate text-[13.5px] font-medium">{d.title}</span>
                    <span className="ml-auto shrink-0 text-[12px] text-ink-3">
                      {d.pageCount ? `${d.pageCount} ${d.fileType === "pptx" ? "页签" : "页"} · ` : ""}
                      {timeAgo(d.createdAt)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyHint text="上传第一份课程资料" href="/courses" link="去上传" />
          )}
          <Link
            href="/courses"
            className="mt-2 inline-flex self-start rounded-full border border-line px-4 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-hover"
          >
            查看全部资料
          </Link>
        </Tile>

        {/* 图谱入口 */}
        <Tile zone="rose" span="col-span-2 md:col-span-4">
          <TileLabel icon={<Graph size={15} weight="fill" />}>知识图谱</TileLabel>
          <p className="text-[13px] leading-relaxed opacity-90">
            {graphCount > 0
              ? `「${course?.name}」已关联 ${kps.length} 个知识点、${graphCount} 个图谱节点。`
              : "用 AI 把知识点连成网络，点击节点直接出题或入复习。"}
          </p>
          <Link
            href="/graph"
            className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-rose-ink px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Graph size={13} /> 打开图谱
          </Link>
        </Tile>
      </BentoIn>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function timeAgo(t: number): string {
  const diff = Date.now() - t;
  if (diff < 3600000) return "刚刚";
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} 天前`;
  return new Date(t).toLocaleDateString("zh-CN");
}

function EmptyHint({ text, href, link }: { text: string; href: string; link: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <p className="text-[13px] opacity-80">{text}</p>
      <Link href={href} className="rounded-full bg-white/70 px-4 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-white">
        {link} →
      </Link>
    </div>
  );
}
