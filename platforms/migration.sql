-- Database Migration for CareFlow Revamp

-- 1. Update universal_patients with email and password
ALTER TABLE universal_patients ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE universal_patients ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 2. Create emergency_requests table
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    symptoms TEXT NOT NULL,
    ward_required VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create otp_verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'owner_registration' | 'employee_registration'
    payload JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add diet_plan to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS diet_plan TEXT;

-- 5. Create staff_contracts table for Payroll
CREATE TABLE IF NOT EXISTS staff_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_member_id VARCHAR(255) UNIQUE NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    overtime_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.5,
    weekly_hours_limit INT NOT NULL DEFAULT 40,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create payroll_runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed'
);

-- 7. Create payroll_records table
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    staff_member_id VARCHAR(255) NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    base_hours DECIMAL(6, 2) NOT NULL,
    overtime_hours DECIMAL(6, 2) NOT NULL,
    base_pay DECIMAL(10, 2) NOT NULL,
    overtime_pay DECIMAL(10, 2) NOT NULL,
    net_pay DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Seed staff contracts (AIIMS staff defaults)
INSERT INTO staff_contracts (staff_member_id, hourly_rate, overtime_multiplier, weekly_hours_limit)
VALUES
('s1', 60.00, 1.5, 40),
('s2', 28.00, 1.5, 40),
('s-receptionist', 22.00, 1.5, 40),
('s-doctor', 55.00, 1.5, 40),
('s-nurse', 32.00, 1.5, 40),
('s-wardboy', 18.00, 1.5, 40),
('s-labtech', 24.00, 1.5, 40),
('s-pharmacist', 26.00, 1.5, 40),
('s-md', 75.00, 1.5, 40),
('s-admin', 30.00, 1.5, 40)
ON CONFLICT (staff_member_id) DO NOTHING;
