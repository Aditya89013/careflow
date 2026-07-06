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
import clinicalRouterRaw from "../src/routes/clinical";


const patientRouter = patientRouterRaw?.default || patientRouterRaw;
const shiftRouter = shiftRouterRaw?.default || shiftRouterRaw;
const publicRouter = publicRouterRaw?.default || publicRouterRaw;
const chatbotRouter = chatbotRouterRaw?.default || chatbotRouterRaw;
const authRouter = authRouterRaw?.default || authRouterRaw;
const clinicalRouter = clinicalRouterRaw?.default || clinicalRouterRaw;

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());


app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});


if (patientRouter) app.use("/api/v1", patientRouter);
if (shiftRouter) app.use("/api/v1", shiftRouter);
if (publicRouter) app.use("/api/v1", publicRouter);
if (chatbotRouter) app.use("/api/v1", chatbotRouter);
if (authRouter) app.use("/api/v1", authRouter);
if (clinicalRouter) app.use("/api/v1", clinicalRouter);


const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));


app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});


module.exports = app;
