import type { CourseColor } from "@/db/schema";

/** 课程识别色 → 样式三件套（课程绑定五种分区色） */
export const COURSE_STYLES: Record<
  CourseColor,
  { band: string; chip: string; dot: string; text: string }
> = {
  mint: {
    band: "bg-mint-line",
    chip: "bg-mint-bg text-mint-ink",
    dot: "bg-mint-ink",
    text: "text-mint-ink",
  },
  sky: {
    band: "bg-sky-line",
    chip: "bg-sky-bg text-sky-ink",
    dot: "bg-sky-ink",
    text: "text-sky-ink",
  },
  peach: {
    band: "bg-peach-line",
    chip: "bg-peach-bg text-peach-ink",
    dot: "bg-peach-ink",
    text: "text-peach-ink",
  },
  lemon: {
    band: "bg-lemon-line",
    chip: "bg-lemon-bg text-lemon-ink",
    dot: "bg-lemon-ink",
    text: "text-lemon-ink",
  },
  rose: {
    band: "bg-rose-line",
    chip: "bg-rose-bg text-rose-ink",
    dot: "bg-rose-ink",
    text: "text-rose-ink",
  },
};

export const COLOR_NAMES: Record<CourseColor, string> = {
  mint: "薄荷绿",
  sky: "天蓝",
  peach: "蜜桃橙",
  lemon: "柠檬黄",
  rose: "玫瑰粉",
};
