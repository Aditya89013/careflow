import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";

import patientRouter from "../src/routes/patients";
import shiftRouter from "../src/routes/shifts";
import publicRouter from "../src/routes/public";
import chatbotRouter from "../src/routes/chatbot";
import authRouter from "../src/routes/auth";

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Base healthcheck
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Register routers
app.use("/api/v1", patientRouter);
app.use("/api/v1", shiftRouter);
app.use("/api/v1", publicRouter);
app.use("/api/v1", chatbotRouter);
app.use("/api/v1", authRouter);

// Export the Express app as a serverless function
export default app;
