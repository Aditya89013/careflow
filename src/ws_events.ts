import { WebSocket } from "ws";

// Map of hospital_id -> set of active WebSocket connections
export const subscriptions = new Map<string, Set<WebSocket>>();

// Broadcast Helper to notify subscribed dashboards of real-time state changes
export function broadcastHospitalEvent(hospitalId: string, event: any) {
  const clients = subscriptions.get(hospitalId);
  if (clients) {
    const payload = JSON.stringify(event);
    clients.forEach(client => {
      if (client.readyState === 1) { // 1 is WebSocket.OPEN in ws
        try {
          client.send(payload);
        } catch (err) {
          console.error("Failed to send WebSocket payload:", err);
        }
      }
    });
  }
}
