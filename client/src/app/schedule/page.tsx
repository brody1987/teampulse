"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface Schedule {
  id: number;
  date: string;
  time: string;
  duration: number;
  content: string;
  color: string;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6~23
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DISPLAY_DAYS = 30;

/** 로컬 날짜를 'YYYY-MM-DD' 문자열로 변환 (UTC 변환 없이) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateShort(d: Date): string {
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

export default function SchedulePage() {
  const todayStr = toLocalDateStr(new Date());
  const [baseDate, setBaseDate] = useState(todayStr);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>();
  const [defaultTime, setDefaultTime] = useState<string>();

  const dates = useMemo(() => {
    const start = new Date(baseDate + "T00:00:00");
    return Array.from({ length: DISPLAY_DAYS }, (_, i) => addDays(start, i));
  }, [baseDate]);

  const startDate = toLocalDateStr(dates[0]);
  const endDate = toLocalDateStr(dates[DISPLAY_DAYS - 1]);

  const { data: schedules = [], mutate } = useSWR<Schedule[]>(
    `/api/schedules?startDate=${startDate}&endDate=${endDate}`,
    fetcher
  );

  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const s of schedules) {
      const key = `${s.date}_${s.time}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [schedules]);

  const handleCellClick = (dateStr: string, hour: number) => {
    const time = `${String(hour).padStart(2, "0")}:00`;
    const existing = scheduleMap.get(`${dateStr}_${time}`);
    if (existing && existing.length > 0) {
      setEditSchedule(existing[0]);
      setDefaultDate(undefined);
      setDefaultTime(undefined);
    } else {
      setEditSchedule(null);
      setDefaultDate(dateStr);
      setDefaultTime(time);
    }
    setDialogOpen(true);
  };

  const handleScheduleClick = (s: Schedule) => {
    setEditSchedule(s);
    setDefaultDate(undefined);
    setDefaultTime(undefined);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditSchedule(null);
    setDefaultDate(todayStr);
    setDefaultTime("09:00");
    setDialogOpen(true);
  };

  const rangeLabel = `${dates[0].getFullYear()}.${formatDateShort(dates[0])} ~ ${formatDateShort(dates[DISPLAY_DAYS - 1])}`;

  const shiftDate = (days: number) => {
    const d = new Date(baseDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setBaseDate(toLocalDateStr(d));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">스케줄</h1>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          스케줄 추가
        </Button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => shiftDate(-7)} title="7일 전">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBaseDate(todayStr)}>
          오늘
        </Button>
        <Input
          type="date"
          value={baseDate}
          onChange={(e) => e.target.value && setBaseDate(e.target.value)}
          className="w-40"
        />
        <span className="text-sm font-medium text-slate-600">{rangeLabel}</span>
        <Button variant="outline" size="icon" onClick={() => shiftDate(7)} title="7일 후">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-lg border shadow-sm overflow-auto max-h-[calc(100vh-220px)]">
        <TooltipProvider>
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 border-b border-r p-2 text-xs text-slate-500 w-24 min-w-24">
                  날짜
                </th>
                {HOURS.map((h) => (
                  <th
                    key={h}
                    className="bg-slate-50 border-b border-r p-1 text-xs text-slate-500 font-normal min-w-[60px]"
                  >
                    {String(h).padStart(2, "0")}:00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const dateStr = toLocalDateStr(date);
                const dayOfWeek = date.getDay();
                const dayLabel = DAY_LABELS[dayOfWeek];
                const isToday = dateStr === todayStr;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                return (
                  <tr
                    key={dateStr}
                    className={
                      isToday
                        ? "bg-blue-50/50"
                        : isWeekend
                          ? "bg-slate-50/40"
                          : ""
                    }
                  >
                    <td
                      className={`sticky left-0 z-10 border-b border-r p-2 text-xs font-medium min-w-24 ${
                        isToday
                          ? "bg-blue-50 text-blue-700"
                          : isWeekend
                            ? "bg-orange-50/60 text-orange-600"
                            : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`font-semibold ${isWeekend ? "text-orange-500" : ""}`}>{dayLabel}</span>
                        {isToday && (
                          <span className="text-[9px] bg-blue-500 text-white rounded px-1">오늘</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{formatDateShort(date)}</div>
                    </td>
                    {HOURS.map((hour) => {
                      const timeStr = `${String(hour).padStart(2, "0")}:00`;
                      const halfStr = `${String(hour).padStart(2, "0")}:30`;
                      const cellSchedules = scheduleMap.get(`${dateStr}_${timeStr}`) || [];
                      const halfSchedules = scheduleMap.get(`${dateStr}_${halfStr}`) || [];

                      return (
                        <td
                          key={hour}
                          className="border-b border-r p-0 h-12 relative cursor-pointer hover:bg-slate-100/60 transition-colors"
                          onClick={() => {
                            if (cellSchedules.length === 0 && halfSchedules.length === 0) {
                              handleCellClick(dateStr, hour);
                            }
                          }}
                        >
                          <div className="flex h-full">
                            {/* :00 half */}
                            <div className="flex-1 relative">
                              {cellSchedules.map((s) => (
                                <Tooltip key={s.id}>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="absolute inset-0 rounded-sm m-0.5 text-[10px] text-white font-medium px-1 truncate text-left leading-tight flex items-center hover:brightness-110 transition-all"
                                      style={{
                                        backgroundColor: s.color,
                                        width: s.duration === 60 ? "calc(200% - 4px)" : undefined,
                                        zIndex: s.duration === 60 ? 2 : 1,
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScheduleClick(s);
                                      }}
                                    >
                                      <span className="truncate">{s.content}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <div className="font-semibold">{s.content}</div>
                                      <div>{s.date} {s.time} · {s.duration}분</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                            {/* :30 half */}
                            <div className="flex-1 relative border-l border-dashed border-slate-200">
                              {halfSchedules.map((s) => (
                                <Tooltip key={s.id}>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="absolute inset-0 rounded-sm m-0.5 text-[10px] text-white font-medium px-1 truncate text-left leading-tight flex items-center hover:brightness-110 transition-all"
                                      style={{
                                        backgroundColor: s.color,
                                        width: s.duration === 60 ? "calc(200% - 4px)" : undefined,
                                        zIndex: s.duration === 60 ? 2 : 1,
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScheduleClick(s);
                                      }}
                                    >
                                      <span className="truncate">{s.content}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <div className="font-semibold">{s.content}</div>
                                      <div>{s.date} {s.time} · {s.duration}분</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </div>

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editSchedule}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        onSaved={() => mutate()}
      />
    </div>
  );
}
