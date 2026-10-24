"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Flame,
  GearSix,
  List,
  Plus,
  Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UploadDialog, type CourseOption } from "@/components/courses/upload-dialog";
import { SearchDialog } from "@/components/layout/search-dialog";

const NAV_ITEMS = [
  { href: "/", label: "概览" },
  { href: "/courses", label: "课程" },
  { href: "/chat", label: "问答" },
  { href: "/quiz", label: "题库" },
  { href: "/wrong-book", label: "错题本" },
  { href: "/review", label: "复习" },
  { href: "/graph", label: "图谱" },
  { href: "/stats", label: "统计" },
  { href: "/plan", label: "计划" },
];

export function TopNav({ streak = 0 }: { streak?: number }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {});
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="border-b border-line bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-[1220px] items-center gap-5 px-4 py-3 sm:px-[30px]">
        {/* 品牌 */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-[34px] place-items-center rounded-xl bg-primary text-white">
            <Sparkle size={18} weight="fill" />
          </span>
          <b className="text-base font-bold">拾知</b>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3.5 py-[7px] text-[13px] transition-colors",
                isActive(item.href)
                  ? "bg-ink font-semibold text-white"
                  : "text-ink-2 hover:bg-surface-hover hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 右侧 */}
        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full bg-peach-bg px-3.5 py-[7px] text-[12.5px] font-semibold text-peach-ink sm:inline-flex">
            <Flame size={14} weight="fill" />
            连续 <span className="num">{streak}</span> 天
          </span>
          <UploadDialog
            courses={courses}
            trigger={
              <Button size="lg" className="hidden sm:inline-flex">
                <Plus data-icon="inline-start" size={14} weight="bold" />
                上传资料
              </Button>
            }
          />
          <SearchDialog />
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="设置"
          >
            <Link href="/settings" aria-label="设置">
              <GearSix size={18} />
            </Link>
          </Button>

          {/* 窄屏汉堡 */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="打开菜单"
              >
                <List size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[260px]">
              <SheetHeader>
                <SheetTitle>拾知</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "rounded-xl px-3.5 py-2.5 text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-ink font-semibold text-white"
                        : "text-ink-2 hover:bg-surface-hover hover:text-ink"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  设置
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
