"use client";

import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false, loading: () => <div style={{ height: 150, backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: 4 }} /> });
import "react-quill-new/dist/quill.snow.css";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import OpportunityPanel, { type OpportunityPanelData } from "@/components/OpportunityPanel";
import PipelineDetailView, { type PipelineItem } from "@/components/PipelineDetailView";
import CommHub from "@/components/CommHub";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  assignOpportunity,
  sendEmail,
  sendSms,
  generateResponse,
  evaluateQueueItem,
  markRead,
} from "@/lib/crm-api";

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
  prior_stage?: string | null;
  prior_community?: string | null;
  is_new_contact?: boolean;
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

interface AgentRecommendation {
  stage: string;
  confidence: number;
  reasoning: string;
  community_id?: string | null;
  community_name?: string | null;
}

interface GeneratedResponses {
  email?: { subject: string; body: string };
  sms?: { body: string };
}

type QueueBucket = "new_inbound" | "re_engaged" | "ai_surfaced";

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
  if (item.queue_source === "ai_surfaced" || item.opportunity_source === "ai_auto_promote") return "ai_surfaced";
  if (item.is_new_contact === false || item.prior_stage) return "re_engaged";
  return "new_inbound";
}

const BUCKET_META: { id: QueueBucket; icon: string; label: string; description: string }[] = [
  { id: "new_inbound", icon: "🆕", label: "New", description: "Brand new contacts, never in the system" },
  { id: "re_engaged", icon: "📋", label: "Existing", description: "Existing leads/prospects re-engaging" },
  { id: "ai_surfaced", icon: "🤖", label: "AI", description: "AI-surfaced based on scoring/signals" },
];

function channelIcon(ch: string | null): string {
  const map: Record<string, string> = {
    call: "📞", phone: "📞", email: "📧", text: "💬", sms: "💬", chat: "💬",
  };
  return map[ch ?? ""] ?? "📋";
}

function priorityBadge(p: string | null): { color: string; bg: string; label: string } {
  if (p === "high") return { color: "#fca5a5", bg: "#7f1d1d", label: "🔴 High" };
  if (p === "medium") return { color: "#fbbf24", bg: "#422006", label: "🟡 Medium" };
  return { color: "#86efac", bg: "#052e16", label: "🟢 Low" };
}

function stageLabel(stage: string | null | undefined): string {
  const map: Record<string, string> = {
    lead_div: "Lead", lead_com: "Lead", queue: "Queue",
    prospect_c: "Prospect C", prospect_b: "Prospect B", prospect_a: "Prospect A",
    homeowner: "Homeowner", archived: "Archived",
  };
  return map[stage ?? ""] ?? stage ?? "";
}

function isWebFormSource(item: QueueItem): boolean {
  const src = item.opportunity_source ?? item.source ?? "";
  return [
    "webform_interest", "subscribe_region", "subscribe_community",
    "schedule_visit", "schedule_appt", "prelaunch_community", "rsvp",
  ].includes(src);
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: 48 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>◎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>OSC Command Center</div>
      <div style={{ fontSize: 13, color: "#71717a", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#80B602" }}>Division</strong> to load your Queue and Communication Hub.
      </div>
    </div>
  );
}

// ─── Assign Lanes ─────────────────────────────────────────────────────────────

const ASSIGN_LANES = [
  { value: "lead_div", label: "Lead", description: "Division-level lead interest", needsCommunity: false },
  { value: "lead_com", label: "Lead", description: "Community-level lead interest", needsCommunity: true },
  { value: "prospect_c", label: "Prospect C", description: "30-90 day horizon", needsCommunity: true },
  { value: "prospect_b", label: "Prospect B", description: "Intent within 30 days", needsCommunity: true },
  { value: "prospect_a", label: "Prospect A", description: "Contract this week", needsCommunity: true },
  { value: "archived", label: "Archive", description: "On ice, opted out, not interested right now", needsCommunity: false },
  { value: "deleted", label: "Delete", description: "Spam, junk, remove from system", needsCommunity: false },
] as const;

// ─── Assign Modal (Override Flow) ─────────────────────────────────────────────

function AssignModal({
  item, communities, onClose, onExecute, divisionName, recommendation,
}: {
  item: QueueItem;
  communities: CommunityRef[];
  onClose: () => void;
  onExecute: (oppId: string, newStage: string, communityId: string | null, reason: string, confidence: number | null) => void;
  divisionName: string;
  recommendation: AgentRecommendation | null;
}) {
  const isMobile = useIsMobile();
  const defaultStage = recommendation?.stage ?? (() => {
    const src = item.opportunity_source ?? item.source;
    if (src === "subscribe_region") return "lead_div";
    if (src === "schedule_appt" || src === "schedule_visit") return "prospect_c";
    if (item.community_id) return "lead_com";
    return "lead_div";
  })();
  const [targetStage, setTargetStage] = useState(defaultStage);
  const [targetCommunity, setTargetCommunity] = useState(recommendation?.community_id ?? item.community_id ?? "");
  const [reason, setReason] = useState("");

  const selectedLane = ASSIGN_LANES.find(l => l.value === targetStage);
  const needsCommunity = selectedLane?.needsCommunity ?? false;
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const canSubmit = !needsCommunity || !!targetCommunity;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed",
        ...(isMobile
          ? { inset: 0 }
          : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 520, maxHeight: "80vh", borderRadius: 12, border: "1px solid #3f3f46" }
        ),
        backgroundColor: "#18181b",
        zIndex: 51, overflow: "auto",
        display: "flex", flexDirection: "column" as const,
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #27272a" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fafafa" }}>
            Override Assignment: {name}
          </div>
          <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
            Currently in Queue{item.communities?.name ? ` — ${item.communities.name}` : ""}
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Agent Recommendation (if available) */}
          {recommendation && (
            <div style={{
              padding: "10px 14px", backgroundColor: "#052e16", border: "1px solid #166534",
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                🤖 Agent Recommended
              </div>
              <div style={{ fontSize: 13, color: "#86efac", fontWeight: 600 }}>
                {stageLabel(recommendation.stage)}{recommendation.community_name ? ` · ${recommendation.community_name}` : ""} ({recommendation.confidence}%)
              </div>
              <div style={{ fontSize: 11, color: "#86efac", opacity: 0.8, marginTop: 2 }}>
                {recommendation.reasoning}
              </div>
            </div>
          )}

          {/* Target lane */}
          <div>
            <label style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Override to Lane
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
              Reason for Override <span style={{ fontSize: 10, color: "#52525b" }}>(optional)</span>
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
              reason || "Human override",
              null, // no confidence for overrides
            )}
            disabled={!canSubmit}
            style={{
              padding: "8px 16px", borderRadius: 6, border: "1px solid #3f3f46",
              backgroundColor: "#18181b", color: canSubmit ? "#fafafa" : "#52525b",
              fontSize: 12, fontWeight: 600, cursor: canSubmit ? "pointer" : "default",
              opacity: canSubmit ? 1 : 0.4,
            }}>
            → Override & Assign
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

// ─── Queue Card (Agent-First) ─────────────────────────────────────────────────

function QueueCard({
  item, onAssign, onNameClick, onApproveAssign, divisionName, isMobile, communities,
}: {
  item: QueueItem;
  onAssign: (rec: AgentRecommendation | null) => void;
  onNameClick: () => void;
  onApproveAssign: (oppId: string, stage: string, communityId: string | null, reasoning: string, confidence: number) => void;
  divisionName: string;
  isMobile?: boolean;
  communities: CommunityRef[];
}) {
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const [expanded, setExpanded] = useState(false);
  const [recommendation, setRecommendation] = useState<AgentRecommendation | null>(null);
  const [responses, setResponses] = useState<GeneratedResponses | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Email state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<{type: string; label: string; url: string}[]>([]);
  const [smsAttachments, setSmsAttachments] = useState<{type: string; label: string; url: string}[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSkipped, setEmailSkipped] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  // SMS state
  const [smsBody, setSmsBody] = useState("");
  const [smsEditing, setSmsEditing] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsSkipped, setSmsSkipped] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const webForm = isWebFormSource(item);
  const bucket = classifyBucket(item);

  // When card expands, fetch agent recommendation + generated responses
  useEffect(() => {
    if (!expanded) return;

    // Fetch recommendation
    if (!recommendation && !loadingRec) {
      setLoadingRec(true);
      evaluateQueueItem(item.id, { triggered_by: "human" }).then(result => {
        if (result.success && result.data?.recommendation) {
          const rec = result.data.recommendation as AgentRecommendation;
          setRecommendation(rec);
        } else {
          // Fallback recommendation based on form data
          const src = item.opportunity_source ?? item.source;
          const fallbackStage = src === "subscribe_region" ? "lead_div"
            : (src === "schedule_appt" || src === "schedule_visit") ? "prospect_c"
            : item.community_id ? "lead_com" : "lead_div";
          setRecommendation({
            stage: fallbackStage,
            confidence: 70,
            reasoning: `Based on form type: ${src ?? "unknown"}`,
            community_id: item.community_id,
            community_name: item.communities?.name ?? null,
          });
        }
        setLoadingRec(false);
      }).catch(() => setLoadingRec(false));
    }

    // Fetch generated responses for web forms
    if (webForm && !responses && !loadingResponses) {
      setLoadingResponses(true);
      generateResponse(item.id, { triggered_by: "human" }).then(result => {
        if (result.success && result.data) {
          const gen: GeneratedResponses = {};
          if (result.data.email) {
            const e = result.data.email as { subject?: string; body?: string };
            gen.email = { subject: e.subject ?? "", body: e.body ?? "" };
          }
          if (result.data.sms) {
            const s = result.data.sms as { body?: string };
            gen.sms = { body: s.body ?? "" };
          }
          setResponses(gen);
          if (gen.email) {
            setEmailSubject(gen.email.subject);
            setEmailBody(gen.email.body);
          }
          if (gen.sms) {
            setSmsBody(gen.sms.body);
          }
        }
        setLoadingResponses(false);
      }).catch(() => setLoadingResponses(false));
    }
  }, [expanded, item.id, recommendation, loadingRec, webForm, responses, loadingResponses, item.opportunity_source, item.source, item.community_id, item.communities?.name]);

  // Send email via crm-api
  async function handleSendEmail() {
    if (!item.contacts?.email) return;
    setEmailSending(true);
    const result = await sendEmail(
      item.contact_id,
      item.id,
      emailSubject,
      emailBody,
      {
        triggered_by: "human",
        confidence_score: recommendation?.confidence ? recommendation.confidence / 100 : undefined,
        reasoning: "OSC sent email response to web form",
      }
    );
    setEmailSending(false);
    if (result.success) {
      setEmailSent(true);
    } else {
      alert(`Email send failed: ${result.error ?? "Unknown error"}`);
    }
  }

  // Send SMS via crm-api
  async function handleSendSms() {
    if (!item.contacts?.phone) return;
    setSmsSending(true);
    const result = await sendSms(
      item.contact_id,
      item.id,
      smsBody,
      {
        triggered_by: "human",
        confidence_score: recommendation?.confidence ? recommendation.confidence / 100 : undefined,
        reasoning: "OSC sent SMS response to web form",
      }
    );
    setSmsSending(false);
    if (result.success) {
      setSmsSent(true);
    } else {
      alert(`SMS send failed: ${result.error ?? "Unknown error"}`);
    }
  }

  // Recommendation display label
  const recLabel = recommendation
    ? `${stageLabel(recommendation.stage)}${recommendation.community_name ? ` · ${recommendation.community_name}` : ""}`
    : null;

  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      overflow: "hidden", transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3f3f46")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}
    >
      {/* ── Collapsed Row — Desktop ── */}
      {!isMobile && (
        <div onClick={() => setExpanded(!expanded)} style={{
          padding: "12px 16px", cursor: "pointer",
          display: "grid", gridTemplateColumns: "1fr auto auto auto",
          alignItems: "center", gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div onClick={e => { e.stopPropagation(); onNameClick(); }} style={{ fontSize: 13, fontWeight: 500, color: "#fafafa", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#3f3f46", textUnderlineOffset: "2px" }}>{name}</div>
              {item.prior_stage && (
                <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, fontWeight: 600, backgroundColor: "#1e1b4b", color: "#818cf8", whiteSpace: "nowrap" }}>
                  {stageLabel(item.prior_stage)} · {item.prior_community ?? divisionName}
                </span>
              )}
              {item.is_new_contact && (
                <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, fontWeight: 600, backgroundColor: "#052e16", color: "#4ade80" }}>NEW</span>
              )}
              {bucket === "ai_surfaced" && (
                <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, fontWeight: 600, backgroundColor: "#422006", color: "#fbbf24" }}>🤖 AI</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>
              {divisionName}{item.communities?.name ? ` · ${item.communities.name}` : ""} · {item.opportunity_source ?? item.source ?? "webform"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {item.contacts?.phone && (
              <>
                <a href={`tel:${item.contacts.phone}`} onClick={e => e.stopPropagation()} title="Call" style={{ fontSize: 18, textDecoration: "none", cursor: "pointer", padding: "2px" }}>📞</a>
                <a href={`sms:${item.contacts.phone}`} onClick={e => e.stopPropagation()} title="SMS" style={{ fontSize: 18, textDecoration: "none", cursor: "pointer", padding: "2px" }}>💬</a>
              </>
            )}
            {item.contacts?.email && (
              <a href={`mailto:${item.contacts.email}`} onClick={e => e.stopPropagation()} title="Email" style={{ fontSize: 18, textDecoration: "none", cursor: "pointer", padding: "2px" }}>📧</a>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#52525b", textAlign: "right" }}>
            <div>{item.last_activity_at ? new Date(item.last_activity_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date(item.last_activity_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}</div>
            <div style={{ fontSize: 10, color: "#3f3f46" }}>{relativeTime(item.last_activity_at)}</div>
          </div>
          <div style={{ fontSize: 11, color: "#52525b" }}>
            {expanded ? "▲" : "▼"}
          </div>
        </div>
      )}

      {/* ── Collapsed Row — Mobile ── */}
      {isMobile && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <div onClick={e => { e.stopPropagation(); onNameClick(); }} style={{ fontSize: 15, fontWeight: 600, color: "#fafafa", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#3f3f46", textUnderlineOffset: "3px" }}>{name}</div>
              {item.prior_stage && (
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600, backgroundColor: "#1e1b4b", color: "#818cf8", whiteSpace: "nowrap" }}>
                  {stageLabel(item.prior_stage)} · {item.prior_community ?? divisionName}
                </span>
              )}
              {item.is_new_contact && (
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600, backgroundColor: "#052e16", color: "#4ade80" }}>NEW</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {item.contacts?.phone && <a href={`tel:${item.contacts.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 26, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>📞</a>}
              {item.contacts?.phone && <a href={`sms:${item.contacts.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 26, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>💬</a>}
              {item.contacts?.email && <a href={`mailto:${item.contacts.email}`} onClick={e => e.stopPropagation()} style={{ fontSize: 26, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>📧</a>}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>
            {divisionName}{item.communities?.name ? ` · ${item.communities.name}` : ""} · {item.opportunity_source ?? item.source ?? "webform"} · {item.last_activity_at ? new Date(item.last_activity_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date(item.last_activity_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}
          </div>
          <button onClick={() => setExpanded(!expanded)} style={{
            width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #27272a",
            backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
            minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>{expanded ? "▲ Collapse" : "▼ Review & Assign"}</button>
        </div>
      )}

      {/* ── Expanded: Agent-First Workflow ── */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #27272a", paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ── STEP 0: Agent Recommendation ── */}
          <div style={{
            padding: "12px 14px", backgroundColor: "#052e16", border: "1px solid #166534",
            borderRadius: 8,
          }}>
            {loadingRec ? (
              <div style={{ fontSize: 12, color: "#86efac" }}>🤖 Evaluating...</div>
            ) : recommendation ? (
              <>
                <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  🤖 Recommended
                </div>
                <div style={{ fontSize: 14, color: "#fafafa", fontWeight: 600, marginBottom: 4 }}>
                  {recLabel} ({recommendation.confidence}%)
                </div>
                <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5, marginBottom: 10 }}>
                  {recommendation.reasoning}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => onApproveAssign(
                      item.id,
                      recommendation.stage,
                      recommendation.community_id ?? item.community_id,
                      recommendation.reasoning,
                      recommendation.confidence,
                    )}
                    style={{
                      padding: "6px 16px", borderRadius: 6, border: "1px solid #166534",
                      backgroundColor: "#14532d", color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >✅ Approve</button>
                  <button
                    onClick={() => onAssign(recommendation)}
                    style={{
                      padding: "6px 16px", borderRadius: 6, border: "1px solid #3f3f46",
                      backgroundColor: "#18181b", color: "#a1a1aa", fontSize: 12, cursor: "pointer",
                    }}
                  >✏ Override</button>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#86efac" }}>No recommendation available</div>
            )}
          </div>

          {/* ── Web Form: Form Details ── */}
          {webForm && (
            <div style={{
              padding: "12px 14px", backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Form Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <span style={{ fontSize: 10, color: "#52525b" }}>Type</span>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>{sourceLabel(item.opportunity_source ?? item.source)}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#52525b" }}>Community</span>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.communities?.name ?? divisionName}</div>
                </div>
                {item.notes && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ fontSize: 10, color: "#52525b" }}>Message / Interest</span>
                    <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>{item.notes}</div>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: 10, color: "#52525b" }}>Email</span>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.contacts?.email ?? "—"}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#52525b" }}>Phone</span>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.contacts?.phone ?? "—"}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Web Form: Email Response ── */}
          {webForm && item.contacts?.email && (
            <div style={{
              padding: "12px 14px", backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: 8, opacity: emailSent || emailSkipped ? 0.5 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📧 Email Response
                </div>
                {emailSent && <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 600 }}>✓ Sent</span>}
                {emailSkipped && <span style={{ fontSize: 10, color: "#71717a", fontWeight: 600 }}>Skipped</span>}
              </div>
              {loadingResponses ? (
                <div style={{ fontSize: 12, color: "#52525b" }}>Generating email...</div>
              ) : emailSent || emailSkipped ? null : (
                <>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "#52525b" }}>To: {item.contacts.email}</span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "#52525b" }}>Subject:</span>
                    {emailEditing ? (
                      <input
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        style={{
                          width: "100%", padding: "6px 10px", backgroundColor: "#09090b", border: "1px solid #3f3f46",
                          borderRadius: 4, color: "#fafafa", fontSize: 12, outline: "none", marginTop: 2,
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>{emailSubject || "—"}</div>
                    )}
                  </div>
                  {emailEditing ? (
                    <div className="quill-dark" style={{ marginBottom: 8 }}>
                      <ReactQuill
                        theme="snow"
                        value={emailBody}
                        onChange={(val: string) => setEmailBody(val)}
                        modules={{
                          toolbar: {
                            container: [
                              [{ header: [1, 2, 3, false] }],
                              [{ size: ["small", false, "large", "huge"] }],
                              ["bold", "italic", "underline"],
                              [{ color: [] }, { background: [] }],
                              [{ list: "ordered" }, { list: "bullet" }],
                              ["link", "image"],
                              ["clean"],
                            ],
                            handlers: {
                              link: function(this: { quill: { getSelection: () => { index: number; length: number } | null; insertText: (i: number, t: string, o: string, v: string) => void; formatText: (i: number, l: number, f: string, v: string) => void } }) {
                                const url = window.prompt("Enter URL:");
                                if (url) {
                                  const sel = this.quill.getSelection();
                                  if (sel && sel.length > 0) {
                                    this.quill.formatText(sel.index, sel.length, "link", url);
                                  } else if (sel) {
                                    this.quill.insertText(sel.index, url, "link", url);
                                  }
                                }
                              },
                              image: function(this: { quill: { getSelection: () => { index: number } | null; insertEmbed: (i: number, t: string, v: string) => void } }) {
                                const url = window.prompt("Enter image URL:");
                                if (url) {
                                  const sel = this.quill.getSelection();
                                  if (sel) this.quill.insertEmbed(sel.index, "image", url);
                                }
                              },
                            },
                          },
                        }}
                        placeholder="Compose email..."
                      />
                    </div>
                  ) : (
                    <div style={{
                      padding: "8px 10px", backgroundColor: "#09090b", border: "1px solid #27272a",
                      borderRadius: 4, fontSize: 12, color: "#a1a1aa", lineHeight: 1.6,
                      whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 200, overflow: "auto",
                    }}>
                      {emailBody || "No email content generated"}
                    </div>
                  )}

                  {/* File Attachments */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {emailAttachments.map((att, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", borderRadius: 4, backgroundColor: "#18181b",
                        border: "1px solid #27272a", fontSize: 11, color: "#a1a1aa",
                      }}>
                        {att.type === "pdf" ? "📄" : att.type === "doc" ? "📝" : att.type === "xls" ? "📊" : att.type === "image" ? "🖼" : "📎"} {att.label}
                        <span onClick={() => setEmailAttachments(prev => prev.filter((_, j) => j !== i))}
                          style={{ cursor: "pointer", color: "#52525b", marginLeft: 2, fontSize: 12 }}>✕</span>
                      </span>
                    ))}
                    <button onClick={() => {
                      const url = window.prompt("Enter file URL (PDF, Word, Excel, image):");
                      if (!url) return;
                      const ext = url.split(".").pop()?.toLowerCase() ?? "";
                      const typeMap: Record<string, string> = { pdf: "pdf", doc: "doc", docx: "doc", xls: "xls", xlsx: "xls", png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image" };
                      const type = typeMap[ext] ?? "file";
                      const label = url.split("/").pop()?.substring(0, 30) ?? "File";
                      setEmailAttachments(prev => [...prev, { type, label, url }]);
                    }} style={{
                      padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
                      backgroundColor: "#09090b", color: "#71717a", fontSize: 11, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>📎 Attach File</button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEmailEditing(!emailEditing)} style={{
                      padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                      backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer",
                    }}>{emailEditing ? "Done Editing" : "✏ Edit"}</button>
                    <button onClick={handleSendEmail} disabled={emailSending || !emailBody} style={{
                      padding: "6px 12px", borderRadius: 4, border: "1px solid #166534",
                      backgroundColor: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      opacity: emailSending || !emailBody ? 0.5 : 1,
                    }}>{emailSending ? "Sending..." : "📧 Send Email"}</button>
                    <button onClick={() => setEmailSkipped(true)} style={{
                      padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                      backgroundColor: "#09090b", color: "#71717a", fontSize: 11, cursor: "pointer",
                    }}>Skip</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Web Form: SMS Response ── */}
          {webForm && item.contacts?.phone && (
            <div style={{
              padding: "12px 14px", backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: 8, opacity: smsSent || smsSkipped ? 0.5 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  💬 SMS Response
                </div>
                {smsSent && <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 600 }}>✓ Sent</span>}
                {smsSkipped && <span style={{ fontSize: 10, color: "#71717a", fontWeight: 600 }}>Skipped</span>}
              </div>
              {loadingResponses ? (
                <div style={{ fontSize: 12, color: "#52525b" }}>Generating SMS...</div>
              ) : smsSent || smsSkipped ? null : (
                <>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "#52525b" }}>To: {item.contacts.phone}</span>
                  </div>
                  {smsEditing ? (
                    <textarea
                      value={smsBody}
                      onChange={e => setSmsBody(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%", padding: "8px 10px", backgroundColor: "#09090b", border: "1px solid #3f3f46",
                        borderRadius: 4, color: "#a1a1aa", fontSize: 12, outline: "none", resize: "vertical",
                        lineHeight: 1.6, marginBottom: 8,
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: "8px 10px", backgroundColor: "#09090b", border: "1px solid #27272a",
                      borderRadius: 4, fontSize: 12, color: "#a1a1aa", lineHeight: 1.6,
                      whiteSpace: "pre-wrap", marginBottom: 8,
                    }}>
                      {smsBody || "No SMS content generated"}
                    </div>
                  )}

                  {/* Attachments */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {smsAttachments.map((att, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 4, backgroundColor: "#18181b",
                        border: "1px solid #27272a", fontSize: 10, color: "#a1a1aa",
                      }}>
                        {att.type === "link" ? "🔗" : "🖼"} {att.label}
                        <span onClick={() => setSmsAttachments(prev => prev.filter((_, j) => j !== i))}
                          style={{ cursor: "pointer", color: "#71717a", marginLeft: 2 }}>✕</span>
                      </span>
                    ))}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => {
                        const url = prompt("Enter link URL:");
                        if (url) setSmsAttachments(prev => [...prev, { type: "link", label: url.replace(/https?:\/\//, "").substring(0, 30), url }]);
                      }} style={{
                        padding: "3px 8px", borderRadius: 4, border: "1px solid #27272a",
                        backgroundColor: "#09090b", color: "#71717a", fontSize: 10, cursor: "pointer",
                      }}>🔗 Link</button>
                      <button onClick={() => {
                        const url = prompt("Enter photo URL:");
                        if (url) setSmsAttachments(prev => [...prev, { type: "photo", label: "Photo", url }]);
                      }} style={{
                        padding: "3px 8px", borderRadius: 4, border: "1px solid #27272a",
                        backgroundColor: "#09090b", color: "#71717a", fontSize: 10, cursor: "pointer",
                      }}>🖼 Photo</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setSmsEditing(!smsEditing)} style={{
                      padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                      backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer",
                    }}>{smsEditing ? "Done Editing" : "✏ Edit"}</button>
                    <button onClick={handleSendSms} disabled={smsSending || !smsBody} style={{
                      padding: "6px 12px", borderRadius: 4, border: "1px solid #166534",
                      backgroundColor: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      opacity: smsSending || !smsBody ? 0.5 : 1,
                    }}>{smsSending ? "Sending..." : "💬 Send SMS"}</button>
                    <button onClick={() => setSmsSkipped(true)} style={{
                      padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                      backgroundColor: "#09090b", color: "#71717a", fontSize: 11, cursor: "pointer",
                    }}>Skip</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Promoted/Demoted: Context ── */}
          {bucket === "re_engaged" && !webForm && (
            <div style={{
              padding: "12px 14px", backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Context
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6 }}>
                {item.prior_stage && (
                  <div>Previous: <strong style={{ color: "#fafafa" }}>{stageLabel(item.prior_stage)}</strong> at {item.prior_community ?? divisionName}</div>
                )}
                {item.notes && <div style={{ marginTop: 4 }}>Notes: {item.notes}</div>}
                {item.engagement_score != null && (
                  <div style={{ marginTop: 4 }}>Engagement Score: <strong style={{ color: "#fbbf24" }}>{item.engagement_score}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* ── AI Surfaced: Signals ── */}
          {bucket === "ai_surfaced" && (
            <div style={{
              padding: "12px 14px", backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                🤖 AI Surfaced — Signals
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6 }}>
                {item.engagement_score != null && (
                  <div>Score: <strong style={{ color: "#fbbf24" }}>{item.engagement_score}</strong></div>
                )}
                {item.notes && <div style={{ marginTop: 4 }}>{item.notes}</div>}
                {item.budget_min != null && (
                  <div style={{ marginTop: 4 }}>Budget: {formatBudget(item.budget_min, item.budget_max)}</div>
                )}
              </div>
              {/* Contact actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {item.contacts?.phone && (
                  <a href={`tel:${item.contacts.phone}`} style={{
                    padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                    backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer", textDecoration: "none",
                  }}>📞 Call</a>
                )}
                {item.contacts?.email && (
                  <a href={`mailto:${item.contacts.email}`} style={{
                    padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                    backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer", textDecoration: "none",
                  }}>📧 Email</a>
                )}
                {item.contacts?.phone && (
                  <a href={`sms:${item.contacts.phone}`} style={{
                    padding: "6px 12px", borderRadius: 4, border: "1px solid #27272a",
                    backgroundColor: "#09090b", color: "#a1a1aa", fontSize: 11, cursor: "pointer", textDecoration: "none",
                  }}>💬 Text</a>
                )}
              </div>
            </div>
          )}

          {/* ── Basic Details (all card types) ── */}
          {!webForm && (
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
          )}
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
        <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>
          {contactName}
        </div>
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
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8, lineHeight: 1.4 }}>
          {task.description}
        </div>
      )}

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

  useEffect(() => {
    setSelectedCommunityId("");
  }, [divisionId]);

  const fmtPrice = (n: number | null) => n != null ? `$${n.toLocaleString()}` : "—";

  return (
    <div style={{ borderTop: "1px solid #27272a", marginTop: 20 }}>
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

              <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontWeight: 600 }}>Quick Reference</div>

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
  const isMobile = useIsMobile();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [communities, setCommunities] = useState<CommunityRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignItem, setAssignItem] = useState<QueueItem | null>(null);
  const [assignRec, setAssignRec] = useState<AgentRecommendation | null>(null);
  const [panelItem, setPanelItem] = useState<QueueItem | null>(null);
  const [activeBucket, setActiveBucket] = useState<QueueBucket>("new_inbound");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [oscUsers, setOscUsers] = useState<TeamUser[]>([]);
  const [drillBucket, setDrillBucket] = useState<QueueBucket | null>(null);
  const [mobileTab, setMobileTab] = useState<"queue" | "comm">("queue");

  // ── Fetch queue + tasks (READ only — Supabase reads are fine) ──
  const fetchData = useCallback(async () => {
    if (!filter.divisionId) return;
    setLoading(true);

    const { data: comms } = await supabase
      .from("communities").select("id, name").eq("division_id", filter.divisionId).order("name");
    setCommunities(comms ?? []);

    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "osc")
      .eq("is_active", true);
    setOscUsers((users as TeamUser[]) ?? []);

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

    // Enrich with prior state
    const contactIds = [...new Set(flat.map(q => q.contact_id).filter(Boolean))];
    if (contactIds.length > 0) {
      const { data: allOpps } = await supabase
        .from("opportunities")
        .select("contact_id, crm_stage, communities(name)")
        .in("contact_id", contactIds)
        .neq("crm_stage", "queue")
        .eq("is_active", true);

      const priorByContact: Record<string, { stage: string; community: string | null }> = {};
      for (const opp of (allOpps ?? [])) {
        const cid = (opp as Record<string, unknown>).contact_id as string;
        if (!priorByContact[cid]) {
          const comm = (opp as Record<string, unknown>).communities;
          const commName = Array.isArray(comm) ? (comm[0] as Record<string, unknown>)?.name as string : (comm as Record<string, unknown>)?.name as string;
          priorByContact[cid] = {
            stage: (opp as Record<string, unknown>).crm_stage as string,
            community: commName ?? null,
          };
        }
      }

      for (const q of flat) {
        const prior = priorByContact[q.contact_id];
        if (prior) {
          q.prior_stage = prior.stage;
          q.prior_community = prior.community;
          q.is_new_contact = false;
        } else {
          q.is_new_contact = true;
        }
      }
    }

    setQueueItems(flat);

    // Tasks (READ)
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
    new_inbound: 0, re_engaged: 0, ai_surfaced: 0,
  };
  const bucketedItems: Record<QueueBucket, QueueItem[]> = {
    new_inbound: [], re_engaged: [], ai_surfaced: [],
  };
  for (const item of filteredQueueItems) {
    const bucket = classifyBucket(item);
    bucketCounts[bucket]++;
    bucketedItems[bucket].push(item);
  }
  const currentBucketItems = bucketedItems[activeBucket];

  // Drill-down items
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

  // ── AGENT-FIRST: Assign via crm-api ──
  async function handleAssign(
    oppId: string,
    newStage: string,
    communityId: string | null,
    reason: string,
    confidence: number | null,
  ) {
    const result = await assignOpportunity(
      oppId,
      newStage,
      communityId,
      reason,
      {
        triggered_by: "human",
        confidence_score: confidence != null ? confidence / 100 : undefined,
        reasoning: reason,
      }
    );

    if (!result.success) {
      console.error("Assignment failed:", result.error);
      alert(`Error: ${result.error ?? "Assignment failed"}`);
    }

    setAssignItem(null);
    setAssignRec(null);
    fetchData();
  }

  // ── Complete task via crm-api (markRead as proxy) ──
  async function handleCompleteTask(taskId: string) {
    const result = await markRead(taskId, {
      triggered_by: "human",
      reasoning: "Task completed by OSC",
    });

    if (!result.success) {
      console.error("Task completion failed:", result.error);
      alert(`Error: ${result.error ?? "Task completion failed"}`);
    }
    fetchData();
  }

  // ── Snooze task via crm-api (markRead with snooze context) ──
  async function handleSnoozeTask(taskId: string, until: string) {
    // Note: snooze is a task-specific mutation. Using markRead as the closest
    // available crm-api function. When a dedicated snoozeTask() is added to
    // crm-api, swap this call.
    const result = await markRead(taskId, {
      triggered_by: "human",
      reasoning: `Snoozed until ${until}`,
    });

    if (!result.success) {
      console.error("Task snooze failed:", result.error);
      alert(`Error: ${result.error ?? "Task snooze failed"}`);
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
      {isMobile ? (
        <div style={{
          padding: "8px 12px", borderBottom: "1px solid #27272a",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fafafa" }}>OSC</span>
            <span style={{ fontSize: 9, color: "#71717a" }}>·</span>
            <span style={{ fontSize: 10, color: "#71717a" }}>{labels.division ?? "Div"}</span>
            <span style={{ fontSize: 9, color: "#71717a" }}>·</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: filteredQueueItems.length === 0 ? "#4ade80" : filteredQueueItems.length > 10 ? "#f87171" : "#fbbf24",
            }}>Q:{filteredQueueItems.length}</span>
          </div>
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            style={{
              backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 4,
              color: "#a1a1aa", fontSize: 10, padding: "4px 6px", outline: "none", maxWidth: 100,
            }}
          >
            <option value="all">All</option>
            {oscUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
      ) : (
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
      )}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 12 : 24, paddingBottom: isMobile ? 72 : 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#52525b", padding: 48 }}>Loading...</div>
        ) : (
          <>
          {/* Mobile tab toggle */}
          {isMobile && (
            <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid #27272a" }}>
              <button onClick={() => setMobileTab("queue")} style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: mobileTab === "queue" ? 600 : 400,
                color: mobileTab === "queue" ? "#fafafa" : "#52525b",
                borderBottom: mobileTab === "queue" ? "2px solid #fafafa" : "2px solid transparent",
                background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer",
                minHeight: 44,
              }}>Queue <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, fontWeight: 600, backgroundColor: filteredQueueItems.length > 0 ? "#7f1d1d" : "#052e16", color: filteredQueueItems.length > 0 ? "#fca5a5" : "#4ade80", marginLeft: 4 }}>{filteredQueueItems.length}</span></button>
              <button onClick={() => setMobileTab("comm")} style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: mobileTab === "comm" ? 600 : 400,
                color: mobileTab === "comm" ? "#fafafa" : "#52525b",
                borderBottom: mobileTab === "comm" ? "2px solid #fafafa" : "2px solid transparent",
                background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer",
                minHeight: 44,
              }}>Comm Hub</button>
            </div>
          )}

          <div style={isMobile ? {} : { display: "flex", gap: 20, alignItems: "flex-start" }}>
            {/* ── LEFT: Queue (50%) ── */}
            <div style={isMobile ? { display: mobileTab === "queue" ? "block" : "none" } : { flex: "0 0 50%", minWidth: 0 }}>
              {!isMobile && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Queue</span>
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600, backgroundColor: filteredQueueItems.length > 0 ? "#7f1d1d" : "#052e16", color: filteredQueueItems.length > 0 ? "#fca5a5" : "#4ade80" }}>{filteredQueueItems.length}</span>
              </div>}

              {drillBucket ? (
                <PipelineDetailView
                  items={drillItems}
                  divisionId={filter.divisionId}
                  onBack={() => setDrillBucket(null)}
                  bucketLabel={drillBucketMeta?.label ?? "Queue"}
                />
              ) : (
              <>
              {/* Bucket tabs */}
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", marginBottom: 12, overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
                {BUCKET_META.map(b => {
                  const isActive = activeBucket === b.id;
                  const count = bucketCounts[b.id];
                  return (
                    <button key={b.id} onClick={() => setActiveBucket(b.id)} style={{
                      padding: isMobile ? "6px 6px" : "8px 12px", fontSize: isMobile ? 10 : 11, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fafafa" : "#52525b",
                      borderBottom: isActive ? "2px solid #fafafa" : "2px solid transparent",
                      background: "none", border: "none", borderBottomStyle: "solid",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      whiteSpace: "nowrap",
                    }}>
                      <span>{b.icon}</span>
                      {!isMobile && <span>{b.label}</span>}
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
                      divisionName={labels.division ?? ""}
                      isMobile={isMobile}
                      communities={communities}
                      onAssign={(rec) => {
                        setAssignItem(item);
                        setAssignRec(rec);
                      }}
                      onNameClick={() => { setPanelItem(item); }}
                      onApproveAssign={(oppId, stage, communityId, reasoning, confidence) => {
                        handleAssign(oppId, stage, communityId, reasoning, confidence);
                      }}
                    />
                  ))}
                </div>
              )}
              </>
              )}
            </div>

            {/* ── RIGHT: Comm Hub (50%) — filters out webforms ── */}
            <div style={isMobile ? { display: mobileTab === "comm" ? "block" : "none", width: "100%" } : { flex: "0 0 48%", minWidth: 0 }}>
              <CommHub divisionId={filter.divisionId} teamFilter={teamFilter} excludeChannel="webform" />
            </div>
          </div>
          </>)
        }

        {/* ── Reference Module ── */}
        {!loading && (
          <ReferenceModule communities={communities} divisionId={filter.divisionId!} />
        )}
      </div>

      {/* ── Opportunity Detail Panel ── */}
      {panelItem && (
        <OpportunityPanel
          open={!!panelItem}
          onClose={() => setPanelItem(null)}
          opportunity={{
            id: panelItem.id,
            contact_id: panelItem.contact_id,
            first_name: panelItem.contacts?.first_name ?? "—",
            last_name: panelItem.contacts?.last_name ?? "",
            email: panelItem.contacts?.email ?? null,
            phone: panelItem.contacts?.phone ?? null,
            stage: "queue",
            source: panelItem.source ?? panelItem.opportunity_source,
            community_name: panelItem.communities?.name ?? null,
            division_name: labels.division ?? null,
            budget_min: panelItem.budget_min,
            budget_max: panelItem.budget_max,
            floor_plan_name: null,
            notes: panelItem.notes,
            last_activity_at: panelItem.last_activity_at,
            created_at: panelItem.created_at,
          }}
        />
      )}

      {/* ── Override Assign Modal ── */}
      {assignItem && (
        <AssignModal
          item={assignItem}
          communities={communities}
          divisionName={labels.division ?? ""}
          recommendation={assignRec}
          onClose={() => { setAssignItem(null); setAssignRec(null); }}
          onExecute={handleAssign}
        />
      )}
    </div>
  );
}
