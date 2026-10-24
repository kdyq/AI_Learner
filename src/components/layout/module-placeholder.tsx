import { Sparkle } from "@phosphor-icons/react";

/** 里程碑交付前的模块占位页 */
export function ModulePlaceholder({
  title,
  milestone,
}: {
  title: string;
  milestone: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-hover text-ink-2">
        <Sparkle size={24} />
      </span>
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-sm text-ink-2">
        该模块将在 {milestone} 交付，当前为占位页面。
      </p>
    </div>
  );
}
