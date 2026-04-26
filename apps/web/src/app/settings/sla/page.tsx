"use client";

import { useState } from "react";

// ─── SLA Timer Definition ─────────────────────────────────────────────────────

interface SlaTimer {
  id: string;
  category: string;
  label: string;
  description: string;
  defaultMinutes: number;
  currentMinutes: number;
  unit: "minutes" | "hours" | "days";
  warningPct: number; // % of SLA before warning (yellow)
  escalateAction?: string;
}

const INITIAL_SLAS: SlaTimer[] = [
  // OSC Queue
  {
    id: "osc_acknowledge",
    category: "OSC Queue",
    label: "New Inbound → OSC Acknowledges",
    description: "Time for OSC to first acknowledge a new web form or Schellie chat lead",
    defaultMinutes: 5,
    currentMinutes: 5,
    unit: "minutes",
    warningPct: 60,
    escalateAction: "Notify DSM",
  },
  {
    id: "osc_route",
    category: "OSC Queue",
    label: "OSC Routes to Community / CSM Queue",
    description: "Time for OSC to assign a division, community, and route to CSM",
    defaultMinutes: 15,
    currentMinutes: 15,
    unit: "minutes",
    warningPct: 60,
    escalateAction: "Notify DSM",
  },
  {
    id: "osc_afterhours",
    category: "OSC Queue",
    label: "After-Hours Queue Processing",
    description: "Items that arrive after 6pm must be processed by this time next business day",
    defaultMinutes: 480, // 8am = 8 hours into next day
    currentMinutes: 480,
    unit: "minutes",
    warningPct: 80,
  },

  // OSC Webform SLAs (form-type specific)
  {
    id: "osc_form_schedule_visit",
    category: "OSC Webform",
    label: "Schedule Visit",
    description: "Hot lead — wants to tour a model home",
    defaultMinutes: 5,
    currentMinutes: 5,
    unit: "minutes",
    warningPct: 60,
    escalateAction: "Notify DSM",
  },
  {
    id: "osc_form_in_person_traffic",
    category: "OSC Webform",
    label: "In-Person Traffic",
    description: "Walk-in traffic — immediate attention",
    defaultMinutes: 5,
    currentMinutes: 5,
    unit: "minutes",
    warningPct: 60,
    escalateAction: "Notify DSM",
  },
  {
    id: "osc_form_zillow_lead",
    category: "OSC Webform",
    label: "Zillow/Trulia/Homes.com",
    description: "Paid portal lead — high intent",
    defaultMinutes: 10,
    currentMinutes: 10,
    unit: "minutes",
    warningPct: 60,
    escalateAction: "Notify DSM",
  },
  {
    id: "osc_form_schellie_conversion",
    category: "OSC Webform",
    label: "Schellie Chat Conversion",
    description: "Chatbot qualified lead",
    defaultMinutes: 10,
    currentMinutes: 10,
    unit: "minutes",
    warningPct: 60,
    escalateAction: "Notify DSM",
  },
  {
    id: "osc_form_interested",
    category: "OSC Webform",
    label: "Interested",
    description: "Expressed interest in a community",
    defaultMinutes: 15,
    currentMinutes: 15,
    unit: "minutes",
    warningPct: 60,
  },
  {
    id: "osc_form_rsvp",
    category: "OSC Webform",
    label: "RSVP",
    description: "Event signup — medium urgency",
    defaultMinutes: 30,
    currentMinutes: 30,
    unit: "minutes",
    warningPct: 50,
  },
  {
    id: "osc_form_prelaunch",
    category: "OSC Webform",
    label: "Prelaunch Community",
    description: "Early interest in upcoming community",
    defaultMinutes: 60,
    currentMinutes: 60,
    unit: "minutes",
    warningPct: 50,
  },
  {
    id: "osc_form_subscribe_community",
    category: "OSC Webform",
    label: "Subscribe Community",
    description: "Community newsletter signup",
    defaultMinutes: 240,
    currentMinutes: 240,
    unit: "hours",
    warningPct: 50,
  },
  {
    id: "osc_form_subscribe_region",
    category: "OSC Webform",
    label: "Subscribe Region",
    description: "Regional newsletter — lowest priority",
    defaultMinutes: 1440,
    currentMinutes: 1440,
    unit: "hours",
    warningPct: 50,
  },

  // CSM Queue
  {
    id: "csm_rank",
    category: "CSM Queue",
    label: "CSM Reviews and Ranks A/B/C",
    description: "Time for CSM to evaluate a promoted lead and assign prospect rank",
    defaultMinutes: 1440, // 24 hours
    currentMinutes: 1440,
    unit: "hours",
    warningPct: 50,
    escalateAction: "Notify DSM",
  },
  {
    id: "csm_first_outreach",
    category: "CSM Queue",
    label: "First Outreach After Ranking",
    description: "Time for CSM to make first contact after assigning A/B/C rank",
    defaultMinutes: 240, // 4 hours
    currentMinutes: 240,
    unit: "hours",
    warningPct: 50,
    escalateAction: "Notify DSM",
  },

  // Communication Response
  {
    id: "nr_sms",
    category: "Communication",
    label: "Inbound SMS Response",
    description: "Time to respond to an inbound text message",
    defaultMinutes: 5,
    currentMinutes: 5,
    unit: "minutes",
    warningPct: 60,
  },
  {
    id: "nr_email",
    category: "Communication",
    label: "Inbound Email Response",
    description: "Time to respond to an inbound email",
    defaultMinutes: 60,
    currentMinutes: 60,
    unit: "minutes",
    warningPct: 50,
  },
  {
    id: "nr_call",
    category: "Communication",
    label: "Missed Call Callback",
    description: "Time to return a missed phone call",
    defaultMinutes: 15,
    currentMinutes: 15,
    unit: "minutes",
    warningPct: 60,
  },

  // Prospect Follow-up
  {
    id: "prospect_a_followup",
    category: "Prospect Follow-up",
    label: "Prospect A — Next Touch",
    description: "Maximum days between contacts for A-rank prospects (contract imminent)",
    defaultMinutes: 1440, // 1 day
    currentMinutes: 1440,
    unit: "days",
    warningPct: 50,
    escalateAction: "Notify DSM + Auto-task",
  },
  {
    id: "prospect_b_followup",
    category: "Prospect Follow-up",
    label: "Prospect B — Next Touch",
    description: "Maximum days between contacts for B-rank prospects (intent within 30 days)",
    defaultMinutes: 4320, // 3 days
    currentMinutes: 4320,
    unit: "days",
    warningPct: 50,
    escalateAction: "Auto-task",
  },
  {
    id: "prospect_c_followup",
    category: "Prospect Follow-up",
    label: "Prospect C — Next Touch",
    description: "Maximum days between contacts for C-rank prospects (nurturing)",
    defaultMinutes: 10080, // 7 days
    currentMinutes: 10080,
    unit: "days",
    warningPct: 50,
  },
  {
    id: "prospect_stale",
    category: "Prospect Follow-up",
    label: "Stale Prospect Alert",
    description: "Days of no activity before prospect is flagged as stale",
    defaultMinutes: 20160, // 14 days
    currentMinutes: 20160,
    unit: "days",
    warningPct: 70,
    escalateAction: "Notify DSM + Flag in dashboard",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayTime(minutes: number, unit: "minutes" | "hours" | "days"): string {
  if (unit === "days") return `${Math.round(minutes / 1440)}d`;
  if (unit === "hours") return `${Math.round(minutes / 60)}h`;
  return `${minutes}m`;
}

function editValue(minutes: number, unit: "minutes" | "hours" | "days"): number {
  if (unit === "days") return Math.round(minutes / 1440);
  if (unit === "hours") return Math.round(minutes / 60);
  return minutes;
}

function toMinutes(value: number, unit: "minutes" | "hours" | "days"): number {
  if (unit === "days") return value * 1440;
  if (unit === "hours") return value * 60;
  return value;
}

const CATEGORY_COLORS: Record<string, string> = {
  "OSC Queue": "#f87171",
  "OSC Webform": "#fb923c",
  "CSM Queue": "#c084fc",
  "Communication": "#60a5fa",
  "Prospect Follow-up": "#4ade80",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlaSettingsPage() {
  const [slas, setSlas] = useState<SlaTimer[]>(INITIAL_SLAS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [bhStart, setBhStart] = useState("07:30");
  const [bhEnd, setBhEnd] = useState("17:00");
  const [bhTz, setBhTz] = useState("America/New_York");

  const categories = [...new Set(slas.map(s => s.category))];

  function handleChange(id: string, value: number) {
    setSlas(prev => prev.map(s =>
      s.id === id ? { ...s, currentMinutes: toMinutes(value, s.unit) } : s
    ));
    setSaved(false);
  }

  function handleSave() {
    // TODO: persist to Supabase sla_config table
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setSlas(prev => prev.map(s => ({ ...s, currentMinutes: s.defaultMinutes })));
    setSaved(false);
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, backgroundColor: "#09090b", minHeight: "100vh", overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#fafafa", margin: 0 }}>SLA Timers</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleReset} style={{
            padding: "8px 16px", borderRadius: 6, border: "1px solid #27272a",
            backgroundColor: "#18181b", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
          }}>Reset to Defaults</button>
          <button onClick={handleSave} style={{
            padding: "8px 16px", borderRadius: 6, border: "none",
            backgroundColor: saved ? "#166534" : "#80B602", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{saved ? "Saved" : "Save Changes"}</button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#71717a", marginBottom: 32, lineHeight: 1.6 }}>
        Response time targets drive alerts, escalations, and dashboard indicators.
        Items turn yellow at the warning threshold and red when SLA is breached.
      </p>

      {/* Business Hours */}
      <div style={{ marginBottom: 32, padding: 20, backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: "#fafafa" }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", margin: 0 }}>Business Hours</h2>
        </div>
        <p style={{ fontSize: 11, color: "#71717a", marginBottom: 16 }}>
          SLA timers only count during business hours. Items arriving after hours start their clock at the next business day.
        </p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 10, color: "#71717a", display: "block", marginBottom: 4 }}>Start</label>
            <input type="time" value={bhStart} onChange={e => setBhStart(e.target.value)} style={{
              padding: "6px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
              borderRadius: 4, color: "#fafafa", fontSize: 14, fontWeight: 600, outline: "none",
            }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#71717a", display: "block", marginBottom: 4 }}>End</label>
            <input type="time" value={bhEnd} onChange={e => setBhEnd(e.target.value)} style={{
              padding: "6px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
              borderRadius: 4, color: "#fafafa", fontSize: 14, fontWeight: 600, outline: "none",
            }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#71717a", display: "block", marginBottom: 4 }}>Timezone</label>
            <select value={bhTz} onChange={e => setBhTz(e.target.value)} style={{
              padding: "6px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
              borderRadius: 4, color: "#fafafa", fontSize: 12, outline: "none",
            }}>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Boise">Boise (MT)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#71717a", display: "block", marginBottom: 4 }}>Work Days</label>
            <span style={{ fontSize: 12, color: "#a1a1aa" }}>Mon–Fri</span>
          </div>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 4, height: 20, borderRadius: 2,
              backgroundColor: CATEGORY_COLORS[cat] ?? "#71717a",
            }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", margin: 0 }}>{cat}</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {slas.filter(s => s.category === cat).map(sla => {
              const isEditing = editingId === sla.id;
              const isModified = sla.currentMinutes !== sla.defaultMinutes;
              const warningMinutes = Math.round(sla.currentMinutes * sla.warningPct / 100);

              return (
                <div key={sla.id} style={{
                  padding: "16px 20px",
                  backgroundColor: "#18181b",
                  border: `1px solid ${isModified ? "#80B602" : "#27272a"}`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#fafafa" }}>{sla.label}</div>
                    <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{sla.description}</div>
                    {sla.escalateAction && (
                      <div style={{ fontSize: 10, color: "#71717a", marginTop: 4 }}>
                        Escalation: {sla.escalateAction}
                      </div>
                    )}
                  </div>

                  {/* Warning threshold */}
                  <div style={{ textAlign: "center", minWidth: 60 }}>
                    <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>
                      {displayTime(warningMinutes, sla.unit)}
                    </div>
                    <div style={{ fontSize: 9, color: "#52525b" }}>WARNING</div>
                  </div>

                  {/* SLA value */}
                  <div style={{ textAlign: "center", minWidth: 80 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="number"
                          value={editValue(sla.currentMinutes, sla.unit)}
                          onChange={e => handleChange(sla.id, parseInt(e.target.value) || 0)}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={e => e.key === "Enter" && setEditingId(null)}
                          autoFocus
                          style={{
                            width: 50, padding: "4px 6px", backgroundColor: "#09090b",
                            border: "1px solid #80B602", borderRadius: 4,
                            color: "#fafafa", fontSize: 14, fontWeight: 600, textAlign: "center",
                            outline: "none",
                          }}
                        />
                        <span style={{ fontSize: 11, color: "#71717a" }}>{sla.unit === "days" ? "d" : sla.unit === "hours" ? "h" : "m"}</span>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingId(sla.id)}
                        style={{ cursor: "pointer" }}
                        title="Click to edit"
                      >
                        <div style={{
                          fontSize: 18, fontWeight: 700,
                          color: isModified ? "#80B602" : "#f87171",
                        }}>
                          {displayTime(sla.currentMinutes, sla.unit)}
                        </div>
                        <div style={{ fontSize: 9, color: "#52525b" }}>SLA</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Visual legend */}
      <div style={{
        marginTop: 16, padding: 16, backgroundColor: "#18181b", border: "1px solid #27272a",
        borderRadius: 8, display: "flex", gap: 24, fontSize: 11, color: "#71717a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4ade80" }} />
          <span>On track</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fbbf24" }} />
          <span>Warning threshold reached</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f87171" }} />
          <span>SLA breached</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#80B602" }} />
          <span>Custom (modified from default)</span>
        </div>
      </div>
    </div>
  );
}
