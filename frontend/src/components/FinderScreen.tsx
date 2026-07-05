import React, { useState, useEffect, useRef } from "react";

declare const L: any;

interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distance_km: number;
  capacity: {
    ICU_beds: string;
    ventilators: string;
    status: string;
  };
}

interface FinderScreenProps {
  hospitalId: string;
  onSendAlert: (payload: any) => Promise<void>;
  showArrivalAck: boolean;
}

export const FinderScreen: React.FC<FinderScreenProps> = ({
  hospitalId,
  onSendAlert,
  showArrivalAck
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [_hospitalsList, setHospitalsList] = useState<Hospital[]>([]);
  const [incident, setIncident] = useState("EMS Critical Care");
  const [eta, setEta] = useState("");

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center map around Delhi, India area coordinates
    const mapInstance = L.map(mapContainerRef.current).setView([28.5450, 77.1900], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    // Fix classical Leaflet tab transition viewport recalculation bug
    setTimeout(() => {
      if (mapInstance) {
        mapInstance.invalidateSize();
      }
    }, 150);

    const fetchHospitals = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/v1/public/hospitals");
        if (res.ok) {
          const data = await res.json();
          const list: Hospital[] = data.hospitals;
          setHospitalsList(list);

          list.forEach((hosp: Hospital) => {
            const marker = L.marker([hosp.latitude, hosp.longitude]).addTo(mapInstance);
            const statusColor = hosp.capacity.status === "Green" ? "green" : hosp.capacity.status === "Yellow" ? "orange" : "red";
            marker.bindPopup(`
              <div style="font-family: sans-serif; line-height: 1.4;">
                <b style="font-size: 14px; color: #1e293b;">${hosp.name}</b><br/>
                <span style="font-size: 11px; color: #64748b;">${hosp.address}</span><br/>
                <hr style="margin: 6px 0; border: 0; border-top: 1px solid #f1f5f9;"/>
                <b>ICU Beds:</b> ${hosp.capacity.ICU_beds}<br/>
                <b>Ventilators:</b> ${hosp.capacity.ventilators}<br/>
                <b>Capacity Index:</b> <span style="color: ${statusColor}; font-weight: bold;">${hosp.capacity.status}</span>
              </div>
            `);
          });
        }
      } catch (err) {
        console.error("Failed to load map markers:", err);
      }
    };

    fetchHospitals();

    return () => {
      mapInstance.remove();
    };
  }, []);

  const handleDispatchAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eta) return;
    await onSendAlert({
      hospitalId,
      incident_protocol: incident,
      estimated_arrival_minutes: Number(eta),
      critical_needs: ["ICU_bed"],
      severity: "high"
    });
    setEta("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Map display column */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Hospital Emergency Finder (Regional Maps)</h2>
          <div 
            ref={mapContainerRef} 
            className="w-full h-[450px] rounded-xl border border-gray-100 shadow-inner z-0" 
          />
        </div>
      </div>

      {/* Emergency dispatch form column */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">EMS Dispatch Coordinator</h2>
            <p className="text-gray-400 text-xs mt-1">Alert hospital operations of incoming critical arrivals.</p>
          </div>

          <form onSubmit={handleDispatchAlert} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="incidentSelect" className="text-xs font-bold text-gray-400 uppercase">Emergency Incident Protocol</label>
              <select 
                id="incidentSelect"
                value={incident} 
                onChange={e => setIncident(e.target.value)}
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none text-gray-700 bg-white"
              >
                <option value="EMS Critical Care">EMS Critical Care Transit</option>
                <option value="Cardiac Arrest Alert">Cardiac Arrest Alert (Level 1)</option>
                <option value="Severe Trauma Protocol">Severe Trauma Protocol</option>
                <option value="Respiratory Distress">Acute Respiratory Distress (ARD)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="etaInput" className="text-xs font-bold text-gray-400 uppercase">Estimated Arrival (Minutes)</label>
              <input 
                id="etaInput"
                type="number" 
                placeholder="15" 
                value={eta} 
                onChange={e => setEta(e.target.value)} 
                required 
                className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 transition text-gray-700"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-150 active:scale-95 shadow-sm shadow-red-200"
            >
              Dispatch EMS warning
            </button>
          </form>

          {showArrivalAck && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-xs text-center font-semibold">
              ✔ ACKNOWLEDGED: Regional intake queues notified successfully.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
