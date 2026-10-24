"use client";

/** 语音朗读（Web Speech API）：去掉 Markdown 噪音后朗读 */
export function speak(text: string): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  window.speechSynthesis.cancel();
  const plain = text
    .replace(/```[\s\S]*?```/g, "（代码略）")
    .replace(/\$\$[\s\S]*?\$\$/g, "（公式略）")
    .replace(/\$[^$]+\$/g, "（公式）")
    .replace(/[#*_>`~\[\]()|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = "zh-CN";
  u.rate = 1;
  window.speechSynthesis.speak(u);
  return u;
}

export function stopSpeak() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
