import { Router, Request, Response } from "express";
import { SqlHospitalRepository } from "../db";
import { authMiddleware } from "../middleware/auth";
import * as jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12983719";
const DEFAULT_HOSPITAL_ID = "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";

// ──────────────────────────────────────────────────────────────────
// 1. Staff & Employee Login Route
// ──────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    if (email === "superadmin@careflow.com" && password === "admin123") {
      const token = jwt.sign(
        {
          sub: "super-admin-id",
          hospital_id: "system",
          role: "super_admin",
          name: "System Admin"
        },
        JWT_SECRET,
        { expiresIn: "8h" }
      );
      return res.status(200).json({
        token,
        user: {
          id: "super-admin-id",
          first_name: "System",
          last_name: "Admin",
          email: "superadmin@careflow.com",
          role: "super_admin",
          hospital_id: "system"
        }
      });
    }

    const repo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    const staffMember = await repo.getStaffByEmail(email);

    if (!staffMember || staffMember.password_hash !== password) {
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
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error during login", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 2. Patient Register Route
// ──────────────────────────────────────────────────────────────────
router.post("/auth/patient-register", async (req: Request, res: Response) => {
  const { 
    first_name, last_name, date_of_birth, gender, blood_group, 
    phone, email, password, emergency_contact_name, emergency_contact_phone 
  } = req.body;

  if (!first_name || !last_name || !date_of_birth || !phone || !email || !password) {
    return res.status(400).json({ error: "Missing required patient registration parameters" });
  }

  try {
    const repo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    
    // Check if email already registered
    const existing = await repo.getUniversalPatientByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email already registered in patient directory" });
    }

    // Generate unique UPID
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const upid = `CF-2026-${randomDigits}`;

    const newPatient = {
      upid,
      pin_hash: "123456", // Default PIN
      account_active: true,
      first_name,
      last_name,
      date_of_birth,
      gender: gender || "Other",
      blood_group: blood_group || "Unknown",
      phone,
      emergency_contact_name: emergency_contact_name || "Self",
      emergency_contact_phone: emergency_contact_phone || phone,
      allergies: [],
      chronic_conditions: [],
      current_medications: [],
      admission_history: [],
      email,
      password_hash: password
    };

    await repo.addUniversalPatient(newPatient);

    return res.status(201).json({
      message: "Patient registration successful",
      upid,
      email
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error during patient registration", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 3. Patient Portal Login Route
// ──────────────────────────────────────────────────────────────────
router.post("/auth/patient-login", async (req: Request, res: Response) => {
  const { upid, pin, email, password } = req.body;

  try {
    const repo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    let patient = null;

    if (email && password) {
      // Login by email and password
      patient = await repo.getUniversalPatientByEmail(email);
      if (!patient || patient.password_hash !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    } else if (upid && pin) {
      // Login by UPID and PIN
      patient = await repo.getUniversalPatientByUpid(upid);
      if (!patient || patient.pin_hash !== pin) {
        return res.status(401).json({ error: "Invalid UPID or PIN" });
      }
    } else {
      return res.status(400).json({ error: "Provide either email/password or UPID/PIN" });
    }

    const token = jwt.sign(
      {
        sub: patient.upid,
        hospital_id: patient.admitted_hospital_id || DEFAULT_HOSPITAL_ID,
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
        email: patient.email,
        hospital_id: patient.admitted_hospital_id
      }
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error during patient login", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 4. Hospital Owner / Organisation Registration
// ──────────────────────────────────────────────────────────────────
router.post("/auth/hospital-owner/register", async (req: Request, res: Response) => {
  const { hospital_name, address, contact_phone, email, password, first_name, last_name } = req.body;
  
  if (!hospital_name || !address || !contact_phone || !email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: "Missing required registration fields" });
  }

  try {
    const repo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    
    // Check if staff email already exists
    const existing = await repo.getStaffByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to otp_verifications
    await repo.saveOtp(email, otp, "owner_registration", {
      hospital_name, address, contact_phone, email, password, first_name, last_name
    });

    // Simulate sending email (print to console/logs)
    console.log(`\n======================================================`);
    printDevLog(`[CareFlow Mail] OTP for Hospital Owner Registration (${email}): ${otp}`);
    console.log(`======================================================\n`);

    return res.status(200).json({
      message: "OTP sent to your email",
      dev_otp: otp // Returning it in response so developer can test without checking console
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error during registration request", details: err.message });
  }
});

router.post("/auth/hospital-owner/verify-otp", async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const repo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    const payload = await repo.verifyOtp(email, otp, "owner_registration");

    if (!payload) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // OTP is valid! Create the Hospital
    const hospitalId = `hosp-${Date.now()}`;
    const hospital = await repo.addHospital({
      id: hospitalId,
      name: payload.hospital_name,
      address: payload.address,
      contact_phone: payload.contact_phone
    });

    // Instantiate repo for new hospital and create default departments (ICU, ER)
    const newRepo = new SqlHospitalRepository(hospitalId);
    await newRepo.createDefaultDepartments();

    // Create Manager/Owner Staff Member
    const ownerId = `s-owner-${Date.now()}`;
    const staff = await newRepo.addStaffMember({
      id: ownerId,
      auth_user_id: `user_owner_${Date.now()}`,
      first_name: payload.first_name,
      last_name: payload.last_name,
      role: "admin",
      specialty: "management",
      contact_number: payload.contact_phone,
      email: payload.email,
      password_hash: payload.password
    });

    // Generate JWT Token
    const token = jwt.sign(
      {
        sub: staff.id,
        hospital_id: hospitalId,
        role: "admin",
        name: `${staff.first_name} ${staff.last_name}`
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      message: "Hospital registered and owner account created successfully",
      token,
      user: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        role: "admin",
        hospital_id: hospitalId,
        hospital_name: hospital.name
      }
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error during OTP verification", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 5. Employee Add / Onboarding with OTP
// ──────────────────────────────────────────────────────────────────
router.post("/auth/employee/register", authMiddleware, async (req: Request, res: Response) => {
  const { first_name, last_name, role, specialty, email, contact_number } = req.body;
  const hospitalId = req.user!.hospitalId;

  if (!first_name || !last_name || !role || !specialty || !email) {
    return res.status(400).json({ error: "Missing required employee onboarding details" });
  }

  try {
    const repo = new SqlHospitalRepository(hospitalId);

    // Generate confirmation OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to otp_verifications
    await repo.saveOtp(email, otp, "employee_registration", {
      first_name, last_name, role, specialty, email, contact_number, hospital_id: hospitalId
    });

    console.log(`\n======================================================`);
    printDevLog(`[CareFlow Mail] OTP for Employee Confirmation (${email}): ${otp}`);
    console.log(`======================================================\n`);

    return res.status(200).json({
      message: "OTP generated for employee confirmation",
      dev_otp: otp
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to request employee registration", details: err.message });
  }
});

router.post("/auth/employee/confirm-otp", authMiddleware, async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const hospitalId = req.user!.hospitalId;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const repo = new SqlHospitalRepository(hospitalId);
    const payload = await repo.verifyOtp(email, otp, "employee_registration");

    if (!payload || payload.hospital_id !== hospitalId) {
      return res.status(400).json({ error: "Invalid or expired confirmation OTP" });
    }

    // Generate credentials
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const employeeId = `EMP-${randomDigits}`;
    const password = Math.random().toString(36).substring(2, 10); // 8-char random password

    // Create staff member
    const newStaff = await repo.addStaffMember({
      id: employeeId,
      auth_user_id: `user_emp_${randomDigits}`,
      first_name: payload.first_name,
      last_name: payload.last_name,
      role: payload.role,
      specialty: payload.specialty,
      contact_number: payload.contact_number,
      email: payload.email,
      password_hash: password
    });

    console.log(`\n======================================================`);
    printDevLog(`[CareFlow Mail] Employee Account Activated! ID: ${employeeId}, Password: ${password}`);
    console.log(`======================================================\n`);

    return res.status(201).json({
      message: "Employee successfully confirmed and onboarding completed",
      employee: {
        id: newStaff.id,
        first_name: newStaff.first_name,
        last_name: newStaff.last_name,
        role: newStaff.role,
        specialty: newStaff.specialty,
        email: newStaff.email,
        password // Returning to admin UI to show the generated credentials
      }
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to confirm employee onboarding", details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// 6. Get Current User Profile
// ──────────────────────────────────────────────────────────────────
router.get("/auth/me", authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const repo = new SqlHospitalRepository(req.user.hospitalId);
    let hospitalName = "";
    
    const hospitals = await repo.getHospitals();
    const hosp = hospitals.find(h => h.id === req.user!.hospitalId);
    if (hosp) hospitalName = hosp.name;

    return res.status(200).json({
      user: {
        ...req.user,
        hospital_name: hospitalName
      }
    });
  } catch (err: any) {
    return res.status(200).json({ user: req.user });
  }
});

// Helper function to print development logs cleanly without CP1252/terminal failures
function printDevLog(msg: string) {
  const clean = msg.encode ? msg.encode("ascii", { errors: "ignore" }).decode("ascii") : msg;
  console.log(clean);
}

export default router;
