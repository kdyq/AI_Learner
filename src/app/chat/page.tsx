import { desc } from "drizzle-orm";
import { db } from "@/db";
import { chatSessions, courses } from "@/db/schema";
import { ChatClient, type ChatSession } from "@/components/chat/chat-client";
import { getAiSettings } from "@/lib/ai/settings";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const sessions = db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt)).all();
  const courseList = db
    .select({ id: courses.id, name: courses.name, color: courses.color })
    .from(courses)
    .all();
  const model = getAiSettings().chat.model;

  return (
    <ChatClient
      initialSessions={sessions.map((s) => ({
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        updatedAt: s.updatedAt,
      })) as ChatSession[]}
      courses={courseList}
      model={model}
    />
  );
}
