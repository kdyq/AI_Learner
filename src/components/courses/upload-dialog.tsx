"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus, SpinnerGap, UploadSimple, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CourseOption = { id: string; name: string; color: string };

const ALLOWED = [".pdf", ".docx", ".pptx", ".md", ".txt"];

export function UploadDialog({
  courses,
  defaultCourseId,
  trigger,
}: {
  courses: CourseOption[];
  defaultCourseId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(defaultCourseId ?? courses[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | File[]) => {
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED.includes(ext)) {
        toast.error(`${f.name}：不支持的格式（支持 PDF/Word/PPT/MD/TXT）`);
        continue;
      }
      ok.push(f);
    }
    if (ok.length) setFiles((prev) => [...prev, ...ok]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const upload = async () => {
    if (!courseId) {
      toast.error("请先创建课程");
      return;
    }
    if (files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("courseId", courseId);
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const data = (await res.json()) as {
        documents?: unknown[];
        rejected?: { fileName: string; reason: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `上传失败（${res.status}）`);
      for (const r of data.rejected ?? []) toast.warning(`${r.fileName}：${r.reason}`);
      toast.success(`已上传 ${data.documents?.length ?? 0} 个文件，正在解析…`);
      setOpen(false);
      setFiles([]);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg">
            <UploadSimple data-icon="inline-start" size={15} /> 上传资料
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>上传课程资料</DialogTitle>
          <DialogDescription>支持 PDF / Word / PPT / Markdown / TXT，可多文件拖入</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>所属课程</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择课程" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`grid cursor-pointer place-items-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-9 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-line hover:bg-surface-hover"
            }`}
          >
            <FilePlus size={26} className="text-ink-3" />
            <p className="text-sm font-medium">拖拽文件到这里，或点击选择</p>
            <p className="text-xs text-ink-3">PDF · DOCX · PPTX · MD · TXT</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.md,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-xl bg-surface-hover px-3 py-2 text-[13px]"
                >
                  <span className="truncate">{f.name}</span>
                  <span className="num ml-auto shrink-0 text-xs text-ink-3">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    aria-label={`移除 ${f.name}`}
                    className="text-ink-3 hover:text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles((prev) => prev.filter((_, j) => j !== i));
                    }}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={upload} disabled={uploading || files.length === 0}>
              {uploading ? <SpinnerGap className="animate-spin" size={14} /> : <UploadSimple size={14} />}
              上传 {files.length > 0 ? `(${files.length})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
