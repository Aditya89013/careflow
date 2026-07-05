import React, { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
  toolUsed?: string;
  isAction?: boolean;
}

interface ChatbotWidgetProps {
  userRole: string;
}

// ─────────────────────────────────────────────────────────────────
// Helpers — minimal markdown renderer (no external deps)
// ─────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((l, i) => nodes.push(<p key={`tl-${i}`} className="text-xs text-gray-600">{l}</p>));
      tableBuffer = [];
      return;
    }
    const headers = tableBuffer[0].split("|").map(h => h.trim()).filter(Boolean);
    const rows    = tableBuffer.slice(2).map(r => r.split("|").map(c => c.trim()).filter(Boolean));
    nodes.push(
      <div key={`tbl-${nodes.length}`} className="overflow-x-auto my-2">
        <table className="text-[10px] w-full border-collapse">
          <thead>
            <tr className="bg-blue-50">
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-1 text-left font-semibold text-blue-700 border border-blue-100">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1 text-gray-700 border border-gray-100 font-mono">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  const inlineFormat = (s: string, key: string): React.ReactNode => {
    // Bold + code
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    if (parts.length === 1) return <span key={key}>{s}</span>;
    return (
      <span key={key}>
        {parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**"))
            return <strong key={i} className="font-semibold text-gray-900">{p.slice(2, -2)}</strong>;
          if (p.startsWith("`") && p.endsWith("`"))
            return <code key={i} className="bg-blue-50 text-blue-700 px-1 rounded text-[10px] font-mono">{p.slice(1, -1)}</code>;
          return <span key={i}>{p}</span>;
        })}
      </span>
    );
  };

  lines.forEach((line, idx) => {
    const k = `l-${idx}`;

    if (line.startsWith("|")) {
      tableBuffer.push(line);
      return;
    } else if (tableBuffer.length) {
      flushTable();
    }

    if (line.startsWith("### "))
      nodes.push(<h4 key={k} className="font-bold text-[11px] text-gray-800 mt-2 mb-1">{line.slice(4)}</h4>);
    else if (line.startsWith("## "))
      nodes.push(<h3 key={k} className="font-bold text-xs text-gray-900 mt-2 mb-1">{line.slice(3)}</h3>);
    else if (line.startsWith("# "))
      nodes.push(<h2 key={k} className="font-bold text-sm text-gray-900 mt-2 mb-1">{line.slice(2)}</h2>);
    else if (/^[-*•] /.test(line))
      nodes.push(<li key={k} className="text-xs text-gray-700 ml-3 list-disc">{inlineFormat(line.replace(/^[-*•] /, ""), k + "i")}</li>);
    else if (line.trim() === "")
      nodes.push(<div key={k} className="h-1" />);
    else
      nodes.push(<p key={k} className="text-xs text-gray-700 leading-relaxed">{inlineFormat(line, k + "i")}</p>);
  });

  if (tableBuffer.length) flushTable();
  return nodes;
}

// Tool-name → emoji + label map
const TOOL_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  admitPatient:                 { emoji: "🏥", label: "Patient Admitted",       color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  getAllocationRecommendations: { emoji: "🔬", label: "SOFA-2 Matching",         color: "bg-purple-50 text-purple-700 border-purple-200" },
  confirmAllocation:            { emoji: "✅", label: "Allocation Confirmed",    color: "bg-blue-50 text-blue-700 border-blue-200" },
  generateShifts:               { emoji: "📅", label: "Shifts Generated",        color: "bg-amber-50 text-amber-700 border-amber-200" },
  getHospitalStatus:            { emoji: "📊", label: "Live Status Snapshot",    color: "bg-indigo-50 text-indigo-700 border-indigo-200" }
};

const SUGGESTED_CHIPS = [
  { label: "🏥 Admit emergency patient",      prompt: "Admit a critical patient named John Doe to ICU with ventilator. HR 105, BP 90/60, O2 88%" },
  { label: "🔬 Get SOFA-2 recommendations",   prompt: "Get allocation recommendations for last patient" },
  { label: "📅 Generate shifts for 3 days",   prompt: "Generate shift schedule for the next 3 days" },
  { label: "📊 Hospital capacity status",     prompt: "Show current hospital status and capacity" }
];

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: `👋 **Welcome to CareFlow AI Guide**

I'm a **fully agentic** assistant that can perform real actions in your hospital system:

| Command | Trigger phrase |
|---------|----------------|
| 🏥 Admit patient | *"Admit Jane Doe to ICU..."* |
| 🔬 Get recommendations | *"Recommendations for last patient"* |
| ✅ Confirm allocation | *"Assign patient p-123 to bed b2"* |
| 📅 Generate shifts | *"Generate shifts for next 3 days"* |
| 📊 Hospital status | *"Show capacity and queue"* |

Try one of the quick actions below ↓`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userMsg: Message = { sender: "user", text: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-bypass-auth": "true",
          "x-bypass-role": userRole
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(m => ({
            role:    m.sender === "user" ? "user" : "assistant",
            content: m.text
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          {
            sender:   "bot",
            text:     data.reply ?? "I encountered an issue processing that request.",
            timestamp: new Date(),
            toolUsed:  data.tool_used,
            isAction:  Boolean(data.tool_used)
          }
        ]);
      } else {
        throw new Error(`${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("[ChatbotWidget]", err);
      setMessages(prev => [
        ...prev,
        {
          sender:    "bot",
          text:      "⚠️ Could not reach the CareFlow server. Please ensure the backend is running on port 3001.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const showChips = messages.length <= 1;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">

      {/* ── Floating Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: 56, height: 56,
            background: "linear-gradient(135deg, #3B82F6, #6366F1)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            cursor: "pointer",
            position: "relative",
            transition: "transform 0.15s"
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          aria-label="Open CareFlow AI Guide"
        >
          <span style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "rgba(99,102,241,0.3)",
            animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite"
          }} />
          <svg width="22" height="22" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div style={{
          width: 400, height: 560,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(16px)",
          borderRadius: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
          border: "1px solid rgba(0,0,0,0.07)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "slideUp 0.2s ease-out"
        }}>

          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #2563EB, #4F46E5)",
            padding: "14px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16
              }}>🤖</div>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 13, letterSpacing: "0.01em" }}>
                  CareFlow AI Guide
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#4ADE80",
                    animation: "pulse 2s infinite"
                  }} />
                  <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>
                    Agentic Mode • 5 Tools Active
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "none", borderRadius: 8,
                color: "rgba(255,255,255,0.85)",
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 14,
                transition: "background 0.15s"
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "14px 14px 6px",
            display: "flex", flexDirection: "column", gap: 10,
            background: "#F8FAFC"
          }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: m.sender === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%" }}>
                  {/* Tool badge */}
                  {m.toolUsed && TOOL_LABELS[m.toolUsed] && (
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 7px", borderRadius: 99,
                      marginBottom: 4,
                      border: "1px solid",
                      ...Object.fromEntries(
                        TOOL_LABELS[m.toolUsed].color
                          .split(" ")
                          .map(cls => {
                            if (cls.startsWith("bg-")) return ["background", cls];
                            if (cls.startsWith("text-")) return ["color", cls];
                            if (cls.startsWith("border-")) return ["borderColor", cls];
                            return [cls, cls];
                          })
                      )
                    }}>
                      {TOOL_LABELS[m.toolUsed].emoji} {TOOL_LABELS[m.toolUsed].label}
                    </div>
                  )}

                  {/* Bubble */}
                  <div style={{
                    padding: "10px 13px",
                    borderRadius: m.sender === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: m.sender === "user"
                      ? "linear-gradient(135deg, #3B82F6, #6366F1)"
                      : "white",
                    color: m.sender === "user" ? "white" : "#1E293B",
                    boxShadow: m.sender === "user"
                      ? "0 2px 12px rgba(99,102,241,0.25)"
                      : "0 1px 6px rgba(0,0,0,0.07)",
                    border: m.sender === "bot" ? "1px solid rgba(0,0,0,0.06)" : "none"
                  }}>
                    {m.sender === "user"
                      ? <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>{m.text}</p>
                      : <div style={{ fontSize: 12, lineHeight: 1.6 }}>{renderMarkdown(m.text)}</div>
                    }
                    <div style={{
                      fontSize: 9, marginTop: 5, textAlign: "right", opacity: 0.55,
                      color: m.sender === "user" ? "rgba(255,255,255,0.8)" : "#64748B"
                    }}>
                      {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  background: "white", border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: "18px 18px 18px 4px",
                  padding: "10px 16px",
                  display: "flex", alignItems: "center", gap: 5,
                  boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
                }}>
                  {[0, 150, 300].map(delay => (
                    <span key={delay} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#6366F1",
                      animation: `bounce 1s ${delay}ms infinite`
                    }} />
                  ))}
                  <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 4 }}>Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {showChips && (
            <div style={{
              padding: "8px 12px",
              background: "white",
              borderTop: "1px solid rgba(0,0,0,0.05)",
              display: "flex", flexWrap: "wrap", gap: 5
            }}>
              {SUGGESTED_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.prompt)}
                  style={{
                    fontSize: 10, fontWeight: 600,
                    padding: "4px 10px", borderRadius: 99,
                    background: "#EEF2FF",
                    color: "#4338CA",
                    border: "1px solid #C7D2FE",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#4338CA"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#4338CA"; }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            background: "white",
            borderTop: "1px solid rgba(0,0,0,0.05)",
            display: "flex", gap: 8, alignItems: "center"
          }}>
            <input
              type="text"
              placeholder="Admit a patient, check status, generate shifts…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend(input)}
              disabled={isLoading}
              style={{
                flex: 1,
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: "8px 14px",
                fontSize: 12,
                color: "#1E293B",
                outline: "none",
                transition: "border 0.15s"
              }}
              onFocus={e => (e.target.style.borderColor = "#6366F1")}
              onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isLoading}
              style={{
                width: 36, height: 36,
                background: !input.trim() || isLoading
                  ? "#CBD5E1"
                  : "linear-gradient(135deg, #3B82F6, #6366F1)",
                border: "none", borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                boxShadow: !input.trim() || isLoading ? "none" : "0 2px 8px rgba(99,102,241,0.3)"
              }}
              aria-label="Send message"
            >
              <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── CSS keyframes injected inline ── */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};
