import { getClient, describeAiError } from "./client";
import type { SlotName } from "./settings";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** 非流式补全 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { slot?: SlotName; temperature?: number; signal?: AbortSignal } = {}
): Promise<string> {
  const { client, cfg } = getClient(opts.slot ?? "chat");
  try {
    const res = await client.chat.completions.create({
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.5,
      ...(opts.signal ? {} : {}),
    });
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw new Error(describeAiError(err));
  }
}

/** 流式补全：异步迭代产出增量文本 */
export async function* chatStream(
  messages: ChatMessage[],
  opts: { slot?: SlotName; temperature?: number } = {}
): AsyncGenerator<string> {
  const { client, cfg } = getClient(opts.slot ?? "chat");
  let stream: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    stream = await client.chat.completions.create({
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.5,
      stream: true,
    });
  } catch (err) {
    throw new Error(describeAiError(err));
  }
  try {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (err) {
    throw new Error(describeAiError(err));
  }
}

/** 把异步增量封装为 SSE ReadStream（route handler 用） */
export function sseStream(gen: AsyncGenerator<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } else {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: value })}\n\n`)
          );
        }
      } catch (err) {
        const msg = (err as Error).message ?? "未知错误";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}
