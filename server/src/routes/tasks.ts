import { Router } from "express";
import { db } from "../lib/db";
import { tasks, members } from "../lib/schema";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "../lib/activity";

const router = Router();

// GET /api/tasks
router.get("/", async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  const assigneeId = req.query.assigneeId as string | undefined;

  let query = db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      sortOrder: tasks.sortOrder,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      assigneeName: members.name,
    })
    .from(tasks)
    .leftJoin(members, eq(tasks.assigneeId, members.id))
    .$dynamic();

  if (projectId) query = query.where(eq(tasks.projectId, parseInt(projectId)));
  if (assigneeId) query = query.where(eq(tasks.assigneeId, parseInt(assigneeId)));

  const result = await query.orderBy(tasks.sortOrder);
  res.json(result);
});

// POST /api/tasks
router.post("/", async (req, res) => {
  const body = req.body;
  const [maxOrder] = await db
    .select({ max: sql<number>`COALESCE(MAX(${tasks.sortOrder}), -1)` })
    .from(tasks)
    .where(eq(tasks.projectId, body.projectId));
  body.sortOrder = (maxOrder?.max ?? -1) + 1;

  const [result] = await db.insert(tasks).values(body).returning();
  await logActivity("create", "task", result.id, `업무 '${result.title}' 생성`);
  res.status(201).json(result);
});

// PUT /api/tasks/:taskId
router.put("/:taskId", async (req, res) => {
  const id = parseInt(req.params.taskId);
  const body = req.body;

  if (body.status === "완료") {
    body.completedAt = new Date().toISOString();
  }

  const [result] = await db.update(tasks).set(body).where(eq(tasks.id, id)).returning();

  if (body.status === "완료") {
    await logActivity("complete", "task", id, `업무 '${result.title}' 완료`);
  } else if (body.status) {
    await logActivity("status_change", "task", id, `업무 '${result.title}' 상태 변경: ${body.status}`);
  } else {
    await logActivity("update", "task", id, `업무 '${result.title}' 수정`);
  }

  res.json(result);
});

// DELETE /api/tasks/:taskId
router.delete("/:taskId", async (req, res) => {
  const id = parseInt(req.params.taskId);
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) return res.status(404).json({ error: "Not found" });
  await db.delete(tasks).where(eq(tasks.id, id));
  await logActivity("delete", "task", id, `업무 '${task.title}' 삭제`);
  res.json({ success: true });
});

// POST /api/tasks/reorder
router.post("/reorder", async (req, res) => {
  const { taskId, newStatus, newOrder } = req.body as {
    taskId: number;
    newStatus: string;
    newOrder: { id: number; sortOrder: number }[];
  };

  if (newStatus) {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "완료") {
      updates.completedAt = new Date().toISOString();
    }
    await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
  }

  if (newOrder.length > 0) {
    const cases = newOrder.map((item) => `WHEN ${item.id} THEN ${item.sortOrder}`).join(" ");
    const ids = newOrder.map((item) => item.id).join(",");
    await db.execute(sql.raw(
      `UPDATE tp_tasks SET sort_order = CASE id ${cases} END WHERE id IN (${ids})`
    ));
  }

  res.json({ success: true });
});

export default router;
