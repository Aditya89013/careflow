import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { API_URL } from "../../config";

export const EmployeeDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"shifts" | "resources">("shifts");
  const [shifts, setShifts] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const shiftsRes = await fetch(`${API_URL}/clinical/shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (shiftsRes.ok) {
          const s = await shiftsRes.json();
          // Filter shifts for this employee if user.id is available, else show all for now
          setShifts(s);
        }

        const resRes = await fetch(`${API_URL}/clinical/infrastructure`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resRes.ok) {
          const r = await resRes.json();
          setResources(r.resources || []);
        }
      } catch (err) {
        console.error("Error fetching employee data", err);
      }
    };
    fetchEmployeeData();
  }, [token]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Staff Dashboard</h1>
          <p style={styles.headerSubtitle}>Welcome back, {user?.email || "Employee"}</p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          Sign Out
        </button>
      </header>

      <div style={styles.tabs}>
        <button
          style={activeTab === "shifts" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("shifts")}
        >
          My Shifts
        </button>
        <button
          style={activeTab === "resources" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("resources")}
        >
          Ward Resources
        </button>
      </div>

      <main style={styles.main}>
        {activeTab === "shifts" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Upcoming Shifts</h2>
            {shifts.length === 0 ? (
              <p style={styles.emptyText}>No shifts scheduled.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Ward/OPD</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.shift_id}>
                      <td style={styles.td}>
                        {new Date(s.start_time).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>{s.shift_type}</td>
                      <td style={styles.td}>{s.ward_id || "N/A"}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor:
                              s.status === "scheduled" ? "#e0f2fe" : "#f1f5f9",
                            color:
                              s.status === "scheduled" ? "#0284c7" : "#64748b",
                          }}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "resources" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Resource Allocations</h2>
            {resources.length === 0 ? (
              <p style={styles.emptyText}>No resources currently allocated.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Resource ID</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Ward/OPD</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => (
                    <tr key={r.resource_id}>
                      <td style={styles.td}>{r.resource_id}</td>
                      <td style={styles.td}>{r.type}</td>
                      <td style={styles.td}>{r.ward_id || "Unassigned"}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor:
                              r.status === "available" ? "#dcfce7" : "#fee2e2",
                            color:
                              r.status === "available" ? "#166534" : "#991b1b",
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2rem 4rem",
    borderBottom: "1px solid #e2e8f0",
  },
  headerTitle: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
  },
  headerSubtitle: {
    margin: "0.25rem 0 0 0",
    color: "#64748b",
    fontSize: "0.875rem",
  },
  logoutBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabs: {
    display: "flex",
    gap: "2rem",
    padding: "0 4rem",
    borderBottom: "1px solid #e2e8f0",
  },
  tab: {
    padding: "1rem 0",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#64748b",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "color 0.2s",
  },
  activeTab: {
    padding: "1rem 0",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid #0f172a",
    color: "#0f172a",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  main: {
    padding: "4rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "2rem",
  },
  cardTitle: {
    margin: "0 0 1.5rem 0",
    fontSize: "1.25rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "0.875rem",
    textAlign: "center",
    padding: "2rem",
    border: "1px dashed #e2e8f0",
    borderRadius: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "1rem",
    borderBottom: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "1rem",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "0.875rem",
    color: "#334155",
  },
  badge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500,
    textTransform: "capitalize",
  },
};
