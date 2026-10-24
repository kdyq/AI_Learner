"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/** 数字滚动：proxy 0→N，power1.out 0.9-1.1s；等宽表格数字 */
export function CountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = (n: number) => {
      el.textContent = String(Math.round(n));
    };
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const proxy = { v: 0 };
      const ctx = gsap.context(() => {
        gsap.to(proxy, {
          v: value,
          duration: Math.min(1.1, Math.max(0.9, value / 120)),
          ease: "power1.out",
          onUpdate: () => show(proxy.v),
        });
      }, el);
      return () => ctx.revert();
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      show(value);
    });
    return () => mm.revert();
  }, [value]);

  return (
    <span ref={ref} className={cn("num", className)}>
      0
    </span>
  );
}
