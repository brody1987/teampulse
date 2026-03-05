"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/fetcher";
import { toast } from "sonner";

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: {
    id: number;
    name: string;
    description: string;
    color: string;
  } | null;
  onSuccess: () => void;
}

export function TeamDialog({ open, onOpenChange, team, onSuccess }: TeamDialogProps) {
  const [form, setForm] = useState({ name: "", description: "", color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setForm({ name: team.name || "", description: team.description || "", color: team.color || COLORS[0] });
    } else {
      setForm({ name: "", description: "", color: COLORS[0] });
    }
  }, [team, open]);

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("팀 이름은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const url = team ? `${API_URL}/api/teams/${team.id}` : `${API_URL}/api/teams`;
      const method = team ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(team ? "팀 정보가 수정되었습니다." : "새 팀이 추가되었습니다.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? "팀 수정" : "새 팀 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>팀 이름 *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="개발팀" />
          </div>
          <div>
            <Label>설명</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="팀에 대한 간단한 설명" />
          </div>
          <div>
            <Label>색상</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? "#1e293b" : "transparent",
                    transform: form.color === c ? "scale(1.15)" : "scale(1)",
                  }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
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
