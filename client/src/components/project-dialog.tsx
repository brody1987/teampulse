"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RichEditor } from "@/components/rich-editor";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import { toast } from "sonner";
import { Plus, Trash2, Users, Building2, User } from "lucide-react";
import { FileAttachment, uploadPendingFiles } from "@/components/file-attachment";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: {
    id: number;
    name: string;
    description: string;
    content?: string;
    type?: string;
    teamId: number;
    ownerId?: number;
    status: string;
    startDate: string;
    endDate: string;
    members?: { id: number; memberId: number; memberName?: string }[];
    metrics?: { id: number; label: string; value: number }[];
  } | null;
  onSuccess: () => void;
}

interface Team {
  id: number;
  name: string;
  color?: string;
}

interface Member {
  id: number;
  name: string;
  teamId: number;
  teamName?: string;
}

interface Metric {
  label: string;
  value: number;
}

const typeConfig = [
  { value: "team", label: "팀", icon: Building2, description: "팀 단위 프로젝트" },
  { value: "collaboration", label: "협업", icon: Users, description: "여러 팀/멤버 참여" },
  { value: "individual", label: "개인", icon: User, description: "개인 프로젝트" },
] as const;

export function ProjectDialog({ open, onOpenChange, project, onSuccess }: ProjectDialogProps) {
  const { data: teams } = useSWR<Team[]>("/api/teams", fetcher);
  const { data: allMembers } = useSWR<Member[]>("/api/members", fetcher);
  const { data: fullProject } = useSWR(
    open && project?.id ? `/api/projects/${project.id}` : null,
    fetcher
  );

  const [form, setForm] = useState({
    name: "",
    description: "",
    content: "",
    type: "team" as string,
    teamId: "",
    ownerId: "",
    status: "active",
    startDate: "",
    endDate: "",
  });
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [saving, setSaving] = useState(false);
  const pendingFilesRef = useRef<File[]>([]);

  const handlePendingFilesChange = useCallback((files: File[]) => {
    pendingFilesRef.current = files;
  }, []);

  useEffect(() => {
    const src = fullProject || project;
    if (src) {
      setForm({
        name: src.name || "",
        description: src.description || "",
        content: src.content || "",
        type: src.type || "team",
        teamId: src.teamId?.toString() || "",
        ownerId: src.ownerId?.toString() || "",
        status: src.status || "active",
        startDate: src.startDate || "",
        endDate: src.endDate || "",
      });
      const memberList: { memberId: number }[] = src.members || [];
      setSelectedMemberIds(memberList.map((m: any) => m.memberId));

      // Derive selected teams from members' teamIds for collaboration
      if ((src.type || "team") === "collaboration" && allMembers && memberList.length > 0) {
        const memberIdSet = new Set(memberList.map((m: any) => m.memberId));
        const teamIdSet = new Set<number>();
        for (const m of allMembers) {
          if (memberIdSet.has(m.id) && m.teamId) teamIdSet.add(m.teamId);
        }
        if (src.teamId) teamIdSet.add(src.teamId);
        setSelectedTeamIds(Array.from(teamIdSet));
      } else if (src.teamId) {
        setSelectedTeamIds([src.teamId]);
      } else {
        setSelectedTeamIds([]);
      }

      setMetrics(src.metrics?.map((m: any) => ({ label: m.label, value: m.value })) || []);
    } else {
      setForm({
        name: "", description: "", content: "", type: "team",
        teamId: "", ownerId: "", status: "active", startDate: "", endDate: "",
      });
      setSelectedTeamIds([]);
      setSelectedMemberIds([]);
      setMetrics([]);
    }
    pendingFilesRef.current = [];
  }, [fullProject, project, open, allMembers]);

  // Members filtered by selected teams (for collaboration)
  const collabMembers = allMembers?.filter(
    (m) => selectedTeamIds.includes(m.teamId)
  ) || [];

  // Members for single team select (team type)
  const teamMembers = allMembers?.filter(
    (m) => form.teamId && m.teamId === parseInt(form.teamId)
  ) || [];

  const activeMembers = allMembers?.filter((m) => (m as any).isActive !== false) || allMembers || [];

  const handleTeamToggle = (teamId: number) => {
    setSelectedTeamIds((prev) => {
      const next = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];

      // Remove members that no longer belong to any selected team
      if (!next.includes(teamId)) {
        const removedTeamMemberIds = new Set(
          (allMembers || []).filter((m) => m.teamId === teamId).map((m) => m.id)
        );
        // Keep members that belong to other still-selected teams
        const stillSelectedMemberIds = new Set(
          (allMembers || [])
            .filter((m) => next.includes(m.teamId))
            .map((m) => m.id)
        );
        setSelectedMemberIds((prev) =>
          prev.filter((id) => !removedTeamMemberIds.has(id) || stillSelectedMemberIds.has(id))
        );
      }
      return next;
    });
  };

  const handleMemberToggle = (memberId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const addMetric = () => setMetrics([...metrics, { label: "", value: 0 }]);
  const removeMetric = (index: number) => setMetrics(metrics.filter((_, i) => i !== index));
  const updateMetric = (index: number, field: keyof Metric, value: string | number) => {
    const updated = [...metrics];
    if (field === "value") {
      updated[index].value = typeof value === "string" ? parseFloat(value) || 0 : value;
    } else {
      updated[index].label = value as string;
    }
    setMetrics(updated);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("프로젝트명은 필수입니다.");
      return;
    }
    if (form.type === "team" && !form.teamId) {
      toast.error("소속 팀은 필수입니다.");
      return;
    }
    if (form.type === "collaboration" && selectedTeamIds.length === 0) {
      toast.error("참여 팀을 1개 이상 선택해주세요.");
      return;
    }
    if (form.type === "individual" && !form.ownerId) {
      toast.error("담당자를 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      const url = project ? `${API_URL}/api/projects/${project.id}` : `${API_URL}/api/projects`;
      const method = project ? "PUT" : "POST";

      // For collaboration, store the first selected team as primary teamId
      const teamId = form.type === "collaboration"
        ? (selectedTeamIds[0] ?? null)
        : form.type === "team"
          ? (form.teamId ? parseInt(form.teamId) : null)
          : null;

      const payload = {
        name: form.name,
        description: form.description,
        content: form.content,
        type: form.type,
        teamId,
        ownerId: form.ownerId ? parseInt(form.ownerId) : null,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
        memberIds: form.type === "collaboration" ? selectedMemberIds : [],
        metrics: metrics.filter((m) => m.label.trim() !== ""),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();

      const projectId = project ? project.id : result.id;
      if (pendingFilesRef.current.length > 0 && projectId) {
        await uploadPendingFiles("project", projectId, pendingFilesRef.current);
      }

      toast.success(project ? "프로젝트가 수정되었습니다." : "새 프로젝트가 생성되었습니다.");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // Group collab members by team for display
  const collabMembersByTeam = selectedTeamIds.map((tid) => {
    const team = teams?.find((t) => t.id === tid);
    const members = collabMembers.filter((m) => m.teamId === tid);
    return { teamId: tid, teamName: team?.name || "알 수 없는 팀", members };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "프로젝트 수정" : "새 프로젝트"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <Label>프로젝트명 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            {/* 프로젝트 유형 */}
            <div>
              <Label>프로젝트 유형</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {typeConfig.map((t) => {
                  const Icon = t.icon;
                  const isActive = form.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                      onClick={() => setForm({ ...form, type: t.value })}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <div>
                        <div className="font-medium text-sm">{t.label}</div>
                        <div className="text-xs opacity-70">{t.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 팀: 단일 팀 선택 */}
            {form.type === "team" && (
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
            )}

            {/* 협업: 팀 체크박스 */}
            {form.type === "collaboration" && (
              <>
                <div>
                  <Label>참여 팀 *</Label>
                  <div className="border rounded-md p-3 mt-1.5 space-y-2">
                    {teams && teams.length > 0 ? (
                      teams.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-1.5">
                          <Checkbox
                            checked={selectedTeamIds.includes(t.id)}
                            onCheckedChange={() => handleTeamToggle(t.id)}
                          />
                          <span className="text-sm font-medium">{t.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">등록된 팀이 없습니다.</p>
                    )}
                  </div>
                  {selectedTeamIds.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{selectedTeamIds.length}개 팀 선택됨</p>
                  )}
                </div>

                {/* 협업: 참여 멤버 (선택된 팀 기준) */}
                {selectedTeamIds.length > 0 && (
                  <div>
                    <Label>참여 멤버</Label>
                    <div className="border rounded-md p-3 mt-1.5 max-h-[220px] overflow-y-auto space-y-3">
                      {collabMembersByTeam.map((group) => (
                        <div key={group.teamId}>
                          <div className="text-xs font-semibold text-slate-500 mb-1 px-1">{group.teamName}</div>
                          {group.members.length > 0 ? (
                            <div className="space-y-1">
                              {group.members.map((m) => (
                                <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-1 pl-3">
                                  <Checkbox
                                    checked={selectedMemberIds.includes(m.id)}
                                    onCheckedChange={() => handleMemberToggle(m.id)}
                                  />
                                  <span className="text-sm">{m.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 pl-3">멤버가 없습니다.</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {selectedMemberIds.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">{selectedMemberIds.length}명 선택됨</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 개인: 담당자 선택 */}
            {form.type === "individual" && (
              <div>
                <Label>담당자 *</Label>
                <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
                  <SelectTrigger><SelectValue placeholder="멤버 선택" /></SelectTrigger>
                  <SelectContent>
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>상태</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">진행중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="on_hold">보류</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>시작일</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>종료일</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>

          {/* 프로젝트 내용 (리치 에디터) */}
          <div>
            <Label>프로젝트 내용</Label>
            <div className="mt-1.5">
              <RichEditor
                content={form.content}
                onChange={(html) => setForm({ ...form, content: html })}
              />
            </div>
          </div>

          {/* 수치 데이터 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>수치 데이터</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMetric}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 항목 추가
              </Button>
            </div>
            {metrics.length > 0 ? (
              <div className="space-y-2">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="항목명 (예: 예산, 횟수)"
                      value={metric.label}
                      onChange={(e) => updateMetric(index, "label", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="값"
                      value={metric.value}
                      onChange={(e) => updateMetric(index, "value", e.target.value)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 shrink-0"
                      onClick={() => removeMetric(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">예산, 횟수, 회차 등 수치 데이터를 추가할 수 있습니다.</p>
            )}
          </div>

          {/* 첨부파일 */}
          <div>
            <Label>첨부파일</Label>
            <div className="mt-1.5">
              <FileAttachment
                entityType="project"
                entityId={project?.id ?? null}
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
