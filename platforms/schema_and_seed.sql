-- CareFlow PostgreSQL Database Schema & Clinical Data Seeds
-- For Supabase Cloud Deployment

-- =========================================================================
-- Part 0: Cleanup (Idempotent execution)
-- =========================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS shift_histories CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS staff_members CASCADE;
DROP TABLE IF EXISTS ventilators CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS universal_patients CASCADE;

DROP TYPE IF EXISTS bed_status CASCADE;
DROP TYPE IF EXISTS bed_type CASCADE;
DROP TYPE IF EXISTS ventilator_status CASCADE;
DROP TYPE IF EXISTS ventilator_type CASCADE;
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS staff_specialty CASCADE;
DROP TYPE IF EXISTS triage_level CASCADE;
DROP TYPE IF EXISTS patient_status CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;
DROP TYPE IF EXISTS shift_status CASCADE;
DROP TYPE IF EXISTS inventory_category CASCADE;

-- =========================================================================
-- Part 1: Schema Definitions
-- =========================================================================

-- Enums
CREATE TYPE bed_status AS ENUM ('free', 'occupied', 'cleaning', 'maintenance');
CREATE TYPE bed_type AS ENUM ('general', 'ICU', 'HDU', 'isolation');
CREATE TYPE ventilator_status AS ENUM ('available', 'in_use', 'maintenance');
CREATE TYPE ventilator_type AS ENUM ('invasive', 'non_invasive');
CREATE TYPE staff_role AS ENUM ('admin', 'receptionist', 'doctor', 'nurse', 'ward_boy', 'lab_tech', 'pharmacist', 'medical_director', 'dept_head', 'staff');
CREATE TYPE staff_specialty AS ENUM ('doctor', 'nurse', 'support');
CREATE TYPE triage_level AS ENUM ('1_resuscitation', '2_emergent', '3_urgent', '4_less_urgent', '5_non_urgent');
CREATE TYPE patient_status AS ENUM ('waiting', 'allocated', 'discharged', 'admitted');
CREATE TYPE shift_type AS ENUM ('day', 'evening', 'night', 'on_call');
CREATE TYPE shift_status AS ENUM ('scheduled', 'swapped', 'completed', 'cancelled');
CREATE TYPE inventory_category AS ENUM ('pharmaceutical', 'equipment', 'consumable');

-- 1. Hospitals (Tenants)
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    address TEXT NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_hospital UNIQUE(hospital_id, code)
);

-- 3. Beds
CREATE TABLE beds (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    status bed_status NOT NULL DEFAULT 'free',
    type bed_type NOT NULL DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_bed_number UNIQUE(department_id, bed_number)
);

-- 4. Ventilators
CREATE TABLE ventilators (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    status ventilator_status NOT NULL DEFAULT 'available',
    type ventilator_type NOT NULL DEFAULT 'invasive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vent_serial UNIQUE(hospital_id, serial_number)
);

-- 5. Staff Members
CREATE TABLE staff_members (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    auth_user_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role staff_role NOT NULL DEFAULT 'staff',
    specialty staff_specialty NOT NULL,
    contact_number VARCHAR(50),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Universal Cross-Hospital Registry
CREATE TABLE universal_patients (
    upid VARCHAR(50) PRIMARY KEY,
    pin_hash VARCHAR(255) NOT NULL,
    account_active BOOLEAN DEFAULT TRUE,
    admitted_hospital_id UUID NULL REFERENCES hospitals(id) ON DELETE SET NULL,
    admitted_at TIMESTAMP WITH TIME ZONE NULL,
    discharged_at TIMESTAMP WITH TIME ZONE NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(20) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_phone VARCHAR(50) NOT NULL,
    allergies JSONB,
    chronic_conditions JSONB,
    current_medications JSONB,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    admission_history JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Patients
CREATE TABLE patients (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    upid VARCHAR(50) REFERENCES universal_patients(upid) ON DELETE SET NULL,
    first_name VARCHAR(100), 
    last_name VARCHAR(100),  
    date_of_birth DATE,      
    triage_level triage_level NOT NULL,
    required_department_code VARCHAR(20) NOT NULL,
    needs_ventilator BOOLEAN DEFAULT FALSE,
    status patient_status NOT NULL DEFAULT 'waiting',
    vitals JSONB,
    admitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    discharged_at TIMESTAMP WITH TIME ZONE
);

-- 8. Allocations
CREATE TABLE allocations (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id VARCHAR(255) UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_id VARCHAR(255) REFERENCES beds(id) ON DELETE SET NULL,
    ventilator_id VARCHAR(255) REFERENCES ventilators(id) ON DELETE SET NULL,
    primary_doctor_id VARCHAR(255) REFERENCES staff_members(id) ON DELETE SET NULL,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    allocated_by VARCHAR(50) NOT NULL,
    is_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    CONSTRAINT chk_override_reason CHECK (is_override = FALSE OR override_reason IS NOT NULL)
);

-- 9. Shifts
CREATE TABLE shifts (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    staff_member_id VARCHAR(255) NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    type shift_type NOT NULL,
    status shift_status NOT NULL DEFAULT 'scheduled',
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Shift History
CREATE TABLE shift_histories (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    staff_member_id VARCHAR(255) NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    shift_id VARCHAR(255) REFERENCES shifts(id) ON DELETE SET NULL,
    worked_date DATE NOT NULL,
    type shift_type NOT NULL,
    hours_worked DECIMAL(4, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Inventory Items
CREATE TABLE inventory_items (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category inventory_category NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    last_restocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit Logs
CREATE TABLE audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    actor_id VARCHAR(255) REFERENCES staff_members(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, 
    entity_name VARCHAR(100) NOT NULL, 
    entity_id VARCHAR(255) NOT NULL,
    payload_before JSONB,
    payload_after JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_beds_lookup ON beds (hospital_id, department_id, status);
CREATE INDEX idx_vents_lookup ON ventilators (hospital_id, department_id, status);
CREATE INDEX idx_staff_active ON staff_members (hospital_id, department_id, is_active);
CREATE INDEX idx_shifts_date ON shifts (hospital_id, shift_date, status);
CREATE INDEX idx_hospitals_geom ON hospitals (latitude, longitude);

-- Row-Level Security (RLS) Configuration

-- Helper Function for current tenant
CREATE OR REPLACE FUNCTION get_current_hospital_id()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_hospital_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Enable RLS on core operational tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventilators ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS Policies matching hospital_id
CREATE POLICY dept_isolation ON departments FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY bed_isolation ON beds FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY vent_isolation ON ventilators FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY staff_isolation ON staff_members FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY patient_isolation ON patients FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY allocation_isolation ON allocations FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY shift_isolation ON shifts FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY shift_hist_isolation ON shift_histories FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY inventory_isolation ON inventory_items FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());
CREATE POLICY audit_isolation ON audit_logs FOR ALL USING (hospital_id = get_current_hospital_id()) WITH CHECK (hospital_id = get_current_hospital_id());


-- =========================================================================
-- Part 2: Seed Configurations
-- =========================================================================

-- 1. Seed Hospitals
INSERT INTO hospitals (id, name, latitude, longitude, address, contact_phone)
VALUES 
('8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'AIIMS New Delhi Regional Complex', 28.567200, 77.210000, 'Ansari Nagar, New Delhi, Delhi 110029', '011-26588500'),
('1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', 'Max Super Speciality Hospital, Saket', 28.527600, 77.211400, 'Press Enclave Rd, Saket, New Delhi, Delhi 110017', '011-26515050');

-- 2. Seed Departments
INSERT INTO departments (id, hospital_id, name, code)
VALUES
('d2d2d2d2-e3e3-f4f4-0505-161616161616', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Intensive Care Unit', 'ICU'),
('e1e1e1e1-e2e2-e3e3-e4e4-e5e5e5e5e5e5', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Emergency Room', 'ER');

-- 3. Seed Beds
INSERT INTO beds (id, hospital_id, department_id, bed_number, status, type)
VALUES
('b1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'ICU-01', 'free', 'ICU'),
('b2', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'ICU-02', 'free', 'ICU'),
('b3', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'ICU-03', 'occupied', 'ICU'),
('b4', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'e1e1e1e1-e2e2-e3e3-e4e4-e5e5e5e5e5e5', 'ER-01', 'free', 'general');

-- 4. Seed Ventilators
INSERT INTO ventilators (id, hospital_id, department_id, serial_number, status, type)
VALUES
('v1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'VNT-4048', 'available', 'invasive'),
('v2', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'VNT-9080', 'in_use', 'invasive');

-- 5. Seed Staff Members
INSERT INTO staff_members (id, hospital_id, department_id, auth_user_id, first_name, last_name, role, specialty, contact_number, email, password_hash, is_active)
VALUES
('s1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_smith', 'Sarah', 'Smith', 'dept_head', 'doctor', '555-1234', 'sarah@careflow.com', 'password123', true),
('s2', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_connor', 'John', 'Connor', 'staff', 'nurse', '555-5678', 'john@careflow.com', 'password123', true),
('s-receptionist', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_receptionist', 'Rita', 'Receptionist', 'receptionist', 'support', '555-0001', 'receptionist@careflow.com', 'password123', true),
('s-doctor', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_doctor', 'Dr. Rajesh', 'Kumar', 'doctor', 'doctor', '555-0002', 'doctor@careflow.com', 'password123', true),
('s-nurse', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_nurse', 'Priyanka', 'Sharma', 'nurse', 'nurse', '555-0003', 'nurse@careflow.com', 'password123', true),
('s-wardboy', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_wardboy', 'Wayne', 'Wardboy', 'ward_boy', 'support', '555-0004', 'wardboy@careflow.com', 'password123', true),
('s-labtech', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_labtech', 'Luke', 'Labtech', 'lab_tech', 'support', '555-0005', 'labtech@careflow.com', 'password123', true),
('s-pharmacist', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_pharmacist', 'Phil', 'Pharmacist', 'pharmacist', 'support', '555-0006', 'pharmacist@careflow.com', 'password123', true),
('s-md', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_md', 'Dr. Arthur', 'Director', 'medical_director', 'doctor', '555-0007', 'md@careflow.com', 'password123', true),
('s-admin', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'd2d2d2d2-e3e3-f4f4-0505-161616161616', 'user_admin', 'Adam', 'Admin', 'admin', 'support', '555-0008', 'admin@careflow.com', 'password123', true);

-- 6. Seed Universal Patients
INSERT INTO universal_patients (upid, pin_hash, account_active, admitted_hospital_id, admitted_at, first_name, last_name, date_of_birth, gender, blood_group, phone, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions, current_medications, insurance_provider, insurance_policy_number, admission_history)
VALUES
('CF-2026-MOCKPT', '123456', true, '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', NOW() - INTERVAL '24 hours', 'Sarah', 'Connor', '1985-11-10', 'Female', 'A_negative', '555-0987', 'John Connor', '555-5678', '["Sulfa Drugs", "Penicillin"]'::jsonb, '["Asthma"]'::jsonb, '["Albuterol Inhaler"]'::jsonb, 'SarahCare', 'SC-99901', '[{"id": "adm-mock-1", "hospital_id": "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", "hospital_name": "AIIMS New Delhi", "admitted_at": "2026-07-04T15:00:00Z", "treating_physician": "Dr. Rajesh Kumar"}]'::jsonb);

-- 7. Seed Patients
INSERT INTO patients (id, hospital_id, upid, first_name, last_name, date_of_birth, triage_level, required_department_code, needs_ventilator, status, vitals, admitted_at)
VALUES
('p-mock-1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'CF-2026-MOCKPT', 'Sarah', 'Connor', '1985-11-10', '2_emergent', 'ICU', false, 'admitted', '{"hr": "82", "bp": "118/75", "o2": "97%", "oxygenation_source": "SpO2", "is_delirious": false}'::jsonb, NOW() - INTERVAL '24 hours');

-- 8. Seed Allocations
INSERT INTO allocations (id, hospital_id, patient_id, bed_id, primary_doctor_id, allocated_by, is_override, override_reason, allocated_at)
VALUES
('a-mock-1', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'p-mock-1', 'b3', 's-doctor', 's-admin', false, null, NOW() - INTERVAL '24 hours');

-- 9. Seed Inventory Items
INSERT INTO inventory_items (id, hospital_id, name, category, quantity_available, min_threshold, unit)
VALUES
('inv-1-aiims', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'Propofol', 'pharmaceutical', 100, 20, 'vials'),
('inv-2-aiims', '8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'PPE Kits', 'consumable', 15, 50, 'boxes');
