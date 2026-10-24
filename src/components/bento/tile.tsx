import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 分区色映射：一个格子只用一种分区色（底 + 同系深色文字） */
const ZONES = {
  mint: "bg-mint-bg text-mint-ink",
  sky: "bg-sky-bg text-sky-ink",
  peach: "bg-peach-bg text-peach-ink",
  lemon: "bg-lemon-bg text-lemon-ink",
  rose: "bg-rose-bg text-rose-ink",
  plain: "bg-surface text-ink ring-1 ring-line",
} as const;

export type TileZone = keyof typeof ZONES;

/** 便当格：18px 圆角 + hover 上浮/投影（CSS，非 GSAP） */
export function Tile({
  zone,
  span,
  className,
  children,
}: {
  zone: TileZone;
  span: string; // 栅格 span，需含响应式（如 "col-span-2 md:col-span-7"）
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[150px] flex-col rounded-[18px] p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-soft",
        ZONES[zone],
        span,
        className
      )}
    >
      {children}
    </div>
  );
}

/** 格子标题行：图标 + 文案 */
export function TileLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold">
      {icon}
      {children}
    </div>
  );
}
