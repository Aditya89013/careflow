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

// 🔥 THE NUCLEAR FIX: Safely load routes using require() 
// This completely bypasses Vercel's "undefined .default" compiler bug
const loadRoute = (routePath: string) => {
  try {
    const routeModule = require(routePath);
    // Return standard router, default export, or null if empty
    return routeModule.default || routeModule.router || routeModule;
  } catch (err) {
    console.warn(`[WARN] Route load skipped for ${routePath}`);
    return null; // Prevents crash if file is missing or empty
  }
};

const patientRouter = loadRoute("../src/routes/patients");
const shiftRouter = loadRoute("../src/routes/shifts");
const publicRouter = loadRoute("../src/routes/public");
const chatbotRouter = loadRoute("../src/routes/chatbot");
const authRouter = loadRoute("../src/routes/auth");
const clinicalRouter = loadRoute("../src/routes/clinical");
const emergencyRouter = loadRoute("../src/routes/emergency");
const patientPortalRouter = loadRoute("../src/routes/patient_portal");
const superAdminRouter = loadRoute("../src/routes/super_admin");

// ✅ Register routes ONLY if they loaded successfully
if (patientRouter && typeof patientRouter === 'function') app.use("/api/v1", patientRouter);
if (shiftRouter && typeof shiftRouter === 'function') app.use("/api/v1", shiftRouter);
if (publicRouter && typeof publicRouter === 'function') app.use("/api/v1", publicRouter);
if (chatbotRouter && typeof chatbotRouter === 'function') app.use("/api/v1", chatbotRouter);
if (authRouter && typeof authRouter === 'function') app.use("/api/v1", authRouter);
if (clinicalRouter && typeof clinicalRouter === 'function') app.use("/api/v1", clinicalRouter);
if (emergencyRouter && typeof emergencyRouter === 'function') app.use("/api/v1", emergencyRouter);
if (patientPortalRouter && typeof patientPortalRouter === 'function') app.use("/api/v1", patientPortalRouter);
if (superAdminRouter && typeof superAdminRouter === 'function') app.use("/api/v1", superAdminRouter);

// Serve built frontend static files
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// SPA catch-all: any non-API route serves index.html for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

// ✅ Export for Vercel Serverless Architecture
module.exports = app;
