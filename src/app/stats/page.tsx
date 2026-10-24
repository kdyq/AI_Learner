import { getStatsOverview } from "@/lib/stats";
import { StatsCharts } from "@/components/stats/stats-charts";

export const dynamic = "force-dynamic";

export default function StatsPage() {
  const data = getStatsOverview();
  const accuracy = data.totals.quizAttempts
    ? Math.round((data.totals.quizCorrect / data.totals.quizAttempts) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">统计</h1>
        <p className="mt-1 text-[13px] text-ink-2">学习热力、正确率趋势与知识点掌握度</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "连续学习", value: `${data.streak} 天` },
          { label: "学习事件", value: `${data.totals.events} 次` },
          { label: "累计学习", value: `${data.totals.studyMinutes} 分钟` },
          { label: "做题正确率", value: `${accuracy}%` },
          { label: "闪卡 / 知识点", value: `${data.totals.cards} / ${data.totals.knowledgePoints}` },
        ].map((s) => (
          <div key={s.label} className="rounded-[18px] bg-surface px-4 py-3.5 ring-1 ring-line">
            <p className="text-[12px] text-ink-3">{s.label}</p>
            <p className="num mt-1 text-[19px] font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <StatsCharts data={data} />
    </div>
  );
}
