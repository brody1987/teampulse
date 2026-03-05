"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderKanban, CheckCircle2, TrendingUp, Activity } from "lucide-react";
import dynamic from "next/dynamic";

const TeamProgressChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => m.TeamProgressChart),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded animate-pulse" /> }
);
const TaskDistributionChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => m.TaskDistributionChart),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded animate-pulse" /> }
);
const CompletionTrendChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((m) => m.CompletionTrendChart),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded animate-pulse" /> }
);

interface DashboardStats {
  kpi: {
    totalMembers: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  taskDistribution: { name: string; value: number; color: string }[];
  teamProgress: { id: number; name: string; color: string; totalTasks: number; completedTasks: number }[];
  completionTrend: { week: string; completed: number }[];
}

interface ActivityItem {
  id: number;
  type: string;
  entityType: string;
  entityId: number;
  description: string;
  createdAt: string;
}

const activityIcons: Record<string, string> = {
  create: "🆕",
  complete: "✅",
  update: "📝",
  evaluate: "⭐",
  delete: "🗑️",
  status_change: "🔄",
  deactivate: "⏸️",
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>("/api/dashboard/stats", fetcher);
  const { data: activities } = useSWR<ActivityItem[]>("/api/activity?limit=10", fetcher);

  if (statsLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-72 bg-slate-200 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!stats) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="text-5xl mb-4">📊</div>
      <p className="text-slate-500">데이터를 불러올 수 없습니다.</p>
    </div>
  );

  const kpiCards = [
    { title: "전체 멤버", value: stats.kpi.totalMembers, suffix: "명", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "진행중 프로젝트", value: stats.kpi.activeProjects, suffix: "개", icon: FolderKanban, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "전체 업무", value: stats.kpi.totalTasks, suffix: "건", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { title: "완료율", value: stats.kpi.completionRate, suffix: "%", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const teamBarData = stats.teamProgress.map((t) => ({
    name: t.name.replace("팀", ""),
    진행률: t.totalTasks > 0 ? Math.round((t.completedTasks / t.totalTasks) * 100) : 0,
    fill: t.color,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-500 mt-1">부서 전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold mt-1">
                    {kpi.value}<span className="text-lg font-normal text-slate-400 ml-1">{kpi.suffix}</span>
                  </p>
                </div>
                <div className={`w-12 h-12 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Team Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">팀별 진행률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <TeamProgressChart data={teamBarData} />
            </div>
          </CardContent>
        </Card>

        {/* Task Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">작업 상태 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <TaskDistributionChart data={stats.taskDistribution} />
            </div>
          </CardContent>
        </Card>

        {/* Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">완료 추이 (최근 8주)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <CompletionTrendChart data={stats.completionTrend} />
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5" /> 최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activities?.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <span className="text-lg mt-0.5">{activityIcons[activity.type] || "📋"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.createdAt?.replace("T", " ").slice(0, 16)}</p>
                  </div>
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-8">활동 기록이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
