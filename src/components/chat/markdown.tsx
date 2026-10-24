"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/** 问答/题目渲染：GFM + LaTeX（$..$ / $$..$$） */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[13.5px] leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul_ul]:my-1 [&_li]:my-0.5 [&_li]:ml-4 [&_ul]:list-disc [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol_li]:ml-5 [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-[15px] [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-semibold [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink-2 [&_code]:rounded-[4px] [&_code]:bg-surface-hover [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_pre_code]:bg-transparent [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-[12px] [&_pre]:bg-ink [&_pre]:p-3.5 [&_pre_code]:text-[12.5px] [&_pre_code]:text-white [&_table]:my-2 [&_table]:w-full [&_table]:text-[12.5px] [&_th]:border [&_th]:border-line [&_th]:bg-surface-hover [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1 [&_a]:text-primary [&_a]:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
