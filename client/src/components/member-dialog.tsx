"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import { toast } from "sonner";

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: {
    id: number;
    name: string;
    role: string;
    teamId: number;
    position: string;
    email: string;
    phone: string;
    isActive?: boolean;
  } | null;
  onSuccess: () => void;
}

export function MemberDialog({ open, onOpenChange, member, onSuccess }: MemberDialogProps) {
  const { data: teams } = useSWR<{ id: number; name: string }[]>("/api/teams", fetcher);
  const [form, setForm] = useState({
    name: "",
    role: "",
    teamId: "",
    position: "",
    email: "",
    phone: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || "",
        role: member.role || "",
        teamId: member.teamId?.toString() || "",
        position: member.position || "",
        email: member.email || "",
        phone: member.phone || "",
        isActive: member.isActive !== false,
      });
    } else {
      setForm({ name: "", role: "", teamId: "", position: "", email: "", phone: "", isActive: true });
    }
  }, [member, open]);

  const handleSubmit = async () => {
    if (!form.name || !form.teamId) {
      toast.error("이름과 소속 팀은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const url = member ? `${API_URL}/api/members/${member.id}` : `${API_URL}/api/members`;
      const method = member ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, teamId: parseInt(form.teamId) }),
      });
      toast.success(member ? "멤버 정보가 수정되었습니다." : "새 멤버가 추가되었습니다.");
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
          <DialogTitle>{member ? "멤버 수정" : "새 멤버 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>이름 *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="홍길동" />
          </div>
          <div>
            <Label>소속 팀 *</Label>
            <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
              <SelectTrigger><SelectValue placeholder="팀 선택" /></SelectTrigger>
              <SelectContent>
                {teams?.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>직책</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="선임" />
            </div>
            <div>
              <Label>역할</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="디자이너" />
            </div>
          </div>
          <div>
            <Label>이메일</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </div>
          <div>
            <Label>전화번호</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
          </div>
          {member && (
            <div className="flex items-center justify-between">
              <Label>활성 상태</Label>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? "bg-blue-600" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "저장중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
