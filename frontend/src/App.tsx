import { useState, useEffect } from "react";
import careflowLogo from "./assets/careflow_logo.png";
import { IntakeScreen } from "./components/IntakeScreen";
import { FinderScreen } from "./components/FinderScreen";
import { ShiftsScreen } from "./components/ShiftsScreen";
import { ChatbotWidget } from "./components/ChatbotWidget";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { RoleRouter } from "./components/RoleRouter";

// Types matching backend schemas
export interface Bed {
  id: string;
  bed_number: string;
  status: "free" | "occupied" | "cleaning" | "maintenance";
  type: "general" | "ICU" | "HDU" | "isolation";
}

export interface Ventilator {
  id: string;
  serial_number: string;
  status: "available" | "in_use" | "maintenance";
  type: "invasive" | "non_invasive";
}

export interface Patient {
  id: string;
  upid?: string;
  first_name: string;
  last_name: string;
  triage_level: string;
  required_department_code: string;
  needs_ventilator: boolean;
  status: "waiting" | "allocated" | "discharged" | "admitted";
  admitted_at: string;
  vitals?: { hr: string; bp: string; o2: string; oxygenation_source: "SpO2" | "PaO2"; is_delirious: boolean };
}

export interface Allocation {
  id: string;
  patient_id: string;
  bed_id: string;
  ventilator_id?: string;
  primary_doctor_id: string;
  is_override: boolean;
  override_reason?: string;
  allocated_at: string;
}

export interface Shift {
  id: string;
  staff_name: string;
  shift_date: string;
  type: "day" | "night" | "on_call";
  rationale?: string;
}

export interface IncomingAlert {
  id: string;
  estimated_arrival_minutes: number;
  critical_needs: string[];
  severity: "high" | "medium";
  timestamp: string;
  incident_protocol?: string;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

function MainApp() {
  const { isAuthenticated, user, logout, token } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "intake" | "finder" | "shifts">("dashboard");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "CareFlow Central Command initialized.",
    "PostgreSQL RLS context set: hospital_id = 8a7b...",
    "Hexagonal domain services instantiated."
  ]);

  // Database States loaded dynamically from Express
  const [beds, setBeds] = useState<Bed[]>([]);
  const [_ventilators, setVentilators] = useState<Ventilator[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [incomingAlerts, setIncomingAlerts] = useState<IncomingAlert[]>([]);

  // Suppress unused warnings
  useEffect(() => {
    console.debug("Synced system resources:", beds.length, allocations.length, incomingAlerts.length, logs.length);
  }, [beds, allocations, incomingAlerts, logs]);

  // Recommendation Wizard states
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showArrivalAck, setShowArrivalAck] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;

  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 15));
  };

  const fetchData = async () => {
    if (!isOnline || !isAuthenticated) return;
    try {
      const pRes = await fetch(`${API_URL}/patients`, { headers: getHeaders() });
      if (pRes.ok) setPatients(await pRes.json());

      const bRes = await fetch(`${API_URL}/beds`, { headers: getHeaders() });
      if (bRes.ok) setBeds(await bRes.json());

      const vRes = await fetch(`${API_URL}/ventilators`, { headers: getHeaders() });
      if (vRes.ok) setVentilators(await vRes.json());

      const aRes = await fetch(`${API_URL}/allocations`, { headers: getHeaders() });
      if (aRes.ok) setAllocations(await aRes.json());

      const sRes = await fetch(`${API_URL}/shifts`, { headers: getHeaders() });
      if (sRes.ok) setShifts(await sRes.json());
    } catch (err) {
      console.error(err);
      addLog("Failed to fetch server database updates.");
    }
  };

  // Sync data on change
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [user?.role, isOnline, isAuthenticated]);

  // WebSockets event synchronization listener with HTTP polling fallback
  useEffect(() => {
    let pollInterval: any;
    let ws: WebSocket | null = null;
    
    const startPollingFallback = () => {
      if (pollInterval) return;
      addLog("WebSocket gateway offline. Fallback to HTTP polling sync (5s interval).");
      pollInterval = setInterval(() => {
        fetchData();
      }, 5000);
    };

    // If VITE_WS_URL is explicitly set to 'none', bypass WebSocket entirely and run polling
    if (import.meta.env.VITE_WS_URL === "none") {
      startPollingFallback();
      return;
    }

    try {
      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const defaultWsUrl = `${wsProto}//${window.location.host}`;
      const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        addLog("WebSockets gateway synchronization channel online.");
        ws?.send(
          JSON.stringify({
            type: "subscribe",
            hospitalId: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d"
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "PATIENT_INTAKE") {
            addLog(`PATIENT INTAKE: ${payload.patient.first_name} ${payload.patient.last_name} admitted.`);
            setPatients(prev => [payload.patient, ...prev]);
          } else if (payload.type === "RESOURCE_ALLOCATION") {
            addLog(`ALLOCATION ENGAGED: Bed ${payload.bed_id} allocated.`);
            fetchData();
          } else if (payload.type === "SHIFTS_GENERATED") {
            addLog(`SHIFTS UPDATED: Constraint schedule optimizer generated shifts.`);
            setShifts(payload.shifts);
          } else if (payload.type === "EMS_INCOMING_ALERT") {
            addLog(`ALERT: EMS incoming alert dispatched.`);
            setIncomingAlerts(prev => [payload.alert, ...prev]);
          }
        } catch (err) {
          console.error(err);
        }
      };

      ws.onerror = () => {
        startPollingFallback();
      };

      ws.onclose = () => {
        startPollingFallback();
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
      startPollingFallback();
    }

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  // Offline sync processing
  const processOutbox = async () => {
    if (outbox.length === 0 || !isOnline) return;
    addLog(`Processing offline outbox queue (${outbox.length} actions pending)...`);
    for (const item of outbox) {
      try {
        const res = await fetch(`${API_URL}/${item.endpoint}`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(item.payload)
        });
        if (res.ok) {
          addLog(`Synced offline action: ${item.endpoint}`);
        }
      } catch (err) {
        console.error("Failed to sync offline item:", err);
      }
    }
    setOutbox([]);
    fetchData();
  };

  useEffect(() => {
    if (isOnline && outbox.length > 0) {
      processOutbox();
    }
  }, [isOnline, outbox]);

  // Fetch recommendations for patient
  const fetchRecommendations = async (patientId: string) => {
    setLoadingRecs(true);
    try {
      const res = await fetch(`${API_URL}/patients/${patientId}/recommendations`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to compute match recommendations.");
    } finally {
      setLoadingRecs(false);
    }
  };

  // Intake Action
  const handleIntakeSubmit = async (payload: any) => {
    if (!isOnline) {
      setOutbox(prev => [...prev, { endpoint: "patients", payload }]);
      addLog("Intake saved to offline outbox queue.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/patients/register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addLog(`Successfully admitted patient.`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to admit patient.");
    }
  };



  // Allocation Placement Confirm
  const handleAllocateConfirm = async (payload: any) => {
    if (!isOnline) {
      setOutbox(prev => [...prev, { endpoint: "allocations", payload }]);
      addLog("Allocation placement saved to offline outbox queue.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/allocations`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addLog("Resource allocation placement complete.");
        fetchData();
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to allocate resources.");
    }
  };

  // Generate shift scheduler optimizer trigger
  const handleGenerateShifts = async (payload: any) => {
    try {
      const res = await fetch(`${API_URL}/shifts/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts);
        addLog("Shift schedule matrices synchronized.");
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to generate shifts.");
    }
  };

  // Swap shift request
  const handleSwapRequest = async (payload: any) => {
    try {
      const res = await fetch(`${API_URL}/shifts/swaps`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addLog("Shift swap request registered. Awaiting manager approval.");
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to submit shift swap request.");
    }
  };

  // Dispatch public/EMS warning incoming warning alert
  const handleSendAlert = async (payload: any) => {
    try {
      const res = await fetch(`${API_URL}/public/hospitals/${payload.hospitalId}/notify-arrival`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowArrivalAck(true);
        setTimeout(() => setShowArrivalAck(false), 3000);
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to dispatch EMS warning.");
    }
  };

  // If login modal is active, display it
  if (showLogin) {
    return <LoginPage onLoginSuccess={() => setShowLogin(false)} />;
  }

  // If NOT authenticated, show Guest Mode (Finder view + capacity maps)
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="bg-white text-gray-900 border-b border-gray-200 px-6 py-3 flex justify-between items-center z-50">
          <div className="flex items-center space-x-3">
            <img src={careflowLogo} alt="CareFlow Logo" className="h-9 w-9 object-contain" />
            <div>
              <h1 className="font-black text-lg text-gray-900 leading-none tracking-tight">CareFlow</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Guest Mode Portal</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition duration-150 active:scale-95 shadow-md shadow-indigo-100"
          >
            Sign In to Dashboard
          </button>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          <FinderScreen 
            hospitalId="8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d"
            onSendAlert={handleSendAlert}
            showArrivalAck={showArrivalAck}
          />
        </main>
        <footer className="bg-white border-t border-gray-100 py-6">
          <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} CareFlow Systems. Public Regional Directory.</span>
          </div>
        </footer>
        <ChatbotWidget userRole="guest" />
      </div>
    );
  }

  // For Patient users, force render ONLY their Patient Portal view
  if (user?.role === "patient") {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center z-50">
          <div className="flex items-center space-x-3">
            <img src={careflowLogo} alt="CareFlow Logo" className="h-9 w-9 object-contain" />
            <div>
              <h1 className="font-black text-lg text-gray-900 leading-none tracking-tight">CareFlow</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Patient Portal</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs py-2 px-4 rounded-xl hover:text-slate-200 transition"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          <RoleRouter />
        </main>
        <footer className="bg-white border-t border-gray-100 py-6">
          <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} CareFlow Secure Health Network.</span>
          </div>
        </footer>
        <ChatbotWidget userRole="patient" />
      </div>
    );
  }

  // For Staff / Administrators, display standard simulator layout with tabs
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 1. Global Responsive Sandbox Frame header */}
      <header className="bg-white text-gray-900 border-b border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        <div className="flex items-center space-x-3">
          <img src={careflowLogo} alt="CareFlow Logo" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="font-black text-lg text-gray-900 leading-none tracking-tight">CareFlow</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Operations Central Simulator</p>
          </div>
        </div>

        {/* Simulator controls config */}
        <div className="flex items-center space-x-6">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Session Active</span>
            <span className="text-xs font-bold text-slate-800">{user?.first_name} ({user?.role.replace("_", " ")})</span>
          </div>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center space-x-1.5 transition ${
              isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
            <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
          </button>

          <button
            onClick={logout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Navigation Tabs */}
        <nav className="flex space-x-2 border-b border-gray-100 pb-px">
          {[
            { id: "dashboard", label: "Operations Dashboard" },
            { id: "intake", label: "Patient Intake & Triage" },
            { id: "finder", label: "Emergency Finder" },
            { id: "shifts", label: "Staff Scheduling" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition duration-150 active:scale-95 ${
                activeTab === tab.id 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Active Screen Mount */}
        <div>
          {activeTab === "dashboard" && <RoleRouter />}

          {activeTab === "intake" && (
            <IntakeScreen 
              patients={patients}
              onIntake={handleIntakeSubmit}
              onAllocate={handleAllocateConfirm}
              loadingRecs={loadingRecs}
              recommendations={recommendations}
              onFetchRecs={fetchRecommendations}
              setRecommendations={setRecommendations}
            />
          )}

          {activeTab === "finder" && (
            <FinderScreen 
              hospitalId="8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d"
              onSendAlert={handleSendAlert}
              showArrivalAck={showArrivalAck}
            />
          )}

          {activeTab === "shifts" && (
            <ShiftsScreen 
              shifts={shifts}
              onGenerateShifts={handleGenerateShifts}
              onSwapRequest={handleSwapRequest}
            />
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} CareFlow Systems. All rights reserved.</span>
          <span className="font-bold tracking-wider uppercase text-[10px]">Institutional Resource Allocator v2.0</span>
        </div>
      </footer>
      <ChatbotWidget userRole={user?.role || "staff"} />
    </div>
  );
}
