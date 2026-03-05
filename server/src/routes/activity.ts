import { Router } from "express";
import { db } from "../lib/db";
import { activityLog } from "../lib/schema";
import { desc } from "drizzle-orm";

const router = Router();

// GET /api/activity
router.get("/", async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) ?? "20");

    const result = await db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    res.json(result);
  } catch (err: any) {
    console.error("Activity error:", err.cause?.message || err.message);
    res.status(500).json({ error: err.cause?.message || err.message });
  }
});

export default router;
