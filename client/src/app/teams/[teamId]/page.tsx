"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, FolderKanban } from "lucide-react";

interface TeamDetail {
  id: number;
  name: string;
  description: string;
  color: string;
  members: {
    id: number;
    name: string;
    role: string;
    position: string;
    email: string;
    phone: string;
    isActive: boolean;
  }[];
  projects: {
    id: number;
    name: string;
    description: string;
    status: string;
    startDate: string;
    endDate: string;
    totalTasks: number;
    completedTasks: number;
  }[];
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "진행중", variant: "default" },
  completed: { label: "완료", variant: "secondary" },
  on_hold: { label: "보류", variant: "outline" },
  cancelled: { label: "취소", variant: "destructive" },
};

export default function TeamDetailPage() {
  const params = useParams();
  const { data: team, isLoading } = useSWR<TeamDetail>(`/api/teams/${params.teamId}`, fetcher);

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-slate-200 rounded" /><div className="h-64 bg-slate-200 rounded-lg" /></div>;
  if (!team) return <div>팀을 찾을 수 없습니다.</div>;

  return (
    <div>
      <div className="mb-8">
        <Link href="/teams" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> 팀 목록
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
          <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
        </div>
        <p className="text-slate-500 mt-1">{team.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">멤버 ({team.members.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>직책</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>연락처</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Link href={`/members/${member.id}`} className="font-medium text-blue-600 hover:underline">
                        {member.name}
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="outline">{member.position}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-600">{member.role}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.email && <Mail className="h-3.5 w-3.5 text-slate-400" />}
                        {member.phone && <Phone className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">프로젝트 ({team.projects.length}개)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {team.projects.map((project) => {
              const progress = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0;
              const st = statusMap[project.status] || statusMap.active;
              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="block">
                  <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{project.name}</span>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{project.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{progress}%</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      {project.startDate} ~ {project.endDate}
                    </div>
                  </div>
                </Link>
              );
            })}
            {team.projects.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">등록된 프로젝트가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
