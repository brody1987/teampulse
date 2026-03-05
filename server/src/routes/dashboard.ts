import { Router } from "express";
import { db } from "../lib/db";
import { teams } from "../lib/schema";
import { sql } from "drizzle-orm";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", async (_req, res) => {
  try {
  const [counts] = await db.execute<{
    totalmembers: number;
    totalprojects: number;
    activeprojects: number;
    totaltasks: number;
    completedtasks: number;
    inprogresstasks: number;
    reviewtasks: number;
    waitingtasks: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM tp_members WHERE is_active = true)::int AS totalmembers,
      (SELECT COUNT(*) FROM tp_projects)::int AS totalprojects,
      (SELECT COUNT(*) FROM tp_projects WHERE status = 'active')::int AS activeprojects,
      (SELECT COUNT(*) FROM tp_tasks)::int AS totaltasks,
      (SELECT COUNT(*) FROM tp_tasks WHERE status = '완료')::int AS completedtasks,
      (SELECT COUNT(*) FROM tp_tasks WHERE status = '진행중')::int AS inprogresstasks,
      (SELECT COUNT(*) FROM tp_tasks WHERE status = '검토중')::int AS reviewtasks,
      (SELECT COUNT(*) FROM tp_tasks WHERE status = '대기')::int AS waitingtasks
  `);

  const teamProgress = await db
    .select({
      id: teams.id,
      name: teams.name,
      color: teams.color,
      totalTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks t JOIN tp_projects p ON t.project_id = p.id WHERE p.team_id = tp_teams.id)`,
      completedTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks t JOIN tp_projects p ON t.project_id = p.id WHERE p.team_id = tp_teams.id AND t.status = '완료')`,
    })
    .from(teams);

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - (7 * 8 + eightWeeksAgo.getDay()));
  eightWeeksAgo.setHours(0, 0, 0, 0);

  const weeklyCompletions = await db.execute<{ weekstart: string; count: number }>(sql`
    SELECT
      date_trunc('week', completed_at::timestamp)::date::text AS weekstart,
      COUNT(*)::int AS count
    FROM tp_tasks
    WHERE completed_at >= ${eightWeeksAgo.toISOString()}
      AND completed_at IS NOT NULL
    GROUP BY date_trunc('week', completed_at::timestamp)
    ORDER BY weekstart
  `);

  const weekMap = new Map<string, number>();
  for (const row of weeklyCompletions) {
    weekMap.set(row.weekstart, row.count);
  }

  const completionTrend = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    const key = weekStart.toISOString().slice(0, 10);
    completionTrend.push({ week: weekLabel, completed: weekMap.get(key) ?? 0 });
  }

  const totalTasks = counts?.totaltasks ?? 0;
  const completedTasks = counts?.completedtasks ?? 0;

  res.json({
    kpi: {
      totalMembers: counts?.totalmembers ?? 0,
      activeProjects: counts?.activeprojects ?? 0,
      totalTasks,
      completedTasks,
      completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    taskDistribution: [
      { name: "대기", value: counts?.waitingtasks ?? 0, color: "#94A3B8" },
      { name: "진행중", value: counts?.inprogresstasks ?? 0, color: "#3B82F6" },
      { name: "검토중", value: counts?.reviewtasks ?? 0, color: "#F59E0B" },
      { name: "완료", value: completedTasks, color: "#10B981" },
    ],
    teamProgress,
    completionTrend,
  });
  } catch (err: any) {
    console.error("Dashboard error:", err.cause?.message || err.message);
    res.status(500).json({ error: err.cause?.message || err.message });
  }
});

export default router;
