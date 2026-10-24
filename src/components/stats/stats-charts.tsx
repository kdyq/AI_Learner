"use client";

import { useEffect, useRef } from "react";
import type { StatsOverview } from "@/lib/stats";

/** ECharts 按需注册：热力图 / 折线 / 条形 */
async function useEcharts() {
  const echarts = await import("echarts/core");
  const { HeatmapChart, LineChart, BarChart } = await import("echarts/charts");
  const components = await import("echarts/components");
  const renderers = await import("echarts/renderers");
  echarts.use([
    HeatmapChart,
    LineChart,
    BarChart,
    components.TitleComponent,
    components.CalendarComponent,
    components.TooltipComponent,
    components.VisualMapComponent,
    components.GridComponent,
    components.LegendComponent,
    renderers.CanvasRenderer,
  ]);
  return echarts;
}

function Chart({ option }: { option: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let inst: { setOption: (o: unknown) => void; dispose: () => void } | null = null;
    (async () => {
      const echarts = await useEcharts();
      if (disposed || !ref.current) return;
      inst = echarts.init(ref.current);
      inst.setOption(option);
    })();
    return () => {
      disposed = true;
      inst?.dispose();
    };
  }, [option]);
  return <div ref={ref} className="h-[300px] w-full" />;
}

export function StatsCharts({ data }: { data: StatsOverview }) {
  const accuracy = data.trend.map((t) => ({ date: t.date, rate: Math.round((t.correct / t.total) * 100) }));

  return (
    <div className="space-y-5">
      <Chart
        option={{
          title: { text: "学习热力图（近 12 周）", left: 8, textStyle: { fontSize: 14 } },
          tooltip: { formatter: (p: { value: [string, number] }) => `${p.value[0]}<br/>学习 ${p.value[1]} 次` },
          visualMap: {
            min: 0,
            max: Math.max(4, ...data.heatmap.map((h) => h.count)),
            calculable: false,
            orient: "horizontal",
            left: "center",
            bottom: 0,
            inRange: { color: ["#E6E8F1", "#FFF2D4", "#F2E0AE", "#C7902B"] },
            itemHeight: 90,
          },
          calendar: {
            range: [data.heatmap[0]?.date, data.heatmap[data.heatmap.length - 1]?.date],
            cellSize: ["auto", 14],
            dayLabel: { nameMap: "ZH" },
            monthLabel: { nameMap: "ZH" },
            splitLine: { show: false },
            itemStyle: { color: "#F3F4F9", borderColor: "#fff", borderWidth: 2 },
          },
          series: [
            {
              type: "heatmap",
              coordinateSystem: "calendar",
              data: data.heatmap.map((h) => [h.date, h.count]),
            },
          ],
        }}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Chart
          option={{
            title: { text: "正确率趋势（近 30 天）", left: 8, textStyle: { fontSize: 14 } },
            tooltip: { trigger: "axis" },
            grid: { left: 40, right: 20, top: 40, bottom: 30 },
            xAxis: { type: "category", data: accuracy.map((a) => a.date.slice(5)) },
            yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" } },
            series: [
              {
                type: "line",
                data: accuracy.map((a) => a.rate),
                smooth: true,
                symbolSize: 6,
                lineStyle: { color: "#2C5CC5", width: 2.5 },
                itemStyle: { color: "#2C5CC5" },
                areaStyle: { color: "rgba(44,92,197,.08)" },
              },
            ],
          }}
        />
        <Chart
          option={{
            title: { text: "知识点掌握度 Top 15", left: 8, top: 0, textStyle: { fontSize: 14 } },
            tooltip: { trigger: "axis" },
            grid: { left: 170, right: 40, top: 46, bottom: 30 },
            xAxis: { type: "value", min: 0, max: 100 },
            yAxis: {
              type: "category",
              data: [...data.mastery].reverse().map((m) => (m.importance === "core" ? "★ " : "") + m.title.slice(0, 12)),
            },
            series: [
              {
                type: "bar",
                data: [...data.mastery].reverse().map((m) => m.mastery),
                itemStyle: { color: "#1E6B4B", borderRadius: [0, 6, 6, 0] },
                barMaxWidth: 14,
                label: { show: true, position: "right", formatter: "{c}%" },
              },
            ],
          }}
        />
      </div>
    </div>
  );
}
