"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrashSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function CourseDeleteButton({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!confirm(`删除课程「${courseName}」？其下所有资料、分块与引用将一并删除。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast.success("课程已删除");
      router.push("/courses");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="删除课程" onClick={remove} disabled={deleting}>
      <TrashSimple size={15} />
    </Button>
  );
}
