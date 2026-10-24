import { getClient, describeAiError } from "./client";

/** 视觉 OCR：data URL 图片 → 纯文本 */
export async function ocrImage(dataUrl: string): Promise<string> {
  const { client, cfg } = getClient("vision");
  try {
    const res = await client.chat.completions.create({
      model: cfg.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请 OCR 这张图片中的全部文字：按原有阅读顺序输出纯文本，保留标题与段落结构（标题单独一行），不要添加任何解释、翻译或标记。若图中没有文字，只输出：（无文字）",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0,
    });
    const text = res.choices[0]?.message?.content ?? "";
    if (!text.trim() || text.includes("（无文字）")) {
      throw new Error("视觉模型未识别到文字");
    }
    return text.trim();
  } catch (err) {
    throw new Error(
      `视觉 OCR 失败：${describeAiError(err)}。可在设置页为视觉槽位单独配置支持图像输入的端点`
    );
  }
}
