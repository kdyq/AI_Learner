import { z } from "zod";

/** 知识点提取（M3） */
export const KnowledgePointSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  importance: z.enum(["core", "normal"]),
  keywords: z.array(z.string()),
  sourceIndexes: z.array(z.number().int().min(1)),
});
export const KnowledgePointsSchema = z.array(KnowledgePointSchema);

/** 出题（M4 预定义） */
export const QuestionSchema = z.object({
  type: z.enum(["single", "multiple", "fill", "judge", "short"]),
  stem: z.string().min(1),
  options: z.array(z.string()).nullable().optional(),
  answer: z.unknown(),
  explanation: z.string().default(""),
  difficulty: z.number().int().min(1).max(5).default(3),
  sourceIndexes: z.array(z.number().int().min(1)).default([]),
});
export const QuestionsSchema = z.array(QuestionSchema);

/** 简答评分（M4） */
export const GradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  missed: z.array(z.string()).default([]),
  isCorrect: z.boolean(),
});

/** 图谱（M5 预定义） */
export const GraphSchema = z.object({
  nodes: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["concept", "process", "example"]).default("concept"),
      description: z.string().default(""),
    })
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      relation: z.string().default("关联"),
    })
  ),
});

/** 学习计划（M5 预定义） */
export const PlanTaskSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string(),
  detail: z.string().default(""),
  type: z.enum(["study", "review", "quiz"]).default("study"),
});
export const PlanTasksSchema = z.array(PlanTaskSchema);
