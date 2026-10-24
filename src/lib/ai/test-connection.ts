import OpenAI from "openai";
import { resolveSlot, type SlotName } from "./settings";
import { describeAiError } from "./client";

export type TestResult = {
  ok: boolean;
  latencyMs?: number;
  model?: string;
  reply?: string;
  error?: string;
};

/** 测试连接：发一条极小请求验证 baseUrl/key/model */
export async function testConnection(slot: SlotName): Promise<TestResult> {
  const cfg = resolveSlot(slot);
  if (!cfg.baseUrl) return { ok: false, error: "未配置 baseUrl" };
  if (!cfg.apiKey) return { ok: false, error: "未配置 API Key（settings 表与 .env.local 均为空）" };
  const client = new OpenAI({
    baseURL: cfg.baseUrl,
    apiKey: cfg.apiKey,
    timeout: 30_000,
    maxRetries: 0,
  });
  const start = Date.now();
  try {
    const res = await client.chat.completions.create({
      model: cfg.model,
      messages: [{ role: "user", content: "回复一个字：好" }],
      max_tokens: 8,
      stream: false,
    });
    const reply = res.choices[0]?.message?.content ?? "";
    return { ok: true, latencyMs: Date.now() - start, model: cfg.model, reply };
  } catch (err) {
    return { ok: false, error: describeAiError(err) };
  }
}
