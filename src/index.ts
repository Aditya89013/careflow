import express from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";

import patientRouter from "./routes/patients";
import shiftRouter from "./routes/shifts";
import publicRouter from "./routes/public";
import chatbotRouter from "./routes/chatbot";
import authRouter from "./routes/auth";
import clinicalRouter from "./routes/clinical";
import emergencyRouter from "./routes/emergency";
import patientPortalRouter from "./routes/patient_portal";
import superAdminRouter from "./routes/super_admin";
import { subscriptions } from "./ws_events";
import { seedDatabase } from "./db";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS and JSON body parser
app.use(cors());
app.use(bodyParser.json());

// Base healthcheck
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Register routers
app.use("/api/v1", patientRouter);
app.use("/api/v1", shiftRouter);
app.use("/api/v1", publicRouter);
app.use("/api/v1", chatbotRouter);
app.use("/api/v1", authRouter);
app.use("/api/v1", clinicalRouter);
app.use("/api/v1", emergencyRouter);
app.use("/api/v1", patientPortalRouter);
app.use("/api/v1", superAdminRouter);

// Set up server
const server = http.createServer(app);

// Mount WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  console.log("WebSocket client connected");

  ws.on("message", (message: string) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "subscribe" && data.hospitalId) {
        if (!subscriptions.has(data.hospitalId)) {
          subscriptions.set(data.hospitalId, new Set());
        }
        subscriptions.get(data.hospitalId)!.add(ws);
        ws.send(JSON.stringify({ status: "subscribed", hospitalId: data.hospitalId }));
        console.log(`WebSocket client subscribed to hospital: ${data.hospitalId}`);
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: "Invalid WebSocket message payload" }));
    }
  });

  ws.on("close", () => {
    // Clean up subscriptions
    for (const [hospitalId, clients] of subscriptions.entries()) {
      if (clients.has(ws)) {
        clients.delete(ws);
        if (clients.size === 0) {
          subscriptions.delete(hospitalId);
        }
      }
    }
    console.log("WebSocket client disconnected");
  });
});

server.listen(port, async () => {
  console.log(`CareFlow server is running on http://localhost:${port}`);
  console.log(`WebSockets gateway listening on ws://localhost:${port}`);
  try {
    await seedDatabase();
  } catch (err) {
    console.error("Database seeding failed on startup:", err);
  }
});

export { server };
