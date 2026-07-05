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

// Set up server
const server = http.createServer(app);

// Mount WebSocket server
const wss = new WebSocketServer({ server });

// Map of hospital_id -> set of active WebSocket connections
const subscriptions = new Map<string, Set<WebSocket>>();

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

// Broadcast Helper to notify subscribed dashboards of real-time state changes
export function broadcastHospitalEvent(hospitalId: string, event: any) {
  const clients = subscriptions.get(hospitalId);
  if (clients) {
    const payload = JSON.stringify(event);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}

server.listen(port, () => {
  console.log(`CareFlow server is running on http://localhost:${port}`);
  console.log(`WebSockets gateway listening on ws://localhost:${port}`);
});

export { server };
