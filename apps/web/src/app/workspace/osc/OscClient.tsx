"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PipelineDetailView, { type PipelineItem } from "@/components/PipelineDetailView";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  contact_id: string;
  crm_stage: string;
  community_id: string | null;
  division_id: string | null;
  osc_id: string | null;
  source: string | null;
  opportunity_source: string | null;
  queue_source: string | null;
  notes: string | null;
  budget_min: number | null;
  budget_max: number | null;
  engagement_score: number | null;
  last_activity_at: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  communities: { name: string } | null;
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
  division_id: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string } | null;
}

interface TeamUser {
  id: string;
  full_name: string;
}

interface CommunityRef { id: string; name: string; }

interface CommunityDetail {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: string | null;
  price_from: number | null;
  hoa_fee: number | null;
  hoa_period: string | null;
  total_homesites: number | null;
  school_district: string | null;
  amenities: string[] | null;
  website_url: string | null;
  brochure_url: string | null;
  site_map_url: string | null;
}

interface CommunityPlan {
  id: string;
  name: string;
  base_price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
}

interface CommunityLot {
  id: string;
  lot_number: string | null;
  status: string | null;
  premium: number | null;
  address: string | null;
}

interface ModelHome {
  id: string;
  name: string | null;
  address: string | null;
  hours: string | null;
}

type QueueBucket = "new_inbound" | "re_engaged" | "demoted" | "ai_surfaced" | "customer";

interface CommActivity {
  id: string;
  contact_id: string | null;
  channel: string | null;
  direction: string;
  subject: string | null;
  occurred_at: string;
  is_read: boolean | null;
  read_at: string | null;
  needs_response: boolean | null;
  responded_at: string | null;
  is_urgent: boolean | null;
  contacts: { first_name: string; last_name: string } | null;
}

type CommHubTab = "urgent" | "needs_response" | "email" | "phone" | "sms" | "all";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}K`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

function sourceLabel(src: string | null): string {
  const map: Record<string, string> = {
    called_osc: "📞 Called", texted_osc: "💬 Texted", webform_interest: "🌐 Web Form",
    schedule_appt: "📅 Appt Request", ai_auto_promote: "🤖 AI Surfaced",
    website: "🌐 Website", realtor: "🏠 Realtor", walk_in: "🚶 Walk-in",
    event: "🎪 Event", phone: "📞 Phone", referral: "👤 Referral",
    zillow: "🏠 Zillow", social_media: "📱 Social",
  };
  return map[src ?? ""] ?? src ?? "—";
}

function classifyBucket(item: QueueItem): QueueBucket {
  const qs = item.queue_source;
  if (qs === "demoted") return "demoted";
  if (qs === "ai_surfaced" || item.opportunity_source === "ai_auto_promote") return "ai_surfaced";
  if (qs === "re_engaged") return "re_engaged";
  if (qs === "customer") return "customer";
  // Default: new inbound (web forms, calls, texts, walk-ins, etc.)
  return "new_inbound";
}

const BUCKET_META: { id: QueueBucket; icon: string; label: string; description: string }[] = [
  { id: "new_inbound", icon: "🆕", label: "New Inbound", description: "Brand new web forms, calls" },
  { id: "re_engaged", icon: "📋", label: "Re-engaged", description: "Existing leads showing new activity" },
  { id: "demoted", icon: "↓", label: "Demoted", description: "Prospects pushed back by CSM" },
  { id: "ai_surfaced", icon: "🤖", label: "AI Surfaced", description: "Scoring spikes, behavioral signals" },
  { id: "customer", icon: "👤", label: "Customer", description: "Existing homeowners reaching out" },
];

function channelIcon(ch: string | null): string {
  const map: Record<string, string> = {
    call: "📞", phone: "📞", email: "📧", text: "💬", sms: "💬", chat: "💬",
  };
  return map[ch ?? ""] ?? "📋";
}

function activityChannelIcon(ch: string | null): string {
  const map: Record<string, string> = {
    email: "📧", phone: "📞", call: "📞", sms: "💬", text: "💬",
    voicemail: "🎙", webform: "🌐", chat: "💭", virtual_tour: "🖥", walk_in: "🚶",
  };
  return map[ch ?? ""] ?? "📬";
}

const COMM_HUB_TABS: { id: CommHubTab; icon: string; label: string }[] = [
  { id: "urgent", icon: "⚡", label: "Urgent" },
  { id: "needs_response", icon: "📬", label: "Needs Response" },
  { id: "email", icon: "📧", label: "Email" },
  { id: "phone", icon: "📞", label: "Phone" },
  { id: "sms", icon: "💬", label: "SMS" },
  { id: "all", icon: "", label: "All" },
];

function priorityBadge(p: string | null): { color: string; bg: string; label: string } {
  if (p === "high") return { color: "#fca5a5", bg: "#7f1d1d", label: "🔴 High" };
  if (p === "medium") return { color: "#fbbf24", bg: "#422006", label: "🟡 Medium" };
  return { color: "#86efac", bg: "#052e16", label: "🟢 Low" };
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: 48 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>◎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>OSC Command Center</div>
      <div style={{ fontSize: 13, color: "#71717a", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#80B602" }}>Division</strong> to load your Queue and Action Items.
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

const ASSIGN_LANES = [
  { value: "lead_div", label: "Lead (Division)", description: "Just interested in the division, no community", needsCommunity: false },
  { value: "lead_com", label: "Lead (Community)", description: "Interested in a specific community", needsCommunity: true },
  { value: "prospect_c", label: "Prospect C", description: "30-90 day horizon", needsCommunity: true },
  { value: "prospect_b", label: "Prospect B", description: "Intent within 30 days", needsCommunity: true },
  { value: "prospect_a", label: "Prospect A", description: "Contract this week", needsCommunity: true },
  { value: "archived", label: "Archive", description: "On ice, opted out, not interested right now", needsCommunity: false },
  { value: "deleted", label: "Delete", description: "Spam, junk, remove from system", needsCommunity: false },
] as const;

function getAiSuggestion(item: QueueItem, communities: CommunityRef[]): string {
  const communityName = item.communities?.name;
  const src = item.opportunity_source ?? item.source;
  if (item.community_id && communityName) {
    return `Submitted form for ${communityName}. Suggest: Lead (Community) at ${communityName}`;
  }
  if (src === "schedule_appt" || src === "schedule_visit") {
    return `Requested a visit. Suggest: Prospect C${communityName ? ` at ${communityName}` : ""}`;
  }
  if (src === "subscribe_region") {
    return "Subscribed to division updates. Suggest: Lead (Division)";
  }
  return "Review form details and assign to appropriate lane";
}

function AssignModal({
  item, communities, onClose, onExecute,
}: {
  item: QueueItem;
  communities: CommunityRef[];
  onClose: () => void;
  onExecute: (oppId: string, newStage: string, communityId: string | null, reason: string) => void;
}) {
  const [targetStage, setTargetStage] = useState("lead_com");
  const [targetCommunity, setTargetCommunity] = useState(item.community_id ?? "");
  const [reason, setReason] = useState("");

  const selectedLane = ASSIGN_LANES.find(l => l.value === targetStage);
  const needsCommunity = selectedLane?.needsCommunity ?? false;
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const suggestion = getAiSuggestion(item, communities);

  const canSubmit = !needsCommunity || !!targetCommunity;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 520, backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
        zIndex: 51, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #27272a" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fafafa" }}>
            Assign: {name}
          </div>
          <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
            Currently in Queue{item.communities?.name ? ` — ${item.communities.name}` : ""}
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* AI Suggestion */}
          <div style={{
            padding: "10px 14px", backgroundColor: "#052e16", border: "1px solid #166534",
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              🤖 AI Suggestion
            </div>
            <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>
              {suggestion}
            </div>
          </div>

          {/* Target lane */}
          <div>
            <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Assign to Lane
            </label>
            <select value={targetStage} onChange={e => setTargetStage(e.target.value)} style={{
              width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
              borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none",
            }}>
              {ASSIGN_LANES.map(l => (
                <option key={l.value} value={l.value}>{l.label} — {l.description}</option>
              ))}
            </select>
          </div>

          {/* Community picker (conditional) */}
          {needsCommunity && (
            <div>
              <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Community <span style={{ color: "#f87171" }}>*</span>
              </label>
              <select value={targetCommunity} onChange={e => setTargetCommunity(e.target.value)} style={{
                width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none",
              }}>
                <option value="">Select community...</option>
                {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Reason <span style={{ fontSize: 10, color: "#52525b" }}>(optional)</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="e.g., Toured model, very interested in Hadley plan"
              style={{
                width: "100%", padding: "8px 12px", backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: 6, color: "#a1a1aa", fontSize: 12, outline: "none", resize: "none",
              }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #27272a", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 6, border: "1px solid #27272a",
            backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
          }}>Cancel</button>
          <button
            onClick={() => onExecute(
              item.id,
              targetStage,
              needsCommunity ? targetCommunity : (targetStage === "lead_div" ? null : item.community_id),
              reason,
            )}
            disabled={!canSubmit}
            style={{
              padding: "8px 16px", borderRadius: 6, border: "1px solid #3f3f46",
              backgroundColor: "#18181b", color: canSubmit ? "#fafafa" : "#52525b",
              fontSize: 12, fontWeight: 600, cursor: canSubmit ? "pointer" : "default",
              opacity: canSubmit ? 1 : 0.4,
            }}>
            → Assign
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
    // Next Monday
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

// ─── Queue Card ───────────────────────────────────────────────────────────────

function QueueCard({
  item, onAssign,
}: {
  item: QueueItem;
  onAssign: () => void;
}) {
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      overflow: "hidden", transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >
      {/* Main row */}
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: "12px 16px", cursor: "pointer",
        display: "grid", gridTemplateColumns: "1fr auto auto auto auto",
        alignItems: "center", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#fafafa" }}>{name}</div>
          <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
            {item.communities?.name ?? "No community"} · {sourceLabel(item.opportunity_source ?? item.source)}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#71717a" }}>{item.contacts?.phone ?? "—"}</div>
        <div style={{ fontSize: 11, color: "#71717a" }}>{formatBudget(item.budget_min, item.budget_max)}</div>
        <div style={{ fontSize: 11, color: "#52525b" }}>{relativeTime(item.last_activity_at)}</div>
        <button onClick={e => { e.stopPropagation(); onAssign(); }} style={{
          padding: "4px 10px", borderRadius: 4, border: "1px solid #3f3f46",
          backgroundColor: "#18181b", color: "#a1a1aa", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>→ Assign</button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 16px 12px", borderTop: "1px solid #27272a", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Email</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.contacts?.email ?? "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Source</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{sourceLabel(item.source)}</div>
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
          {/* AI Recommendation */}
          <div style={{
            marginTop: 8, padding: "10px 14px", backgroundColor: "#052e16", border: "1px solid #166534",
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              🤖 AI Recommendation
            </div>
            <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>
              {item.opportunity_source === "webform_interest"
                ? `Responded via web form. Suggest calling within 5 minutes — speed-to-lead is critical. Reference their community interest in ${item.communities?.name ?? "the community"}.`
                : item.opportunity_source === "called_osc"
                ? "Inbound caller — high intent. Schedule a model home visit within the next 48 hours."
                : item.opportunity_source === "texted_osc"
                ? "Texted the sales line. Reply within 2 minutes with a warm greeting and availability for a call."
                : `Review this contact's activity and engagement. ${item.budget_min ? `Budget range ${formatBudget(item.budget_min, item.budget_max)} fits available inventory.` : "Budget not yet captured — ask during first contact."}`
              }
            </div>
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
  const contactName = task.contacts
    ? `${task.contacts.first_name} ${task.contacts.last_name}`
    : null;

  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      padding: "12px 14px", transition: "border-color 0.15s", position: "relative",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >
      {/* Header: title + priority */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#fafafa", flex: 1 }}>
          {channelIcon(task.channel)} {task.title}
        </span>
        <span style={{
          fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 600,
          backgroundColor: pb.bg, color: pb.color,
        }}>{pb.label}</span>
      </div>

      {/* Contact + due */}
      {contactName && (
        <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>
          {contactName}
        </div>
      )}

      {/* AI suggestion */}
      {task.ai_suggestion && (
        <div style={{
          fontSize: 11, color: "#86efac", backgroundColor: "#052e16", border: "1px solid #166534",
          borderRadius: 4, padding: "6px 10px", marginBottom: 8, lineHeight: 1.5,
        }}>
          🤖 {task.ai_suggestion}
        </div>
      )}

      {task.description && !task.ai_suggestion && (
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8, lineHeight: 1.4 }}>
          {task.description}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
        {task.channel === "call" || task.channel === "phone" ? (
          <ActionBtn label="📞 Call" />
        ) : null}
        {task.channel === "email" ? (
          <ActionBtn label="📧 Email" />
        ) : null}
        {task.channel === "text" || task.channel === "sms" ? (
          <ActionBtn label="💬 Text" />
        ) : null}
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

// ─── Reference Module ──────────────────────────────────────────────────────────

function ReferenceModule({ communities, divisionId }: { communities: CommunityRef[]; divisionId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [plans, setPlans] = useState<CommunityPlan[]>([]);
  const [lots, setLots] = useState<CommunityLot[]>([]);
  const [modelHome, setModelHome] = useState<ModelHome | null>(null);
  const [refLoading, setRefLoading] = useState(false);

  useEffect(() => {
    if (!selectedCommunityId) {
      setDetail(null);
      setPlans([]);
      setLots([]);
      setModelHome(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setRefLoading(true);
      const [detailRes, plansRes, lotsRes, modelRes] = await Promise.all([
        supabase.from("communities").select("id, name, city, state, status, price_from, hoa_fee, hoa_period, total_homesites, school_district, amenities, website_url, brochure_url, site_map_url").eq("id", selectedCommunityId).single(),
        supabase.from("community_plans").select("id, name, base_price, beds, baths, sqft").eq("community_id", selectedCommunityId).order("base_price", { ascending: true }),
        supabase.from("lots").select("id, lot_number, status, premium, address").eq("community_id", selectedCommunityId).eq("is_available", true).order("lot_number", { ascending: true }),
        supabase.from("model_homes").select("id, name, address, hours").eq("community_id", selectedCommunityId).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setDetail((detailRes.data as CommunityDetail) ?? null);
      setPlans((plansRes.data as CommunityPlan[]) ?? []);
      setLots((lotsRes.data as CommunityLot[]) ?? []);
      setModelHome((modelRes.data as ModelHome) ?? null);
      setRefLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedCommunityId]);

  // Reset selection when division changes
  useEffect(() => {
    setSelectedCommunityId("");
  }, [divisionId]);

  const fmtPrice = (n: number | null) => n != null ? `$${n.toLocaleString()}` : "—";

  return (
    <div style={{ borderTop: "1px solid #27272a", marginTop: 20 }}>
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: "#a1a1aa",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          📚 Community Reference
        </span>
        <span style={{ fontSize: 11, color: "#52525b" }}>{expanded ? "▲ Collapse" : "▼ Expand"}</span>
      </button>

      {expanded && (
        <div style={{ paddingBottom: 16 }}>
          {/* Community selector */}
          <div style={{ marginBottom: 16 }}>
            <select
              value={selectedCommunityId}
              onChange={e => setSelectedCommunityId(e.target.value)}
              style={{
                padding: "8px 12px", backgroundColor: "#18181b", border: "1px solid #27272a",
                borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none", minWidth: 280,
              }}
            >
              <option value="">Select a community...</option>
              {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {refLoading && (
            <div style={{ textAlign: "center", color: "#52525b", padding: 24, fontSize: 12 }}>Loading community data...</div>
          )}

          {!refLoading && detail && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Row 1 — Key Facts */}
              <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontWeight: 600 }}>Key Facts</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  <RefFact label="Community" value={detail.name} />
                  <RefFact label="Location" value={[detail.city, detail.state].filter(Boolean).join(", ") || "—"} />
                  <RefFact label="Status" value={detail.status ?? "—"} />
                  <RefFact label="Price From" value={fmtPrice(detail.price_from)} highlight />
                  <RefFact label="HOA Fee" value={detail.hoa_fee != null ? `$${detail.hoa_fee}${detail.hoa_period ? ` / ${detail.hoa_period}` : ""}` : "—"} />
                  <RefFact label="Total Homesites" value={detail.total_homesites != null ? String(detail.total_homesites) : "—"} />
                  <RefFact label="Available Lots" value={String(lots.length)} highlight />
                  <RefFact label="School District" value={detail.school_district ?? "—"} />
                </div>
              </div>

              {/* Row 2 — Floor Plans */}
              <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontWeight: 600 }}>
                  Floor Plans {plans.length > 0 && <span style={{ color: "#52525b" }}>({plans.length})</span>}
                </div>
                {plans.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#52525b" }}>No plans found</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #27272a" }}>
                        {["Plan", "Price", "Beds", "Baths", "Sq Ft"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "4px 8px", color: "#52525b", fontWeight: 500, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #1a1a1e" }}>
                          <td style={{ padding: "6px 8px", color: "#fafafa", fontWeight: 500 }}>{p.name}</td>
                          <td style={{ padding: "6px 8px", color: "#a1a1aa" }}>{fmtPrice(p.base_price)}</td>
                          <td style={{ padding: "6px 8px", color: "#a1a1aa" }}>{p.beds ?? "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#a1a1aa" }}>{p.baths ?? "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#a1a1aa" }}>{p.sqft != null ? p.sqft.toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Row 3 — Available Lots */}
              <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontWeight: 600 }}>
                  Available Lots {lots.length > 0 && <span style={{ color: "#52525b" }}>({lots.length})</span>}
                </div>
                {lots.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#52525b" }}>No available lots</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #27272a" }}>
                        {["Lot #", "Status", "Premium", "Address"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "4px 8px", color: "#52525b", fontWeight: 500, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map(l => (
                        <tr key={l.id} style={{ borderBottom: "1px solid #1a1a1e" }}>
                          <td style={{ padding: "6px 8px", color: "#fafafa", fontWeight: 500 }}>{l.lot_number ?? "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#a1a1aa" }}>{l.status ?? "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#a1a1aa" }}>{l.premium != null ? fmtPrice(l.premium) : "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#a1a1aa" }}>{l.address ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Row 4 — Quick Reference */}
              <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontWeight: 600 }}>Quick Reference</div>

                {/* Amenities */}
                {detail.amenities && detail.amenities.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", marginBottom: 6 }}>Amenities</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {detail.amenities.map((a, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 4,
                          backgroundColor: "#27272a", color: "#a1a1aa",
                        }}>{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Home */}
                {modelHome && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", marginBottom: 6 }}>Model Home</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6 }}>
                      {modelHome.name && <div style={{ fontWeight: 500, color: "#fafafa" }}>{modelHome.name}</div>}
                      {modelHome.address && <div>{modelHome.address}</div>}
                      {modelHome.hours && <div style={{ color: "#71717a" }}>Hours: {modelHome.hours}</div>}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div>
                  <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", marginBottom: 6 }}>Links</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {detail.website_url && <RefLink label="🌐 Website" href={detail.website_url} />}
                    {detail.brochure_url && <RefLink label="📄 Brochure" href={detail.brochure_url} />}
                    {detail.site_map_url && <RefLink label="🗺️ Site Map" href={detail.site_map_url} />}
                    {!detail.website_url && !detail.brochure_url && !detail.site_map_url && (
                      <span style={{ fontSize: 12, color: "#52525b" }}>No links available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!refLoading && !detail && selectedCommunityId === "" && (
            <div style={{ textAlign: "center", color: "#52525b", padding: 24, fontSize: 12 }}>
              Select a community above to view reference data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RefFact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: highlight ? "#4ade80" : "#fafafa", fontWeight: highlight ? 600 : 400 }}>{value}</div>
    </div>
  );
}

function RefLink({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
      backgroundColor: "#09090b", color: "#a1a1aa", textDecoration: "none", cursor: "pointer",
    }}>{label}</a>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OscClient() {
  const { filter, labels } = useGlobalFilter();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [communities, setCommunities] = useState<CommunityRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignItem, setAssignItem] = useState<QueueItem | null>(null);
  const [activeBucket, setActiveBucket] = useState<QueueBucket>("new_inbound");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [oscUsers, setOscUsers] = useState<TeamUser[]>([]);
  const [leftPane, setLeftPane] = useState<"queue" | "comms">("queue");
  const [commActivities, setCommActivities] = useState<CommActivity[]>([]);
  const [drillBucket, setDrillBucket] = useState<QueueBucket | null>(null);
  const [activeCommTab, setActiveCommTab] = useState<CommHubTab>("needs_response");

  // ── Fetch queue + tasks ──
  const fetchData = useCallback(async () => {
    if (!filter.divisionId) return;
    setLoading(true);

    // Communities for this division
    const { data: comms } = await supabase
      .from("communities").select("id, name").eq("division_id", filter.divisionId).order("name");
    setCommunities(comms ?? []);

    // OSC team members
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "osc")
      .eq("is_active", true);
    setOscUsers((users as TeamUser[]) ?? []);

    // Queue items
    const { data: items } = await supabase
      .from("opportunities")
      .select("id, contact_id, crm_stage, community_id, division_id, osc_id, source, opportunity_source, queue_source, notes, budget_min, budget_max, engagement_score, last_activity_at, created_at, contacts(first_name, last_name, email, phone), communities(name)")
      .eq("crm_stage", "queue")
      .eq("division_id", filter.divisionId)
      .order("last_activity_at", { ascending: false });

    const flat = (items ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      contacts: Array.isArray(item.contacts) ? (item.contacts as Record<string, unknown>[])[0] ?? null : item.contacts,
      communities: Array.isArray(item.communities) ? (item.communities as Record<string, unknown>[])[0] ?? null : item.communities,
    })) as QueueItem[];
    setQueueItems(flat);

    // Tasks
    const now = new Date().toISOString();
    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, title, description, priority, channel, status, due_at, snoozed_until, completed_at, ai_suggestion, contact_id, opportunity_id, assigned_to_id, division_id, created_at, contacts(first_name, last_name)")
      .eq("division_id", filter.divisionId)
      .eq("status", "pending")
      .or(`snoozed_until.is.null,snoozed_until.lte.${now}`)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    const flatTasks = (taskData ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      contacts: Array.isArray(t.contacts) ? (t.contacts as Record<string, unknown>[])[0] ?? null : t.contacts,
    })) as TaskItem[];
    setTasks(flatTasks);

    // Fetch activities for Comm Hub
    const { data: actData } = await supabase
      .from("activities")
      .select("id, contact_id, channel, direction, subject, occurred_at, is_read, read_at, needs_response, responded_at, is_urgent, contacts(first_name, last_name)")
      .eq("direction", "inbound")
      .eq("division_id", filter.divisionId)
      .order("occurred_at", { ascending: false })
      .limit(100);

    const flatActivities = (actData ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      contacts: Array.isArray(a.contacts) ? (a.contacts as Record<string, unknown>[])[0] ?? null : a.contacts,
    })) as CommActivity[];
    setCommActivities(flatActivities);

    setLoading(false);
  }, [filter.divisionId]);

  useEffect(() => {
    if (!filter.divisionId) {
      setQueueItems([]);
      setTasks([]);
      setCommunities([]);
      return;
    }
    fetchData();

    // Supabase Realtime — live updates
    const channel = supabase
      .channel("osc-queue-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "opportunities",
        filter: `division_id=eq.${filter.divisionId}`,
      }, () => { fetchData(); })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `division_id=eq.${filter.divisionId}`,
      }, () => { fetchData(); })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "activities",
      }, () => { fetchData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter.divisionId, fetchData]);

  // ── Apply team filter ──
  const filteredQueueItems = teamFilter === "all"
    ? queueItems
    : queueItems.filter(q => q.osc_id === teamFilter);
  const filteredTasks = teamFilter === "all"
    ? tasks
    : tasks.filter(t => t.assigned_to_id === teamFilter);

  // ── Bucketed queue ──
  const bucketCounts: Record<QueueBucket, number> = {
    new_inbound: 0, re_engaged: 0, demoted: 0, ai_surfaced: 0, customer: 0,
  };
  const bucketedItems: Record<QueueBucket, QueueItem[]> = {
    new_inbound: [], re_engaged: [], demoted: [], ai_surfaced: [], customer: [],
  };
  for (const item of filteredQueueItems) {
    const bucket = classifyBucket(item);
    bucketCounts[bucket]++;
    bucketedItems[bucket].push(item);
  }
  const currentBucketItems = bucketedItems[activeBucket];

  // Drill-down items for PipelineDetailView
  const drillBucketMeta = drillBucket ? BUCKET_META.find(b => b.id === drillBucket) : null;
  const drillItems: PipelineItem[] = drillBucket
    ? (bucketedItems[drillBucket] ?? []).map(q => ({
        id: q.id,
        contact_id: q.contact_id,
        first_name: q.contacts?.first_name ?? "\u2014",
        last_name: q.contacts?.last_name ?? "",
        email: q.contacts?.email ?? null,
        phone: q.contacts?.phone ?? null,
        crm_stage: q.crm_stage,
        source: q.source ?? null,
        budget_min: q.budget_min ?? null,
        budget_max: q.budget_max ?? null,
        last_activity_at: q.last_activity_at ?? null,
        engagement_score: q.engagement_score ?? null,
        notes: q.notes ?? null,
        created_at: q.created_at,
      }))
    : [];

  // ── Mark activity as read ──
  async function handleMarkRead(activityId: string) {
    await supabase.from("activities").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", activityId);
    setCommActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true, read_at: new Date().toISOString() } : a));
  }

  // Comm Hub computed values
  const unreadCommCount = commActivities.filter(a => !a.is_read).length;
  const commCounts: Record<CommHubTab, number> = {
    urgent: commActivities.filter(a => a.is_urgent).length,
    needs_response: commActivities.filter(a => a.needs_response && !a.responded_at).length,
    email: commActivities.filter(a => a.channel === "email").length,
    phone: commActivities.filter(a => a.channel === "phone" || a.channel === "call").length,
    sms: commActivities.filter(a => a.channel === "sms" || a.channel === "text").length,
    all: commActivities.length,
  };
  const filteredCommActivities = commActivities.filter(a => {
    if (activeCommTab === "urgent") return a.is_urgent;
    if (activeCommTab === "needs_response") return a.needs_response && !a.responded_at;
    if (activeCommTab === "email") return a.channel === "email";
    if (activeCommTab === "phone") return a.channel === "phone" || a.channel === "call";
    if (activeCommTab === "sms") return a.channel === "sms" || a.channel === "text";
    return true;
  });

  // ── Execute promotion/demotion ──
  async function handleAction(oppId: string, newStage: string, communityId: string | null, reason: string) {
    const update: Record<string, unknown> = { crm_stage: newStage };
    if (communityId) update.community_id = communityId;
    if (newStage === "lead_div") update.community_id = null;

    const { error } = await supabase
      .from("opportunities")
      .update(update)
      .eq("id", oppId);

    if (error) {
      console.error("Stage transition failed:", error);
      alert(`Error: ${error.message}`);
    } else {
      const item = queueItems.find(q => q.id === oppId);
      if (item) {
        await supabase.from("stage_transitions").insert({
          org_id: "00000000-0000-0000-0000-000000000001",
          opportunity_id: oppId,
          contact_id: item.contact_id,
          from_stage: "queue",
          to_stage: newStage,
          triggered_by: "manual",
          reason: reason || null,
        });
      }
    }

    setAssignItem(null);
    fetchData();
  }

  // ── Complete task ──
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

  // ── Snooze task ──
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

  // ── No division selected ──
  if (!filter.divisionId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#09090b", color: "#fafafa" }}>
        <div style={{ padding: "10px 24px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>OSC Command Center</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>Online Sales Consultant</span>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#09090b", color: "#fafafa" }}>
      {/* ── Top Bar ── */}
      <div style={{
        padding: "10px 24px", borderBottom: "1px solid #27272a",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>OSC Command Center</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>
            {labels.division ?? "Division"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            style={{
              backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 6,
              color: "#a1a1aa", fontSize: 12, padding: "6px 12px", outline: "none",
            }}
          >
            <option value="all">All Team Members</option>
            {oscUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#52525b" }}>Queue:</span>
            <span style={{
              fontSize: 16, fontWeight: 700,
              color: filteredQueueItems.length === 0 ? "#4ade80" : filteredQueueItems.length > 10 ? "#f87171" : "#fbbf24",
            }}>{filteredQueueItems.length}</span>
          </div>
          <span style={{ fontSize: 11, color: "#52525b" }}>
            Goal: <strong style={{ color: filteredQueueItems.length === 0 ? "#4ade80" : "#fafafa" }}>0</strong>
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#52525b", padding: 48 }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            {/* ── LEFT: Queue + Comm Hub (~60%) ── */}
            <div style={{ flex: "0 0 60%", minWidth: 0 }}>
              {/* Tier 1 tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 12, borderBottom: "1px solid #27272a" }}>
                <button onClick={() => setLeftPane("queue")} style={{
                  padding: "6px 14px", fontSize: 13, fontWeight: leftPane === "queue" ? 600 : 400,
                  color: leftPane === "queue" ? "#fafafa" : "#52525b",
                  borderBottom: leftPane === "queue" ? "2px solid #fafafa" : "2px solid transparent",
                  background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  OSC Queue
                  <span style={{ fontSize: 10, padding: "0 5px", borderRadius: 3, fontWeight: 600, backgroundColor: filteredQueueItems.length > 0 ? "#7f1d1d" : "#052e16", color: filteredQueueItems.length > 0 ? "#fca5a5" : "#4ade80" }}>{filteredQueueItems.length}</span>
                </button>
                <button onClick={() => setLeftPane("comms")} style={{
                  padding: "6px 14px", fontSize: 13, fontWeight: leftPane === "comms" ? 600 : 400,
                  color: leftPane === "comms" ? "#fafafa" : "#52525b",
                  borderBottom: leftPane === "comms" ? "2px solid #fafafa" : "2px solid transparent",
                  background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  Comm Hub
                  <span style={{ fontSize: 10, padding: "0 5px", borderRadius: 3, fontWeight: 600, backgroundColor: unreadCommCount > 0 ? "#7f1d1d" : "#27272a", color: unreadCommCount > 0 ? "#fca5a5" : "#71717a" }}>{unreadCommCount}</span>
                </button>
              </div>

              {leftPane === "queue" ? (
              drillBucket ? (
                <PipelineDetailView
                  items={drillItems}
                  divisionId={filter.divisionId}
                  onBack={() => setDrillBucket(null)}
                  bucketLabel={drillBucketMeta?.label ?? "Queue"}
                />
              ) : (
              <>
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
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      whiteSpace: "nowrap",
                    }}>
                      <span>{b.icon}</span>
                      <span>{b.label}</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); if (count > 0) { setActiveBucket(b.id); setDrillBucket(b.id); } }}
                        title={count > 0 ? `View all ${b.label}` : undefined}
                        style={{
                          fontSize: 10, padding: "0 5px", borderRadius: 3, fontWeight: 600,
                          backgroundColor: count > 0 ? "#7f1d1d" : "#27272a",
                          color: count > 0 ? "#fca5a5" : "#71717a",
                          cursor: count > 0 ? "pointer" : "default",
                        }}
                      >{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Queue items for active bucket */}
              {currentBucketItems.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: "center", backgroundColor: "#18181b", border: "1px solid #27272a",
                  borderRadius: 8, color: "#52525b", fontSize: 12,
                }}>
                  No items in {BUCKET_META.find(b => b.id === activeBucket)?.label ?? "this bucket"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {currentBucketItems.map(item => (
                    <QueueCard
                      key={item.id}
                      item={item}
                      onAssign={() => { setAssignItem(item); }}
                    />
                  ))}
                </div>
              )}
              </>
              )
            ) : (
              /* Comm Hub */
              <>
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", marginBottom: 12, flexWrap: "wrap" }}>
                {COMM_HUB_TABS.map(t => {
                  const isActive = activeCommTab === t.id;
                  const count = commCounts[t.id];
                  return (
                    <button key={t.id} onClick={() => setActiveCommTab(t.id)} style={{
                      padding: "6px 10px", fontSize: 11, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fafafa" : "#52525b",
                      borderBottom: isActive ? "2px solid #fafafa" : "2px solid transparent",
                      background: "none", border: "none", borderBottomStyle: "solid",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                    }}>
                      {t.icon && <span>{t.icon}</span>}
                      <span>{t.label}</span>
                      <span style={{
                        fontSize: 10, padding: "0 5px", borderRadius: 3, fontWeight: 600,
                        backgroundColor: t.id === "urgent" && count > 0 ? "#7f1d1d" : count > 0 ? "#172554" : "#27272a",
                        color: t.id === "urgent" && count > 0 ? "#fca5a5" : count > 0 ? "#60a5fa" : "#71717a",
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {filteredCommActivities.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: "center", backgroundColor: "#18181b", border: "1px solid #27272a",
                  borderRadius: 6, color: "#52525b", fontSize: 12,
                }}>No activities in this view</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {filteredCommActivities.map(a => {
                    const contactName = a.contacts ? `${a.contacts.first_name} ${a.contacts.last_name}` : "Unknown";
                    const isRead = !!a.is_read;
                    return (
                      <div key={a.id} style={{
                        padding: "8px 12px", display: "flex", alignItems: "center", gap: 10,
                        borderRadius: 6, cursor: "pointer", opacity: isRead ? 0.5 : 1,
                        transition: "background-color 0.1s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{activityChannelIcon(a.channel)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "#fafafa" }}>{contactName}</span>
                            {a.is_urgent && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600, backgroundColor: "#7f1d1d", color: "#fca5a5" }}>URGENT</span>}
                            {a.needs_response && !a.responded_at && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600, backgroundColor: "#422006", color: "#fbbf24" }}>NEEDS RESPONSE</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.subject ?? "No subject"}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: "#52525b", flexShrink: 0, whiteSpace: "nowrap" }}>{relativeTime(a.occurred_at)}</span>
                        {!isRead && (
                          <button
                            onClick={e => { e.stopPropagation(); handleMarkRead(a.id); }}
                            title="Mark as read"
                            style={{
                              padding: "2px 6px", borderRadius: 3, border: "1px solid #27272a",
                              backgroundColor: "#09090b", color: "#52525b", fontSize: 11, cursor: "pointer",
                              opacity: 0.6, transition: "opacity 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                          >✓</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </>
            )}
            </div>

            {/* ── RIGHT: Action Items (Tasks) (~38%) ── */}
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
        )}

        {/* ── Reference Module ── */}
        {!loading && (
          <ReferenceModule communities={communities} divisionId={filter.divisionId!} />
        )}
      </div>

      {/* ── Assign Modal ── */}
      {assignItem && (
        <AssignModal
          item={assignItem}
          communities={communities}
          onClose={() => { setAssignItem(null); }}
          onExecute={handleAction}
        />
      )}
    </div>
  );
}
