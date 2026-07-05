import React from "react";
import type { Bed, Patient, Allocation } from "../App";

interface IncomingAlert {
  id: string;
  estimated_arrival_minutes: number;
  critical_needs: string[];
  severity: "high" | "medium";
  timestamp: string;
  incident_protocol?: string;
}

interface DashboardProps {
  beds: Bed[];
  patients: Patient[];
  allocations: Allocation[];
  incomingAlerts: IncomingAlert[];
  logs: string[];
  onExportFHIR: (patientId: string) => Promise<any>;
}

export const DashboardScreen: React.FC<DashboardProps> = ({
  beds,
  patients,
  allocations: _allocations,
  incomingAlerts,
  logs,
  onExportFHIR
}) => {
  const [selectedFHIRBundle, setSelectedFHIRBundle] = React.useState<any | null>(null);
  const [selectedFHIRPatientName, setSelectedFHIRPatientName] = React.useState<string>("");
  const [loadingFHIR, setLoadingFHIR] = React.useState<boolean>(false);
  const triggerExportFHIR = async (patient: Patient) => {
    setLoadingFHIR(true);
    setSelectedFHIRPatientName(`${patient.first_name} ${patient.last_name}`);
    try {
      const bundle = await onExportFHIR(patient.id);
      setSelectedFHIRBundle(bundle);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFHIR(false);
    }
  };

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.status === "occupied").length;
  const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Real-time EMS Warning alerts bar */}
      {incomingAlerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md animate-pulse">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-red-800 font-bold text-sm uppercase tracking-wider">
                🚨 CRITICAL WARNING: EMS Incoming Incident
              </p>
              {incomingAlerts.map(alert => (
                <p key={alert.id} className="text-red-700 text-sm mt-1">
                  <b>{alert.incident_protocol || "EMS Rescue"}</b>: ETA {alert.estimated_arrival_minutes} mins. Needs: {alert.critical_needs.join(", ")} (Severity: {alert.severity})
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hospital metrics rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Bed Capacity</span>
          <span className="text-3xl font-extrabold text-gray-900 mt-2 tabular-nums">{totalBeds}</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Occupied Beds</span>
          <span className="text-3xl font-extrabold text-blue-600 mt-2 tabular-nums">{occupiedBeds}</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Bed Occupancy</span>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-3xl font-extrabold text-gray-900 tabular-nums">{occupancyPercentage}%</span>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients Admission Queue list */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Active Patient Queue</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="py-2">Patient</th>
                  <th className="py-2">Triage Level</th>
                  <th className="py-2">Vitals</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">No patients currently in queue.</td>
                  </tr>
                ) : (
                  patients.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-semibold text-gray-900">{p.first_name} {p.last_name}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.triage_level.startsWith("1") ? "bg-red-100 text-red-700" :
                          p.triage_level.startsWith("2") ? "bg-orange-100 text-orange-700" :
                          p.triage_level.startsWith("3") ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {p.triage_level.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500 tabular-nums">
                        {p.vitals ? `HR: ${p.vitals.hr} | BP: ${p.vitals.bp} | O2: ${p.vitals.o2}` : "N/A"}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          p.status === "allocated" ? "bg-green-500" : "bg-yellow-500"
                        }`} />
                        <span className="ml-2 text-xs text-gray-600 capitalize">{p.status}</span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => triggerExportFHIR(p)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline transition"
                          disabled={loadingFHIR}
                        >
                          FHIR Export
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit event logs panel */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">System Activity Audit Log</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {logs.map((log, index) => (
              <div key={index} className="text-xs border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-mono">[System]</span>{" "}
                <span className="text-gray-700">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bed inventory list */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Ward Bed Allocations Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {beds.map(bed => (
            <div 
              key={bed.id} 
              className={`p-4 rounded-xl border flex flex-col justify-between h-28 transition-all ${
                bed.status === "free" ? "border-green-100 bg-green-50/20" :
                bed.status === "occupied" ? "border-blue-100 bg-blue-50/20" :
                "border-gray-100 bg-gray-50/20"
              }`}
            >
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{bed.type} Bed</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{bed.bed_number}</p>
              </div>
              <span className={`inline-block self-start px-2 py-0.5 rounded-md text-[10px] font-bold ${
                bed.status === "free" ? "bg-green-100 text-green-700" :
                bed.status === "occupied" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {bed.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* HL7 FHIR Bundle Modal */}
      {selectedFHIRBundle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">HL7 FHIR Observation Bundle</h3>
                <p className="text-xs text-gray-500 mt-0.5">Patient: <span className="font-semibold text-gray-700">{selectedFHIRPatientName}</span></p>
              </div>
              <button 
                onClick={() => setSelectedFHIRBundle(null)}
                className="text-gray-400 hover:text-gray-600 font-semibold p-1 hover:bg-gray-100 rounded-full transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <p className="text-xs text-gray-500">
                This valid HL7 FHIR Bundle contains observation resources for heart rate, blood pressure, and oxygen saturation parameters mapped using standard LOINC system codes.
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-xl overflow-x-auto max-h-[40vh] shadow-inner select-all">
                  {JSON.stringify(selectedFHIRBundle, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedFHIRBundle, null, 2));
                  alert("Copied FHIR Bundle JSON to clipboard!");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-sm transition active:scale-95"
              >
                Copy to Clipboard
              </button>
              <button 
                onClick={() => setSelectedFHIRBundle(null)}
                className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-2 px-4 rounded-lg text-sm transition active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
