"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluationDialog } from "@/components/evaluation-dialog";
import Link from "next/link";
import { Award, Star } from "lucide-react";
import dynamic from "next/dynamic";

const TeamComparisonChart = dynamic(
  () => import("@/components/charts/evaluation-charts").then((m) => m.TeamComparisonChart),
  { ssr: false, loading: () => <div className="h-72 bg-slate-100 rounded animate-pulse" /> }
);

interface Evaluation {
  id: number;
  taskId: number;
  memberId: number;
  quality: number;
  timeliness: number;
  creativity: number;
  collaboration: number;
  comment: string;
  createdAt: string;
  taskTitle: string;
  memberName: string;
  teamName: string;
  teamColor: string;
}

interface CompletedTask {
  id: number;
  title: string;
  assigneeId: number;
  assigneeName: string;
  projectName: string;
  completedAt: string;
}

export default function EvaluationsPage() {
  const [teamFilter, setTeamFilter] = useState("all");
  const { data: evaluations, mutate } = useSWR<Evaluation[]>(
    `/api/evaluations${teamFilter !== "all" ? `?teamId=${teamFilter}` : ""}`,
    fetcher
  );
  const { data: teams } = useSWR<{ id: number; name: string; color: string }[]>("/api/teams", fetcher);

  // Get completed tasks that haven't been evaluated
  const { data: allTasks } = useSWR<any[]>("/api/tasks", fetcher);
  const evaluatedTaskIds = new Set(evaluations?.map((e) => e.taskId) || []);
  const unevaluatedTasks = allTasks?.filter(
    (t: any) => t.status === "완료" && t.assigneeId && !evaluatedTaskIds.has(t.id)
  ) || [];

  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [evalTarget, setEvalTarget] = useState<{ taskId: number; memberId: number; taskTitle: string; memberName: string } | null>(null);

  // Phase 5: useMemo for rankings computation
  const rankings = useMemo(() => {
    const memberScores = new Map<number, { name: string; teamName: string; teamColor: string; scores: number[]; quality: number[]; timeliness: number[]; creativity: number[]; collaboration: number[] }>();
    evaluations?.forEach((ev) => {
      if (!memberScores.has(ev.memberId)) {
        memberScores.set(ev.memberId, {
          name: ev.memberName,
          teamName: ev.teamName,
          teamColor: ev.teamColor,
          scores: [],
          quality: [],
          timeliness: [],
          creativity: [],
          collaboration: [],
        });
      }
      const m = memberScores.get(ev.memberId)!;
      const avg = (ev.quality + ev.timeliness + ev.creativity + ev.collaboration) / 4;
      m.scores.push(avg);
      m.quality.push(ev.quality);
      m.timeliness.push(ev.timeliness);
      m.creativity.push(ev.creativity);
      m.collaboration.push(ev.collaboration);
    });

    return Array.from(memberScores.entries())
      .map(([id, data]) => ({
        id,
        ...data,
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        evalCount: data.scores.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [evaluations]);

  // Phase 5: useMemo for teamChartData with O(teams + evaluations) algorithm
  const teamChartData = useMemo(() => {
    if (!teams || !evaluations) return [];

    // Build team aggregates in one pass over evaluations: O(evaluations)
    const teamAgg = new Map<string, { quality: number; timeliness: number; creativity: number; collaboration: number; count: number }>();
    for (const e of evaluations) {
      let agg = teamAgg.get(e.teamName);
      if (!agg) {
        agg = { quality: 0, timeliness: 0, creativity: 0, collaboration: 0, count: 0 };
        teamAgg.set(e.teamName, agg);
      }
      agg.quality += e.quality;
      agg.timeliness += e.timeliness;
      agg.creativity += e.creativity;
      agg.collaboration += e.collaboration;
      agg.count++;
    }

    // Map over teams: O(teams)
    return teams.map((team) => {
      const agg = teamAgg.get(team.name);
      if (!agg || agg.count === 0) return { name: team.name, 품질: 0, 시의성: 0, 창의성: 0, 협업: 0 };
      return {
        name: team.name,
        품질: +(agg.quality / agg.count).toFixed(1),
        시의성: +(agg.timeliness / agg.count).toFixed(1),
        창의성: +(agg.creativity / agg.count).toFixed(1),
        협업: +(agg.collaboration / agg.count).toFixed(1),
      };
    });
  }, [teams, evaluations]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">성과 평가</h1>
          <p className="text-slate-500 mt-1">팀별/멤버별 성과를 관리하세요</p>
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="팀 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 팀</SelectItem>
            {teams?.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="pending">미평가 업무</TabsTrigger>
          <TabsTrigger value="history">평가 이력</TabsTrigger>
          <TabsTrigger value="ranking">멤버 랭킹</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">팀별 평균 점수</CardTitle>
              </CardHeader>
              <CardContent>
                {teamChartData.some(d => d.품질 > 0) ? (
                  <div className="h-72">
                    <TeamComparisonChart data={teamChartData} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-16">평가 데이터가 없습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" /> 상위 성과자</CardTitle>
              </CardHeader>
              <CardContent>
                {rankings.length > 0 ? (
                  <div className="space-y-3">
                    {rankings.slice(0, 5).map((r, i) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <Link href={`/members/${r.id}`} className="font-medium hover:text-blue-600">{r.name}</Link>
                          <div className="text-xs text-slate-400">{r.teamName} | {r.evalCount}건 평가</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-lg">{r.avgScore.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-16">평가 데이터가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">미평가 완료 업무 ({unevaluatedTasks.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>업무</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unevaluatedTasks.map((task: any) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.assigneeName}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEvalTarget({
                              taskId: task.id,
                              memberId: task.assigneeId,
                              taskTitle: task.title,
                              memberName: task.assigneeName,
                            });
                            setEvalDialogOpen(true);
                          }}
                        >
                          평가하기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {unevaluatedTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-400">모든 완료 업무가 평가되었습니다.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">평가 이력 ({evaluations?.length ?? 0}건)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>업무</TableHead>
                    <TableHead>멤버</TableHead>
                    <TableHead>팀</TableHead>
                    <TableHead>품질</TableHead>
                    <TableHead>시의성</TableHead>
                    <TableHead>창의성</TableHead>
                    <TableHead>협업</TableHead>
                    <TableHead>평균</TableHead>
                    <TableHead>날짜</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations?.map((ev) => {
                    const avg = ((ev.quality + ev.timeliness + ev.creativity + ev.collaboration) / 4).toFixed(1);
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.taskTitle}</TableCell>
                        <TableCell>
                          <Link href={`/members/${ev.memberId}`} className="text-blue-600 hover:underline">{ev.memberName}</Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" style={{ backgroundColor: ev.teamColor + "20", color: ev.teamColor }}>{ev.teamName}</Badge>
                        </TableCell>
                        <TableCell>{ev.quality}</TableCell>
                        <TableCell>{ev.timeliness}</TableCell>
                        <TableCell>{ev.creativity}</TableCell>
                        <TableCell>{ev.collaboration}</TableCell>
                        <TableCell className="font-bold">{avg}</TableCell>
                        <TableCell className="text-sm text-slate-500">{ev.createdAt?.slice(0, 10)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(!evaluations || evaluations.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-400">평가 이력이 없습니다.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">멤버 랭킹</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>멤버</TableHead>
                    <TableHead>팀</TableHead>
                    <TableHead>평가 건수</TableHead>
                    <TableHead>품질</TableHead>
                    <TableHead>시의성</TableHead>
                    <TableHead>창의성</TableHead>
                    <TableHead>협업</TableHead>
                    <TableHead>종합 평균</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"}`}>
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/members/${r.id}`} className="font-medium text-blue-600 hover:underline">{r.name}</Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ backgroundColor: r.teamColor + "20", color: r.teamColor }}>{r.teamName}</Badge>
                      </TableCell>
                      <TableCell>{r.evalCount}건</TableCell>
                      <TableCell>{(r.quality.reduce((a, b) => a + b, 0) / r.quality.length).toFixed(1)}</TableCell>
                      <TableCell>{(r.timeliness.reduce((a, b) => a + b, 0) / r.timeliness.length).toFixed(1)}</TableCell>
                      <TableCell>{(r.creativity.reduce((a, b) => a + b, 0) / r.creativity.length).toFixed(1)}</TableCell>
                      <TableCell>{(r.collaboration.reduce((a, b) => a + b, 0) / r.collaboration.length).toFixed(1)}</TableCell>
                      <TableCell className="font-bold text-lg">{r.avgScore.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                  {rankings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-400">평가 데이터가 없습니다.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {evalTarget && (
        <EvaluationDialog
          open={evalDialogOpen}
          onOpenChange={setEvalDialogOpen}
          taskId={evalTarget.taskId}
          memberId={evalTarget.memberId}
          taskTitle={evalTarget.taskTitle}
          memberName={evalTarget.memberName}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}
