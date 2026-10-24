"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/**
 * 便当格入场编排：子元素 y:16/scale:.96/autoAlpha:0 → back.out(1.4)，stagger 0.07。
 * 直接子元素需带 data-bento-tile 或为 Tile 组件。
 */
export function BentoIn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          el.children,
          { y: 16, scale: 0.96, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.55,
            ease: "back.out(1.4)",
            stagger: 0.07,
            clearProps: "transform,visibility",
          }
        );
      }, el);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
