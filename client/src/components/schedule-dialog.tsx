"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL } from "@/lib/fetcher";
import { toast } from "sonner";

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

const COLOR_PRESETS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
];

interface Schedule {
  id: number;
  date: string;
  time: string;
  duration: number;
  content: string;
  color: string;
}

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule | null;
  defaultDate?: string;
  defaultTime?: string;
  onSaved: () => void;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  schedule,
  defaultDate,
  defaultTime,
  onSaved,
}: ScheduleDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (schedule) {
        setDate(schedule.date);
        setTime(schedule.time);
        setDuration(String(schedule.duration));
        setContent(schedule.content);
        setColor(schedule.color);
      } else {
        setDate(defaultDate || new Date().toISOString().split("T")[0]);
        setTime(defaultTime || "09:00");
        setDuration("60");
        setContent("");
        setColor("#3B82F6");
      }
    }
  }, [open, schedule, defaultDate, defaultTime]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = { date, time, duration: parseInt(duration), content: content.trim(), color };
      if (schedule) {
        await fetch(`${API_URL}/api/schedules/${schedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("스케줄이 수정되었습니다.");
      } else {
        await fetch(`${API_URL}/api/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("스케줄이 추가되었습니다.");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/schedules/${schedule.id}`, { method: "DELETE" });
      toast.success("스케줄이 삭제되었습니다.");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{schedule ? "스케줄 수정" : "스케줄 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>날짜</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>시간</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>소요시간</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30분</SelectItem>
                  <SelectItem value="60">1시간</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>내용</Label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="스케줄 내용을 입력하세요"
            />
          </div>
          <div className="space-y-2">
            <Label>색상</Label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#1e293b" : "transparent",
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          {schedule && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto">
              삭제
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
