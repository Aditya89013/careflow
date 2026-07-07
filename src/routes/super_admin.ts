import { Router, Request, Response } from "express";
import { SqlHospitalRepository, mockDb } from "../db";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();

// 1. Get all hospitals (admin dashboard management)
router.get("/super-admin/hospitals", authMiddleware, requireRole(["super_admin"]), async (req: Request, res: Response) => {
  try {
    const repo = new SqlHospitalRepository("8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d");
    const hospitals = await repo.getHospitals();

    const results = [];
    for (const hospital of hospitals) {
      const hospitalRepo = new SqlHospitalRepository(hospital.id);
      const beds = await hospitalRepo.getBeds();
      const vents = await hospitalRepo.getVentilators();
      const staff = await hospitalRepo.getStaff();
      const patients = await hospitalRepo.getPatients();

      results.push({
        id: hospital.id,
        name: hospital.name,
        latitude: hospital.latitude || 28.6139,
        longitude: hospital.longitude || 77.2090,
        address: hospital.address,
        contact_phone: hospital.contact_phone,
        metrics: {
          total_beds: beds.length,
          occupied_beds: beds.filter(b => b.status === "occupied").length,
          total_ventilators: vents.length,
          in_use_ventilators: vents.filter(v => v.status === "in_use").length,
          total_staff: staff.length,
          total_patients: patients.length
        }
      });
    }

    return res.status(200).json({ hospitals: results });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to retrieve hospitals", details: err.message });
  }
});

// 2. Register a new hospital (optionally with an owner account)
router.post("/super-admin/hospitals", authMiddleware, requireRole(["super_admin"]), async (req: Request, res: Response) => {
  const { 
    name, address, contact_phone, latitude, longitude,
    owner_email, owner_password, owner_first_name, owner_last_name 
  } = req.body;

  if (!name || !address || !contact_phone) {
    return res.status(400).json({ error: "Missing required hospital fields (name, address, contact_phone)" });
  }

  try {
    const repo = new SqlHospitalRepository("8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d");
    
    // If owner details are provided, check email availability first
    if (owner_email) {
      const existing = await repo.getStaffByEmail(owner_email);
      if (existing) {
        return res.status(400).json({ error: `Owner email ${owner_email} is already registered` });
      }
      if (!owner_password || !owner_first_name || !owner_last_name) {
        return res.status(400).json({ error: "Missing required owner details (password, first name, last name)" });
      }
    }

    const hospitalId = `hosp-${Date.now()}`;
    const newHospital = await repo.addHospital({
      id: hospitalId,
      name,
      address,
      contact_phone,
      latitude: latitude ? Number(latitude) : 28.6139,
      longitude: longitude ? Number(longitude) : 77.2090
    });

    // Create default ER and ICU departments for the hospital
    const hospitalRepo = new SqlHospitalRepository(hospitalId);
    await hospitalRepo.createDefaultDepartments();

    // Create owner account if requested
    let newOwner = null;
    if (owner_email) {
      const ownerId = `s-owner-${Date.now()}`;
      newOwner = await hospitalRepo.addStaffMember({
        id: ownerId,
        auth_user_id: `user_owner_${Date.now()}`,
        first_name: owner_first_name,
        last_name: owner_last_name,
        role: "admin",
        specialty: "management",
        contact_number: contact_phone,
        email: owner_email,
        password_hash: owner_password
      });
    }

    return res.status(201).json({
      message: "Hospital registered successfully by Super Admin",
      hospital: newHospital,
      owner: newOwner ? {
        id: newOwner.id,
        email: newOwner.email,
        role: newOwner.role
      } : null
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to register hospital", details: err.message });
  }
});

export default router;
