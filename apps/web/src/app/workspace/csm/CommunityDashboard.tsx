"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunityViewProps {
  community: Record<string, any>;
  plans: any[];
  lots: any[];
  modelHome: any | null;
  specHomes: any[];
  divisions: { id: string; name: string; slug: string }[];
}

interface MonthGoal {
  month: string;
  sales: number;
  goal: number;
}

interface ProspectItem {
  id: string;
  contact_id: string;
  crm_stage: string;
  community_id: string | null;
  division_id: string | null;
  csm_id: string | null;
  source: string | null;
  opportunity_source: string | null;
  queue_source: string | null;
  notes: string | null;
  budget_min: number | null;
  budget_max: number | null;
  engagement_score: number | null;
  last_activity_at: string | null;
  created_at: string;
  contacts: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  channel: string | null;
  status: string;
  due_at: string | null;
  snoozed_until: string | null;
  completed_at: string | null;
  ai_suggestion: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  assigned_to_id: string | null;
  community_id: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string } | null;
}

interface TeamUser {
  id: string;
  full_name: string;
}

type CsmBucket = "new_from_osc" | "stale" | "ai_hot" | "followup_due";

type DrillPanel = null | "plans" | "lots" | "leads" | "prospects" | "customers" | "qd";

type ActionType = "promote" | "demote" | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_GOALS: MonthGoal[] = [
  { month: "JAN", sales: 3, goal: 4 },
  { month: "FEB", sales: 5, goal: 4 },
  { month: "MAR", sales: 4, goal: 4 },
  { month: "APR", sales: 2, goal: 4 },
  { month: "MAY", sales: 0, goal: 4 },
  { month: "JUN", sales: 0, goal: 5 },
  { month: "JUL", sales: 0, goal: 5 },
  { month: "AUG", sales: 0, goal: 5 },
  { month: "SEP", sales: 0, goal: 4 },
  { month: "OCT", sales: 0, goal: 4 },
  { month: "NOV", sales: 0, goal: 3 },
  { month: "DEC", sales: 0, goal: 3 },
];

const BUCKET_META: { id: CsmBucket; icon: string; label: string; description: string }[] = [
  { id: "new_from_osc", icon: "🆕", label: "New from OSC", description: "Freshly promoted prospects" },
  { id: "stale", icon: "⚠️", label: "Stale", description: "No communication in 30+ days" },
  { id: "ai_hot", icon: "📈", label: "AI Hot", description: "Scoring spike / buying signals" },
  { id: "followup_due", icon: "📋", label: "Follow-up Due", description: "Scheduled follow-ups due today" },
];

const STAGE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  prospect_a: { color: "#4ade80", bg: "#052e16", label: "A" },
  prospect_b: { color: "#60a5fa", bg: "#172554", label: "B" },
  prospect_c: { color: "#fbbf24", bg: "#422006", label: "C" },
};

const PROMOTE_MAP: Record<string, string> = {
  prospect_c: "prospect_b",
  prospect_b: "prospect_a",
  prospect_a: "homeowner",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => (n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}K`);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function classifyBucket(item: ProspectItem, todayTaskOppIds: Set<string>): CsmBucket {
  // New from OSC: created within last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (new Date(item.created_at).getTime() > sevenDaysAgo) return "new_from_osc";

  // Follow-up Due: has a task due today
  if (todayTaskOppIds.has(item.id)) return "followup_due";

  // AI Hot: engagement_score > 60
  if (item.engagement_score != null && item.engagement_score > 60) return "ai_hot";

  // Stale: last_activity_at > 30 days ago
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (!item.last_activity_at || new Date(item.last_activity_at).getTime() < thirtyDaysAgo) return "stale";

  // Default: new from OSC (catch-all)
  return "new_from_osc";
}

function channelIcon(ch: string | null): string {
  const map: Record<string, string> = { call: "📞", phone: "📞", email: "📧", text: "💬", sms: "💬", chat: "💬" };
  return map[ch ?? ""] ?? "📋";
}

function priorityBadge(p: string | null): { color: string; bg: string; label: string } {
  if (p === "high") return { color: "#fca5a5", bg: "#7f1d1d", label: "🔴 High" };
  if (p === "medium") return { color: "#fbbf24", bg: "#422006", label: "🟡 Medium" };
  return { color: "#86efac", bg: "#052e16", label: "🟢 Low" };
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, subtitle, active, onClick,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 20px",
        backgroundColor: active ? "#18181b" : "#09090b",
        border: `1px solid ${active ? "#3f3f46" : "#27272a"}`,
        borderRadius: 8,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = "#52525b";
          e.currentTarget.style.backgroundColor = "#18181b";
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = active ? "#3f3f46" : "#27272a";
          e.currentTarget.style.backgroundColor = active ? "#18181b" : "#09090b";
        }
      }}
    >
      <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 600, color: "#fafafa", lineHeight: 1.2 }}>{value}</span>
      {subtitle && <span style={{ fontSize: 11, color: "#52525b" }}>{subtitle}</span>}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{title}</span>
        {count !== undefined && (
          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── MiniTable ────────────────────────────────────────────────────────────────

function MiniTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                padding: "8px 14px", textAlign: "left", fontSize: 11, color: "#71717a",
                fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
                backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#3f3f46" }}>No data</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "8px 14px", fontSize: 12, color: j === 0 ? "#fafafa" : "#a1a1aa",
                  fontWeight: j === 0 ? 500 : 400, borderBottom: "1px solid #18181b",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sales Goal Strip ─────────────────────────────────────────────────────────

function SalesGoalStrip() {
  const ytdSales = MONTH_GOALS.reduce((s, m) => s + m.sales, 0);
  const ytdGoal = MONTH_GOALS.reduce((s, m) => s + m.goal, 0);

  return (
    <div style={{ padding: "16px 24px" }}>
      <div style={{
        display: "flex", alignItems: "stretch", gap: 0,
        border: "1px solid #27272a", borderRadius: 8, overflow: "hidden", backgroundColor: "#09090b",
      }}>
        <div style={{
          padding: "12px 20px", borderRight: "1px solid #27272a",
          display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 120, gap: 2,
        }}>
          <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>YTD</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#fafafa" }}>Sales: {ytdSales}</span>
          <span style={{ fontSize: 11, color: "#52525b" }}>Goal: {ytdSales} / {ytdGoal}</span>
        </div>
        {MONTH_GOALS.map((m) => {
          const met = m.sales >= m.goal && m.goal > 0;
          return (
            <div key={m.month} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 4px", borderRight: "1px solid #18181b",
              borderBottom: `2px solid ${met ? "#22c55e" : "#27272a"}`, minWidth: 0,
            }}>
              <span style={{ fontSize: 10, color: "#52525b", fontWeight: 500, letterSpacing: "0.05em" }}>{m.month}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: m.sales > 0 ? "#fafafa" : "#3f3f46", marginTop: 2 }}>{m.sales}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Action Modal (Promote/Demote) ───────────────────────────────────────────

function ActionModal({
  item, action, onClose, onExecute,
}: {
  item: ProspectItem;
  action: ActionType;
  onClose: () => void;
  onExecute: (oppId: string, newStage: string, reason: string) => void;
}) {
  const currentStage = item.crm_stage;
  const promoteTarget = PROMOTE_MAP[currentStage] ?? "homeowner";
  const [targetStage, setTargetStage] = useState(action === "promote" ? promoteTarget : "queue");
  const [reason, setReason] = useState("");

  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const stageInfo = STAGE_COLORS[currentStage];

  const promoteOptions = action === "promote"
    ? [
        ...(currentStage === "prospect_c" ? [{ value: "prospect_b", label: "Prospect B — Intent within 30 days" }] : []),
        ...(currentStage === "prospect_c" || currentStage === "prospect_b" ? [{ value: "prospect_a", label: "Prospect A — Contract this week" }] : []),
        { value: "homeowner", label: "Homeowner — Sale closed" },
      ]
    : [];

  const demoteOptions = [
    { value: "queue", label: "Queue — Return to OSC for re-routing" },
  ];

  const options = action === "promote" ? promoteOptions : demoteOptions;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 480, backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
        zIndex: 51, overflow: "hidden",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #27272a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#fafafa" }}>
              {action === "promote" ? "↑ Promote" : "↓ Demote"}: {name}
            </span>
            {stageInfo && (
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                backgroundColor: stageInfo.bg, color: stageInfo.color, fontWeight: 600,
              }}>{stageInfo.label}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
            Currently: {currentStage.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
          </div>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Move to
            </label>
            <select value={targetStage} onChange={e => setTargetStage(e.target.value)} style={{
              width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
              borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none",
            }}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Reason
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder={action === "promote" ? "e.g., Very interested, toured model home, ready to move up" : "e.g., Not responding, needs more nurturing by OSC"}
              style={{
                width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: 6, color: "#a1a1aa", fontSize: 12, outline: "none", resize: "none",
              }} />
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #27272a", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 6, border: "1px solid #27272a",
            backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
          }}>Cancel</button>
          <button
            onClick={() => onExecute(item.id, targetStage, reason)}
            style={{
              padding: "8px 16px", borderRadius: 6, border: "none",
              backgroundColor: action === "promote" ? "#166534" : "#991b1b",
              color: "#fafafa", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            {action === "promote" ? "↑ Promote" : "↓ Demote"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Snooze Picker ────────────────────────────────────────────────────────────

function SnoozePicker({ onSnooze, onClose }: { onSnooze: (until: string) => void; onClose: () => void }) {
  const options = [
    { label: "1 hour", ms: 3600000 },
    { label: "4 hours", ms: 14400000 },
    { label: "Tomorrow 9am", ms: 0 },
    { label: "Next Monday 9am", ms: 0 },
  ];

  function computeTime(opt: { label: string; ms: number }): string {
    if (opt.ms > 0) return new Date(Date.now() + opt.ms).toISOString();
    const now = new Date();
    if (opt.label.startsWith("Tomorrow")) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const daysUntilMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    d.setDate(d.getDate() + daysUntilMon);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
      <div style={{
        position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 51,
        backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8,
        padding: 4, minWidth: 160, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {options.map(opt => (
          <button key={opt.label} onClick={() => onSnooze(computeTime(opt))} style={{
            display: "block", width: "100%", padding: "8px 12px", textAlign: "left",
            background: "none", border: "none", color: "#a1a1aa", fontSize: 12,
            cursor: "pointer", borderRadius: 4,
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#27272a")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            ⏰ {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({ label }: { label: string }) {
  return (
    <button style={{
      padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
      backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >{label}</button>
  );
}

// ─── Prospect Queue Card ──────────────────────────────────────────────────────

function ProspectCard({
  item, onPromote, onDemote,
}: {
  item: ProspectItem;
  onPromote: () => void;
  onDemote: () => void;
}) {
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const stageInfo = STAGE_COLORS[item.crm_stage];
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      overflow: "hidden", transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: "12px 16px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#fafafa" }}>{name}</span>
            {stageInfo && (
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                backgroundColor: stageInfo.bg, color: stageInfo.color, fontWeight: 600,
              }}>{stageInfo.label}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
            {formatBudget(item.budget_min, item.budget_max)} · {relativeTime(item.last_activity_at)}
          </div>
        </div>
        <span style={{ fontSize: 11, color: "#71717a", flexShrink: 0 }}>{item.contacts?.phone ?? "—"}</span>
        <button onClick={e => { e.stopPropagation(); onPromote(); }} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid #166534",
          backgroundColor: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
        }}>↑ Promote</button>
        <button onClick={e => { e.stopPropagation(); onDemote(); }} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid #991b1b",
          backgroundColor: "#1c1917", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
        }}>↓ Demote</button>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 12px", borderTop: "1px solid #27272a", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Email</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.contacts?.email ?? "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Source</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.opportunity_source ?? item.source ?? "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Created</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{new Date(item.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          {item.notes && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Notes</span>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>{item.notes}</div>
            </div>
          )}
          {/* Quick Actions */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <ActionBtn label="📞 Call" />
            <ActionBtn label="📧 Email" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, onComplete, onSnooze,
}: {
  task: TaskItem;
  onComplete: () => void;
  onSnooze: (until: string) => void;
}) {
  const [showSnooze, setShowSnooze] = useState(false);
  const pb = priorityBadge(task.priority);
  const contactName = task.contacts ? `${task.contacts.first_name} ${task.contacts.last_name}` : null;

  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      padding: "12px 14px", transition: "border-color 0.15s", position: "relative",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#fafafa", flex: 1 }}>
          {channelIcon(task.channel)} {task.title}
        </span>
        <span style={{
          fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 600,
          backgroundColor: pb.bg, color: pb.color,
        }}>{pb.label}</span>
      </div>

      {contactName && (
        <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>{contactName}</div>
      )}

      {task.ai_suggestion && (
        <div style={{
          fontSize: 11, color: "#86efac", backgroundColor: "#052e16", border: "1px solid #166534",
          borderRadius: 4, padding: "6px 10px", marginBottom: 8, lineHeight: 1.5,
        }}>
          🤖 {task.ai_suggestion}
        </div>
      )}

      {task.description && !task.ai_suggestion && (
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8, lineHeight: 1.4 }}>{task.description}</div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
        {(task.channel === "call" || task.channel === "phone") && <ActionBtn label="📞 Call" />}
        {task.channel === "email" && <ActionBtn label="📧 Email" />}
        {(task.channel === "text" || task.channel === "sms") && <ActionBtn label="💬 Text" />}
        {!task.channel && (
          <>
            <ActionBtn label="📞 Call" />
            <ActionBtn label="📧 Email" />
            <ActionBtn label="💬 Text" />
          </>
        )}
        <button onClick={onComplete} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid #166534",
          backgroundColor: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>✓ Complete</button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowSnooze(!showSnooze)} style={{
            padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
            backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer",
          }}>⏰ Snooze</button>
          {showSnooze && (
            <SnoozePicker
              onSnooze={(until) => { setShowSnooze(false); onSnooze(until); }}
              onClose={() => setShowSnooze(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reference Module ─────────────────────────────────────────────────────────

function ReferenceModule({
  community, plans, lots, modelHome,
}: {
  community: Record<string, any>;
  plans: any[];
  lots: any[];
  modelHome: any | null;
}) {
  const [open, setOpen] = useState(false);
  const availableLots = lots.filter((l: any) => l.is_available);

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "12px 16px", backgroundColor: "#18181b", border: "1px solid #27272a",
          borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          color: "#fafafa", fontSize: 13, fontWeight: 600,
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
      >
        <span>📚 Community Reference</span>
        <span style={{ fontSize: 11, color: "#71717a" }}>{open ? "▲ Collapse" : "▼ Expand"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Plans Table */}
          {plans.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 8 }}>Floor Plans ({plans.length})</div>
              <MiniTable
                headers={["Plan", "Price", "Beds", "Baths", "Sq Ft"]}
                rows={plans.map((p: any) => [
                  p.marketing_name ?? p.plan_name ?? "—",
                  formatPrice(p.net_price ?? p.base_price),
                  p.beds ?? "—",
                  p.baths ?? "—",
                  p.sqft ? p.sqft.toLocaleString() : "—",
                ])}
              />
            </div>
          )}

          {/* Available Lots */}
          {availableLots.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 8 }}>Available Lots ({availableLots.length})</div>
              <MiniTable
                headers={["Lot #", "Premium", "Address", "Phase"]}
                rows={availableLots.map((l: any) => [
                  l.lot_number ?? "—",
                  l.lot_premium ? formatPrice(l.lot_premium) : "—",
                  l.address ?? "—",
                  l.phase ?? "—",
                ])}
              />
            </div>
          )}

          {/* Community Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* Model Home */}
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Model Home</div>
              {modelHome ? (
                <>
                  <div style={{ fontSize: 12, color: "#fafafa", fontWeight: 500 }}>{modelHome.name ?? modelHome.model_marketing_name ?? "Model"}</div>
                  {modelHome.address && <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>{modelHome.address}</div>}
                  {modelHome.open_hours && <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>Hours: {modelHome.open_hours}</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {modelHome.virtual_tour_url && (
                      <a href={modelHome.virtual_tour_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#a1a1aa", textDecoration: "underline" }}>Virtual Tour ↗</a>
                    )}
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#3f3f46" }}>No model home</span>
              )}
            </div>

            {/* Schools */}
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Schools</div>
              {[
                ["District", community.school_district],
                ["Elementary", community.school_elementary],
                ["Middle", community.school_middle],
                ["High", community.school_high],
              ].map(([label, val]) => val ? (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ fontSize: 11, color: "#52525b" }}>{label}</span>
                  <span style={{ fontSize: 11, color: "#a1a1aa" }}>{val as string}</span>
                </div>
              ) : null)}
              {!community.school_district && <span style={{ fontSize: 12, color: "#3f3f46" }}>No school data</span>}
            </div>

            {/* Details + Links */}
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Details</div>
              {[
                ["Total Homesites", community.total_homesites],
                ["Status", community.status],
                ["55+", community.is_55_plus ? "Yes" : "No"],
                ["HOA", community.hoa_fee ? `${formatPrice(community.hoa_fee)}/${community.hoa_period ?? "mo"}` : "—"],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ fontSize: 11, color: "#52525b" }}>{label}</span>
                  <span style={{ fontSize: 11, color: "#a1a1aa" }}>{String(val ?? "—")}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {community.page_url && (
                  <a href={`https://schellbrothers.com${community.page_url}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#a1a1aa", textDecoration: "underline" }}>Website ↗</a>
                )}
                {community.brochure_url && (
                  <a href={community.brochure_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#a1a1aa", textDecoration: "underline" }}>Brochure ↗</a>
                )}
                {community.lot_map_url && (
                  <a href={community.lot_map_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#a1a1aa", textDecoration: "underline" }}>Site Map ↗</a>
                )}
              </div>
            </div>
          </div>

          {/* Amenities */}
          {community.amenities && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 8 }}>Amenities</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {community.amenities.split(",").map((a: string) => a.trim()).filter(Boolean).map((a: string) => (
                  <span key={a} style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 4,
                    backgroundColor: "#18181b", border: "1px solid #27272a", color: "#a1a1aa",
                  }}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CommunityView({ community, plans, lots, modelHome, specHomes, divisions }: CommunityViewProps) {
  const [drill, setDrill] = useState<DrillPanel>(null);
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeBucket, setActiveBucket] = useState<CsmBucket>("new_from_osc");
  const [actionItem, setActionItem] = useState<ProspectItem | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [csmUsers, setCsmUsers] = useState<TeamUser[]>([]);

  const availableLots = lots.filter((l: any) => l.is_available);
  const underConstruction = lots.filter((l: any) => l.construction_status === "under-construction" || l.lot_status === "under-construction");
  const qdLots = lots.filter((l: any) => l.lot_status === "quick-delivery");
  const division = divisions.find(d => d.id === community.division_id);

  // Fetch CRM data
  const fetchData = useCallback(async () => {
    if (!community?.id) return;
    const cid = community.id;
    const now = new Date().toISOString();

    // CSM team members
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "csm")
      .eq("is_active", true);
    setCsmUsers((users as TeamUser[]) ?? []);

    const [oppRes, leadRes, custRes, taskRes] = await Promise.all([
      supabase
        .from("opportunities")
        .select("id, contact_id, crm_stage, community_id, division_id, csm_id, source, opportunity_source, queue_source, notes, budget_min, budget_max, engagement_score, last_activity_at, created_at, contacts(first_name, last_name, email, phone)")
        .eq("community_id", cid)
        .in("crm_stage", ["prospect_c", "prospect_b", "prospect_a"])
        .order("last_activity_at", { ascending: false }),
      supabase.from("leads").select("*").eq("community_id", cid).neq("stage", "opportunity"),
      supabase.from("home_owners").select("*, contacts(first_name, last_name, email, phone)").eq("community_id", cid),
      supabase
        .from("tasks")
        .select("id, title, description, priority, channel, status, due_at, snoozed_until, completed_at, ai_suggestion, contact_id, opportunity_id, assigned_to_id, community_id, created_at, contacts(first_name, last_name)")
        .eq("community_id", cid)
        .eq("status", "pending")
        .or(`snoozed_until.is.null,snoozed_until.lte.${now}`)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    const flatProspects = (oppRes.data ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      contacts: Array.isArray(item.contacts) ? (item.contacts as Record<string, unknown>[])[0] ?? null : item.contacts,
    })) as ProspectItem[];

    const flatTasks = (taskRes.data ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      contacts: Array.isArray(t.contacts) ? (t.contacts as Record<string, unknown>[])[0] ?? null : t.contacts,
    })) as TaskItem[];

    setProspects(flatProspects);
    setLeads(leadRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setTasks(flatTasks);
  }, [community?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build task opp IDs for today's due tasks
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayTaskOppIds = new Set(
    tasks
      .filter(t => t.due_at && new Date(t.due_at) >= todayStart && new Date(t.due_at) <= todayEnd && t.opportunity_id)
      .map(t => t.opportunity_id!)
  );

  // Apply team filter
  const filteredProspects = teamFilter === "all"
    ? prospects
    : prospects.filter(p => p.csm_id === teamFilter);
  const filteredTasks = teamFilter === "all"
    ? tasks
    : tasks.filter(t => t.assigned_to_id === teamFilter);

  // Bucket prospects
  const bucketCounts: Record<CsmBucket, number> = { new_from_osc: 0, stale: 0, ai_hot: 0, followup_due: 0 };
  const bucketedItems: Record<CsmBucket, ProspectItem[]> = { new_from_osc: [], stale: [], ai_hot: [], followup_due: [] };
  for (const item of filteredProspects) {
    const bucket = classifyBucket(item, todayTaskOppIds);
    bucketCounts[bucket]++;
    bucketedItems[bucket].push(item);
  }
  const currentBucketItems = bucketedItems[activeBucket];

  // Execute promote/demote
  async function handleAction(oppId: string, newStage: string, reason: string) {
    const item = prospects.find(p => p.id === oppId);
    if (!item) return;

    const { error } = await supabase
      .from("opportunities")
      .update({
        crm_stage: newStage,
        ...(newStage === "queue" ? { community_id: null } : {}),
      })
      .eq("id", oppId);

    if (error) {
      console.error("Stage transition failed:", error);
      alert(`Error: ${error.message}`);
    } else {
      await supabase.from("stage_transitions").insert({
        org_id: "00000000-0000-0000-0000-000000000001",
        opportunity_id: oppId,
        contact_id: item.contact_id,
        from_stage: item.crm_stage,
        to_stage: newStage,
        triggered_by: "manual",
        reason: reason || null,
      });
    }

    setActionItem(null);
    setActionType(null);
    fetchData();
  }

  async function handleCompleteTask(taskId: string) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) {
      console.error("Task completion failed:", error);
      alert(`Error: ${error.message}`);
    }
    fetchData();
  }

  async function handleSnoozeTask(taskId: string, until: string) {
    const { error } = await supabase
      .from("tasks")
      .update({ snoozed_until: until })
      .eq("id", taskId);
    if (error) {
      console.error("Task snooze failed:", error);
      alert(`Error: ${error.message}`);
    }
    fetchData();
  }

  function toggleDrill(panel: DrillPanel) {
    setDrill(prev => prev === panel ? null : panel);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          {division && <span style={{ fontSize: 12, color: "#52525b" }}>{division.name} /</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fafafa", margin: 0 }}>{community.name}</h1>
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            style={{
              backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 6,
              color: "#a1a1aa", fontSize: 12, padding: "6px 12px", outline: "none",
            }}
          >
            <option value="all">All Team Members</option>
            {csmUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#52525b" }}>
            {[community.city, community.state].filter(Boolean).join(", ")}
          </span>
          {community.status && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 500,
              backgroundColor: community.status === "active" ? "#052e16" : "#422006",
              color: community.status === "active" ? "#4ade80" : "#fbbf24",
              border: `1px solid ${community.status === "active" ? "#166534" : "#854d0e"}`,
            }}>
              {community.status.charAt(0).toUpperCase() + community.status.slice(1)}
            </span>
          )}
        </div>
        {community.price_from && (
          <span style={{ fontSize: 12, color: "#71717a", marginTop: 4, display: "block" }}>
            From {formatPrice(community.price_from)}
            {community.hoa_fee ? ` · HOA ${formatPrice(community.hoa_fee)}/${community.hoa_period ?? "mo"}` : ""}
          </span>
        )}
      </div>

      {/* ── Sales Goal Strip ── */}
      <SalesGoalStrip />

      {/* ── Metrics Grid ── */}
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <MetricCard label="Plans" value={plans.length} onClick={() => toggleDrill("plans")} active={drill === "plans"} />
          <MetricCard label="Available Lots" value={availableLots.length} subtitle={`${lots.length} total`} onClick={() => toggleDrill("lots")} active={drill === "lots"} />
          <MetricCard label="Under Construction" value={underConstruction.length} />
          <MetricCard label="QD / Spec Homes" value={specHomes.length + qdLots.length} onClick={(specHomes.length + qdLots.length) > 0 ? () => toggleDrill("qd") : undefined} active={drill === "qd"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
          <MetricCard label="Leads" value={leads.length} onClick={() => toggleDrill("leads")} active={drill === "leads"} />
          <MetricCard label="Prospects (A/B/C)" value={prospects.length}
            subtitle={prospects.length > 0 ? `A: ${prospects.filter(p => p.crm_stage === "prospect_a").length} · B: ${prospects.filter(p => p.crm_stage === "prospect_b").length} · C: ${prospects.filter(p => p.crm_stage === "prospect_c").length}` : undefined}
            onClick={() => toggleDrill("prospects")} active={drill === "prospects"} />
          <MetricCard label="Customers" value={customers.length} onClick={() => toggleDrill("customers")} active={drill === "customers"} />
          <MetricCard label="Tasks" value={tasks.length} subtitle={tasks.length > 0 ? "pending" : "all clear"} />
        </div>
      </div>

      {/* ── Drill-down panel ── */}
      {drill && (
        <div style={{ padding: "0 24px 16px" }}>
          {drill === "plans" && (
            <Section title="Floor Plans" count={plans.length}>
              <MiniTable
                headers={["Plan", "Price", "Beds", "Baths", "Sq Ft"]}
                rows={plans.map((p: any) => [
                  p.marketing_name ?? p.plan_name ?? "—",
                  formatPrice(p.net_price ?? p.base_price),
                  p.beds ?? "—",
                  p.baths ?? "—",
                  p.sqft ? p.sqft.toLocaleString() : "—",
                ])}
              />
            </Section>
          )}
          {drill === "lots" && (
            <Section title="Lots" count={lots.length}>
              <MiniTable
                headers={["Lot #", "Status", "Available", "Premium", "Address"]}
                rows={lots.map((l: any) => [
                  l.lot_number ?? "—",
                  l.lot_status ?? "—",
                  l.is_available ? "✓" : "—",
                  l.lot_premium ? formatPrice(l.lot_premium) : "—",
                  l.address ?? "—",
                ])}
              />
            </Section>
          )}
          {drill === "leads" && (
            <Section title="Leads" count={leads.length}>
              <MiniTable
                headers={["Name", "Stage", "Source", "Last Activity", "Created"]}
                rows={leads.map((l: any) => [
                  `${l.first_name} ${l.last_name}`,
                  l.stage ?? "—",
                  l.source ?? "—",
                  relativeTime(l.last_activity_at),
                  new Date(l.created_at).toLocaleDateString(),
                ])}
              />
            </Section>
          )}
          {drill === "prospects" && (
            <Section title="Prospects" count={prospects.length}>
              <MiniTable
                headers={["Name", "Stage", "Budget", "Phone", "Last Activity", "Created"]}
                rows={prospects.map(p => [
                  `${p.contacts?.first_name ?? "—"} ${p.contacts?.last_name ?? ""}`,
                  <span key="stage" style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                    backgroundColor: STAGE_COLORS[p.crm_stage]?.bg ?? "#27272a",
                    color: STAGE_COLORS[p.crm_stage]?.color ?? "#a1a1aa",
                  }}>{STAGE_COLORS[p.crm_stage]?.label ?? p.crm_stage}</span>,
                  formatBudget(p.budget_min, p.budget_max),
                  p.contacts?.phone ?? "—",
                  relativeTime(p.last_activity_at),
                  new Date(p.created_at).toLocaleDateString(),
                ])}
              />
            </Section>
          )}
          {drill === "customers" && (
            <Section title="Customers" count={customers.length}>
              <MiniTable
                headers={["Name", "Purchase Price", "Settlement", "Move-In", "Stage"]}
                rows={customers.map((c: any) => [
                  `${c.contacts?.first_name ?? "—"} ${c.contacts?.last_name ?? ""}`,
                  formatPrice(c.purchase_price),
                  c.settlement_date ? new Date(c.settlement_date).toLocaleDateString() : "—",
                  c.move_in_date ? new Date(c.move_in_date).toLocaleDateString() : "—",
                  c.post_sale_stage ?? "—",
                ])}
              />
            </Section>
          )}
          {drill === "qd" && (
            <Section title="Quick Delivery / Spec Homes" count={specHomes.length + qdLots.length}>
              <MiniTable
                headers={["Plan", "Address", "Price", "Beds", "Baths", "Sq Ft"]}
                rows={specHomes.map((s: any) => [
                  s.plan_name ?? "—",
                  s.address ?? "—",
                  formatPrice(s.list_price),
                  s.beds ?? "—",
                  s.baths ?? "—",
                  s.sqft ? s.sqft.toLocaleString() : "—",
                ])}
              />
            </Section>
          )}
        </div>
      )}

      {/* ── CSM Queue + Task List ── */}
      <div style={{ padding: "0 24px 24px", display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* LEFT: CSM Prospect Queue (~60%) */}
        <div style={{ flex: "0 0 60%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>CSM Queue</span>
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
              backgroundColor: filteredProspects.length > 0 ? "#172554" : "#052e16",
              color: filteredProspects.length > 0 ? "#60a5fa" : "#4ade80",
            }}>{filteredProspects.length} prospects</span>
          </div>

          {/* Bucket tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", marginBottom: 12 }}>
            {BUCKET_META.map(b => {
              const isActive = activeBucket === b.id;
              const count = bucketCounts[b.id];
              return (
                <button key={b.id} onClick={() => setActiveBucket(b.id)} style={{
                  padding: "8px 12px", fontSize: 11, fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#fafafa" : "#52525b",
                  borderBottom: isActive ? "2px solid #fafafa" : "2px solid transparent",
                  background: "none", border: "none", borderBottomStyle: "solid",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                }}>
                  <span>{b.icon}</span>
                  <span>{b.label}</span>
                  <span style={{
                    fontSize: 10, padding: "0 5px", borderRadius: 3, fontWeight: 600,
                    backgroundColor: count > 0 ? "#172554" : "#27272a",
                    color: count > 0 ? "#60a5fa" : "#71717a",
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Queue items */}
          {currentBucketItems.length === 0 ? (
            <div style={{
              padding: 32, textAlign: "center", backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: 8, color: "#52525b", fontSize: 12,
            }}>
              No prospects in {BUCKET_META.find(b => b.id === activeBucket)?.label ?? "this bucket"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {currentBucketItems.map(item => (
                <ProspectCard
                  key={item.id}
                  item={item}
                  onPromote={() => { setActionItem(item); setActionType("promote"); }}
                  onDemote={() => { setActionItem(item); setActionType("demote"); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Task List (~40%) */}
        <div style={{ flex: "0 0 38%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Action Items</span>
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
              backgroundColor: filteredTasks.length > 0 ? "#422006" : "#052e16",
              color: filteredTasks.length > 0 ? "#fbbf24" : "#4ade80",
            }}>{filteredTasks.length} pending</span>
          </div>

          {filteredTasks.length === 0 ? (
            <div style={{
              padding: 32, textAlign: "center", backgroundColor: "#052e16", border: "1px solid #166534",
              borderRadius: 8, color: "#4ade80", fontSize: 12, fontWeight: 500,
            }}>
              ✓ All tasks complete
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => handleCompleteTask(task.id)}
                  onSnooze={(until) => handleSnoozeTask(task.id, until)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Reference Module (collapsible) ── */}
      <ReferenceModule community={community} plans={plans} lots={lots} modelHome={modelHome} />

      {/* ── Action Modal ── */}
      {actionItem && actionType && (
        <ActionModal
          item={actionItem}
          action={actionType}
          onClose={() => { setActionItem(null); setActionType(null); }}
          onExecute={handleAction}
        />
      )}
    </div>
  );
}

export default CommunityView;
