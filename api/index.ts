import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";

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

// Register routers
console.log("patientRouter type:", typeof patientRouter, patientRouter ? Object.keys(patientRouter) : null);
console.log("shiftRouter type:", typeof shiftRouter, shiftRouter ? Object.keys(shiftRouter) : null);
console.log("publicRouter type:", typeof publicRouter, publicRouter ? Object.keys(publicRouter) : null);
console.log("chatbotRouter type:", typeof chatbotRouter, chatbotRouter ? Object.keys(chatbotRouter) : null);
console.log("authRouter type:", typeof authRouter, authRouter ? Object.keys(authRouter) : null);

app.use("/api/v1", patientRouter);
app.use("/api/v1", shiftRouter);
app.use("/api/v1", publicRouter);
app.use("/api/v1", chatbotRouter);
app.use("/api/v1", authRouter);

// Export the Express app as a serverless function
export default app;
