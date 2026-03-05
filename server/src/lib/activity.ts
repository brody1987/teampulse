import { db } from "./db";
import { activityLog } from "./schema";

export async function logActivity(type: string, entityType: string, entityId: number | null, description: string) {
  await db.insert(activityLog).values({ type, entityType, entityId, description });
}
