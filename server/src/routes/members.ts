import { Router } from "express";
import { db } from "../lib/db";
import { members, teams, tasks, projects, evaluations } from "../lib/schema";
import { eq, like } from "drizzle-orm";
import { logActivity } from "../lib/activity";

const router = Router();

// GET /api/members
router.get("/", async (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  const search = req.query.search as string | undefined;

  let query = db
    .select({
      id: members.id,
      name: members.name,
      role: members.role,
      teamId: members.teamId,
      position: members.position,
      email: members.email,
      phone: members.phone,
      isActive: members.isActive,
      createdAt: members.createdAt,
      teamName: teams.name,
      teamColor: teams.color,
    })
    .from(members)
    .leftJoin(teams, eq(members.teamId, teams.id))
    .$dynamic();

  if (teamId) query = query.where(eq(members.teamId, parseInt(teamId)));
  if (search) query = query.where(like(members.name, `%${search}%`));

  const result = await query;
  res.json(result);
});

// POST /api/members
router.post("/", async (req, res) => {
  const [result] = await db.insert(members).values(req.body).returning();
  await logActivity("create", "member", result.id, `멤버 '${result.name}' 추가`);
  res.status(201).json(result);
});

// GET /api/members/:memberId
router.get("/:memberId", async (req, res) => {
  const id = parseInt(req.params.memberId);

  const [member] = await db
    .select({
      id: members.id,
      name: members.name,
      role: members.role,
      teamId: members.teamId,
      position: members.position,
      email: members.email,
      phone: members.phone,
      isActive: members.isActive,
      createdAt: members.createdAt,
      teamName: teams.name,
      teamColor: teams.color,
    })
    .from(members)
    .leftJoin(teams, eq(members.teamId, teams.id))
    .where(eq(members.id, id));

  if (!member) return res.status(404).json({ error: "Not found" });

  const memberTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectName: projects.name,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.assigneeId, id));

  const memberEvals = await db
    .select({
      id: evaluations.id,
      taskId: evaluations.taskId,
      quality: evaluations.quality,
      timeliness: evaluations.timeliness,
      creativity: evaluations.creativity,
      collaboration: evaluations.collaboration,
      comment: evaluations.comment,
      createdAt: evaluations.createdAt,
      taskTitle: tasks.title,
    })
    .from(evaluations)
    .leftJoin(tasks, eq(evaluations.taskId, tasks.id))
    .where(eq(evaluations.memberId, id));

  res.json({ ...member, tasks: memberTasks, evaluations: memberEvals });
});

// PUT /api/members/:memberId
router.put("/:memberId", async (req, res) => {
  const id = parseInt(req.params.memberId);
  const [result] = await db.update(members).set(req.body).where(eq(members.id, id)).returning();
  await logActivity("update", "member", id, `멤버 '${result.name}' 정보 수정`);
  res.json(result);
});

// DELETE /api/members/:memberId
router.delete("/:memberId", async (req, res) => {
  const id = parseInt(req.params.memberId);
  const [member] = await db.select().from(members).where(eq(members.id, id));
  if (!member) return res.status(404).json({ error: "Not found" });
  await db.update(members).set({ isActive: false }).where(eq(members.id, id));
  await logActivity("deactivate", "member", id, `멤버 '${member.name}' 비활성화`);
  res.json({ success: true });
});

export default router;
