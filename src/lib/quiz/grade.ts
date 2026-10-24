import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, questions, wrongItems } from "@/db/schema";
import { callJson } from "@/lib/ai/json";
import { GradeSchema } from "@/lib/ai/schemas";
import { gradePrompt } from "@/lib/ai/prompts";
import { recordEvent } from "@/lib/study";

type QuestionType = "single" | "multiple" | "fill" | "judge" | "short";

export type SubmitAnswer = { questionId: string; answer: unknown };

export type QuestionResult = {
  questionId: string;
  type: QuestionType;
  isCorrect: boolean | null;
  score: number;
  aiFeedback?: string;
  correctAnswer: unknown;
  explanation: string;
  stem: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/** 客观题自动判分 */
function gradeObjective(type: QuestionType, answer: unknown, user: unknown): boolean {
  if (user === null || user === undefined) return false;
  switch (type) {
    case "single":
      return Number(user) === Number(answer);
    case "judge":
      return Boolean(user) === Boolean(answer);
    case "multiple": {
      const a = (Array.isArray(answer) ? answer : []).map(Number).sort();
      const u = (Array.isArray(user) ? user : []).map(Number).sort();
      return a.length === u.length && a.every((v, i) => v === u[i]);
    }
    case "fill": {
      const accepted = Array.isArray(answer) ? answer.map(String) : [String(answer)];
      const u = norm(String(user));
      return accepted.some((a) => norm(a) === u);
    }
    default:
      return false;
  }
}

/** 提交整卷：客观自动判分；简答 AI 要点评分；错题入错题本 */
export async function submitQuiz(
  quizSetId: string,
  answers: SubmitAnswer[]
): Promise<{
  total: number;
  score: number;
  correctCount: number;
  results: QuestionResult[];
}> {
  const qs = db.select().from(questions).where(eq(questions.quizSetId, quizSetId)).all();
  if (qs.length === 0) throw new Error("题组不存在或没有题目");

  const results: QuestionResult[] = [];
  for (const q of qs) {
    const user = answers.find((a) => a.questionId === q.id)?.answer ?? null;
    const type = q.type as QuestionType;
    let isCorrect: boolean | null = null;
    let score: number | null = null;
    let aiFeedback: string | undefined;

    if (type === "short") {
      const ref = String(q.answer ?? "");
      const ua = String(user ?? "");
      if (!ua.trim()) {
        score = 0;
        isCorrect = false;
        aiFeedback = "未作答";
      } else {
        const g = await callJson(GradeSchema, [
          { role: "user", content: gradePrompt(q.stem, ref, ua) },
        ]);
        score = Math.round(g.score);
        isCorrect = g.isCorrect;
        aiFeedback = [g.feedback, g.missed.length ? `未覆盖要点：${g.missed.join("；")}` : ""]
          .filter(Boolean)
          .join("\n");
      }
    } else {
      isCorrect = gradeObjective(type, q.answer, user);
      score = isCorrect ? 100 : 0;
    }

    db.insert(attempts)
      .values({
        id: crypto.randomUUID(),
        questionId: q.id,
        quizSetId,
        userAnswer: user,
        isCorrect,
        score,
        aiFeedback: aiFeedback ?? null,
        createdAt: Date.now(),
      })
      .run();

    if (isCorrect === false) {
      // 错题本 upsert
      const existing = db.select().from(wrongItems).where(eq(wrongItems.questionId, q.id)).get();
      if (existing) {
        db.update(wrongItems)
          .set({
            wrongCount: existing.wrongCount + 1,
            lastWrongAt: Date.now(),
            reason: q.explanation ?? "",
            resolved: false,
            updatedAt: Date.now(),
          })
          .where(eq(wrongItems.id, existing.id))
          .run();
      } else {
        db.insert(wrongItems)
          .values({
            id: crypto.randomUUID(),
            questionId: q.id,
            courseId: q.courseId,
            wrongCount: 1,
            reason: q.explanation ?? "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          .run();
      }
    }

    results.push({
      questionId: q.id,
      type,
      isCorrect,
      score: score ?? 0,
      aiFeedback,
      correctAnswer: q.answer,
      explanation: q.explanation ?? "",
      stem: q.stem,
    });
  }

  const correctCount = results.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / results.length) * 100);

  recordEvent("quiz", {
    courseId: qs[0].courseId,
    durationSec: 0,
    meta: { quizSetId, score, total: results.length },
  });

  return { total: results.length, score, correctCount, results };
}
