import { Router } from "express";
import { db } from "../lib/db";
import { teams, members, projects, tasks, projectMembers, projectMetrics, evaluations } from "../lib/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { logActivity } from "../lib/activity";

const router = Router();

// GET /api/teams
router.get("/", async (_req, res) => {
  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      color: teams.color,
      memberCount: sql<number>`(SELECT COUNT(*) FROM tp_members WHERE team_id = tp_teams.id AND is_active = true)`,
      projectCount: sql<number>`(SELECT COUNT(*) FROM tp_projects WHERE team_id = tp_teams.id)`,
      activeProjectCount: sql<number>`(SELECT COUNT(*) FROM tp_projects WHERE team_id = tp_teams.id AND status = 'active')`,
      totalTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks t JOIN tp_projects p ON t.project_id = p.id WHERE p.team_id = tp_teams.id)`,
      completedTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks t JOIN tp_projects p ON t.project_id = p.id WHERE p.team_id = tp_teams.id AND t.status = '완료')`,
    })
    .from(teams);

  res.json(result);
});

// POST /api/teams
router.post("/", async (req, res) => {
  const [result] = await db.insert(teams).values(req.body).returning();
  await logActivity("create", "team", result.id, `팀 '${result.name}' 생성`);
  res.status(201).json(result);
});

// GET /api/teams/:teamId
router.get("/:teamId", async (req, res) => {
  const id = parseInt(req.params.teamId);

  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  if (!team) return res.status(404).json({ error: "Not found" });

  const teamMembers = await db.select().from(members).where(eq(members.teamId, id));
  const teamProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      totalTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks WHERE project_id = tp_projects.id)`,
      completedTasks: sql<number>`(SELECT COUNT(*) FROM tp_tasks WHERE project_id = tp_projects.id AND status = '완료')`,
    })
    .from(projects)
    .where(eq(projects.teamId, id));

  res.json({ ...team, members: teamMembers, projects: teamProjects });
});

// PUT /api/teams/:teamId
router.put("/:teamId", async (req, res) => {
  const id = parseInt(req.params.teamId);
  const [result] = await db.update(teams).set(req.body).where(eq(teams.id, id)).returning();
  await logActivity("update", "team", id, `팀 '${result.name}' 정보 수정`);
  res.json(result);
});

// DELETE /api/teams/:teamId
router.delete("/:teamId", async (req, res) => {
  const id = parseInt(req.params.teamId);

  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  if (!team) return res.status(404).json({ error: "Not found" });

  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, id));
  const projectIds = teamProjects.map((p) => p.id);

  if (projectIds.length > 0) {
    const projectTasks = await db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.projectId, projectIds));
    const taskIds = projectTasks.map((t) => t.id);
    if (taskIds.length > 0) {
      await db.delete(evaluations).where(inArray(evaluations.taskId, taskIds));
    }
    await db.delete(tasks).where(inArray(tasks.projectId, projectIds));
    await db.delete(projectMembers).where(inArray(projectMembers.projectId, projectIds));
    await db.delete(projectMetrics).where(inArray(projectMetrics.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }

  await db.update(members).set({ teamId: null }).where(eq(members.teamId, id));
  await db.delete(teams).where(eq(teams.id, id));
  await logActivity("delete", "team", id, `팀 '${team.name}' 삭제`);
  res.json({ success: true });
});

export default router;
