"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, CheckCircle2, FolderKanban, Building2, Users, User, Trash2, Search, Pin, PinOff, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ProjectDialog } from "@/components/project-dialog";

interface Project {
  id: number;
  name: string;
  description: string;
  type: string;
  teamId: number;
  status: string;
  startDate: string;
  endDate: string;
  teamName: string;
  teamColor: string;
  totalTasks: number;
  completedTasks: number;
  isPinned: boolean;
  memberNames: string;
}

const typeLabels: Record<string, { label: string; color: string; icon: typeof Building2 }> = {
  team: { label: "팀", color: "bg-blue-100 text-blue-700", icon: Building2 },
  collaboration: { label: "협업", color: "bg-purple-100 text-purple-700", icon: Users },
  individual: { label: "개인", color: "bg-green-100 text-green-700", icon: User },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "진행중", variant: "default" },
  completed: { label: "완료", variant: "secondary" },
  on_hold: { label: "보류", variant: "outline" },
  cancelled: { label: "취소", variant: "destructive" },
};

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ProjectsPage() {
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(toLocalDateStr(new Date()));
  const [showExpired, setShowExpired] = useState(false);
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const queryParams = new URLSearchParams();
  if (teamFilter !== "all") queryParams.set("teamId", teamFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data: projects, isLoading, mutate } = useSWR<Project[]>(`/api/projects?${queryParams}`, fetcher);
  const { data: teams } = useSWR<{ id: number; name: string }[]>("/api/teams", fetcher);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    let list = projects;

    // Date filter: hide expired (endDate < filterDate) unless showExpired is on
    if (!showExpired && filterDate) {
      list = list.filter((p) => {
        if (!p.endDate) return true;
        return filterDate <= p.endDate;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.teamName?.toLowerCase().includes(q) ||
          p.memberNames?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, search, filterDate, showExpired]);

  const handleDelete = async (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까?\n\n관련 업무와 데이터가 모두 삭제됩니다.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`'${project.name}' 프로젝트가 삭제되었습니다.`);
      mutate();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !project.isPinned }),
      });
      if (!res.ok) throw new Error();
      toast.success(project.isPinned ? "고정이 해제되었습니다." : "상단에 고정되었습니다.");
      mutate();
    } catch {
      toast.error("변경에 실패했습니다.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">프로젝트</h1>
          <p className="text-slate-500 mt-1">전체 프로젝트 현황</p>
        </div>
        <Button onClick={() => { setEditProject(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> 새 프로젝트
        </Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="프로젝트 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="팀 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 팀</SelectItem>
            {teams?.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="active">진행중</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
            <SelectItem value="on_hold">보류</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-40"
          />
          {filterDate !== toLocalDateStr(new Date()) && (
            <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => setFilterDate(toLocalDateStr(new Date()))}>
              오늘
            </Button>
          )}
        </div>
        <Button
          variant={showExpired ? "secondary" : "outline"}
          size="sm"
          className="flex items-center gap-1.5"
          onClick={() => setShowExpired(!showExpired)}
          title={showExpired ? "기간 필터 적용" : "종료된 프로젝트 포함"}
        >
          {showExpired ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showExpired ? "전체 보기" : "기간 필터"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-200 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const progress = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0;
            const st = statusConfig[project.status] || statusConfig.active;
            const ti = typeLabels[project.type] || typeLabels.team;
            const TypeIcon = ti.icon;
            return (
              <Card
                key={project.id}
                className={`hover:shadow-lg transition-shadow cursor-pointer ${project.isPinned ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {project.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      <span className="font-semibold truncate">{project.name}</span>
                    </div>
                    <Badge variant={st.variant} className="shrink-0 ml-2">{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`w-fit text-xs ${ti.color}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />{ti.label}
                    </Badge>
                    {project.teamName && (
                      <Badge variant="outline" className="w-fit border-transparent" style={{ backgroundColor: project.teamColor + "20", color: project.teamColor }}>
                        {project.teamName}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {project.startDate} ~ {project.endDate}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {project.completedTasks}/{project.totalTasks}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/projects/${project.id}/board`}>
                      <Button variant="outline" size="sm">칸반보드</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => { setEditProject(project); setDialogOpen(true); }}>수정</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={project.isPinned ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-amber-500"}
                      onClick={(e) => handleTogglePin(e, project)}
                      title={project.isPinned ? "고정 해제" : "상단 고정"}
                    >
                      {project.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, project)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredProjects.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-3 py-16 text-slate-400">
              <FolderKanban className="h-12 w-12 text-slate-300" />
              <span>{search ? "검색 결과가 없습니다." : "프로젝트가 없습니다. 새 프로젝트를 시작해보세요."}</span>
            </div>
          )}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editProject}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
