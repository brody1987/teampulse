import { pgTable, serial, text, integer, real, boolean, timestamp, index, varchar } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#3B82F6"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  teamId: integer("team_id").references(() => teams.id),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_members_team_id").on(table.teamId),
]);

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content"),
  type: text("type", { enum: ["team", "collaboration", "individual"] }).notNull().default("team"),
  teamId: integer("team_id").references(() => teams.id),
  ownerId: integer("owner_id").references(() => members.id),
  status: text("status", { enum: ["active", "completed", "on_hold", "cancelled"] }).notNull().default("active"),
  isPinned: boolean("is_pinned").notNull().default(false),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_projects_team_id").on(table.teamId),
  index("idx_projects_status").on(table.status),
]);

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  memberId: integer("member_id").references(() => members.id).notNull(),
}, (table) => [
  index("idx_project_members_project_id").on(table.projectId),
  index("idx_project_members_member_id").on(table.memberId),
]);

export const projectMetrics = pgTable("project_metrics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  label: text("label").notNull(),
  value: real("value").notNull().default(0),
}, (table) => [
  index("idx_project_metrics_project_id").on(table.projectId),
]);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  assigneeId: integer("assignee_id").references(() => members.id),
  status: text("status", { enum: ["대기", "진행중", "검토중", "완료"] }).notNull().default("대기"),
  priority: text("priority", { enum: ["긴급", "높음", "보통", "낮음"] }).notNull().default("보통"),
  dueDate: text("due_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  completedAt: text("completed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tasks_project_id").on(table.projectId),
  index("idx_tasks_status").on(table.status),
  index("idx_tasks_assignee_id").on(table.assigneeId),
  index("idx_tasks_completed_at").on(table.completedAt),
  index("idx_tasks_project_status").on(table.projectId, table.status),
]);

export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  memberId: integer("member_id").references(() => members.id),
  quality: real("quality").notNull(),
  timeliness: real("timeliness").notNull(),
  creativity: real("creativity").notNull(),
  collaboration: real("collaboration").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_evaluations_member_id").on(table.memberId),
  index("idx_evaluations_task_id").on(table.taskId),
]);

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration").notNull().default(60),
  content: text("content").notNull(),
  color: text("color").notNull().default("#3B82F6"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_schedules_date").on(table.date),
]);

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_attachments_entity").on(table.entityType, table.entityId),
]);

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_activity_log_created_at").on(table.createdAt),
]);
