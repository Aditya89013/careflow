import { Router, Request, Response } from "express";
import { SqlHospitalRepository, mockDb } from "../db";
import { authMiddleware } from "../middleware/auth";
import * as jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12983719";

// Staff Login Route
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const staffMember = mockDb.staff_members.find(
      s => s.email?.toLowerCase() === email.toLowerCase() && s.password_hash === password
    );

    if (!staffMember) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        sub: staffMember.id,
        hospital_id: staffMember.hospital_id,
        role: staffMember.role,
        name: `${staffMember.first_name} ${staffMember.last_name}`
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      token,
      user: {
        id: staffMember.id,
        first_name: staffMember.first_name,
        last_name: staffMember.last_name,
        email: staffMember.email,
        role: staffMember.role,
        hospital_id: staffMember.hospital_id
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error during login" });
  }
});

// Patient Portal Login Route
router.post("/auth/patient-login", async (req: Request, res: Response) => {
  const { upid, pin } = req.body;
  if (!upid || !pin) {
    return res.status(400).json({ error: "UPID and PIN are required" });
  }

  try {
    const patient = mockDb.universal_patients.find(
      p => p.upid.toUpperCase() === upid.toUpperCase()
    );

    if (!patient) {
      return res.status(401).json({ error: "Invalid UPID or PIN" });
    }

    if (patient.pin_hash !== pin) {
      return res.status(401).json({ error: "Invalid UPID or PIN" });
    }

    const token = jwt.sign(
      {
        sub: patient.upid,
        hospital_id: patient.admitted_hospital_id || "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
        role: "patient",
        name: `${patient.first_name} ${patient.last_name}`,
        upid: patient.upid
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      token,
      user: {
        id: patient.upid,
        upid: patient.upid,
        first_name: patient.first_name,
        last_name: patient.last_name,
        role: "patient",
        hospital_id: patient.admitted_hospital_id
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error during patient login" });
  }
});

// Get Current User Profile
router.get("/auth/me", authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.status(200).json({ user: req.user });
});

export default router;
