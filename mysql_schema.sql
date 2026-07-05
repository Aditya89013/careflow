-- CareFlow MySQL Database Schema

-- 1. Hospitals (Tenants)
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    address TEXT NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    UNIQUE KEY uq_dept_hospital (hospital_id, code)
);

-- 3. Beds
CREATE TABLE IF NOT EXISTS beds (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    bed_number VARCHAR(50) NOT NULL,
    status ENUM('free', 'occupied', 'cleaning', 'maintenance') NOT NULL DEFAULT 'free',
    type ENUM('general', 'ICU', 'HDU', 'isolation') NOT NULL DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY uq_bed_number (department_id, bed_number)
);

-- 4. Ventilators
CREATE TABLE IF NOT EXISTS ventilators (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    status ENUM('available', 'in_use', 'maintenance') NOT NULL DEFAULT 'available',
    type ENUM('invasive', 'non_invasive') NOT NULL DEFAULT 'invasive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY uq_vent_serial (hospital_id, serial_number)
);

-- 5. Staff Members
CREATE TABLE IF NOT EXISTS staff_members (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36),
    auth_user_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'receptionist', 'doctor', 'nurse', 'ward_boy', 'lab_tech', 'pharmacist', 'medical_director', 'dept_head', 'staff') NOT NULL DEFAULT 'staff',
    specialty ENUM('doctor', 'nurse', 'support') NOT NULL,
    contact_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 6. Patients
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    upid VARCHAR(50),
    first_name VARCHAR(100), 
    last_name VARCHAR(100),  
    date_of_birth DATE,      
    triage_level ENUM('1_resuscitation', '2_emergent', '3_urgent', '4_less_urgent', '5_non_urgent') NOT NULL,
    required_department_code VARCHAR(20) NOT NULL,
    needs_ventilator BOOLEAN DEFAULT FALSE,
    status ENUM('waiting', 'allocated', 'discharged') NOT NULL DEFAULT 'waiting',
    vitals JSON NULL,
    admitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharged_at TIMESTAMP NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 7. Allocations
CREATE TABLE IF NOT EXISTS allocations (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) UNIQUE NOT NULL,
    bed_id VARCHAR(36) NULL,
    ventilator_id VARCHAR(36) NULL,
    primary_doctor_id VARCHAR(36) NULL,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    allocated_by VARCHAR(36) NULL,
    is_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL,
    FOREIGN KEY (ventilator_id) REFERENCES ventilators(id) ON DELETE SET NULL,
    FOREIGN KEY (primary_doctor_id) REFERENCES staff_members(id) ON DELETE SET NULL
);

-- 8. Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    staff_member_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    shift_date DATE NOT NULL,
    type ENUM('day', 'evening', 'night', 'on_call') NOT NULL,
    status ENUM('scheduled', 'swapped', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_member_id) REFERENCES staff_members(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- 9. Shift History
CREATE TABLE IF NOT EXISTS shift_histories (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    staff_member_id VARCHAR(36) NOT NULL,
    shift_id VARCHAR(36) NULL,
    worked_date DATE NOT NULL,
    type ENUM('day', 'evening', 'night', 'on_call') NOT NULL,
    hours_worked DECIMAL(4, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_member_id) REFERENCES staff_members(id) ON DELETE CASCADE
);

-- 10. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category ENUM('pharmaceutical', 'equipment', 'consumable') NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    last_restocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    actor_id VARCHAR(36) NULL,
    action VARCHAR(100) NOT NULL, 
    entity_name VARCHAR(100) NOT NULL, 
    entity_id VARCHAR(36) NOT NULL,
    payload_before JSON NULL,
    payload_after JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 12. Universal Cross-Hospital Registry
CREATE TABLE IF NOT EXISTS universal_patients (
    upid VARCHAR(50) PRIMARY KEY,
    pin_hash VARCHAR(255) NOT NULL,
    account_active BOOLEAN DEFAULT TRUE,
    admitted_hospital_id VARCHAR(36) NULL,
    admitted_at TIMESTAMP NULL,
    discharged_at TIMESTAMP NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(20) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_phone VARCHAR(50) NOT NULL,
    allergies JSON NULL,
    chronic_conditions JSON NULL,
    current_medications JSON NULL,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    admission_history JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
