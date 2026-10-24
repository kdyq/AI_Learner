import type { z } from "zod";
import { getClient, describeAiError } from "./client";
import type { SlotName } from "./settings";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/** 剥离 markdown 围栏并截取首个完整 JSON 值，容错解析 */
export function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[[{]/);
    if (start < 0) throw new Error("回复中未找到 JSON 内容");
    const open = text[start];
    const close = open === "{" ? "}" : "]";
    const end = text.lastIndexOf(close);
    if (end <= start) throw new Error("JSON 内容不完整");
    return JSON.parse(text.slice(start, end + 1));
  }
}

/** 结构化输出：prompt 约定 JSON → 容错解析 → zod 校验，失败带原文重试一次 */
export async function callJson<T>(
  schema: z.ZodType<T>,
  messages: ChatMsg[],
  slot: SlotName = "chat"
): Promise<T> {
  const { client, cfg } = getClient(slot);
  let lastRaw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptMessages: ChatMsg[] =
      attempt === 0
        ? messages
        : [
            ...messages,
            { role: "assistant", content: lastRaw },
            {
              role: "user",
              content:
                "你上一条回复未能通过 JSON 校验。请严格按约定结构、只输出一个合法 JSON（不要围栏、不要多余文字）。",
            },
          ];
    let raw = "";
    try {
      const res = await client.chat.completions.create({
        model: cfg.model,
        messages: attemptMessages,
        temperature: 0.3,
      });
      raw = res.choices[0]?.message?.content ?? "";
    } catch (err) {
      throw new Error(describeAiError(err));
    }
    lastRaw = raw;
    let errText = "";
    try {
      const parsed = extractJson(raw);
      const ok = schema.safeParse(parsed);
      if (ok.success) return ok.data;
      errText = JSON.stringify(ok.error.issues.slice(0, 5));
    } catch (err) {
      errText = (err as Error).message;
    }
    if (attempt === 1) {
      throw new Error(`AI 结构化输出两次校验失败：${errText}；原文片段：${raw.slice(0, 300)}`);
    }
  }
  throw new Error("unreachable");
}
