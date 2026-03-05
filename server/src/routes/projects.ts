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

  let query = db
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
      totalTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks WHERE project_id = tp_projects.id)`,
      completedTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks WHERE project_id = tp_projects.id AND status = '완료')`,
      isPinned: projects.isPinned,
      memberNames: sql<string>`COALESCE((
        SELECT string_agg(DISTINCT name, ',') FROM (
          SELECT m.name FROM tp_members m WHERE m.team_id = tp_projects.team_id AND m.is_active = true
          UNION
          SELECT m.name FROM tp_members m WHERE m.id = tp_projects.owner_id
          UNION
          SELECT m.name FROM tp_members m INNER JOIN tp_project_members pm ON pm.member_id = m.id WHERE pm.project_id = tp_projects.id
        ) sub
      ), '')`,
    })
    .from(projects)
    .leftJoin(teams, eq(projects.teamId, teams.id))
    .$dynamic();

  if (teamId) query = query.where(eq(projects.teamId, parseInt(teamId)));
  if (status) query = query.where(eq(projects.status, status as any));

  const result = await query.orderBy(sql`is_pinned DESC, tp_projects.created_at DESC`);
  res.json(result);
});

// POST /api/projects
router.post("/", async (req, res) => {
  const { memberIds, metrics, ...projectData } = req.body;

  const [result] = await db.insert(projects).values(projectData).returning();

  if (memberIds && memberIds.length > 0) {
    for (const memberId of memberIds) {
      await db.insert(projectMembers).values({ projectId: result.id, memberId });
    }
  }

  if (metrics && metrics.length > 0) {
    for (const metric of metrics) {
      if (metric.label.trim()) {
        await db.insert(projectMetrics).values({
          projectId: result.id,
          label: metric.label,
          value: metric.value || 0,
        });
      }
    }
  }

  await logActivity("create", "project", result.id, `프로젝트 '${result.name}' 생성`);
  res.status(201).json(result);
});

// GET /api/projects/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);

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
    })
    .from(projects)
    .leftJoin(teams, eq(projects.teamId, teams.id))
    .where(eq(projects.id, id));

  if (!project) return res.status(404).json({ error: "Not found" });

  const projectTasks = await db
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
    .orderBy(tasks.sortOrder);

  const pmRows = await db
    .select({
      id: projectMembers.id,
      memberId: projectMembers.memberId,
      memberName: members.name,
    })
    .from(projectMembers)
    .leftJoin(members, eq(projectMembers.memberId, members.id))
    .where(eq(projectMembers.projectId, id));

  const metricsRows = await db
    .select()
    .from(projectMetrics)
    .where(eq(projectMetrics.projectId, id));

  let ownerName: string | null = null;
  if (project.ownerId) {
    const [owner] = await db.select({ name: members.name }).from(members).where(eq(members.id, project.ownerId));
    ownerName = owner?.name || null;
  }

  res.json({
    ...project,
    ownerName,
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
    for (const memberId of memberIds) {
      await db.insert(projectMembers).values({ projectId: id, memberId });
    }
  }

  await db.delete(projectMetrics).where(eq(projectMetrics.projectId, id));
  if (metrics && metrics.length > 0) {
    for (const metric of metrics) {
      if (metric.label.trim()) {
        await db.insert(projectMetrics).values({
          projectId: id,
          label: metric.label,
          value: metric.value || 0,
        });
      }
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
