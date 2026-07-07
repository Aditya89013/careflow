-- ============================================================
-- CareFlow HMS — Attendance System Integration Migration
-- Supports: ZKTeco, MATRIX COSEC, eSSL, UKG, Deputy, BambooHR
-- ============================================================

-- 1. Attendance System Connectors (one per external system)
CREATE TABLE IF NOT EXISTS attendance_connectors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL,
  name                TEXT NOT NULL,                   -- "Main Building ZKBioTime", "Deputy Cloud"
  provider            TEXT NOT NULL,                   -- 'zkteco_push' | 'zkteco_biotime' | 'matrix_cosec' | 'ukg' | 'deputy' | 'bamboohr' | 'essl_sql' | 'csv' | 'generic_webhook'
  status              TEXT NOT NULL DEFAULT 'inactive', -- 'active' | 'inactive' | 'error'
  config              JSONB NOT NULL DEFAULT '{}',     -- auth, base_url, credentials (encrypted at app level)
  sync_mode           TEXT NOT NULL DEFAULT 'poll',   -- 'push' | 'poll' | 'webhook'
  poll_interval_sec   INTEGER DEFAULT 300,             -- polling interval (seconds)
  last_sync_at        TIMESTAMPTZ,
  last_sync_status    TEXT,
  last_error          TEXT,
  records_synced      INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Biometric Devices (physical terminals)
CREATE TABLE IF NOT EXISTS attendance_devices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id        UUID REFERENCES attendance_connectors(id) ON DELETE CASCADE,
  hospital_id         UUID NOT NULL,
  serial_number       TEXT NOT NULL,
  device_name         TEXT,
  location            TEXT,                            -- "OPD Entrance", "ICU Wing A"
  ip_address          TEXT,
  firmware_version    TEXT,
  last_heartbeat_at   TIMESTAMPTZ,
  status              TEXT DEFAULT 'unknown',          -- 'online' | 'offline' | 'unknown'
  user_count          INTEGER DEFAULT 0,
  log_count           INTEGER DEFAULT 0,
  device_metadata     JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, serial_number)
);

-- 3. Raw Attendance Events (normalized across all providers)
CREATE TABLE IF NOT EXISTS attendance_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id           UUID NOT NULL,
  connector_id          UUID REFERENCES attendance_connectors(id) ON DELETE SET NULL,
  device_id             UUID REFERENCES attendance_devices(id) ON DELETE SET NULL,

  -- Employee identification
  employee_code         TEXT NOT NULL,                 -- ID as stored on device/system
  employee_name         TEXT,
  department            TEXT,

  -- Event data
  punch_timestamp       TIMESTAMPTZ NOT NULL,
  punch_type            TEXT NOT NULL,                 -- 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OT_IN' | 'OT_OUT'
  punch_type_raw        TEXT,                          -- Original value from source ('0', 'in', 'start', etc.)
  verify_method         TEXT,                          -- 'FINGERPRINT' | 'FACE' | 'RFID_CARD' | 'MOBILE' | 'PIN'
  verify_method_raw     TEXT,
  work_code             TEXT,
  location_name         TEXT,
  device_serial         TEXT,

  -- Health data (ZKTeco thermal devices)
  temperature           NUMERIC(4,1),
  mask_detected         BOOLEAN,

  -- Source tracking
  source_system         TEXT NOT NULL,                 -- 'zkteco_push' | 'zkteco_biotime' | 'deputy' etc.
  source_event_id       TEXT,                          -- External system's own ID for deduplication
  raw_payload           JSONB,                         -- Complete original payload

  -- Processing
  processed             BOOLEAN DEFAULT FALSE,
  linked_staff_id       UUID,                          -- FK to hospital staff once matched
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Deduplication constraint
  UNIQUE(hospital_id, employee_code, punch_timestamp, punch_type)
);

-- 4. Sync State (track last processed position per connector)
CREATE TABLE IF NOT EXISTS attendance_sync_state (
  connector_id          UUID PRIMARY KEY REFERENCES attendance_connectors(id) ON DELETE CASCADE,
  last_event_id         TEXT,                          -- Last external ID processed
  last_event_timestamp  TIMESTAMPTZ,                  -- Last punch_timestamp processed
  last_poll_at          TIMESTAMPTZ DEFAULT NOW(),
  total_events_pulled   BIGINT DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_att_events_hospital    ON attendance_events(hospital_id);
CREATE INDEX IF NOT EXISTS idx_att_events_employee    ON attendance_events(hospital_id, employee_code);
CREATE INDEX IF NOT EXISTS idx_att_events_punch_time  ON attendance_events(hospital_id, punch_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_att_events_processed   ON attendance_events(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_att_connectors_hosp    ON attendance_connectors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_att_devices_connector  ON attendance_devices(connector_id);
