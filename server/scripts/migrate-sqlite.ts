import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const sqliteDb = new Database("../data/teampulse.db");
const client = postgres(process.env.DATABASE_URL!);
const pg = drizzle(client);

async function migrate() {
  console.log("Reading SQLite data...");

  // Read all tables from SQLite
  const teams = sqliteDb.prepare("SELECT * FROM teams").all() as any[];
  const members = sqliteDb.prepare("SELECT * FROM members").all() as any[];
  const projects = sqliteDb.prepare("SELECT * FROM projects").all() as any[];
  const tasks = sqliteDb.prepare("SELECT * FROM tasks").all() as any[];
  const evaluations = sqliteDb.prepare("SELECT * FROM evaluations").all() as any[];
  const schedules = sqliteDb.prepare("SELECT * FROM schedules").all() as any[];
  const activityLog = sqliteDb.prepare("SELECT * FROM activity_log").all() as any[];

  let projectMembers: any[] = [];
  let projectMetrics: any[] = [];
  let attachments: any[] = [];
  try { projectMembers = sqliteDb.prepare("SELECT * FROM project_members").all() as any[]; } catch {}
  try { projectMetrics = sqliteDb.prepare("SELECT * FROM project_metrics").all() as any[]; } catch {}
  try { attachments = sqliteDb.prepare("SELECT * FROM attachments").all() as any[]; } catch {}

  console.log(`Teams: ${teams.length}, Members: ${members.length}, Projects: ${projects.length}, Tasks: ${tasks.length}`);
  console.log(`Evaluations: ${evaluations.length}, Schedules: ${schedules.length}, Activity: ${activityLog.length}`);
  console.log(`ProjectMembers: ${projectMembers.length}, ProjectMetrics: ${projectMetrics.length}, Attachments: ${attachments.length}`);

  // Insert into PostgreSQL with tp_ prefix tables
  // We need to maintain IDs, so use raw SQL with explicit id values

  // Reset sequences after insert
  const insertWithId = async (table: string, rows: any[]) => {
    if (rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const colNames = cols.map(c => `"${c}"`).join(", ");

    for (const row of rows) {
      const values = cols.map(c => row[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      await client.unsafe(`INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`, values);
    }

    // Reset sequence to max id
    const [{ max }] = await client.unsafe(`SELECT COALESCE(MAX(id), 0) as max FROM ${table}`);
    if (max > 0) {
      await client.unsafe(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${max})`);
    }
    console.log(`  ${table}: ${rows.length} rows inserted`);
  };

  // Fix SQLite timestamp values that contain literal default expressions
  const fixTimestamp = (val: any): any => {
    if (typeof val === "string") {
      // SQLite stores literal default like "(datetime('now'))" or "datetime('now')"
      if (val.includes("datetime(") || val.includes("CURRENT_TIMESTAMP")) {
        return new Date().toISOString();
      }
      // If it's already a valid date string, keep it
    }
    return val;
  };

  // Fix boolean values (SQLite stores 0/1, PostgreSQL expects true/false)
  const fixBoolean = (val: any): any => {
    if (val === 0) return false;
    if (val === 1) return true;
    return val;
  };

  // Map SQLite column names to PostgreSQL column names
  const timestampCols = new Set(["created_at", "completed_at"]);
  const booleanCols = new Set(["is_active", "is_pinned"]);

  const mapRow = (row: any, mapping: Record<string, string>) => {
    const result: any = {};
    for (const [from, to] of Object.entries(mapping)) {
      if (row[from] !== undefined) {
        let val = row[from];
        if (timestampCols.has(to)) val = fixTimestamp(val);
        if (booleanCols.has(to)) val = fixBoolean(val);
        result[to] = val;
      }
    }
    return result;
  };

  // Teams
  await insertWithId("tp_teams", teams.map(r => mapRow(r, {
    id: "id", name: "name", description: "description", color: "color", created_at: "created_at"
  })));

  // Members
  await insertWithId("tp_members", members.map(r => mapRow(r, {
    id: "id", name: "name", role: "role", team_id: "team_id", position: "position",
    email: "email", phone: "phone", is_active: "is_active", created_at: "created_at"
  })));

  // Projects
  await insertWithId("tp_projects", projects.map(r => mapRow(r, {
    id: "id", name: "name", description: "description", content: "content", type: "type",
    team_id: "team_id", owner_id: "owner_id", status: "status", is_pinned: "is_pinned",
    start_date: "start_date", end_date: "end_date", created_at: "created_at"
  })));

  // Project Members
  if (projectMembers.length > 0) {
    await insertWithId("tp_project_members", projectMembers.map(r => mapRow(r, {
      id: "id", project_id: "project_id", member_id: "member_id"
    })));
  }

  // Project Metrics
  if (projectMetrics.length > 0) {
    await insertWithId("tp_project_metrics", projectMetrics.map(r => mapRow(r, {
      id: "id", project_id: "project_id", label: "label", value: "value"
    })));
  }

  // Tasks
  await insertWithId("tp_tasks", tasks.map(r => mapRow(r, {
    id: "id", title: "title", description: "description", project_id: "project_id",
    assignee_id: "assignee_id", status: "status", priority: "priority", due_date: "due_date",
    sort_order: "sort_order", completed_at: "completed_at", created_at: "created_at"
  })));

  // Evaluations
  await insertWithId("tp_evaluations", evaluations.map(r => mapRow(r, {
    id: "id", task_id: "task_id", member_id: "member_id", quality: "quality",
    timeliness: "timeliness", creativity: "creativity", collaboration: "collaboration",
    comment: "comment", created_at: "created_at"
  })));

  // Schedules
  await insertWithId("tp_schedules", schedules.map(r => mapRow(r, {
    id: "id", date: "date", time: "time", duration: "duration",
    content: "content", color: "color", created_at: "created_at"
  })));

  // Attachments
  if (attachments.length > 0) {
    await insertWithId("tp_attachments", attachments.map(r => mapRow(r, {
      id: "id", entity_type: "entity_type", entity_id: "entity_id", file_name: "file_name",
      original_name: "original_name", file_size: "file_size", mime_type: "mime_type", created_at: "created_at"
    })));
  }

  // Activity Log
  await insertWithId("tp_activity_log", activityLog.map(r => mapRow(r, {
    id: "id", type: "type", entity_type: "entity_type", entity_id: "entity_id",
    description: "description", created_at: "created_at"
  })));

  console.log("\nMigration complete!");
  sqliteDb.close();
  await client.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
