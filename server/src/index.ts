import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";

import teamsRouter from "./routes/teams";
import membersRouter from "./routes/members";
import projectsRouter from "./routes/projects";
import tasksRouter from "./routes/tasks";
import evaluationsRouter from "./routes/evaluations";
import schedulesRouter from "./routes/schedules";
import attachmentsRouter from "./routes/attachments";
import activityRouter from "./routes/activity";
import dashboardRouter from "./routes/dashboard";

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({
  origin: corsOrigin.startsWith("http") ? corsOrigin : `https://${corsOrigin}`,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/teams", teamsRouter);
app.use("/api/members", membersRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/evaluations", evaluationsRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/activity", activityRouter);
app.use("/api/dashboard", dashboardRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message, err.cause || "");
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`TeamPulse API server running on port ${PORT}`);
});
