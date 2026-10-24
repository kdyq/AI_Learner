import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/layout/top-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { calcStreak } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "拾知 — AI 学习助手",
    template: "%s · 拾知",
  },
  description: "本地运行的 AI 学习助手：资料解析、RAG 问答、出题练习、间隔重复复习。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <TopNav streak={calcStreak()} />
          <main className="mx-auto w-full max-w-[1220px] flex-1 px-4 py-6 sm:px-[30px]">
            {children}
          </main>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
