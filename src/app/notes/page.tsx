import { desc } from "drizzle-orm";
import { db } from "@/db";
import { courses, knowledgePoints, notes } from "@/db/schema";
import { NotesClient, type NoteRow } from "@/components/notes/notes-client";

export const dynamic = "force-dynamic";

export default function NotesPage() {
  const noteRows = db.select().from(notes).orderBy(desc(notes.updatedAt)).all();
  const courseList = db.select({ id: courses.id, name: courses.name }).from(courses).all();
  const kps = db
    .select({ id: knowledgePoints.id, title: knowledgePoints.title, courseId: knowledgePoints.courseId })
    .from(knowledgePoints)
    .all();

  return (
    <NotesClient
      initialNotes={noteRows.map((n) => ({
        id: n.id,
        courseId: n.courseId,
        title: n.title,
        content: n.content,
        updatedAt: n.updatedAt,
      })) as NoteRow[]}
      courses={courseList}
      knowledgePoints={kps}
    />
  );
}
