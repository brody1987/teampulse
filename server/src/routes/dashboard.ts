import { Router } from "express";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", async (_req, res) => {
  try {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - (7 * 8 + eightWeeksAgo.getDay()));
    eightWeeksAgo.setHours(0, 0, 0, 0);

    // Single query for all dashboard data
    const [result] = await db.execute<Record<string, any>>(sql`
      WITH counts AS (
        SELECT
          (SELECT COUNT(*) FROM tp_members WHERE is_active = true)::int AS total_members,
          (SELECT COUNT(*) FROM tp_projects WHERE status = 'active')::int AS active_projects,
          (SELECT COUNT(*) FROM tp_tasks)::int AS total_tasks,
          (SELECT COUNT(*) FROM tp_tasks WHERE status = '완료')::int AS completed_tasks,
          (SELECT COUNT(*) FROM tp_tasks WHERE status = '진행중')::int AS inprogress_tasks,
          (SELECT COUNT(*) FROM tp_tasks WHERE status = '검토중')::int AS review_tasks,
          (SELECT COUNT(*) FROM tp_tasks WHERE status = '대기')::int AS waiting_tasks
      ),
      team_prog AS (
        SELECT json_agg(json_build_object(
          'id', t.id, 'name', t.name, 'color', t.color,
          'totalTasks', COALESCE(tc.total, 0),
          'completedTasks', COALESCE(tc.completed, 0)
        )) AS data
        FROM tp_teams t
        LEFT JOIN (
          SELECT p.team_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE tk.status = '완료')::int AS completed
          FROM tp_tasks tk JOIN tp_projects p ON tk.project_id = p.id
          GROUP BY p.team_id
        ) tc ON tc.team_id = t.id
      ),
      weekly AS (
        SELECT json_agg(json_build_object('weekstart', ws, 'count', cnt) ORDER BY ws) AS data
        FROM (
          SELECT date_trunc('week', completed_at::timestamp)::date::text AS ws, COUNT(*)::int AS cnt
          FROM tp_tasks
          WHERE completed_at IS NOT NULL AND completed_at >= ${eightWeeksAgo.toISOString()}
          GROUP BY 1
        ) w
      )
      SELECT
        row_to_json(c.*) AS counts,
        tp.data AS team_progress,
        wk.data AS weekly
      FROM counts c, team_prog tp, weekly wk
    `);

    const counts = (result as any).counts;
    const teamProgress = (result as any).team_progress || [];
    const weeklyRaw = (result as any).weekly || [];

    const weekMap = new Map<string, number>();
    for (const row of weeklyRaw) {
      weekMap.set(row.weekstart, row.count);
    }

    const completionTrend = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      const key = weekStart.toISOString().slice(0, 10);
      completionTrend.push({ week: weekLabel, completed: weekMap.get(key) ?? 0 });
    }

    const totalTasks = counts?.total_tasks ?? 0;
    const completedTasks = counts?.completed_tasks ?? 0;

    res.json({
      kpi: {
        totalMembers: counts?.total_members ?? 0,
        activeProjects: counts?.active_projects ?? 0,
        totalTasks,
        completedTasks,
        completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      taskDistribution: [
        { name: "대기", value: counts?.waiting_tasks ?? 0, color: "#94A3B8" },
        { name: "진행중", value: counts?.inprogress_tasks ?? 0, color: "#3B82F6" },
        { name: "검토중", value: counts?.review_tasks ?? 0, color: "#F59E0B" },
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
