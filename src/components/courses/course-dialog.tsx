"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLOR_NAMES, COURSE_STYLES } from "@/lib/course-colors";
import type { CourseColor } from "@/db/schema";
import { cn } from "@/lib/utils";

export type CourseForEdit = {
  id: string;
  name: string;
  description: string;
  color: CourseColor;
};

export function CourseDialog({
  course,
  trigger,
}: {
  course?: CourseForEdit;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [color, setColor] = useState<CourseColor>(course?.color ?? "mint");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error("请填写课程名");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(course ? `/api/courses/${course.id}` : "/api/courses", {
        method: course ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "保存失败");
      }
      toast.success(course ? "课程已更新" : `课程「${name}」已创建`);
      setOpen(false);
      if (!course) {
        setName("");
        setDescription("");
      }
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={course ? "outline" : "default"} size={course ? "icon-sm" : "lg"}>
            {course ? <PencilSimple size={14} /> : "新建课程"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{course ? "编辑课程" : "新建课程"}</DialogTitle>
          <DialogDescription>课程色用于各页面的识别与色带绑定</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>课程名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：操作系统" />
          </div>
          <div className="space-y-1.5">
            <Label>简介（可选）</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话描述这门课"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>课程色</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(COLOR_NAMES) as CourseColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all",
                    COURSE_STYLES[c].chip,
                    color === c && "ring-2 ring-ink ring-offset-2"
                  )}
                >
                  {COLOR_NAMES[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "保存中…" : course ? "保存" : "创建"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
