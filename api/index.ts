import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Base healthcheck
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Static imports for routes so Vercel can trace/bundle dependencies correctly
import patientRouter from "../src/routes/patients";
import shiftRouter from "../src/routes/shifts";
import publicRouter from "../src/routes/public";
import chatbotRouter from "../src/routes/chatbot";
import authRouter from "../src/routes/auth";
import clinicalRouter from "../src/routes/clinical";
import emergencyRouter from "../src/routes/emergency";
import patientPortalRouter from "../src/routes/patient_portal";
import superAdminRouter from "../src/routes/super_admin";
import payrollRouter from "../src/routes/payroll";

// Normalize default export vs named router object
const getRouterObj = (r: any) => {
  if (!r) return null;
  return r.default || r.router || r;
};

const patientRouterObj = getRouterObj(patientRouter);
const shiftRouterObj = getRouterObj(shiftRouter);
const publicRouterObj = getRouterObj(publicRouter);
const chatbotRouterObj = getRouterObj(chatbotRouter);
const authRouterObj = getRouterObj(authRouter);
const clinicalRouterObj = getRouterObj(clinicalRouter);
const emergencyRouterObj = getRouterObj(emergencyRouter);
const patientPortalRouterObj = getRouterObj(patientPortalRouter);
const superAdminRouterObj = getRouterObj(superAdminRouter);
const payrollRouterObj = getRouterObj(payrollRouter);

// ✅ Register routes ONLY if they loaded successfully
if (patientRouterObj) app.use("/api/v1", patientRouterObj);
if (shiftRouterObj) app.use("/api/v1", shiftRouterObj);
if (publicRouterObj) app.use("/api/v1", publicRouterObj);
if (chatbotRouterObj) app.use("/api/v1", chatbotRouterObj);
if (authRouterObj) app.use("/api/v1", authRouterObj);
if (clinicalRouterObj) app.use("/api/v1", clinicalRouterObj);
if (emergencyRouterObj) app.use("/api/v1", emergencyRouterObj);
if (patientPortalRouterObj) app.use("/api/v1", patientPortalRouterObj);
if (superAdminRouterObj) app.use("/api/v1", superAdminRouterObj);
if (payrollRouterObj) app.use("/api/v1", payrollRouterObj);

// Serve built frontend static files
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// SPA catch-all: any non-API route serves index.html for React Router
app.get("*", (req, res) => {
  const filePath = path.join(frontendDist, "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("[ERROR] Failed to serve index.html from:", filePath, err);
      res.status(500).send(`
        <html>
          <head><title>CareFlow Load Error</title></head>
          <body style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto; color: #333;">
            <h2>CareFlow Portal Load Failure</h2>
            <p>The server failed to locate or load the frontend interface assets.</p>
            <p style="color: #666; font-size: 0.9rem;">Path searched: <code>${filePath}</code></p>
            <p style="color: red; font-size: 0.9rem;">Error: <code>${err.message}</code></p>
            <p>Please check your Vercel build status and ensure the frontend build ran correctly during deployment.</p>
          </body>
        </html>
      `);
    }
  });
});

// ✅ Export for Vercel Serverless Architecture
module.exports = app;
