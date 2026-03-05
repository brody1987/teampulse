import { Router } from "express";
import { db } from "../lib/db";
import { evaluations, tasks, members, teams } from "../lib/schema";
import { eq, gte, lte, desc } from "drizzle-orm";
import { logActivity } from "../lib/activity";

const router = Router();

// GET /api/evaluations
router.get("/", async (req, res) => {
  const memberId = req.query.memberId as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  let query = db
    .select({
      id: evaluations.id,
      taskId: evaluations.taskId,
      memberId: evaluations.memberId,
      quality: evaluations.quality,
      timeliness: evaluations.timeliness,
      creativity: evaluations.creativity,
      collaboration: evaluations.collaboration,
      comment: evaluations.comment,
      createdAt: evaluations.createdAt,
      taskTitle: tasks.title,
      memberName: members.name,
      teamName: teams.name,
      teamColor: teams.color,
    })
    .from(evaluations)
    .leftJoin(tasks, eq(evaluations.taskId, tasks.id))
    .leftJoin(members, eq(evaluations.memberId, members.id))
    .leftJoin(teams, eq(members.teamId, teams.id))
    .$dynamic();

  if (memberId) query = query.where(eq(evaluations.memberId, parseInt(memberId)));
  if (teamId) query = query.where(eq(members.teamId, parseInt(teamId)));
  if (from) query = query.where(gte(evaluations.createdAt, new Date(from)));
  if (to) query = query.where(lte(evaluations.createdAt, new Date(to)));

  const result = await query.orderBy(desc(evaluations.createdAt));
  res.json(result);
});

// POST /api/evaluations
router.post("/", async (req, res) => {
  const body = req.body;
  const [result] = await db.insert(evaluations).values(body).returning();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, body.taskId));
  const [member] = await db.select().from(members).where(eq(members.id, body.memberId));
  await logActivity("evaluate", "task", body.taskId, `'${member?.name}'의 업무 '${task?.title}' 평가 완료`);
  res.status(201).json(result);
});

export default router;
