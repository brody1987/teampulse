import { Router } from "express";
import { db } from "../lib/db";
import { activityLog } from "../lib/schema";
import { desc } from "drizzle-orm";

const router = Router();

// GET /api/activity
router.get("/", async (req, res) => {
  const limit = parseInt((req.query.limit as string) ?? "20");

  const result = await db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  res.json(result);
});

export default router;
