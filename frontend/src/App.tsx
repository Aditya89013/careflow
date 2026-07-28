import { useState, useEffect } from "react";
import careflowLogo from "./assets/careflow_logo.png";
import { API_URL } from "./config";
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "intake" | "finder" | "shifts">("finder");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Auto-set activeTab when user logs in or logs out
  useEffect(() => {
    if (!user) {
      setActiveTab("finder");
    } else {
      setActiveTab("dashboard");
    }
  }, [user]);

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
          setOutbox(prev => prev.filter(i => i !== item));
        }
      } catch (err) {
        console.error("Failed to sync offline item:", err);
      }
    }
  };

  useEffect(() => {
    if (isOnline) {
      processOutbox();
    }
  }, [isOnline, outbox]);

  const fetchRecommendations = async (patientId: string) => {
    if (!isOnline) return;
    setLoadingRecs(true);
    try {
      const res = await fetch(`${API_URL}/allocations/recommendations/${patientId}`, {
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
        addLog("Constraint-based circadian shift roster generated successfully.");
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to generate shifts.");
    }
  };

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

  // Patient Portal View
  if (isAuthenticated && user?.role === "patient") {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50">
          <div className="flex items-center space-x-3">
            <img src={careflowLogo} alt="CareFlow Logo" className="h-8 w-8 object-contain opacity-90" />
            <div>
              <h1 className="font-semibold text-lg text-gray-900 tracking-tight leading-none">CareFlow</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-1 uppercase">Patient Portal</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          <RoleRouter />
        </main>
        <footer className="bg-transparent py-6">
          <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} CareFlow Secure Health Network.</span>
          </div>
        </footer>
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
          setOutbox(prev => prev.filter(i => i !== item));
        }
      } catch (err) {
        console.error("Failed to sync offline item:", err);
      }
    }
  };

  useEffect(() => {
    if (isOnline) {
      processOutbox();
    }
  }, [isOnline, outbox]);

  const fetchRecommendations = async (patientId: string) => {
    if (!isOnline) return;
    setLoadingRecs(true);
    try {
      const res = await fetch(`${API_URL}/allocations/recommendations/${patientId}`, {
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
        addLog("Constraint-based circadian shift roster generated successfully.");
      }
    } catch (err) {
      console.error(err);
      addLog("Failed to generate shifts.");
    }
  };

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

  // Patient Portal View
  if (isAuthenticated && user?.role === "patient") {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50">
          <div className="flex items-center space-x-3">
            <img src={careflowLogo} alt="CareFlow Logo" className="h-8 w-8 object-contain opacity-90" />
            <div>
              <h1 className="font-semibold text-lg text-gray-900 tracking-tight leading-none">CareFlow</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-1 uppercase">Patient Portal</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          <RoleRouter />
        </main>
        <footer className="bg-transparent py-6">
          <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} CareFlow Secure Health Network.</span>
          </div>
        </footer>
        <ChatbotWidget userRole="patient" />
      </div>
    );
  }

  // Public / Unauthenticated Default View OR Staff View
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50">
        <div className="flex items-center space-x-3">
          <img src={careflowLogo} alt="CareFlow Logo" className="h-8 w-8 object-contain opacity-90" />
          <div>
            <h1 className="font-semibold text-lg text-gray-900 tracking-tight leading-none">CareFlow</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-1 uppercase">
              {isAuthenticated ? "Operations Command Center" : "Public Emergency Network"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {isAuthenticated ? (
            <>
              <div className="flex flex-col text-right">
                <span className="text-xs font-medium text-gray-900">{user?.first_name}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{user?.role.replace("_", " ")}</span>
              </div>

              <button
                onClick={() => setIsOnline(!isOnline)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-2 transition-colors ${
                  isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
                <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
              </button>

              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Staff / Patient Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Navigation Tabs */}
        {isAuthenticated && (
          <nav className="flex space-x-6 border-b border-gray-200 pb-px">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "intake", label: "Triage & Allocation" },
              { id: "finder", label: "Emergency Finder" },
              { id: "shifts", label: "Staff Scheduling" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? "border-b-2 border-slate-900 text-slate-900" 
                    : "border-b-2 border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        <div>
          {(!isAuthenticated || activeTab === "finder") && (
            <FinderScreen 
              hospitalId="8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d"
              onSendAlert={handleSendAlert}
              showArrivalAck={showArrivalAck}
            />
          )}

          {isAuthenticated && activeTab === "dashboard" && <RoleRouter />}

          {isAuthenticated && activeTab === "intake" && (
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

          {isAuthenticated && activeTab === "shifts" && (
            <ShiftsScreen 
              shifts={shifts}
              onGenerateShifts={handleGenerateShifts}
              onSwapRequest={handleSwapRequest}
              userRole={user?.role}
            />
          )}
        </div>
      </main>

      {/* Login Modal Overlay for Unauthenticated Users */}
      {showLoginModal && !isAuthenticated && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-all z-10"
              title="Close Login Modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <LoginPage onLoginSuccess={() => setShowLoginModal(false)} />
          </div>
        </div>
      )}

      <ChatbotWidget userRole={user?.role || "public"} />
    </div>
  );
}
