import Link from "next/link";
import {
  Cards,
  ChartBar,
  ChatCircleText,
  FilePdf,
  FileDoc,
  FilePpt,
  Graph,
  Lightning,
  Notebook,
  Play,
  Target,
} from "@/components/icons";
import { BentoIn } from "@/components/motion/bento-in";
import { CountUp } from "@/components/motion/count-up";
import { ProgressRing } from "@/components/motion/progress-ring";
import { FlipCard } from "@/components/motion/flip-card";
import { Tile, TileLabel } from "@/components/bento/tile";

// M1 静态骨架；M5 接 study_events / flashcards / wrong_items 真实数据
const HEAT_LEVELS = [0, 1, 2, 0, 3, 2, 1, 2, 1, 0, 3, 2, 1, 2, 0, 1, 3, 2, 0, 1, 2, 1, 0, 2, 3, 1, 0, 1, 2, 0, 1, 0, 2, 1, 3];
const RECENT_FILES = [
  { icon: FilePdf, name: "Chapter3-处理机调度.pdf", meta: "PDF · 42 页 · 昨天" },
  { icon: FilePpt, name: "第4讲-死锁.pptx", meta: "PPT · 38 页签 · 3 天前" },
  { icon: FileDoc, name: "复习提纲.docx", meta: "Word · 8 页 · 上周" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}

export default function OverviewPage() {
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 · 周${"日一二三四五六"[today.getDay()]}`;

  return (
    <div className="space-y-5">
      {/* 问候行 */}
      <div>
        <h1 className="text-[21px] font-bold tracking-wide">{greeting()}，继续操作系统</h1>
        <p className="mt-0.5 text-[13px] text-ink-2">{dateStr} · 期中考试还有 12 天，先清掉今天的复习队列吧</p>
      </div>

      {/* 便当格 */}
      <BentoIn className="grid grid-cols-2 gap-4 md:grid-cols-12">
        {/* 今日复习（mint 大格） */}
        <Tile zone="mint" span="col-span-2 md:col-span-7">
          <TileLabel icon={<Cards size={15} weight="fill" />}>今日复习</TileLabel>
          <div className="flex items-end gap-2">
            <span className="text-[34px] leading-none font-bold">
              <CountUp value={23} />
            </span>
            <span className="pb-1 text-[13px] opacity-80">张卡片</span>
          </div>
          <p className="mt-1 text-[12.5px] opacity-80">
            错题 <b>12</b> 道 · 新知识点 <b>6</b> 个
          </p>
          <div className="mt-3 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <FlipCard
              className="h-[150px]"
              front={
                <div className="text-center">
                  <span className="mb-2 inline-block rounded-full bg-white/70 px-3 py-0.5 text-[11px] font-semibold">闪卡 · 操作系统</span>
                  <p className="text-[15px] font-semibold">什么是 PCB？它保存哪些信息？</p>
                  <p className="mt-2 flex items-center justify-center gap-1 text-[11.5px] opacity-70">
                    <Cards size={12} /> 点击卡片查看答案
                  </p>
                </div>
              }
              back={
                <div className="overflow-y-auto text-center">
                  <span className="mb-2 inline-block rounded-full bg-white/70 px-3 py-0.5 text-[11px] font-semibold">答案</span>
                  <p className="text-[13px] leading-relaxed">
                    进程控制块：操作系统管理进程的核心数据结构，保存 PID、进程状态、程序计数器、寄存器上下文与内存信息。
                  </p>
                </div>
              }
            />
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
        </Tile>

        {/* 继续问答（sky） */}
        <Tile zone="sky" span="col-span-2 md:col-span-5">
          <TileLabel icon={<ChatCircleText size={15} weight="fill" />}>继续问答</TileLabel>
          <div className="space-y-2 text-[13px]">
            <div className="self-end rounded-[14px] bg-white/80 px-3.5 py-2 font-medium">
              为什么多级页表能节省内存？
            </div>
            <div className="rounded-[14px] bg-white/50 px-3.5 py-2 leading-relaxed">
              一级表常驻内存，二级表按需创建，稀疏地址空间下页表占用从 4MB 降到几十 KB<sup className="font-semibold">[1]</sup>……
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11.5px]">
              <FilePdf size={12} /> Chapter3.pdf · p.42
            </span>
          </div>
          <Link
            href="/chat"
            className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-sky-ink px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            继续提问
          </Link>
        </Tile>

        {/* 课程进度（白格 + 进度环） */}
        <Tile zone="plain" span="col-span-2 md:col-span-4">
          <TileLabel icon={<Target size={15} weight="fill" />}>操作系统</TileLabel>
          <div className="flex flex-1 items-center gap-4">
            <ProgressRing value={62} color="var(--accent)" />
            <div>
              <h3 className="text-[15px] font-semibold">第 4 章 处理机调度</h3>
              <p className="mt-1 text-[12.5px] text-ink-2">
                知识点 <b className="text-ink">86</b> 个 · 已掌握 <b className="text-ink">53</b>
              </p>
              <p className="text-[12.5px] text-ink-3">上次学习 · 2 小时前</p>
            </div>
          </div>
        </Tile>

        {/* 错题本（peach） */}
        <Tile zone="peach" span="col-span-2 md:col-span-4">
          <TileLabel icon={<Notebook size={15} weight="fill" />}>错题本</TileLabel>
          <div className="flex items-end gap-2">
            <span className="text-[34px] leading-none font-bold">
              <CountUp value={12} />
            </span>
            <span className="pb-1 text-[13px] opacity-80">道待重练</span>
          </div>
          <p className="mt-1 text-[12.5px] opacity-80">
            最近正确率 <b>71.4%</b>，比上周高 <b>6.2</b> 个百分点
          </p>
          <Link
            href="/wrong-book"
            className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-peach-ink px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Lightning size={13} weight="fill" /> 去重练
          </Link>
        </Tile>

        {/* 本周热力（lemon） */}
        <Tile zone="lemon" span="col-span-2 md:col-span-4">
          <TileLabel icon={<ChartBar size={15} weight="fill" />}>本周学习</TileLabel>
          <div className="grid flex-1 grid-flow-col grid-rows-5 gap-1">
            {HEAT_LEVELS.slice(0, 35).map((lv, i) => (
              <span
                key={i}
                className="rounded-[4px]"
                style={{
                  backgroundColor: lv === 0 ? "rgba(138,106,18,.12)" : `rgba(138,106,18,${0.2 + lv * 0.22})`,
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-[12.5px] opacity-80">
            本周学习 <b>18</b> 次 · 累计 <b>6.5</b> 小时
          </p>
        </Tile>

        {/* 最近资料（白格） */}
        <Tile zone="plain" span="col-span-2 md:col-span-8">
          <TileLabel icon={<FileDoc size={15} weight="fill" />}>最近资料</TileLabel>
          <div className="flex-1 space-y-1">
            {RECENT_FILES.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <f.icon size={20} className="shrink-0 text-ink-2" />
                <span className="truncate text-[13.5px] font-medium">{f.name}</span>
                <span className="ml-auto shrink-0 text-[12px] text-ink-3">{f.meta}</span>
              </div>
            ))}
          </div>
          <Link
            href="/courses"
            className="mt-2 inline-flex self-start rounded-full border border-line px-4 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-hover"
          >
            查看全部资料
          </Link>
        </Tile>

        {/* 图谱入口（rose） */}
        <Tile zone="rose" span="col-span-2 md:col-span-4">
          <TileLabel icon={<Graph size={15} weight="fill" />}>知识图谱</TileLabel>
          <p className="text-[13px] leading-relaxed opacity-90">
            「操作系统」已关联 <b>132</b> 个知识点，看看它们如何连成网络。
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
