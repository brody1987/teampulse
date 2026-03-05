import { Router } from "express";
import { db } from "../lib/db";
import { projects, teams, tasks, members, projectMembers, projectMetrics, evaluations, attachments } from "../lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { logActivity } from "../lib/activity";

const router = Router();

// GET /api/projects
router.get("/", async (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  const status = req.query.status as string | undefined;

  const conditions: string[] = [];
  if (teamId) conditions.push(`p.team_id = ${parseInt(teamId)}`);
  if (status) conditions.push(`p.status = '${status.replace(/'/g, "''")}'`);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.execute(sql.raw(`
    SELECT p.id, p.name, p.description, p.content, p.type,
      p.team_id AS "teamId", p.owner_id AS "ownerId", p.status,
      p.start_date AS "startDate", p.end_date AS "endDate",
      p.created_at AS "createdAt", p.is_pinned AS "isPinned",
      t.name AS "teamName", t.color AS "teamColor",
      COALESCE(tc.total, 0)::int AS "totalTasks",
      COALESCE(tc.completed, 0)::int AS "completedTasks",
      COALESCE(mn.names, '') AS "memberNames"
    FROM tp_projects p
    LEFT JOIN tp_teams t ON p.team_id = t.id
    LEFT JOIN (
      SELECT project_id, COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = '완료')::int AS completed
      FROM tp_tasks GROUP BY project_id
    ) tc ON tc.project_id = p.id
    LEFT JOIN (
      SELECT pm.project_id, string_agg(DISTINCT m.name, ',') AS names
      FROM tp_project_members pm
      JOIN tp_members m ON m.id = pm.member_id
      GROUP BY pm.project_id
    ) mn ON mn.project_id = p.id
    ${whereClause}
    ORDER BY p.is_pinned DESC, p.created_at DESC
  `));

  res.json(result);
});

// POST /api/projects
router.post("/", async (req, res) => {
  const { memberIds, metrics, ...projectData } = req.body;

  const [result] = await db.insert(projects).values(projectData).returning();

  if (memberIds && memberIds.length > 0) {
    await db.insert(projectMembers).values(
      memberIds.map((memberId: number) => ({ projectId: result.id, memberId }))
    );
  }

  if (metrics && metrics.length > 0) {
    const validMetrics = metrics.filter((m: any) => m.label.trim());
    if (validMetrics.length > 0) {
      await db.insert(projectMetrics).values(
        validMetrics.map((m: any) => ({ projectId: result.id, label: m.label, value: m.value || 0 }))
      );
    }
  }

  await logActivity("create", "project", result.id, `프로젝트 '${result.name}' 생성`);
  res.status(201).json(result);
});

// GET /api/projects/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  // Fetch project with owner name in single query
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      content: projects.content,
      type: projects.type,
      teamId: projects.teamId,
      ownerId: projects.ownerId,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      createdAt: projects.createdAt,
      teamName: teams.name,
      teamColor: teams.color,
      isPinned: projects.isPinned,
      ownerName: sql<string | null>`(SELECT name FROM tp_members WHERE id = tp_projects.owner_id)`,
    })
    .from(projects)
    .leftJoin(teams, eq(projects.teamId, teams.id))
    .where(eq(projects.id, id));

  if (!project) return res.status(404).json({ error: "Not found" });

  // Run remaining queries in parallel
  const [projectTasks, pmRows, metricsRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        sortOrder: tasks.sortOrder,
        assigneeId: tasks.assigneeId,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        assigneeName: members.name,
      })
      .from(tasks)
      .leftJoin(members, eq(tasks.assigneeId, members.id))
      .where(eq(tasks.projectId, id))
      .orderBy(tasks.sortOrder),
    db
      .select({
        id: projectMembers.id,
        memberId: projectMembers.memberId,
        memberName: members.name,
      })
      .from(projectMembers)
      .leftJoin(members, eq(projectMembers.memberId, members.id))
      .where(eq(projectMembers.projectId, id)),
    db.select().from(projectMetrics).where(eq(projectMetrics.projectId, id)),
  ]);

  res.json({
    ...project,
    tasks: projectTasks,
    members: pmRows,
    metrics: metricsRows,
  });
});

// PUT /api/projects/:id
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { memberIds, metrics, ...projectData } = req.body;

  const [result] = await db.update(projects).set(projectData).where(eq(projects.id, id)).returning();

  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  if (memberIds && memberIds.length > 0) {
    await db.insert(projectMembers).values(
      memberIds.map((memberId: number) => ({ projectId: id, memberId }))
    );
  }

  await db.delete(projectMetrics).where(eq(projectMetrics.projectId, id));
  if (metrics && metrics.length > 0) {
    const validMetrics = metrics.filter((m: any) => m.label.trim());
    if (validMetrics.length > 0) {
      await db.insert(projectMetrics).values(
        validMetrics.map((m: any) => ({ projectId: id, label: m.label, value: m.value || 0 }))
      );
    }
  }

  await logActivity("update", "project", id, `프로젝트 '${result.name}' 수정`);
  res.json(result);
});

// DELETE /api/projects/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return res.status(404).json({ error: "Not found" });

  const projectTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, id));
  const taskIds = projectTasks.map((t) => t.id);

  if (taskIds.length > 0) {
    await db.delete(evaluations).where(inArray(evaluations.taskId, taskIds));
    await db.delete(attachments).where(and(eq(attachments.entityType, "task"), inArray(attachments.entityId, taskIds)));
  }

  await db.delete(attachments).where(and(eq(attachments.entityType, "project"), eq(attachments.entityId, id)));
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db.delete(projectMetrics).where(eq(projectMetrics.projectId, id));
  await db.delete(tasks).where(eq(tasks.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));

  await logActivity("delete", "project", id, `프로젝트 '${project.name}' 삭제`);
  res.json({ success: true });
});

export default router;
