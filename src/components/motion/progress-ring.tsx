"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CountUp } from "./count-up";

/** 进度环：strokeDashoffset 周长→目标值，power2.inOut 描边动画 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  color = "var(--accent)",
  trackColor = "var(--line)",
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    const target = c * (1 - Math.min(100, Math.max(0, value)) / 100);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          el,
          { strokeDashoffset: c },
          { strokeDashoffset: target, duration: 1.1, ease: "power2.inOut" }
        );
      }, el);
      return () => ctx.revert();
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      el.style.strokeDashoffset = String(target);
    });
    return () => mm.revert();
  }, [value, c]);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c}
        />
      </svg>
      <span className="absolute text-sm font-bold">
        <CountUp value={value} />
        <span className="text-[0.7em] font-medium">%</span>
      </span>
    </div>
  );
}
