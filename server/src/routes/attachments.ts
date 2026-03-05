import { Router } from "express";
import { db } from "../lib/db";
import { attachments } from "../lib/schema";
import { and, eq } from "drizzle-orm";
import { supabase, BUCKET_NAME } from "../lib/supabase";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// GET /api/attachments
router.get("/", async (req, res) => {
  const entityType = req.query.entityType as string | undefined;
  const entityId = req.query.entityId as string | undefined;

  if (!entityType || !entityId) {
    return res.json([]);
  }

  const result = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, parseInt(entityId))));

  res.json(result);
});

// POST /api/attachments
router.post("/", upload.array("files"), async (req, res) => {
  const entityType = req.body.entityType as string;
  const entityId = parseInt(req.body.entityId as string);
  const files = req.files as Express.Multer.File[];

  if (!entityType || !entityId || !files || files.length === 0) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const results = [];

  for (const file of files) {
    // Fix multer latin1 encoding for non-ASCII filenames (e.g. Korean)
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const ext = path.extname(originalName);
    const fileName = `${randomUUID()}${ext}`;
    const storagePath = `${entityType}/${entityId}/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype || "application/octet-stream",
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ error: "File upload failed" });
    }

    const [record] = await db
      .insert(attachments)
      .values({
        entityType,
        entityId,
        fileName: storagePath,
        originalName,
        fileSize: file.size,
        mimeType: file.mimetype || "application/octet-stream",
      })
      .returning();

    results.push(record);
  }

  res.status(201).json(results);
});

// GET /api/attachments/:id (download)
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!attachment) return res.status(404).json({ error: "Not found" });

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(attachment.fileName);

  if (error || !data) {
    return res.status(404).json({ error: "File not found" });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
  res.send(buffer);
});

// DELETE /api/attachments/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!attachment) return res.status(404).json({ error: "Not found" });

  await supabase.storage.from(BUCKET_NAME).remove([attachment.fileName]);
  await db.delete(attachments).where(eq(attachments.id, id));
  res.json({ success: true });
});

export default router;
