"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FolderKanban, TrendingUp, Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { TeamDialog } from "@/components/team-dialog";

interface Team {
  id: number;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  projectCount: number;
  activeProjectCount: number;
  totalTasks: number;
  completedTasks: number;
}

export default function TeamsPage() {
  const { data: teams, isLoading, mutate } = useSWR<Team[]>("/api/teams", fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  const handleDelete = async (e: React.MouseEvent, team: Team) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`'${team.name}' 팀을 삭제하시겠습니까?\n\n소속 프로젝트와 업무도 함께 삭제됩니다.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`'${team.name}' 팀이 삭제되었습니다.`);
      mutate();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleEdit = (e: React.MouseEvent, team: Team) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTeam(team);
    setDialogOpen(true);
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-slate-200 rounded" /><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{[...Array(5)].map((_, i) => <div key={i} className="h-48 bg-slate-200 rounded-lg" />)}</div></div>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">팀 관리</h1>
          <p className="text-slate-500 mt-1">{teams?.length || 0}개 팀의 현황을 한눈에 확인하세요</p>
        </div>
        <Button onClick={() => { setEditTeam(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          팀 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teams?.map((team) => {
          const progress = team.totalTasks > 0 ? Math.round((team.completedTasks / team.totalTasks) * 100) : 0;
          return (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 group" style={{ borderTopColor: team.color }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{team.activeProjectCount}개 프로젝트</Badge>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500"
                        onClick={(e) => handleEdit(e, team)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                        onClick={(e) => handleDelete(e, team)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="h-4 w-4" />
                      <span>{team.memberCount}명</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <FolderKanban className="h-4 w-4" />
                      <span>{team.projectCount}개</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>{progress}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>진행률</span>
                      <span>{team.completedTasks}/{team.totalTasks}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: team.color }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <TeamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        team={editTeam}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
