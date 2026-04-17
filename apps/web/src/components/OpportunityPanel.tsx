"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpportunityPanelData {
  id: string;
  contact_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string | null;
  community_name: string | null;
  division_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  floor_plan_name: string | null;
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
}

interface OpportunityPanelProps {
  open: boolean;
  onClose: () => void;
  opportunity: OpportunityPanelData | null;
}

interface StageTransition {
  id: string;
  from_stage: string | null;
  to_stage: string | null;
  triggered_by: string | null;
  reason: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  occurred_at: string;
}

interface ContactSecondary {
  email_secondary: string | null;
  phone_secondary: string | null;
}

// ─── Stage Badge ──────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lead_div:       { label: "DIVISION LEAD",   color: "#166534", bg: "#bbf7d0" },
  lead_com:       { label: "COMMUNITY LEAD",  color: "#1e40af", bg: "#bfdbfe" },
  queue:          { label: "OSC QUEUE",        color: "#92400e", bg: "#fde68a" },
  prospect_c:     { label: "PROSPECT C",       color: "#9a3412", bg: "#fed7aa" },
  prospect_b:     { label: "PROSPECT B",       color: "#1e40af", bg: "#bfdbfe" },
  prospect_a:     { label: "PROSPECT A",       color: "#166534", bg: "#bbf7d0" },
  homeowner:      { label: "HOMEOWNER",        color: "#065f46", bg: "#a7f3d0" },
  archived:       { label: "ARCHIVED",         color: "#e4e4e7", bg: "#3f3f46" },
  deleted:        { label: "DELETED",          color: "#fecaca", bg: "#7f1d1d" },
  // post-sale stages
  sold_not_started:   { label: "SOLD",             color: "#92400e", bg: "#fde68a" },
  under_construction: { label: "UNDER CONSTRUCTION", color: "#1e40af", bg: "#bfdbfe" },
  settled:            { label: "SETTLED",           color: "#065f46", bg: "#a7f3d0" },
};

function getStageConfig(stage: string): { label: string; color: string; bg: string } {
  return STAGE_CONFIG[stage] ?? { label: stage.toUpperCase().replace(/_/g, " "), color: "#a1a1aa", bg: "#27272a" };
}

export function StageBadge({ stage }: { stage: string }) {
  const cfg = getStageConfig(stage);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        background: cfg.bg,
        color: cfg.color,
        lineHeight: "16px",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Section / Row (local mirrors to keep panel self-contained) ───────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null | React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        minHeight: 20,
      }}
    >
      <span style={{ fontSize: 12, color: "#555", flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: value == null || value === "" || value === "—" ? "#333" : "#ededed", textAlign: "right", wordBreak: "break-word" }}>
        {value == null || value === "" ? "—" : value}
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const CHANNEL_ICONS: Record<string, string> = {
  email: "📧", phone: "📞", sms: "💬", video: "🎥", voice: "🎙",
  web: "🌐", chat: "💭", app: "🖥", walk_in: "🚶", mail: "📬",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OpportunityPanel({ open, onClose, opportunity }: OpportunityPanelProps) {
  const [activeTab, setActiveTab] = useState<"history" | "activity">("history");
  const [history, setHistory] = useState<StageTransition[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  // Contact editing state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail2, setEditEmail2] = useState("");
  const [editPhone2, setEditPhone2] = useState("");
  const [secondary, setSecondary] = useState<ContactSecondary>({ email_secondary: null, phone_secondary: null });

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset state when opportunity changes
  useEffect(() => {
    setEditing(false);
    setEditingNotes(false);
    setActiveTab("history");
    setHistory([]);
    setActivities([]);
  }, [opportunity?.id]);

  // Fetch secondary contact fields
  useEffect(() => {
    if (!opportunity?.contact_id) { setSecondary({ email_secondary: null, phone_secondary: null }); return; }
    supabase
      .from("contacts")
      .select("email_secondary, phone_secondary")
      .eq("id", opportunity.contact_id)
      .single()
      .then(({ data }) => {
        if (data) setSecondary(data as ContactSecondary);
      });
  }, [opportunity?.contact_id]);

  // Fetch history
  useEffect(() => {
    if (!opportunity) return;
    setHistoryLoading(true);
    supabase
      .from("stage_transitions")
      .select("id, from_stage, to_stage, triggered_by, reason, created_at")
      .eq("opportunity_id", opportunity.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setHistory(data ?? []);
        setHistoryLoading(false);
      });
  }, [opportunity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch activities (lazy — only when tab is active)
  useEffect(() => {
    if (activeTab !== "activity" || !opportunity?.contact_id) return;
    if (activities.length > 0) return; // already fetched
    setActivityLoading(true);
    supabase
      .from("activities")
      .select("id, channel, direction, subject, occurred_at")
      .eq("contact_id", opportunity.contact_id)
      .order("occurred_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setActivities(data ?? []);
        setActivityLoading(false);
      });
  }, [activeTab, opportunity?.contact_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start editing contacts
  const startEditing = useCallback(() => {
    if (!opportunity) return;
    setEditEmail(opportunity.email ?? "");
    setEditPhone(opportunity.phone ?? "");
    setEditEmail2(secondary.email_secondary ?? "");
    setEditPhone2(secondary.phone_secondary ?? "");
    setEditing(true);
  }, [opportunity, secondary]);

  // Save contact edits
  const saveContact = useCallback(async () => {
    if (!opportunity?.contact_id) return;
    setSaving(true);
    await supabase.from("contacts").update({
      email: editEmail || null,
      phone: editPhone || null,
      email_secondary: editEmail2 || null,
      phone_secondary: editPhone2 || null,
    }).eq("id", opportunity.contact_id);
    // Update local secondary state
    setSecondary({ email_secondary: editEmail2 || null, phone_secondary: editPhone2 || null });
    setSaving(false);
    setEditing(false);
  }, [opportunity?.contact_id, editEmail, editPhone, editEmail2, editPhone2]);

  // Save notes
  const saveNotes = useCallback(async () => {
    if (!opportunity) return;
    setSavingNotes(true);
    await supabase.from("opportunities").update({ notes: editNotes || null }).eq("id", opportunity.id);
    setSavingNotes(false);
    setEditingNotes(false);
  }, [opportunity, editNotes]);

  if (!open || !opportunity) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    fontSize: 12,
    color: "#ededed",
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 4,
    outline: "none",
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 4,
    cursor: "pointer",
    border: "1px solid #27272a",
    background: "#18181b",
    color: "#a1a1aa",
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 40,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          background: "#111",
          borderLeft: "1px solid #1f1f1f",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #1f1f1f", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0, lineHeight: 1.3 }}>
                  {opportunity.first_name} {opportunity.last_name}
                </h2>
                <StageBadge stage={opportunity.stage} />
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "#555", fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* ── Contact Section ───────────────────────────────────────── */}
            <Section title="Contact">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Primary</span>
                {!editing && (
                  <button onClick={startEditing} style={{ ...smallBtnStyle, fontSize: 10, padding: "2px 8px" }}>
                    ✏ Edit
                  </button>
                )}
              </div>

              {editing ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "#555", marginBottom: 2, display: "block" }}>Email</label>
                      <input style={inputStyle} value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#555", marginBottom: 2, display: "block" }}>Phone</label>
                      <input style={inputStyle} value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Secondary</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "#555", marginBottom: 2, display: "block" }}>Email Secondary</label>
                      <input style={inputStyle} value={editEmail2} onChange={e => setEditEmail2(e.target.value)} placeholder="Add secondary email" />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#555", marginBottom: 2, display: "block" }}>Phone Secondary</label>
                      <input style={inputStyle} value={editPhone2} onChange={e => setEditPhone2(e.target.value)} placeholder="Add secondary phone" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={saveContact}
                      disabled={saving}
                      style={{ ...smallBtnStyle, background: "#22c55e", color: "#000", border: "none", fontWeight: 600, opacity: saving ? 0.5 : 1 }}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditing(false)} style={smallBtnStyle}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <Row
                    label="Email"
                    value={
                      opportunity.email ? (
                        <a href={`mailto:${opportunity.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>
                          {opportunity.email}
                        </a>
                      ) : null
                    }
                  />
                  <Row
                    label="Phone"
                    value={
                      opportunity.phone ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {opportunity.phone}
                          <a href={`tel:${opportunity.phone}`} style={{ textDecoration: "none", fontSize: 14 }} title="Call">📞</a>
                          <a href={`sms:${opportunity.phone}`} style={{ textDecoration: "none", fontSize: 14 }} title="Text">💬</a>
                        </span>
                      ) : null
                    }
                  />
                  <Row label="Source" value={opportunity.source} />

                  {/* Secondary — always show */}
                  <div style={{ marginTop: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Secondary</span>
                  </div>
                  <Row
                    label="Email"
                    value={
                      secondary.email_secondary ? (
                        <a href={`mailto:${secondary.email_secondary}`} style={{ color: "#7aafdf", textDecoration: "none" }}>
                          {secondary.email_secondary}
                        </a>
                      ) : (
                        <span style={{ color: "#333", fontStyle: "italic" }}>Add secondary email</span>
                      )
                    }
                  />
                  <Row
                    label="Phone"
                    value={
                      secondary.phone_secondary ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {secondary.phone_secondary}
                          <a href={`tel:${secondary.phone_secondary}`} style={{ textDecoration: "none", fontSize: 14 }} title="Call">📞</a>
                          <a href={`sms:${secondary.phone_secondary}`} style={{ textDecoration: "none", fontSize: 14 }} title="Text">💬</a>
                        </span>
                      ) : (
                        <span style={{ color: "#333", fontStyle: "italic" }}>Add secondary phone</span>
                      )
                    }
                  />
                </>
              )}
            </Section>

            {/* ── Interest Section ──────────────────────────────────────── */}
            <Section title="Interest">
              <Row label="Division" value={opportunity.division_name} />
              <Row label="Community" value={opportunity.community_name ?? "—"} />
              <Row label="Budget" value={formatBudget(opportunity.budget_min, opportunity.budget_max)} />
              {opportunity.floor_plan_name && <Row label="Floor Plan" value={opportunity.floor_plan_name} />}
            </Section>

            {/* ── Notes (editable) ─────────────────────────────────────── */}
            <Section title="Notes">
              {editingNotes ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                    placeholder="Add notes…"
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      style={{ ...smallBtnStyle, background: "#22c55e", color: "#000", border: "none", fontWeight: 600, opacity: savingNotes ? 0.5 : 1 }}
                    >
                      {savingNotes ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditingNotes(false)} style={smallBtnStyle}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => { setEditNotes(opportunity.notes ?? ""); setEditingNotes(true); }}
                  style={{ cursor: "pointer", minHeight: 24 }}
                  title="Click to edit notes"
                >
                  {opportunity.notes ? (
                    <p style={{ fontSize: 13, color: "#888", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{opportunity.notes}</p>
                  ) : (
                    <p style={{ fontSize: 12, color: "#333", fontStyle: "italic", margin: 0 }}>Click to add notes…</p>
                  )}
                </div>
              )}
            </Section>

            {/* ── Sub-tabs ─────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid #1a1a1a" }}>
              {(["history", "activity"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid #ededed" : "2px solid transparent",
                    color: activeTab === tab ? "#ededed" : "#555",
                    transition: "all 0.15s",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ── History Tab ──────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {historyLoading ? (
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>Loading…</p>
                ) : history.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>No stage transitions recorded</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {history.map(t => (
                      <div key={t.id} style={{ lineHeight: 1.6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {t.from_stage ? <StageBadge stage={t.from_stage} /> : <span style={{ fontSize: 10, color: "#555" }}>—</span>}
                          <span style={{ color: "#555", fontSize: 12 }}>→</span>
                          {t.to_stage ? <StageBadge stage={t.to_stage} /> : <span style={{ fontSize: 10, color: "#555" }}>—</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                          {formatDateTime(t.created_at)}
                          {t.triggered_by && <span> · by {t.triggered_by}</span>}
                          {t.reason && <span> ({t.reason})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Activity Tab ─────────────────────────────────────────── */}
            {activeTab === "activity" && (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {!opportunity.contact_id ? (
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>No contact linked</p>
                ) : activityLoading ? (
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>Loading…</p>
                ) : activities.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>No activities recorded</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {activities.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "18px" }}>
                          {CHANNEL_ICONS[a.channel ?? ""] ?? "📋"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "#ededed", display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: a.direction === "inbound" ? "#4ade80" : "#60a5fa", fontSize: 10 }}>
                              {a.direction === "inbound" ? "↓" : "↑"}
                            </span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {a.subject || "(no subject)"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "#555" }}>
                            {formatDateTime(a.occurred_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
