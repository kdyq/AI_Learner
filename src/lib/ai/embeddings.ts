import OpenAI from "openai";
import { getAiSettings } from "./settings";
import { describeAiError } from "./client";

/** embedding 槽位是否开启（Agnes 无 /embeddings，默认关闭走 BM25） */
export function embeddingEnabled(): boolean {
  return Boolean(getAiSettings().embedding.enabled);
}

/** 调用远程 OpenAI 协议 /embeddings，返回 Float32Array */
export async function embed(texts: string[]): Promise<Float32Array[]> {
  const s = getAiSettings();
  const e = s.embedding;
  if (!e.enabled || !e.baseUrl || !e.model) throw new Error("embedding 槽位未开启或未配置");
  const client = new OpenAI({
    baseURL: e.baseUrl,
    apiKey: e.apiKey ?? "not-set",
    timeout: 60_000,
    maxRetries: 2,
  });
  try {
    const res = await client.embeddings.create({
      model: e.model,
      input: texts,
    });
    return res.data
      .sort((a, b) => a.index - b.index)
      .map((d) => Float32Array.from(d.embedding));
  } catch (err) {
    throw new Error(describeAiError(err));
  }
}

export function toBlob(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

export function fromBlob(buf: Buffer | null): Float32Array | null {
  if (!buf) return null;
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
