import OpenAI from "openai";
import { getAiSettings, resolveSlot, type SlotName } from "./settings";

/** 单次调用 60s 超时，429/5xx 指数退避重试 2 次（SDK 内建） */
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

export function getClient(slot: SlotName = "chat") {
  const cfg = resolveSlot(slot);
  if (!cfg.baseUrl) throw new Error("该槽位未配置 baseUrl");
  return {
    client: new OpenAI({
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey || "not-set",
      timeout: TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    }),
    cfg,
  };
}

/** 把 SDK/网络错误翻译成中文提示并原样带出细节 */
export function describeAiError(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? "网络";
    const detail = err.message ?? "";
    return `AI 接口错误（${status}）：${detail}`;
  }
  if (err instanceof OpenAI.APIConnectionTimeoutError) return "AI 接口超时（60s），请稍后重试";
  if (err instanceof OpenAI.APIConnectionError) return `无法连接 AI 服务：${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}
