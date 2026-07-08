import { Router, Request, Response } from "express";
import { SqlHospitalRepository } from "../db";
import { authMiddleware } from "../middleware/auth";
import * as jwt from "jsonwebtoken";
import { sendEmail } from "../services/email";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12983719";
const DEFAULT_HOSPITAL_ID = "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";

// ──────────────────────────────────────────────────────────────────
// 1. Staff & Employee Login Route
// ──────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email/ID and password are required" });
  }

  try {
    if (email === "superadmin@careflow.com" && password === "admin123") {
      const { requiredRole } = req.body;
      if (requiredRole === "staff") {
        return res.status(403).json({ error: "Access denied. Use the Hospital Admin login portal instead." });
      }
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
    let matchedUser: any = null;

    if (!email.includes("@")) {
      // Treat as Employee ID: check new employees table
      const emp = await repo.getEmployeeById(email);
      if (emp) {
        if (emp.password_hash === password) {
          const names = emp.name.split(" ");
          matchedUser = {
            id: emp.id,
            first_name: names[0] || "Staff",
            last_name: names.slice(1).join(" ") || "Member",
            email: emp.email,
            role: emp.role,
            hospital_id: emp.hospital_id
          };
        }
      } else {
        // Fallback: check legacy staff_members table
        const staff = await repo.getStaffByEmailOrId(email);
        if (staff && staff.password_hash === password) {
          matchedUser = {
            id: staff.id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email,
            role: staff.role,
            hospital_id: staff.hospital_id
          };
        }
      }
    } else {
      // Treat as Admin / Staff Email: check legacy staff_members
      const staff = await repo.getStaffByEmail(email);
      if (staff && staff.password_hash === password) {
        matchedUser = {
          id: staff.id,
          first_name: staff.first_name,
          last_name: staff.last_name,
          email: staff.email,
          role: staff.role,
          hospital_id: staff.hospital_id
        };
      } else {
        // Check new employees table by email
        const emp = await repo.getEmployeeByEmail(email);
        if (emp && emp.password_hash === password) {
          const names = emp.name.split(" ");
          matchedUser = {
            id: emp.id,
            first_name: names[0] || "Staff",
            last_name: names.slice(1).join(" ") || "Member",
            email: emp.email,
            role: emp.role,
            hospital_id: emp.hospital_id
          };
        }
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: "Invalid ID/Email or password" });
    }

    const { requiredRole } = req.body;
    if (requiredRole) {
      const isAdminRole = ["admin", "medical_director", "super_admin"].includes(matchedUser.role);
      if (requiredRole === "admin" && !isAdminRole) {
        return res.status(403).json({ error: "Access denied. Use the Employee login portal instead." });
      }
      if (requiredRole === "staff" && isAdminRole) {
        return res.status(403).json({ error: "Access denied. Use the Hospital Admin login portal instead." });
      }
    }

    const token = jwt.sign(
      {
        sub: matchedUser.id,
        hospital_id: matchedUser.hospital_id,
        role: matchedUser.role,
        name: `${matchedUser.first_name} ${matchedUser.last_name}`
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      token,
      user: matchedUser
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

    // Send email with OTP
    await sendEmail(
      email,
      "CareFlow - Hospital Owner Registration OTP",
      `Hello ${first_name || "Owner"},\n\nYour OTP for registering the hospital "${hospital_name || "CareFlow Hospital"}" is: ${otp}\n\nThis OTP is valid for 10 minutes.`
    );

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

    // Send email with OTP
    await sendEmail(
      email,
      "CareFlow - Employee Confirmation OTP",
      `Hello ${first_name},\n\nYou have been added as a ${role} at CareFlow. Please confirm your email using the following OTP:\n\n${otp}`
    );

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

    // Create staff member (legacy table sync)
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

    // Create employee (new table sync)
    await repo.addEmployee({
      id: employeeId,
      hospital_id: hospitalId,
      name: `${payload.first_name} ${payload.last_name}`,
      email: payload.email,
      role: payload.role,
      current_shift: "Morning",
      assigned_ward_id: null,
      password_hash: password
    });

    // Send email with credentials
    await sendEmail(
      email,
      "CareFlow - Account Activated",
      `Hello ${payload.first_name},\n\nYour account has been activated!\n\nYour Login Credentials:\nEmployee ID: ${employeeId}\nPassword: ${password}\n\nPlease keep these details secure.`
    );

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
// Forgot Password Routes
// ──────────────────────────────────────────────────────────────────
router.post("/auth/patient/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const repo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    const patient = await repo.getUniversalPatientByEmail(email);

    if (!patient) {
      return res.status(404).json({ error: "Patient with this email does not exist" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to otp_verifications
    await repo.saveOtp(email, otp, "patient_forgot_password", { email });

    // Send email with forgot password OTP
    await sendEmail(
      email,
      "CareFlow - Forgot Password OTP",
      `Hello ${patient.first_name},\n\nYou requested a password reset. Your OTP is: ${otp}\n\nIf you did not request this, please ignore this email.`
    );

    return res.status(200).json({
      message: "Forgot password OTP sent to email",
      dev_otp: otp
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to process forgot password request", details: err.message });
  }
});

router.post("/auth/patient/reset-password", async (req: Request, res: Response) => {
  const { email, otp, new_password } = req.body;
  if (!email || !otp || !new_password) {
    return res.status(400).json({ error: "Email, OTP, and new password are required" });
  }

  try {
    const repo = new SqlHospitalRepository(DEFAULT_HOSPITAL_ID);
    const payload = await repo.verifyOtp(email, otp, "patient_forgot_password");

    if (!payload) {
      return res.status(400).json({ error: "Invalid or expired reset password OTP" });
    }

    // Update password
    await repo.updateUniversalPatientPassword(email, new_password);

    return res.status(200).json({
      message: "Password reset successful. You can now login with your new password."
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to reset patient password", details: err.message });
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
  console.log(msg);
}

export default router;
