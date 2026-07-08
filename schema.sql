-- Enums
CREATE TYPE bed_status AS ENUM ('free', 'occupied', 'cleaning', 'maintenance');
CREATE TYPE bed_type AS ENUM ('general', 'ICU', 'HDU', 'isolation');
CREATE TYPE ventilator_status AS ENUM ('available', 'in_use', 'maintenance');
CREATE TYPE ventilator_type AS ENUM ('invasive', 'non_invasive');
CREATE TYPE staff_role AS ENUM ('admin', 'dept_head', 'staff');
CREATE TYPE staff_specialty AS ENUM ('doctor', 'nurse', 'support');
CREATE TYPE triage_level AS ENUM ('1_resuscitation', '2_emergent', '3_urgent', '4_less_urgent', '5_non_urgent');
CREATE TYPE patient_status AS ENUM ('waiting', 'allocated', 'discharged');
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

-- 1a. Universal Patients
CREATE TABLE universal_patients (
    upid VARCHAR(100) PRIMARY KEY,
    pin_hash VARCHAR(255) NOT NULL,
    account_active BOOLEAN DEFAULT TRUE,
    admitted_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    admitted_at TIMESTAMP WITH TIME ZONE,
    discharged_at TIMESTAMP WITH TIME ZONE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(50) DEFAULT 'Other',
    blood_group VARCHAR(50) DEFAULT 'Unknown',
    phone VARCHAR(50) DEFAULT '',
    emergency_contact_name VARCHAR(100) DEFAULT '',
    emergency_contact_phone VARCHAR(50) DEFAULT '',
    allergies JSONB DEFAULT '[]'::jsonb,
    chronic_conditions JSONB DEFAULT '[]'::jsonb,
    current_medications JSONB DEFAULT '[]'::jsonb,
    insurance_provider VARCHAR(100) DEFAULT '',
    insurance_policy_number VARCHAR(100) DEFAULT '',
    admission_history JSONB DEFAULT '[]'::jsonb,
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    auth_user_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role staff_role NOT NULL DEFAULT 'staff',
    specialty staff_specialty NOT NULL,
    contact_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    upid VARCHAR(100),
    first_name VARCHAR(100), 
    last_name VARCHAR(100),  
    date_of_birth DATE,      
    triage_level triage_level NOT NULL,
    required_department_code VARCHAR(20) NOT NULL,
    needs_ventilator BOOLEAN DEFAULT FALSE,
    status patient_status NOT NULL DEFAULT 'waiting',
    admitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    discharged_at TIMESTAMP WITH TIME ZONE,
    vitals JSONB
);

-- 7. Allocations
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    ventilator_id UUID REFERENCES ventilators(id) ON DELETE SET NULL,
    primary_doctor_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    allocated_by UUID NOT NULL REFERENCES staff_members(id),
    is_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    CONSTRAINT chk_override_reason CHECK (is_override = FALSE OR override_reason IS NOT NULL)
);

-- 8. Shifts
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    type shift_type NOT NULL,
    status shift_status NOT NULL DEFAULT 'scheduled',
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Shift History
CREATE TABLE shift_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    worked_date DATE NOT NULL,
    type shift_type NOT NULL,
    hours_worked DECIMAL(4, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Inventory Items
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category inventory_category NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    last_restocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, 
    entity_name VARCHAR(100) NOT NULL, 
    entity_id UUID NOT NULL,
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

-- 12. Helper Function for current tenant
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

-- 13. AI-driven Resource Allocation Model tables
ALTER TABLE universal_patients ADD COLUMN IF NOT EXISTS current_status VARCHAR(50) DEFAULT 'Discharged';

CREATE TABLE IF NOT EXISTS infrastructure (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- ICU, CCU, General, etc.
    total_capacity INT NOT NULL,
    current_occupancy INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward_id VARCHAR(100),
    type VARCHAR(100) NOT NULL, -- Ventilator, Oxygen Cylinder
    status VARCHAR(50) NOT NULL DEFAULT 'Available' -- Available, In-Use, Maintenance
);

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL, -- Doctor, Nurse, Ward Boy
    current_shift VARCHAR(50),
    assigned_ward_id VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS treatment_sessions (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(100) NOT NULL REFERENCES universal_patients(upid) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    assigned_employee_id VARCHAR(100) REFERENCES employees(id) ON DELETE SET NULL,
    resource_used_ids JSONB DEFAULT '[]'::jsonb, -- array of resource ids
    status VARCHAR(50) NOT NULL DEFAULT 'Admitted', -- Discharged, Admitted, Seeking Emergency
    health_issue_description TEXT
);

