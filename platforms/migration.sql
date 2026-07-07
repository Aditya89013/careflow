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
