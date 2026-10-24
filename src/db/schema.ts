import { sqliteTable, text, integer, blob, uniqueIndex, index } from "drizzle-orm/sqlite-core";

/** id 一律 uuid 字符串；时间戳一律 integer 毫秒 */

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default("").notNull(),
  color: text("color").$type<"mint" | "sky" | "peach" | "lemon" | "rose">().notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export type CourseColor = "mint" | "sky" | "peach" | "lemon" | "rose";

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").$type<"pdf" | "docx" | "pptx" | "md" | "txt">().notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  pageCount: integer("page_count"),
  charCount: integer("char_count"),
  status: text("status").$type<"pending" | "parsing" | "ready" | "error">().notNull().default("pending"),
  errorMessage: text("error_message"),
  summary: text("summary"),
  meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export const chunks = sqliteTable(
  "chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    seq: integer("seq").notNull(),
    content: text("content").notNull(),
    charCount: integer("char_count").notNull(),
    sourceRef: text("source_ref", { mode: "json" })
      .$type<{ page?: number; slide?: number; heading?: string }>()
      .notNull(),
    embedding: blob("embedding", { mode: "buffer" }),
    createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [
    index("idx_chunks_document").on(t.documentId),
    index("idx_chunks_course").on(t.courseId),
  ]
);

export const knowledgePoints = sqliteTable("knowledge_points", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  documentId: text("document_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  importance: text("importance").$type<"core" | "normal">().notNull().default("normal"),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull().default([]),
  sourceChunkIds: text("source_chunk_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  mastery: integer("mastery").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  courseId: text("course_id"),
  title: text("title").notNull().default("新会话"),
  mode: text("mode").$type<"rag" | "feynman" | "socratic">().notNull().default("rag"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export type Citation = {
  n: number;
  chunkId: string;
  documentId: string;
  label: string;
  page?: number;
  slide?: number;
};

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  citations: text("citations", { mode: "json" }).$type<Citation[]>().default([]),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export type QuizConfig = {
  types: string[];
  count: number;
  difficulty: number;
  scope: string;
  /** 模拟卷限时（分钟），0 表示不限时 */
  timeLimitMin?: number;
};

export const quizSets = sqliteTable("quiz_sets", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  title: text("title").notNull(),
  config: text("config", { mode: "json" }).$type<QuizConfig>().notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  quizSetId: text("quiz_set_id").references(() => quizSets.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull(),
  knowledgePointId: text("knowledge_point_id"),
  type: text("type").$type<"single" | "multiple" | "fill" | "judge" | "short">().notNull(),
  stem: text("stem").notNull(),
  options: text("options", { mode: "json" }).$type<string[]>(),
  answer: text("answer", { mode: "json" }).$type<unknown>(),
  explanation: text("explanation"),
  difficulty: integer("difficulty").notNull().default(3),
  sourceChunkIds: text("source_chunk_ids", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  quizSetId: text("quiz_set_id"),
  userAnswer: text("user_answer", { mode: "json" }).$type<unknown>(),
  isCorrect: integer("is_correct", { mode: "boolean" }),
  score: integer("score"),
  aiFeedback: text("ai_feedback"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const wrongItems = sqliteTable("wrong_items", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull(),
  wrongCount: integer("wrong_count").notNull().default(1),
  lastWrongAt: integer("last_wrong_at").notNull().$defaultFn(() => Date.now()),
  reason: text("reason"),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export const flashcards = sqliteTable(
  "flashcards",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    knowledgePointId: text("knowledge_point_id"),
    questionId: text("question_id"),
    front: text("front").notNull(),
    back: text("back").notNull(),
    // FSRS 字段
    due: integer("due").notNull().$defaultFn(() => Date.now()),
    stability: integer("stability").notNull().default(0),
    difficulty: integer("difficulty").notNull().default(0),
    elapsedDays: integer("elapsed_days").notNull().default(0),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: text("state").$type<"new" | "learning" | "review" | "relearning">().notNull().default("new"),
    lastReviewAt: integer("last_review_at"),
    createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [index("idx_flashcards_due").on(t.due)]
);

export const reviewLogs = sqliteTable("review_logs", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  rating: text("rating").$type<"again" | "hard" | "good" | "easy">().notNull(),
  reviewedAt: integer("reviewed_at").notNull().$defaultFn(() => Date.now()),
  scheduledDays: integer("scheduled_days").notNull().default(0),
  elapsedDays: integer("elapsed_days").notNull().default(0),
});

export const graphNodes = sqliteTable(
  "graph_nodes",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    name: text("name").notNull(),
    type: text("type").$type<"concept" | "process" | "example">().notNull().default("concept"),
    description: text("description").default("").notNull(),
    knowledgePointId: text("knowledge_point_id"),
    weight: integer("weight").notNull().default(1),
  },
  (t) => [uniqueIndex("uq_graph_nodes_course_name").on(t.courseId, t.name)]
);

export const graphEdges = sqliteTable(
  "graph_edges",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    sourceId: text("source_id").notNull(),
    targetId: text("target_id").notNull(),
    relation: text("relation").default("关联").notNull(),
    weight: integer("weight").notNull().default(1),
  },
  (t) => [uniqueIndex("uq_graph_edges_triple").on(t.sourceId, t.targetId, t.relation)]
);

export const studyPlans = sqliteTable("study_plans", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  title: text("title").notNull(),
  examDate: integer("exam_date"),
  startDate: integer("start_date").notNull(),
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const planTasks = sqliteTable("plan_tasks", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => studyPlans.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  title: text("title").notNull(),
  detail: text("detail").default("").notNull(),
  type: text("type").$type<"study" | "review" | "quiz">().notNull().default("study"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  doneAt: integer("done_at"),
});

export const studyEvents = sqliteTable(
  "study_events",
  {
    id: text("id").primaryKey(),
    type: text("type").$type<"chat" | "quiz" | "review" | "upload" | "flashcard">().notNull(),
    courseId: text("course_id"),
    durationSec: integer("duration_sec").notNull().default(0),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [index("idx_events_created").on(t.createdAt)]
);

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  courseId: text("course_id"),
  documentId: text("document_id"),
  knowledgePointId: text("knowledge_point_id"),
  title: text("title").notNull(),
  content: text("content").default("").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});
