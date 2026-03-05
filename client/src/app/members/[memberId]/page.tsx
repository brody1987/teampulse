"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";
import dynamic from "next/dynamic";

const MemberRadarChart = dynamic(
  () => import("@/components/charts/member-radar-chart").then((m) => m.MemberRadarChart),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded animate-pulse" /> }
);

interface MemberDetail {
  id: number;
  name: string;
  role: string;
  teamId: number;
  position: string;
  email: string;
  phone: string;
  isActive: boolean;
  teamName: string;
  teamColor: string;
  tasks: {
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    projectName: string;
    completedAt: string;
  }[];
  evaluations: {
    id: number;
    taskId: number;
    quality: number;
    timeliness: number;
    creativity: number;
    collaboration: number;
    comment: string;
    createdAt: string;
    taskTitle: string;
  }[];
}

const priorityColors: Record<string, string> = {
  "긴급": "bg-red-100 text-red-700",
  "높음": "bg-orange-100 text-orange-700",
  "보통": "bg-blue-100 text-blue-700",
  "낮음": "bg-slate-100 text-slate-600",
};

const statusColors: Record<string, string> = {
  "대기": "bg-slate-100 text-slate-600",
  "진행중": "bg-blue-100 text-blue-700",
  "검토중": "bg-yellow-100 text-yellow-700",
  "완료": "bg-green-100 text-green-700",
};

export default function MemberDetailPage() {
  const params = useParams();
  const { data: member, isLoading } = useSWR<MemberDetail>(`/api/members/${params.memberId}`, fetcher);

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-slate-200 rounded" /><div className="h-64 bg-slate-200 rounded-lg" /></div>;
  if (!member) return <div>멤버를 찾을 수 없습니다.</div>;

  // Calculate average scores
  const avgScores = member.evaluations.length > 0
    ? {
        quality: member.evaluations.reduce((s, e) => s + e.quality, 0) / member.evaluations.length,
        timeliness: member.evaluations.reduce((s, e) => s + e.timeliness, 0) / member.evaluations.length,
        creativity: member.evaluations.reduce((s, e) => s + e.creativity, 0) / member.evaluations.length,
        collaboration: member.evaluations.reduce((s, e) => s + e.collaboration, 0) / member.evaluations.length,
      }
    : null;

  const radarData = avgScores
    ? [
        { subject: "품질", score: avgScores.quality },
        { subject: "시의성", score: avgScores.timeliness },
        { subject: "창의성", score: avgScores.creativity },
        { subject: "협업", score: avgScores.collaboration },
      ]
    : [];

  return (
    <div>
      <Link href="/members" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> 멤버 목록
      </Link>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: member.teamColor }}>
              {member.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{member.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" style={{ backgroundColor: member.teamColor + "20", color: member.teamColor }}>
                  {member.teamName}
                </Badge>
                <span className="text-slate-500">{member.position}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">{member.role}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                {member.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {member.email}</span>}
                {member.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {member.phone}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">성과 레이더</CardTitle>
          </CardHeader>
          <CardContent>
            {avgScores ? (
              <div className="h-64">
                <MemberRadarChart data={radarData} color={member.teamColor} />
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">평가 데이터가 없습니다.</p>
            )}
            {avgScores && (
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div className="text-center p-2 bg-slate-50 rounded">
                  <div className="text-slate-500">품질</div>
                  <div className="font-bold">{avgScores.quality.toFixed(1)}</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <div className="text-slate-500">시의성</div>
                  <div className="font-bold">{avgScores.timeliness.toFixed(1)}</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <div className="text-slate-500">창의성</div>
                  <div className="font-bold">{avgScores.creativity.toFixed(1)}</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <div className="text-slate-500">협업</div>
                  <div className="font-bold">{avgScores.collaboration.toFixed(1)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">업무 이력 ({member.tasks.length}건)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업무</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>우선순위</TableHead>
                  <TableHead>마감일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-sm text-slate-500">{task.projectName}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status] || ""}`}>
                        {task.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] || ""}`}>
                        {task.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{task.dueDate}</TableCell>
                  </TableRow>
                ))}
                {member.tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">업무 이력이 없습니다.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Evaluation History */}
      {member.evaluations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">평가 이력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.evaluations.map((ev) => (
              <div key={ev.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{ev.taskTitle}</span>
                  <span className="text-xs text-slate-400">{ev.createdAt?.slice(0, 10)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm mb-2">
                  <div className="text-center"><span className="text-slate-500">품질</span> <span className="font-bold ml-1">{ev.quality}</span></div>
                  <div className="text-center"><span className="text-slate-500">시의성</span> <span className="font-bold ml-1">{ev.timeliness}</span></div>
                  <div className="text-center"><span className="text-slate-500">창의성</span> <span className="font-bold ml-1">{ev.creativity}</span></div>
                  <div className="text-center"><span className="text-slate-500">협업</span> <span className="font-bold ml-1">{ev.collaboration}</span></div>
                </div>
                {ev.comment && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{ev.comment}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
