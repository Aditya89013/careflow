import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";
import path from "path";

import patientRouterRaw from "../src/routes/patients";
import shiftRouterRaw from "../src/routes/shifts";
import publicRouterRaw from "../src/routes/public";
import chatbotRouterRaw from "../src/routes/chatbot";
import authRouterRaw from "../src/routes/auth";

const patientRouter = (patientRouterRaw as any).default || patientRouterRaw;
const shiftRouter = (shiftRouterRaw as any).default || shiftRouterRaw;
const publicRouter = (publicRouterRaw as any).default || publicRouterRaw;
const chatbotRouter = (chatbotRouterRaw as any).default || chatbotRouterRaw;
const authRouter = (authRouterRaw as any).default || authRouterRaw;

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Base healthcheck
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Register API routers
app.use("/api/v1", patientRouter);
app.use("/api/v1", shiftRouter);
app.use("/api/v1", publicRouter);
app.use("/api/v1", chatbotRouter);
app.use("/api/v1", authRouter);

// Serve built frontend static files
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// SPA catch-all: any non-API route serves index.html for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

// Export the Express app as a serverless function
export default app;
