"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichEditor } from "@/components/rich-editor";
import { FileAttachment, uploadPendingFiles } from "@/components/file-attachment";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: number;
    title: string;
    description: string;
    projectId: number;
    assigneeId: number;
    status: string;
    priority: string;
    dueDate: string;
  } | null;
  projectId: number;
  teamId?: number;
  projectType?: string;
  ownerId?: number | null;
  projectMembers?: { id: number; memberId: number; memberName: string }[];
  onSuccess: () => void;
}

export function TaskDialog({ open, onOpenChange, task, projectId, teamId, projectType, ownerId, projectMembers, onSuccess }: TaskDialogProps) {
  const { data: fetchedMembers } = useSWR<{ id: number; name: string; teamId: number }[]>(
    projectMembers && projectMembers.length > 0 ? null : (teamId ? `/api/members?teamId=${teamId}` : "/api/members"),
    fetcher
  );

  // For collaboration projects, use project members; otherwise use fetched team members
  const members = projectMembers && projectMembers.length > 0
    ? projectMembers.map((m) => ({ id: m.memberId, name: m.memberName }))
    : fetchedMembers;
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    status: "대기",
    priority: "보통",
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);
  const pendingFilesRef = useRef<File[]>([]);

  const handlePendingFilesChange = useCallback((files: File[]) => {
    pendingFilesRef.current = files;
  }, []);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        assigneeId: task.assigneeId?.toString() || "",
        status: task.status || "대기",
        priority: task.priority || "보통",
        dueDate: task.dueDate || "",
      });
    } else {
      const defaultAssigneeId = projectType === "individual" && ownerId ? ownerId.toString() : "";
      setForm({ title: "", description: "", assigneeId: defaultAssigneeId, status: "대기", priority: "보통", dueDate: "" });
    }
    pendingFilesRef.current = [];
  }, [task, open]);

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error("업무 제목은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const url = task ? `${API_URL}/api/tasks/${task.id}` : `${API_URL}/api/tasks`;
      const method = task ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        ...form,
        projectId,
        assigneeId: form.assigneeId ? parseInt(form.assigneeId) : null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();

      // Upload pending files
      const taskId = task ? task.id : result.id;
      if (pendingFilesRef.current.length > 0 && taskId) {
        await uploadPendingFiles("task", taskId, pendingFilesRef.current);
      }

      toast.success(task ? "업무가 수정되었습니다." : "새 업무가 추가되었습니다.");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "업무 수정" : "새 업무"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>제목 *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>설명</Label>
            <div className="mt-1.5">
              <RichEditor
                content={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
              />
            </div>
          </div>
          <div>
            <Label>담당자</Label>
            <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
              <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>상태</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="대기">대기</SelectItem>
                  <SelectItem value="진행중">진행중</SelectItem>
                  <SelectItem value="검토중">검토중</SelectItem>
                  <SelectItem value="완료">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>우선순위</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="긴급">긴급</SelectItem>
                  <SelectItem value="높음">높음</SelectItem>
                  <SelectItem value="보통">보통</SelectItem>
                  <SelectItem value="낮음">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>마감일</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <Label>첨부파일</Label>
            <div className="mt-1.5">
              <FileAttachment
                entityType="task"
                entityId={task?.id ?? null}
                onPendingFilesChange={handlePendingFilesChange}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "저장중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
