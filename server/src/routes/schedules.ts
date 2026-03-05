import { Router } from "express";
import { db } from "../lib/db";
import { schedules } from "../lib/schema";
import { and, eq, gte, lte } from "drizzle-orm";

const router = Router();

// GET /api/schedules
router.get("/", async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  let query = db.select().from(schedules).$dynamic();

  if (startDate && endDate) {
    query = query.where(
      and(gte(schedules.date, startDate), lte(schedules.date, endDate))
    );
  }

  const result = await query.orderBy(schedules.date, schedules.time);
  res.json(result);
});

// POST /api/schedules
router.post("/", async (req, res) => {
  const [result] = await db.insert(schedules).values(req.body).returning();
  res.status(201).json(result);
});

// PUT /api/schedules/:id
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [result] = await db.update(schedules).set(req.body).where(eq(schedules.id, id)).returning();
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});

// DELETE /api/schedules/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
  if (!schedule) return res.status(404).json({ error: "Not found" });
  await db.delete(schedules).where(eq(schedules.id, id));
  res.json({ success: true });
});

export default router;
