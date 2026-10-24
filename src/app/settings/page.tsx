"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChatsCircle,
  Eye,
  MathOperations,
  PlugsConnected,
  SpinnerGap,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiSettings, SlotName } from "@/lib/ai/settings";

type TestResult = {
  ok: boolean;
  latencyMs?: number;
  model?: string;
  reply?: string;
  error?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<SlotName | null>(null);
  const [results, setResults] = useState<Partial<Record<SlotName, TestResult>>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.ai));
  }, []);

  if (!settings) {
    return <p className="py-20 text-center text-sm text-ink-3">加载设置中…</p>;
  }

  const patch = (fn: (draft: AiSettings) => void) => {
    const next = structuredClone(settings);
    fn(next);
    setSettings(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`保存失败（${res.status}）`);
      const d = (await res.json()) as { ai: AiSettings };
      setSettings(d.ai);
      toast.success("设置已保存");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const test = async (slot: SlotName) => {
    // 先保存当前编辑值再测试，避免测到旧配置
    setTesting(slot);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const result = (await res.json()) as TestResult;
      setResults((r) => ({ ...r, [slot]: result }));
      if (result.ok) toast.success(`${SLOT_LABEL[slot]} 连接成功（${result.latencyMs}ms）`);
      else toast.error(`${SLOT_LABEL[slot]} 连接失败：${result.error}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">设置</h1>
          <p className="mt-1 text-[13px] text-ink-2">配置 AI 模型槽位（OpenAI 兼容协议）</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "保存中…" : "保存设置"}
        </Button>
      </div>

      {/* 对话槽位 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatsCircle size={17} /> 对话模型
          </CardTitle>
          <CardDescription>问答、摘要、知识点、出题、评分、计划全部走此槽位。默认 Agnes agnes-3.0-flash。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SlotFields
            values={settings.chat}
            onChange={(v) => patch((d) => { d.chat = { ...d.chat, ...v }; })}
          />
          <TestButton slot="chat" state={testing === "chat"} result={results.chat} onTest={test} />
        </CardContent>
      </Card>

      {/* 视觉槽位 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={17} /> 视觉模型
          </CardTitle>
          <CardDescription>扫描件 OCR、图片识别用。默认继承对话槽位（Agnes 支持图像输入）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              id="vision-inherit"
              checked={settings.vision.inherit}
              onCheckedChange={(v) => patch((d) => { d.vision.inherit = v; })}
            />
            <Label htmlFor="vision-inherit">继承对话模型配置</Label>
          </div>
          {!settings.vision.inherit && (
            <>
              <SlotFields
                values={settings.vision}
                onChange={(v) => patch((d) => { d.vision = { ...d.vision, ...v }; })}
              />
              <TestButton slot="vision" state={testing === "vision"} result={results.vision} onTest={test} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Embedding 槽位 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MathOperations size={17} /> Embedding 模型
          </CardTitle>
          <CardDescription>
            Agnes 无 /embeddings 端点，默认关闭（仅 BM25 检索）。开启后可配任意 OpenAI 协议端点，启用向量+RRF 混合检索。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              id="emb-enable"
              checked={settings.embedding.enabled}
              onCheckedChange={(v) => patch((d) => { d.embedding.enabled = v; })}
            />
            <Label htmlFor="emb-enable">启用向量检索</Label>
          </div>
          {settings.embedding.enabled && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>模型名</Label>
                  <Input
                    value={settings.embedding.model ?? ""}
                    onChange={(e) => patch((d) => { d.embedding.model = e.target.value; })}
                    placeholder="text-embedding-3-small"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>维度（dims）</Label>
                  <Input
                    type="number"
                    className="num"
                    value={settings.embedding.dims ?? 0}
                    onChange={(e) => patch((d) => { d.embedding.dims = Number(e.target.value); })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Base URL</Label>
                  <Input
                    value={settings.embedding.baseUrl ?? ""}
                    onChange={(e) => patch((d) => { d.embedding.baseUrl = e.target.value; })}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>API Key（留空则用对话槽位 Key）</Label>
                  <Input
                    type="password"
                    value={settings.embedding.apiKey ?? ""}
                    onChange={(e) => patch((d) => { d.embedding.apiKey = e.target.value; })}
                  />
                </div>
              </div>
              <TestButton slot="embedding" state={testing === "embedding"} result={results.embedding} onTest={test} />
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-ink-3">
        Key 读取优先级：设置页（settings 表）→ .env.local（AGNES_API_KEY）
      </p>
    </div>
  );
}

const SLOT_LABEL: Record<SlotName, string> = {
  chat: "对话模型",
  vision: "视觉模型",
  embedding: "Embedding",
};

function SlotFields({
  values,
  onChange,
}: {
  values: { baseUrl: string; model: string; apiKey: string };
  onChange: (v: Partial<{ baseUrl: string; model: string; apiKey: string }>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Base URL</Label>
        <Input
          value={values.baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
          placeholder="https://api.agnes-ai.cn/v1"
        />
      </div>
      <div className="space-y-1.5">
        <Label>模型名</Label>
        <Input
          value={values.model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="agnes-3.0-flash"
        />
      </div>
      <div className="space-y-1.5">
        <Label>API Key（留空则回退 .env.local）</Label>
        <Input
          type="password"
          value={values.apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
          placeholder="sk-…"
        />
      </div>
    </div>
  );
}

function TestButton({
  slot,
  state,
  result,
  onTest,
}: {
  slot: SlotName;
  state: boolean;
  result?: TestResult;
  onTest: (slot: SlotName) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" onClick={() => onTest(slot)} disabled={state}>
        {state ? <SpinnerGap className="animate-spin" size={14} /> : <PlugsConnected size={14} />}
        测试连接
      </Button>
      {result && (
        <span
          className={`text-[13px] ${result.ok ? "text-ok" : "text-danger"}`}
          role="status"
        >
          {result.ok
            ? `连接成功 · ${result.model} · ${result.latencyMs}ms · 回复「${result.reply}」`
            : `失败：${result.error}`}
        </span>
      )}
    </div>
  );
}
