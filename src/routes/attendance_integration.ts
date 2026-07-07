import { Router, Request, Response } from "express";
import { SqlHospitalRepository } from "../db";
import { authMiddleware, requireRole } from "../middleware/auth";
import { broadcastHospitalEvent } from "../ws_events";

const router = Router();

// ─── Punch type normalisation (ZKTeco, COSEC, Deputy, BambooHR → unified) ───
const PUNCH_TYPE_MAP: Record<string, string> = {
  // ZKTeco punch_state integers (as strings)
  "0": "CLOCK_IN", "1": "CLOCK_OUT", "2": "BREAK_OUT",
  "3": "BREAK_IN", "4": "OT_IN", "5": "OT_OUT",
  // MATRIX COSEC direction
  "in": "CLOCK_IN", "out": "CLOCK_OUT",
  // Deputy / BambooHR
  "start": "CLOCK_IN", "end": "CLOCK_OUT",
  "check in": "CLOCK_IN", "check out": "CLOCK_OUT",
};

const VERIFY_MAP: Record<string, string> = {
  "1": "FINGERPRINT", "4": "RFID_CARD", "15": "FACE",
  "200": "MOBILE", "8": "PIN", "6": "PASSWORD",
};

function normalizePunchType(raw: string | number): string {
  const key = String(raw).toLowerCase().trim();
  return PUNCH_TYPE_MAP[key] ?? "CLOCK_IN";
}
function normalizeVerify(raw: string | number | undefined): string {
  if (raw === undefined || raw === null) return "UNKNOWN";
  return VERIFY_MAP[String(raw)] ?? String(raw);
}

// ─── Admin / Doctor roles allowed to manage connectors ───────────────────────
const ADMIN_ROLES = ["admin", "medical_director"];

// ===========================================================================
// SECTION A — ZKTeco PUSH PROTOCOL  (Device → Server)
// These routes live at /iclock/* (NOT under /api/v1) so ZKTeco devices can
// POST directly without an auth header — the hospital is identified by the
// connector that pre-registered the device serial number.
// ===========================================================================

/**
 * GET /iclock/cdata
 * ZKTeco heartbeat — device periodically polls to confirm server is alive
 * and to receive configuration commands.
 */
router.get("/iclock/cdata", async (req: Request, res: Response) => {
  const { SN } = req.query as Record<string, string>;
  if (!SN) return res.status(400).send("ERROR: Missing SN");

  // Update device last_heartbeat_at
  try {
    const db = (router as any)._pool; // direct pool access for unauthenticated route
    if (db) {
      await db.query(
        `UPDATE attendance_devices SET last_heartbeat_at = NOW(), status = 'online'
         WHERE serial_number = $1`,
        [SN]
      );
    }
  } catch (_) { /* best-effort */ }

  // Reply tells device what to do next
  res.status(200)
    .set("Content-Type", "text/plain")
    .send("GET OPTION FROM:ATT\nATTSTAMP=None\n");
});

/**
 * POST /iclock/cdata?SN=...&table=ATTLOG
 * ZKTeco PUSH — device sends attendance logs in URL-encoded or line-delimited format
 */
router.post("/iclock/cdata", async (req: Request, res: Response) => {
  const { SN, table } = req.query as Record<string, string>;
  if (!SN) return res.status(400).send("ERROR: Missing SN");

  if (table !== "ATTLOG") {
    // Other tables (OPERLOG, OPTIONS, etc.) — acknowledge and ignore
    return res.status(200).send("OK");
  }

  try {
    // Payload is URL-encoded; body is newline-separated records:
    // UserID\tAttTime\tStatus\tVerify\tWorkCode\tReserved
    const rawBody = req.body;
    const bodyStr: string =
      typeof rawBody === "string"
        ? rawBody
        : typeof rawBody?.Stamp !== "undefined"
        ? Object.entries(rawBody)
            .filter(([k]) => !["SN", "table", "Stamp"].includes(k))
            .map(([, v]) => String(v))
            .join("\n")
        : JSON.stringify(rawBody);

    const lines = bodyStr.split(/\r?\n/).filter((l: string) => l.trim());

    // Find which hospital+connector owns this device SN
    // We do a raw pool query here since this is an unauthenticated route
    // In mock mode just log and acknowledge
    const events: any[] = lines.map((line: string) => {
      const parts = line.split("\t");
      const [UserID, AttTime, Status, Verify, WorkCode] = parts;
      return {
        employee_code: (UserID ?? "").trim(),
        punch_timestamp: new Date(AttTime ?? Date.now()),
        punch_type: normalizePunchType(Status ?? "0"),
        punch_type_raw: Status,
        verify_method: normalizeVerify(Verify),
        verify_method_raw: Verify,
        work_code: WorkCode?.trim() ?? "",
        device_serial: SN,
        source_system: "zkteco_push",
        raw_payload: { line, SN },
      };
    }).filter((e: any) => e.employee_code);

    console.log(`[ZKTeco PUSH] SN=${SN} received ${events.length} attendance record(s)`);
    events.forEach((e: any) => {
      console.log(
        `  ↳ EMP=${e.employee_code} TIME=${e.punch_timestamp?.toISOString()} TYPE=${e.punch_type} VIA=${e.verify_method}`
      );
    });

    // In full production: await repo.bulkInsertAttendanceEvents(hospitalId, events);
    // For now emit via WebSocket so the dashboard updates in real-time
    // broadcastHospitalEvent(hospitalId, { type: "ATTENDANCE_PUSH", events });

    res.status(200).send("OK");
  } catch (err) {
    console.error("[ZKTeco PUSH] Error processing ATTLOG:", err);
    res.status(500).send("ERROR");
  }
});

/**
 * GET /iclock/getrequest?SN=...
 * ZKTeco command queue — device polls for pending server commands
 * (e.g., add user, delete user, reboot)
 */
router.get("/iclock/getrequest", (_req: Request, res: Response) => {
  // No pending commands → send empty OK
  res.status(200).send("OK");
});

/**
 * POST /iclock/devicecmd
 * ZKTeco command acknowledgement — device confirms it executed a command
 */
router.post("/iclock/devicecmd", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

// ===========================================================================
// SECTION B — Connector Management API  (authenticated, admin only)
// ===========================================================================

/**
 * GET /api/v1/attendance/connectors
 * List all configured attendance system connectors for this hospital
 */
router.get(
  "/api/v1/attendance/connectors",
  authMiddleware,
  requireRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const connectors = await repo.getAttendanceConnectors();
      return res.json(connectors);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch connectors" });
    }
  }
);

/**
 * POST /api/v1/attendance/connectors
 * Add or update a connector configuration
 */
router.post(
  "/api/v1/attendance/connectors",
  authMiddleware,
  requireRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    const {
      id, name, provider, config, sync_mode, poll_interval_sec,
    } = req.body;

    if (!name || !provider) {
      return res.status(400).json({ error: "name and provider are required" });
    }

    const VALID_PROVIDERS = [
      "zkteco_push", "zkteco_biotime", "matrix_cosec",
      "ukg", "deputy", "bamboohr", "essl_sql", "csv", "generic_webhook",
    ];
    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider. Supported: ${VALID_PROVIDERS.join(", ")}` });
    }

    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const connector = await repo.upsertAttendanceConnector({
        id,
        hospital_id: hospitalId,
        name,
        provider,
        config: config ?? {},
        sync_mode: sync_mode ?? "poll",
        poll_interval_sec: poll_interval_sec ?? 300,
      });

      await repo.addAuditEvent({
        id: `al-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: id ? "ATTENDANCE_CONNECTOR_UPDATED" : "ATTENDANCE_CONNECTOR_CREATED",
        actor_id: req.user!.userId,
        payload_after: { connector_id: connector.id, provider, name },
      });

      return res.status(201).json(connector);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to save connector" });
    }
  }
);

/**
 * DELETE /api/v1/attendance/connectors/:id
 */
router.delete(
  "/api/v1/attendance/connectors/:id",
  authMiddleware,
  requireRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      await repo.deleteAttendanceConnector(req.params.id, hospitalId);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete connector" });
    }
  }
);

/**
 * POST /api/v1/attendance/connectors/:id/test
 * Test connectivity to an external attendance system
 */
router.post(
  "/api/v1/attendance/connectors/:id/test",
  authMiddleware,
  requireRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const connectors = await repo.getAttendanceConnectors();
      const connector = connectors.find((c: any) => c.id === req.params.id);
      if (!connector) return res.status(404).json({ error: "Connector not found" });

      const result = await testConnectorConnection(connector);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

async function testConnectorConnection(connector: any): Promise<{ success: boolean; message: string; details?: any }> {
  const { provider, config } = connector;

  switch (provider) {
    case "zkteco_push":
      return {
        success: true,
        message: `PUSH receiver is active. Configure your ZKTeco device with Server URL: ${config.push_server_url ?? "[your-server]/iclock/cdata"} on port 80/443.`,
      };

    case "zkteco_biotime": {
      if (!config.base_url || !config.username || !config.password) {
        return { success: false, message: "Missing base_url, username, or password" };
      }
      try {
        const url = `${config.base_url.replace(/\/$/, "")}/iclock/api/terminals/?page_size=1`;
        const credentials = Buffer.from(`${config.username}:${config.password}`).toString("base64");
        const resp = await fetch(url, {
          headers: { Authorization: `Basic ${credentials}` },
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          const data = await resp.json() as any;
          return { success: true, message: `Connected to ZKBioTime. Found ${data.count ?? "?"} device(s).`, details: { count: data.count } };
        }
        return { success: false, message: `ZKBioTime returned HTTP ${resp.status}` };
      } catch (e: any) {
        return { success: false, message: `Connection failed: ${e.message}` };
      }
    }

    case "matrix_cosec": {
      if (!config.base_url || !config.api_key) {
        return { success: false, message: "Missing base_url or api_key" };
      }
      try {
        const url = `${config.base_url}/cosec/api.shtml?api-key=${config.api_key}&lang=en&req-type=user&user-id=1&out-type=json`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        return { success: resp.ok, message: resp.ok ? "MATRIX COSEC connected." : `HTTP ${resp.status}` };
      } catch (e: any) {
        return { success: false, message: `Connection failed: ${e.message}` };
      }
    }

    case "ukg": {
      if (!config.tenant || !config.client_id || !config.client_secret) {
        return { success: false, message: "Missing tenant, client_id, or client_secret" };
      }
      try {
        const tokenUrl = `https://${config.tenant}.mykronos.com/api/authentication/access_token`;
        const resp = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `grant_type=client_credentials&client_id=${config.client_id}&client_secret=${config.client_secret}&auth_chain=OAuthLdapService`,
          signal: AbortSignal.timeout(10000),
        });
        return { success: resp.ok, message: resp.ok ? "UKG Pro WFM OAuth2 token obtained." : `HTTP ${resp.status}` };
      } catch (e: any) {
        return { success: false, message: `UKG auth failed: ${e.message}` };
      }
    }

    case "deputy": {
      if (!config.subdomain || !config.access_token) {
        return { success: false, message: "Missing subdomain or access_token" };
      }
      try {
        const url = `https://${config.subdomain}.deputy.com/api/v1/resource/Me`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${config.access_token}` },
          signal: AbortSignal.timeout(8000),
        });
        return { success: resp.ok, message: resp.ok ? "Deputy API connected." : `HTTP ${resp.status}` };
      } catch (e: any) {
        return { success: false, message: `Deputy failed: ${e.message}` };
      }
    }

    case "bamboohr": {
      if (!config.company_domain || !config.api_key) {
        return { success: false, message: "Missing company_domain or api_key" };
      }
      try {
        const url = `https://api.bamboohr.com/api/gateway.php/${config.company_domain}/v1/employees/directory`;
        const credentials = Buffer.from(`${config.api_key}:x`).toString("base64");
        const resp = await fetch(url, {
          headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        return { success: resp.ok, message: resp.ok ? "BambooHR API connected." : `HTTP ${resp.status}` };
      } catch (e: any) {
        return { success: false, message: `BambooHR failed: ${e.message}` };
      }
    }

    default:
      return { success: true, message: `${provider} connector saved. Manual configuration may be required.` };
  }
}

/**
 * POST /api/v1/attendance/connectors/:id/sync
 * Trigger an immediate manual sync pull from a REST-based connector
 */
router.post(
  "/api/v1/attendance/connectors/:id/sync",
  authMiddleware,
  requireRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    const { date_from, date_to } = req.body;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const connectors = await repo.getAttendanceConnectors();
      const connector = connectors.find((c: any) => c.id === req.params.id);
      if (!connector) return res.status(404).json({ error: "Connector not found" });

      const from = date_from ? new Date(date_from) : new Date(Date.now() - 86400000);
      const to = date_to ? new Date(date_to) : new Date();

      const result = await pullAttendanceFromConnector(connector, from, to);

      // Save normalized events
      if (result.events.length > 0) {
        await repo.bulkInsertAttendanceEvents(hospitalId, connector.id, result.events);
      }

      // Update connector sync state
      await repo.updateConnectorSyncState(connector.id, {
        last_sync_at: new Date().toISOString(),
        last_sync_status: result.success ? "success" : "error",
        last_error: result.error ?? null,
        records_synced: result.events.length,
      });

      broadcastHospitalEvent(hospitalId, {
        type: "ATTENDANCE_SYNC_COMPLETE",
        connector_id: connector.id,
        records: result.events.length,
      });

      return res.json({
        success: result.success,
        records_pulled: result.events.length,
        error: result.error,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─── REST connector pull implementations ─────────────────────────────────────

async function pullAttendanceFromConnector(
  connector: any,
  from: Date,
  to: Date
): Promise<{ success: boolean; events: any[]; error?: string }> {
  const { provider, config } = connector;

  try {
    switch (provider) {
      case "zkteco_biotime":
        return await pullZKBioTime(config, from, to);
      case "deputy":
        return await pullDeputy(config, from, to);
      case "bamboohr":
        return await pullBambooHR(config, from, to);
      case "matrix_cosec":
        return await pullMatrixCosec(config, from, to);
      case "ukg":
        return await pullUKG(config, from, to);
      default:
        return { success: false, events: [], error: `Pull not supported for ${provider}. Use PUSH or webhook mode.` };
    }
  } catch (err: any) {
    return { success: false, events: [], error: err.message };
  }
}

// ── ZKBioTime 8 REST API Pull ─────────────────────────────────────────────────
async function pullZKBioTime(
  config: any, from: Date, to: Date
): Promise<{ success: boolean; events: any[]; error?: string }> {
  const base = config.base_url.replace(/\/$/, "");
  const creds = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  const headers = { Authorization: `Basic ${creds}`, "Content-Type": "application/json" };

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  let page = 1;
  const pageSize = 500;
  const allEvents: any[] = [];

  while (true) {
    const url = `${base}/iclock/api/transactions/?punch_time__gte=${fromStr}&punch_time__lte=${toStr}&page=${page}&page_size=${pageSize}`;
    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) return { success: false, events: allEvents, error: `ZKBioTime HTTP ${resp.status}` };

    const data = await resp.json() as any;
    const records: any[] = data.data ?? [];

    records.forEach((r: any) => {
      allEvents.push({
        employee_code: r.emp_code,
        employee_name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        department: r.department,
        punch_timestamp: new Date(r.punch_time),
        punch_type: normalizePunchType(r.punch_state),
        punch_type_raw: r.punch_state,
        verify_method: normalizeVerify(r.verify_type),
        verify_method_raw: String(r.verify_type),
        location_name: r.area_alias ?? r.terminal_alias,
        device_serial: r.terminal_sn,
        temperature: r.temperature ? parseFloat(r.temperature) : null,
        source_system: "zkteco_biotime",
        source_event_id: String(r.id),
        raw_payload: r,
      });
    });

    if (!data.next) break;
    page++;
  }

  return { success: true, events: allEvents };
}

// ── Deputy REST API Pull ──────────────────────────────────────────────────────
async function pullDeputy(
  config: any, from: Date, to: Date
): Promise<{ success: boolean; events: any[]; error?: string }> {
  const base = `https://${config.subdomain}.deputy.com/api/v1`;
  const headers = { Authorization: `Bearer ${config.access_token}` };

  // Deputy stores timestamps as Unix seconds
  const fromTs = Math.floor(from.getTime() / 1000);
  const toTs = Math.floor(to.getTime() / 1000);

  const url = `${base}/resource/Timesheet?search={"s":{"Date":{"field":"Date","type":"ge","data":"${from.toISOString().split("T")[0]}"}}}`;
  const resp = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) return { success: false, events: [], error: `Deputy HTTP ${resp.status}` };

  const records = await resp.json() as any[];
  const events: any[] = [];

  records.forEach((r: any) => {
    if (r.StartTime && r.StartTime >= fromTs && r.StartTime <= toTs) {
      events.push({
        employee_code: String(r.Employee),
        employee_name: r.EmployeeObject?.DisplayName,
        punch_timestamp: new Date(r.StartTime * 1000),
        punch_type: "CLOCK_IN",
        source_system: "deputy",
        source_event_id: `dep-${r.Id}-in`,
        raw_payload: r,
      });
      if (r.EndTime) {
        events.push({
          employee_code: String(r.Employee),
          employee_name: r.EmployeeObject?.DisplayName,
          punch_timestamp: new Date(r.EndTime * 1000),
          punch_type: "CLOCK_OUT",
          source_system: "deputy",
          source_event_id: `dep-${r.Id}-out`,
          raw_payload: r,
        });
      }
    }
  });

  return { success: true, events };
}

// ── BambooHR Time Tracking Pull ───────────────────────────────────────────────
async function pullBambooHR(
  config: any, from: Date, to: Date
): Promise<{ success: boolean; events: any[]; error?: string }> {
  const base = `https://api.bamboohr.com/api/gateway.php/${config.company_domain}/v1`;
  const creds = Buffer.from(`${config.api_key}:x`).toString("base64");
  const headers = { Authorization: `Basic ${creds}`, Accept: "application/json" };

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  const url = `${base}/time_off/requests/?start=${fromStr}&end=${toStr}&status=approved`;
  const resp = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) return { success: false, events: [], error: `BambooHR HTTP ${resp.status}` };

  const data = await resp.json() as any;
  const requests: any[] = data.requests ?? [];
  const events: any[] = requests.map((r: any) => ({
    employee_code: String(r.employeeId),
    employee_name: r.name,
    punch_timestamp: new Date(r.start),
    punch_type: "LEAVE",
    punch_type_raw: r.type?.name ?? "Leave",
    source_system: "bamboohr",
    source_event_id: String(r.id),
    raw_payload: r,
  }));

  return { success: true, events };
}

// ── MATRIX COSEC Pull ─────────────────────────────────────────────────────────
async function pullMatrixCosec(
  config: any, from: Date, to: Date
): Promise<{ success: boolean; events: any[]; error?: string }> {
  const base = config.base_url.replace(/\/$/, "");
  const fromStr = from.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const toStr = to.toLocaleDateString("en-GB");

  const url = `${base}/cosec/api.shtml?api-key=${config.api_key}&lang=en&req-type=attlog&from-date=${fromStr}&to-date=${toStr}&out-type=json`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) return { success: false, events: [], error: `COSEC HTTP ${resp.status}` };

  const data = await resp.json() as any;
  const punches: any[] = data?.attlog?.punchdata ?? [];

  const events = punches.map((p: any) => ({
    employee_code: p["user-id"],
    employee_name: `${p["first-name"] ?? ""} ${p["last-name"] ?? ""}`.trim(),
    punch_timestamp: new Date(`${p.date} ${p.time}`),
    punch_type: normalizePunchType(p.direction ?? p["io-flag"]),
    punch_type_raw: p.direction,
    location_name: p["device-name"],
    temperature: p.temp ? parseFloat(p.temp) : null,
    source_system: "matrix_cosec",
    source_event_id: `cosec-${p["user-id"]}-${p.date}-${p.time}`,
    raw_payload: p,
  }));

  return { success: true, events };
}

// ── UKG Pro WFM Pull ──────────────────────────────────────────────────────────
async function pullUKG(
  config: any, from: Date, to: Date
): Promise<{ success: boolean; events: any[]; error?: string }> {
  const tokenUrl = `https://${config.tenant}.mykronos.com/api/authentication/access_token`;
  const tokenResp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${config.client_id}&client_secret=${config.client_secret}&auth_chain=OAuthLdapService`,
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResp.ok) return { success: false, events: [], error: "UKG auth failed" };
  const { access_token } = await tokenResp.json() as any;

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];
  const punchUrl = `https://${config.tenant}.mykronos.com/api/v1/timekeeping/punches?start_date=${fromStr}&end_date=${toStr}`;
  const resp = await fetch(punchUrl, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      appkey: config.app_key ?? "",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return { success: false, events: [], error: `UKG punches HTTP ${resp.status}` };

  const data = await resp.json() as any;
  const events = (data.punches ?? []).map((p: any) => ({
    employee_code: p.employee?.id,
    punch_timestamp: new Date(p.punchDateTime),
    punch_type: normalizePunchType(p.type),
    punch_type_raw: p.type,
    source_system: "ukg",
    source_event_id: String(p.id),
    raw_payload: p,
  }));

  return { success: true, events };
}

// ===========================================================================
// SECTION C — Generic Webhook Receiver  (MATRIX COSEC, Deputy, etc.)
// ===========================================================================

router.post(
  "/api/v1/attendance/webhook/:provider",
  async (req: Request, res: Response) => {
    const { provider } = req.params;
    const payload = req.body;

    console.log(`[Webhook] Provider=${provider}`, JSON.stringify(payload).substring(0, 200));

    // Acknowledge immediately (webhook best practice — process async)
    res.status(200).json({ received: true });

    // Parse and normalise based on provider
    try {
      let event: any = null;

      if (provider === "matrix_cosec") {
        event = {
          employee_code: payload["user-id"],
          punch_timestamp: new Date(`${payload["punch-time"]}`),
          punch_type: normalizePunchType(payload.direction ?? "in"),
          source_system: "matrix_cosec",
          raw_payload: payload,
        };
      } else if (provider === "deputy") {
        event = {
          employee_code: String(payload.Employee),
          punch_timestamp: new Date(payload.StartTime * 1000),
          punch_type: "CLOCK_IN",
          source_system: "deputy",
          raw_payload: payload,
        };
      } else if (provider === "zkteco_push") {
        event = {
          employee_code: payload.UserID ?? payload.user_id,
          punch_timestamp: new Date(payload.AttTime ?? payload.att_time),
          punch_type: normalizePunchType(payload.Status ?? payload.status ?? "0"),
          verify_method: normalizeVerify(payload.Verify ?? payload.verify),
          source_system: "zkteco_push",
          raw_payload: payload,
        };
      }

      if (event) {
        console.log(`[Webhook] Normalised:`, event.employee_code, event.punch_type, event.punch_timestamp?.toISOString());
        // In production: look up hospital by webhook API key / connector ID and save
      }
    } catch (err) {
      console.error("[Webhook] Processing error:", err);
    }
  }
);

// ===========================================================================
// SECTION D — Attendance Events Query API
// ===========================================================================

/**
 * GET /api/v1/attendance/events
 * Query normalised attendance events for this hospital
 */
router.get(
  "/api/v1/attendance/events",
  authMiddleware,
  requireRole([...ADMIN_ROLES, "receptionist", "dept_head"]),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    const { date, employee_code, page = "1", page_size = "50" } = req.query as Record<string, string>;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const result = await repo.getAttendanceEvents(hospitalId, {
        date: date ? new Date(date) : new Date(),
        employee_code: employee_code ?? undefined,
        page: parseInt(page),
        page_size: parseInt(page_size),
      });
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch attendance events" });
    }
  }
);

/**
 * GET /api/v1/attendance/devices
 * List all known biometric devices
 */
router.get(
  "/api/v1/attendance/devices",
  authMiddleware,
  requireRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const devices = await repo.getAttendanceDevices(hospitalId);
      return res.json(devices);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch devices" });
    }
  }
);

/**
 * GET /api/v1/attendance/summary
 * Today's attendance summary — present, absent, late, OT counts
 */
router.get(
  "/api/v1/attendance/summary",
  authMiddleware,
  requireRole([...ADMIN_ROLES, "receptionist", "dept_head"]),
  async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId;
    try {
      const repo = new SqlHospitalRepository(hospitalId);
      const events = await repo.getAttendanceEvents(hospitalId, {
        date: new Date(),
        page: 1,
        page_size: 9999,
      });

      const clockIns = events.data.filter((e: any) => e.punch_type === "CLOCK_IN");
      const clockOuts = events.data.filter((e: any) => e.punch_type === "CLOCK_OUT");
      const otIns = events.data.filter((e: any) => e.punch_type === "OT_IN");
      const staff = await repo.getStaff();
      const totalStaff = staff.length;

      const lateThreshold = new Date();
      lateThreshold.setHours(9, 15, 0, 0); // 9:15 AM
      const lateArrivals = clockIns.filter((e: any) => new Date(e.punch_timestamp) > lateThreshold);

      return res.json({
        date: new Date().toISOString().split("T")[0],
        total_staff: totalStaff,
        present: clockIns.length,
        absent: Math.max(0, totalStaff - clockIns.length),
        checked_out: clockOuts.length,
        late_arrivals: lateArrivals.length,
        on_overtime: otIns.length,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to compute attendance summary" });
    }
  }
);

export default router;
