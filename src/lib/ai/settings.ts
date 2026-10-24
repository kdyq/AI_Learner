import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";

/** 三槽位：chat / vision / embedding（DEV.md §5.1） */
export type SlotConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type EmbeddingConfig = SlotConfig & { dims: number };

export type AiSettings = {
  chat: SlotConfig;
  vision: SlotConfig & { inherit: boolean };
  embedding: { enabled: boolean } & Partial<EmbeddingConfig>;
};

const AGNES_BASE = "https://api.agnes-ai.cn/v1";
const AGNES_MODEL = "agnes-3.0-flash";

export const DEFAULT_SETTINGS: AiSettings = {
  chat: { baseUrl: AGNES_BASE, model: AGNES_MODEL, apiKey: "" },
  vision: { baseUrl: AGNES_BASE, model: AGNES_MODEL, apiKey: "", inherit: true },
  embedding: { enabled: false },
};

export type SlotName = "chat" | "vision" | "embedding";

const KEY = "ai";

/** settings 表 → 默认值合并；apiKey 空则回退 .env.local 的 AGNES_API_KEY */
export function getAiSettings(): AiSettings {
  const envKey = process.env.AGNES_API_KEY ?? "";
  const merged: AiSettings = structuredClone(DEFAULT_SETTINGS);
  merged.chat.apiKey = envKey;
  merged.vision.apiKey = envKey;
  try {
    const row = db.select().from(settingsTable).where(eq(settingsTable.key, KEY)).get();
    if (row?.value) {
      const saved = row.value as Partial<AiSettings>;
      if (saved.chat) merged.chat = { ...merged.chat, ...saved.chat };
      if (saved.vision) merged.vision = { ...merged.vision, ...saved.vision };
      if (saved.embedding) merged.embedding = { ...merged.embedding, ...saved.embedding };
    }
  } catch {
    // 表尚未建好等情况：直接用默认值
  }
  // 空字符串视为未设置：回退 .env.local
  if (!merged.chat.apiKey) merged.chat.apiKey = envKey;
  if (!merged.vision.apiKey) merged.vision.apiKey = merged.chat.apiKey;
  if (merged.embedding.enabled && !merged.embedding.apiKey) {
    merged.embedding.apiKey = merged.chat.apiKey;
  }
  // vision 继承 chat
  if (merged.vision.inherit) {
    merged.vision.baseUrl = merged.chat.baseUrl;
    merged.vision.model = merged.chat.model;
    if (!merged.vision.apiKey) merged.vision.apiKey = merged.chat.apiKey;
  }
  // embedding apiKey/model 等为空时不可用
  return merged;
}

export function saveAiSettings(next: Partial<AiSettings>) {
  const current = getAiSettings();
  const merged: AiSettings = {
    chat: { ...current.chat, ...next.chat },
    vision: { ...current.vision, ...next.vision },
    embedding: { ...current.embedding, ...next.embedding },
  };
  db.insert(settingsTable)
    .values({ key: KEY, value: merged, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: merged, updatedAt: Date.now() } })
    .run();
  return merged;
}

/** 取某个槽位生效配置（vision 已在 getAiSettings 里落到 chat） */
export function resolveSlot(slot: SlotName, s: AiSettings = getAiSettings()): SlotConfig {
  switch (slot) {
    case "chat":
      return s.chat;
    case "vision":
      return s.vision;
    case "embedding": {
      const e = s.embedding;
      return { baseUrl: e.baseUrl ?? "", model: e.model ?? "", apiKey: e.apiKey ?? "" };
    }
  }
}
