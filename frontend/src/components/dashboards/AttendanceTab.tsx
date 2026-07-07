import React, { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Connector {
  id: string;
  name: string;
  provider: string;
  status: string;
  sync_mode: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  records_synced: number;
  config: Record<string, string>;
}

interface AttendanceEvent {
  id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  punch_timestamp: string;
  punch_type: string;
  verify_method: string;
  location_name: string;
  device_serial: string;
  temperature: number | null;
  source_system: string;
}

interface AttendanceSummary {
  date: string;
  total_staff: number;
  present: number;
  absent: number;
  checked_out: number;
  late_arrivals: number;
  on_overtime: number;
}

// ─── Provider config metadata ─────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "zkteco_push",
    label: "ZKTeco — PUSH Protocol",
    icon: "🖐",
    description: "Device pushes data to CareFlow in real-time. No polling needed.",
    badge: "Most Common in India",
    badgeColor: "#16a34a",
    fields: [{ key: "push_server_url", label: "Your Server URL (configure on device)", placeholder: "https://your-domain.com/iclock/cdata" }],
  },
  {
    id: "zkteco_biotime",
    label: "ZKBioTime 8 REST API",
    icon: "🌐",
    description: "Connect to ZKBioTime 8 software to pull attendance logs via REST.",
    badge: "REST API",
    badgeColor: "#2563eb",
    fields: [
      { key: "base_url", label: "BioTime Server URL", placeholder: "http://192.168.1.50" },
      { key: "username", label: "Username", placeholder: "admin" },
      { key: "password", label: "Password", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "matrix_cosec",
    label: "MATRIX COSEC",
    icon: "🔐",
    description: "Integrate MATRIX COSEC biometric system via REST API.",
    badge: "India / SAARC",
    badgeColor: "#7c3aed",
    fields: [
      { key: "base_url", label: "COSEC Server URL", placeholder: "http://10.10.10.100:4343" },
      { key: "api_key", label: "API Key", placeholder: "your-api-key" },
    ],
  },
  {
    id: "ukg",
    label: "UKG Pro / Kronos WFM",
    icon: "🏢",
    description: "Enterprise WFM integration via UKG OAuth2 API.",
    badge: "Enterprise",
    badgeColor: "#b45309",
    fields: [
      { key: "tenant", label: "Tenant ID", placeholder: "your-company" },
      { key: "client_id", label: "OAuth Client ID", placeholder: "" },
      { key: "client_secret", label: "OAuth Client Secret", placeholder: "••••••••", type: "password" },
      { key: "app_key", label: "App Key", placeholder: "" },
    ],
  },
  {
    id: "deputy",
    label: "Deputy",
    icon: "📋",
    description: "Connect Deputy scheduling & time tracking via OAuth2.",
    badge: "Cloud WFM",
    badgeColor: "#0891b2",
    fields: [
      { key: "subdomain", label: "Deputy Subdomain", placeholder: "yourhospital" },
      { key: "access_token", label: "Access Token", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "bamboohr",
    label: "BambooHR",
    icon: "🎋",
    description: "Sync time-off and timesheet records from BambooHR.",
    badge: "HRMS",
    badgeColor: "#15803d",
    fields: [
      { key: "company_domain", label: "Company Domain", placeholder: "yourhospital" },
      { key: "api_key", label: "API Key", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "essl_sql",
    label: "eSSL E-Time Track (SQL)",
    icon: "🗄",
    description: "Connect directly to eSSL's SQL database for attendance polling.",
    badge: "India",
    badgeColor: "#dc2626",
    fields: [
      { key: "db_host", label: "SQL Server Host", placeholder: "192.168.1.100" },
      { key: "db_name", label: "Database Name", placeholder: "essl_db" },
      { key: "db_user", label: "Username", placeholder: "sa" },
      { key: "db_pass", label: "Password", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "csv",
    label: "CSV / Manual Import",
    icon: "📄",
    description: "Upload attendance exports from any system in CSV format.",
    badge: "Universal",
    badgeColor: "#64748b",
    fields: [],
  },
  {
    id: "generic_webhook",
    label: "Generic Webhook",
    icon: "🔗",
    description: "Receive real-time attendance events from any system via HTTP POST.",
    badge: "Webhook",
    badgeColor: "#7c3aed",
    fields: [{ key: "webhook_secret", label: "Webhook Secret (optional)", placeholder: "shared-secret" }],
  },
];

const PUNCH_COLORS: Record<string, string> = {
  CLOCK_IN: "#16a34a",
  CLOCK_OUT: "#dc2626",
  BREAK_OUT: "#f59e0b",
  BREAK_IN: "#3b82f6",
  OT_IN: "#7c3aed",
  OT_OUT: "#db2777",
  LEAVE: "#64748b",
};

const PUNCH_LABELS: Record<string, string> = {
  CLOCK_IN: "Clock In",
  CLOCK_OUT: "Clock Out",
  BREAK_OUT: "Break Out",
  BREAK_IN: "Break In",
  OT_IN: "OT In",
  OT_OUT: "OT Out",
  LEAVE: "Leave",
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AttendanceTab: React.FC = () => {
  const [view, setView] = useState<"dashboard" | "connectors" | "events" | "devices">("dashboard");
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formName, setFormName] = useState("");
  const [formSyncMode, setFormSyncMode] = useState("poll");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const token = localStorage.getItem("token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const BASE = import.meta.env.VITE_API_URL ?? "";

  const notify = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/attendance/connectors`, { headers });
      if (res.ok) setConnectors(await res.json());
    } catch (_) {}
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/attendance/summary`, { headers });
      if (res.ok) setSummary(await res.json());
    } catch (_) {}
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/v1/attendance/events?date=${dateFilter}&page_size=100`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data ?? []);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { fetchConnectors(); fetchSummary(); }, []);
  useEffect(() => { if (view === "events") fetchEvents(); }, [view, dateFilter]);

  const openAddModal = (provider: typeof PROVIDERS[0]) => {
    setSelectedProvider(provider);
    setFormData({});
    setFormName(`${provider.label} — ${new Date().toLocaleDateString()}`);
    setFormSyncMode(provider.id === "zkteco_push" || provider.id === "generic_webhook" ? "push" : "poll");
    setTestResult(null);
    setShowAddModal(true);
  };

  const saveConnector = async () => {
    if (!selectedProvider || !formName) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/v1/attendance/connectors`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: formName,
          provider: selectedProvider.id,
          config: formData,
          sync_mode: formSyncMode,
          poll_interval_sec: 300,
        }),
      });
      if (res.ok) {
        notify("success", "Connector saved successfully.");
        setShowAddModal(false);
        fetchConnectors();
      } else {
        notify("error", "Failed to save connector.");
      }
    } catch (_) { notify("error", "Network error."); } finally { setLoading(false); }
  };

  const deleteConnector = async (id: string) => {
    if (!confirm("Delete this connector?")) return;
    const res = await fetch(`${BASE}/api/v1/attendance/connectors/${id}`, { method: "DELETE", headers });
    if (res.ok) { notify("success", "Connector deleted."); fetchConnectors(); }
  };

  const testConnector = async (id: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${BASE}/api/v1/attendance/connectors/${id}/test`, { method: "POST", headers });
      const data = await res.json();
      setTestResult(data);
    } catch (_) { setTestResult({ success: false, message: "Network error" }); } finally { setTesting(false); }
  };

  const syncConnector = async (id: string) => {
    setSyncing(id);
    try {
      const res = await fetch(`${BASE}/api/v1/attendance/connectors/${id}/sync`, {
        method: "POST", headers,
        body: JSON.stringify({ date_from: dateFilter }),
      });
      const data = await res.json();
      notify(data.success ? "success" : "error", data.success ? `Pulled ${data.records_pulled} records.` : data.error);
      fetchConnectors();
      fetchEvents();
      fetchSummary();
    } catch (_) { notify("error", "Sync failed."); } finally { setSyncing(null); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "1.5rem", fontFamily: "'Inter', sans-serif", color: "#f1f5f9", minHeight: "100vh" }}>

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
          padding: "0.75rem 1.25rem", borderRadius: "10px", fontWeight: 600,
          background: notification.type === "success" ? "#16a34a" : "#dc2626",
          color: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: "slideIn 0.3s ease",
        }}>
          {notification.type === "success" ? "✅" : "❌"} {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🏥 Attendance Integration Hub
        </h2>
        <p style={{ color: "#94a3b8", margin: "0.25rem 0 0" }}>
          Connect ZKTeco, MATRIX COSEC, UKG, Deputy, BambooHR & more — real-time sync with JCI/NABH compliance
        </p>
      </div>

      {/* Tab Nav */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #1e293b", paddingBottom: "0.75rem" }}>
        {[
          { key: "dashboard", label: "📊 Dashboard" },
          { key: "connectors", label: "🔌 Connectors" },
          { key: "events", label: "📋 Events Log" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key as any)} style={{
            padding: "0.5rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: "0.875rem",
            background: view === tab.key ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "#1e293b",
            color: view === tab.key ? "white" : "#94a3b8",
            transition: "all 0.2s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── DASHBOARD VIEW ── */}
      {view === "dashboard" && (
        <div>
          {/* Summary KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Total Staff", value: summary?.total_staff ?? "—", color: "#38bdf8", icon: "👥" },
              { label: "Present Today", value: summary?.present ?? "—", color: "#4ade80", icon: "✅" },
              { label: "Absent", value: summary?.absent ?? "—", color: "#f87171", icon: "❌" },
              { label: "Late Arrivals", value: summary?.late_arrivals ?? "—", color: "#fbbf24", icon: "⏰" },
              { label: "On Overtime", value: summary?.on_overtime ?? "—", color: "#a78bfa", icon: "🔥" },
              { label: "Checked Out", value: summary?.checked_out ?? "—", color: "#94a3b8", icon: "🚪" },
            ].map(card => (
              <div key={card.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{card.icon}</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Active Connectors */}
          <h3 style={{ color: "#94a3b8", fontSize: "0.875rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>Active Connectors</h3>
          {connectors.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed #334155", borderRadius: "12px", padding: "2rem", textAlign: "center", color: "#475569" }}>
              No connectors configured yet. Go to the <strong style={{ color: "#38bdf8" }}>Connectors</strong> tab to add your attendance system.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {connectors.map(c => {
                const prov = PROVIDERS.find(p => p.id === c.provider);
                return (
                  <div key={c.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "1.5rem" }}>{prov?.icon ?? "🔌"}</div>
                    <div style={{ flex: 1, minWidth: "160px" }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{prov?.label ?? c.provider} • {c.sync_mode}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.status === "active" ? "#22c55e" : c.status === "error" ? "#ef4444" : "#f59e0b", display: "inline-block" }} />
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.status}</span>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#475569" }}>
                      {c.last_sync_at ? `Last sync: ${new Date(c.last_sync_at).toLocaleTimeString()}` : "Never synced"}
                      {c.records_synced > 0 && ` • ${c.records_synced} records`}
                    </div>
                    <button onClick={() => syncConnector(c.id)} disabled={syncing === c.id} style={{ padding: "0.35rem 0.9rem", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
                      {syncing === c.id ? "⏳ Syncing…" : "↻ Sync Now"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONNECTORS VIEW ── */}
      {view === "connectors" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, color: "#e2e8f0" }}>Configured Connectors ({connectors.length})</h3>
          </div>

          {/* Existing connectors */}
          {connectors.map(c => {
            const prov = PROVIDERS.find(p => p.id === c.provider);
            return (
              <div key={c.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "2rem" }}>{prov?.icon ?? "🔌"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{c.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>{prov?.label ?? c.provider}</div>
                    {c.last_error && <div style={{ fontSize: "0.75rem", color: "#f87171", marginTop: "0.3rem" }}>⚠ {c.last_error}</div>}
                    {c.last_sync_at && <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: "0.2rem" }}>Last synced: {new Date(c.last_sync_at).toLocaleString()} • {c.records_synced} records</div>}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button onClick={() => { setTesting(false); testConnector(c.id); setTestResult(null); }} disabled={testing} style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid #334155", background: "transparent", color: "#38bdf8", cursor: "pointer", fontSize: "0.8rem" }}>
                      🔍 Test
                    </button>
                    <button onClick={() => syncConnector(c.id)} disabled={syncing === c.id} style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", cursor: "pointer", fontSize: "0.8rem" }}>
                      {syncing === c.id ? "⏳" : "↻ Sync"}
                    </button>
                    <button onClick={() => deleteConnector(c.id)} style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid #7f1d1d", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: "0.8rem" }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
                {testResult && (
                  <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "8px", background: testResult.success ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)", border: `1px solid ${testResult.success ? "#16a34a" : "#dc2626"}`, fontSize: "0.85rem", color: testResult.success ? "#4ade80" : "#f87171" }}>
                    {testResult.success ? "✅" : "❌"} {testResult.message}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New — Provider Grid */}
          <h3 style={{ color: "#94a3b8", fontSize: "0.875rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "1.5rem 0 0.75rem" }}>Add New Connector</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" }}>
            {PROVIDERS.map(prov => (
              <button key={prov.id} onClick={() => openAddModal(prov)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem", cursor: "pointer", textAlign: "left", transition: "all 0.2s", color: "#e2e8f0" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{prov.icon}</span>
                  <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "20px", background: `${prov.badgeColor}22`, color: prov.badgeColor, border: `1px solid ${prov.badgeColor}44`, fontWeight: 600 }}>{prov.badge}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{prov.label}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4 }}>{prov.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── EVENTS LOG VIEW ── */}
      {view === "events" && (
        <div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
            <label style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Date:</label>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.875rem" }} />
            <button onClick={fetchEvents} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", cursor: "pointer", fontSize: "0.875rem" }}>🔄 Refresh</button>
            <span style={{ color: "#475569", fontSize: "0.8rem" }}>{events.length} records</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#475569" }}>Loading attendance records…</div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#475569", border: "1px dashed #334155", borderRadius: "12px" }}>
              No attendance records for {dateFilter}.<br />
              <span style={{ fontSize: "0.8rem" }}>Connect a biometric system via the Connectors tab or trigger a manual sync.</span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e293b" }}>
                    {["Employee", "Department", "Time", "Type", "Via", "Location", "Temp", "Source"].map(h => (
                      <th key={h} style={{ padding: "0.6rem 0.75rem", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <div style={{ fontWeight: 600 }}>{e.employee_name || e.employee_code}</div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>#{e.employee_code}</div>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#94a3b8" }}>{e.department || "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>{new Date(e.punch_timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, background: `${PUNCH_COLORS[e.punch_type] ?? "#475569"}22`, color: PUNCH_COLORS[e.punch_type] ?? "#94a3b8", border: `1px solid ${PUNCH_COLORS[e.punch_type] ?? "#475569"}44` }}>
                          {PUNCH_LABELS[e.punch_type] ?? e.punch_type}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#94a3b8", fontSize: "0.75rem" }}>{e.verify_method?.replace("_", " ") ?? "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#64748b", fontSize: "0.75rem" }}>{e.location_name || e.device_serial || "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: e.temperature && e.temperature > 37.5 ? "#f87171" : "#94a3b8", fontSize: "0.8rem" }}>
                        {e.temperature ? `${e.temperature}°C` : "—"}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "#475569", background: "#1e293b", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{e.source_system?.replace("_", " ")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADD CONNECTOR MODAL ── */}
      {showAddModal && selectedProvider && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{selectedProvider.icon} {selectedProvider.label}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{selectedProvider.description}</div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>Connector Name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.9rem", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>Sync Mode</label>
              <select value={formSyncMode} onChange={e => setFormSyncMode(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.9rem" }}>
                <option value="poll">Poll (CareFlow pulls data on schedule)</option>
                <option value="push">Push (Device/system pushes data to CareFlow)</option>
                <option value="webhook">Webhook (Real-time HTTP POST events)</option>
              </select>
            </div>

            {selectedProvider.fields.map(field => (
              <div key={field.key} style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>{field.label}</label>
                <input
                  type={(field as any).type ?? "text"}
                  value={formData[field.key] ?? ""}
                  onChange={e => setFormData(d => ({ ...d, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.9rem", boxSizing: "border-box" }}
                />
              </div>
            ))}

            {/* ZKTeco PUSH — show device config instructions */}
            {selectedProvider.id === "zkteco_push" && (
              <div style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "10px", padding: "1rem", marginBottom: "1rem", fontSize: "0.8rem", color: "#7dd3fc" }}>
                <strong>📌 Device Setup Instructions</strong>
                <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.8 }}>
                  <li>On ZKTeco device: <strong>Comm → ADMS → Server URL</strong></li>
                  <li>Set URL to: <code style={{ background: "#1e293b", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>{window.location.origin}/iclock/cdata</code></li>
                  <li>Set heartbeat: <strong>60 seconds</strong></li>
                  <li>Save and restart device</li>
                </ol>
                <div style={{ marginTop: "0.5rem", color: "#94a3b8" }}>Webhook URL: <code style={{ background: "#1e293b", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>{window.location.origin}/api/v1/attendance/webhook/zkteco_push</code></div>
              </div>
            )}

            {testResult && (
              <div style={{ padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", background: testResult.success ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)", border: `1px solid ${testResult.success ? "#16a34a" : "#dc2626"}`, color: testResult.success ? "#4ade80" : "#f87171", fontSize: "0.85rem" }}>
                {testResult.success ? "✅" : "❌"} {testResult.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button onClick={saveConnector} disabled={loading} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                {loading ? "Saving…" : "💾 Save Connector"}
              </button>
              <button onClick={() => setShowAddModal(false)} style={{ padding: "0.75rem 1.25rem", borderRadius: "10px", border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;
