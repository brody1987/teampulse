"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/lib/fetcher";
import { toast } from "sonner";

interface EvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
  memberId: number;
  taskTitle: string;
  memberName: string;
  onSuccess: () => void;
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <Label>{label}</Label>
        <span className="text-sm font-bold text-blue-600">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>1</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

export function EvaluationDialog({ open, onOpenChange, taskId, memberId, taskTitle, memberName, onSuccess }: EvaluationDialogProps) {
  const [quality, setQuality] = useState(7);
  const [timeliness, setTimeliness] = useState(7);
  const [creativity, setCreativity] = useState(7);
  const [collaboration, setCollaboration] = useState(7);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, memberId, quality, timeliness, creativity, collaboration, comment }),
      });
      toast.success("평가가 저장되었습니다.");
      onSuccess();
      onOpenChange(false);
      // Reset
      setQuality(7); setTimeliness(7); setCreativity(7); setCollaboration(7); setComment("");
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
          <DialogTitle>성과 평가</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
          <div><span className="text-slate-400">업무:</span> {taskTitle}</div>
          <div><span className="text-slate-400">담당자:</span> {memberName}</div>
        </div>
        <div className="space-y-5">
          <ScoreSlider label="품질 (Quality)" value={quality} onChange={setQuality} />
          <ScoreSlider label="시의성 (Timeliness)" value={timeliness} onChange={setTimeliness} />
          <ScoreSlider label="창의성 (Creativity)" value={creativity} onChange={setCreativity} />
          <ScoreSlider label="협업 (Collaboration)" value={collaboration} onChange={setCollaboration} />
          <div>
            <Label>코멘트</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="평가 의견을 작성하세요..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "저장중..." : "평가 저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
