"use client";

import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/** 闪卡翻转：rotationY +=180，0.6s power2.inOut，preserve-3d；点击整卡触发 */
export function FlipCard({
  front,
  back,
  className,
}: {
  front: ReactNode;
  back: ReactNode;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    const el = innerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.style.transform = next ? "rotateY(180deg)" : "";
    } else {
      gsap.to(el, { rotationY: next ? 180 : 0, duration: 0.6, ease: "power2.inOut" });
    }
  };

  return (
    <div
      className={cn("cursor-pointer select-none [perspective:1200px]", className)}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      aria-pressed={flipped}
    >
      <div
        ref={innerRef}
        className="relative h-full w-full [transform-style:preserve-3d]"
      >
        <div className="absolute inset-0 grid place-items-center rounded-[14px] p-5 [backface-visibility:hidden]">
          {front}
        </div>
        <div className="absolute inset-0 grid place-items-center rounded-[14px] p-5 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          {back}
        </div>
      </div>
    </div>
  );
}
