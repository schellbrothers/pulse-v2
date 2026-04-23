"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import OpportunityPanel, { type OpportunityPanelData } from "@/components/OpportunityPanel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadItem {
  id: string;
  contact_id: string;
  crm_stage: string;
  community_id: string | null;
  division_id: string | null;
  source: string | null;
  opportunity_source: string | null;
  engagement_score: number | null;
  last_activity_at: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  communities: { name: string } | null;
}

interface StageTransition {
  id: string;
  opportunity_id: string;
  from_stage: string;
  to_stage: string;
  created_at: string;
}

interface CommunityRef {
  id: string;
  name: string;
}

interface CommunityBreakdown {
  id: string;
  name: string;
  leadDivCount: number;
  leadComCount: number;
  total: number;
  conversionRate: number;
}

type LeadTab = "lead_div" | "lead_com" | "new_week" | "warming";

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

function sourceLabel(src: string | null): string {
  const map: Record<string, string> = {
    website: "Website", realtor: "Realtor", walk_in: "Walk-in",
    event: "Event", phone: "Phone", referral: "Referral",
    zillow: "Zillow", social_media: "Social", webform_interest: "Web Form",
    called_osc: "Called", texted_osc: "Texted", schedule_appt: "Appt Request",
  };
  return map[src ?? ""] ?? src ?? "—";
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Stubbed Campaign Data ────────────────────────────────────────────────────

const STUB_CAMPAIGNS = [
  { name: "Spring Open House Invite", openRate: 24.3, clickRate: 5.1, sentDate: "Apr 10, 2026" },
  { name: "New Community Announcement", openRate: 31.7, clickRate: 8.2, sentDate: "Apr 3, 2026" },
  { name: "March Newsletter", openRate: 19.8, clickRate: 3.4, sentDate: "Mar 15, 2026" },
];

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: 48 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>MKT</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>Marketing Command Center</div>
      <div style={{ fontSize: 13, color: "#71717a", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#a855f7" }}>Division</strong> to load your lead pipeline and marketing analytics.
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      padding: "16px 18px", flex: "1 1 0%", minWidth: 140,
    }}>
      <div style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ?? "#fafafa" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  item, communities, onPromoteToQueue, onAssignCommunity, onNameClick,
}: {
  item: LeadItem;
  communities: CommunityRef[];
  onPromoteToQueue: (id: string) => void;
  onAssignCommunity: (id: string, communityId: string) => void;
  onNameClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const name = `${item.contacts?.first_name ?? "—"} ${item.contacts?.last_name ?? ""}`;
  const isDiv = item.crm_stage === "lead_div";

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
        display: "grid", gridTemplateColumns: "1fr auto auto auto",
        alignItems: "center", gap: 12,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span onClick={e => { e.stopPropagation(); onNameClick(); }} style={{ fontSize: 13, fontWeight: 500, color: "#fafafa", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#3f3f46", textUnderlineOffset: "2px" }}>{name}</span>
            <span style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 600,
              backgroundColor: isDiv ? "rgba(168,85,247,0.15)" : "rgba(59,130,246,0.15)",
              color: isDiv ? "#a855f7" : "#3b82f6",
            }}>
              {isDiv ? "DIV" : "COM"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
            {item.communities?.name ?? "No community"} · {sourceLabel(item.opportunity_source ?? item.source)}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#71717a" }}>{item.contacts?.email ?? "—"}</div>
        <div style={{ fontSize: 11, color: "#52525b" }}>{relativeTime(item.last_activity_at)}</div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onPromoteToQueue(item.id)} style={{
            padding: "4px 10px", borderRadius: 4, border: "1px solid #166534",
            backgroundColor: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>↑ Queue</button>
          {isDiv && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowCommunityPicker(!showCommunityPicker)} style={{
                padding: "4px 10px", borderRadius: 4, border: "1px solid #1e40af",
                backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>↑ Community</button>
              {showCommunityPicker && (
                <>
                  <div onClick={() => setShowCommunityPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
                  <div style={{
                    position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 51,
                    backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8,
                    padding: 4, minWidth: 200, maxHeight: 240, overflowY: "auto",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}>
                    {communities.map(c => (
                      <button key={c.id} onClick={() => { onAssignCommunity(item.id, c.id); setShowCommunityPicker(false); }} style={{
                        display: "block", width: "100%", padding: "8px 12px", textAlign: "left",
                        background: "none", border: "none", color: "#a1a1aa", fontSize: 12,
                        cursor: "pointer", borderRadius: 4,
                      }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#27272a")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Community: {c.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 12px", borderTop: "1px solid #27272a", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Email</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.contacts?.email ?? "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Phone</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.contacts?.phone ?? "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Source</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{sourceLabel(item.source)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 4 }}>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Created</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{new Date(item.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Engagement</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.engagement_score ?? "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Community</span>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.communities?.name ?? "None"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Conversion Funnel ────────────────────────────────────────────────────────

function ConversionFunnel({ divToComRate, comToQueueRate }: { divToComRate: number; comToQueueRate: number }) {
  return (
    <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14, fontWeight: 600 }}>
        Conversion Funnel (Last 30 Days)
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FunnelStage label="Lead (Div)" color="#a855f7" />
        <FunnelArrow rate={divToComRate} />
        <FunnelStage label="Lead (Com)" color="#3b82f6" />
        <FunnelArrow rate={comToQueueRate} />
        <FunnelStage label="Queue" color="#4ade80" />
      </div>
      <div style={{ fontSize: 11, color: "#52525b", marginTop: 10 }}>
        Trend data coming soon — stubbed for initial release
      </div>
    </div>
  );
}

function FunnelStage({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      padding: "8px 14px", borderRadius: 6, border: `1px solid ${color}33`,
      backgroundColor: `${color}10`, color, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {label}
    </div>
  );
}

function FunnelArrow({ rate }: { rate: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 13, color: "#fafafa", fontWeight: 600 }}>{rate.toFixed(1)}%</span>
      <span style={{ fontSize: 16, color: "#52525b" }}>→</span>
    </div>
  );
}

// ─── Community Breakdown Table ────────────────────────────────────────────────

function CommunityBreakdownTable({
  data, onFilter,
}: {
  data: CommunityBreakdown[];
  onFilter: (communityId: string | null) => void;
}) {
  return (
    <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, fontWeight: 600 }}>
        Community Breakdown
      </div>
      {data.length === 0 ? (
        <div style={{ fontSize: 12, color: "#52525b", padding: 16, textAlign: "center" }}>No communities found</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #27272a" }}>
              {["Community", "Div Leads", "Com Leads", "Total", "Conv. Rate"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#52525b", fontWeight: 500, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id} onClick={() => onFilter(row.id)} style={{ borderBottom: "1px solid #1a1a1e", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#27272a")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td style={{ padding: "8px 8px", color: "#fafafa", fontWeight: 500 }}>{row.name}</td>
                <td style={{ padding: "8px 8px", color: "#a855f7" }}>{row.leadDivCount}</td>
                <td style={{ padding: "8px 8px", color: "#3b82f6" }}>{row.leadComCount}</td>
                <td style={{ padding: "8px 8px", color: "#a1a1aa" }}>{row.total}</td>
                <td style={{ padding: "8px 8px", color: row.conversionRate > 0 ? "#4ade80" : "#52525b" }}>
                  {row.conversionRate > 0 ? `${row.conversionRate.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketingDashboard() {
  const { filter, labels } = useGlobalFilter();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [communities, setCommunities] = useState<CommunityRef[]>([]);
  const [conversionsThisMonth, setConversionsThisMonth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadTab>("lead_div");
  const [communityFilter, setCommunityFilter] = useState<string | null>(null);
  const [panelItem, setPanelItem] = useState<LeadItem | null>(null);

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);

    const oppQuery = supabase
      .from("opportunities")
      .select("id, contact_id, crm_stage, community_id, division_id, source, opportunity_source, engagement_score, last_activity_at, created_at, contacts(first_name, last_name, email, phone), communities(name)")
      .in("crm_stage", ["lead_div", "lead_com"])
      .order("last_activity_at", { ascending: false });
    if (filter.divisionId) oppQuery.eq("division_id", filter.divisionId);

    const commQuery = supabase.from("communities").select("id, name").order("name");
    if (filter.divisionId) commQuery.eq("division_id", filter.divisionId);

    const [leadsRes, commsRes, transitionsRes] = await Promise.all([
      oppQuery,
      commQuery,
      supabase
        .from("stage_transitions")
        .select("id, opportunity_id, from_stage, to_stage, created_at")
        .eq("to_stage", "queue")
        .in("from_stage", ["lead_div", "lead_com"])
        .gte("created_at", startOfMonth()),
    ]);

    const flat = (leadsRes.data ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      contacts: Array.isArray(item.contacts) ? (item.contacts as Record<string, unknown>[])[0] ?? null : item.contacts,
      communities: Array.isArray(item.communities) ? (item.communities as Record<string, unknown>[])[0] ?? null : item.communities,
    })) as LeadItem[];

    setLeads(flat);
    setCommunities((commsRes.data as CommunityRef[]) ?? []);
    setConversionsThisMonth((transitionsRes.data as StageTransition[])?.length ?? 0);
    setLoading(false);
  }, [filter.divisionId]);

  useEffect(() => {
    fetchData();
  }, [filter.divisionId, fetchData]);

  // ── Computed metrics ──
  const divLeads = leads.filter(l => l.crm_stage === "lead_div");
  const comLeads = leads.filter(l => l.crm_stage === "lead_com");
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? (conversionsThisMonth / totalLeads) * 100 : 0;
  const weekAgo = daysAgo(7);
  const newThisWeek = leads.filter(l => l.created_at >= weekAgo);

  // ── Community breakdown ──
  const communityBreakdown: CommunityBreakdown[] = communities.map(c => {
    const divCount = leads.filter(l => l.crm_stage === "lead_div" && l.community_id === c.id).length;
    const comCount = leads.filter(l => l.crm_stage === "lead_com" && l.community_id === c.id).length;
    const total = divCount + comCount;
    // For "unclaimed" div leads we also count those with null community
    return {
      id: c.id,
      name: c.name,
      leadDivCount: divCount,
      leadComCount: comCount,
      total,
      conversionRate: 0, // Would need transition data per community — stubbed
    };
  });

  // Count leads with no community assigned
  const unassignedLeads = leads.filter(l => l.community_id === null);
  if (unassignedLeads.length > 0) {
    communityBreakdown.push({
      id: "__none__",
      name: "Unassigned",
      leadDivCount: unassignedLeads.filter(l => l.crm_stage === "lead_div").length,
      leadComCount: unassignedLeads.filter(l => l.crm_stage === "lead_com").length,
      total: unassignedLeads.length,
      conversionRate: 0,
    });
  }

  // ── Funnel rates ──
  const divToComRate = divLeads.length + comLeads.length > 0
    ? (comLeads.length / (divLeads.length + comLeads.length)) * 100
    : 0;
  const comToQueueRate = comLeads.length > 0
    ? (conversionsThisMonth / comLeads.length) * 100
    : 0;

  // ── Tab filtering ──
  let tabLeads: LeadItem[];
  switch (activeTab) {
    case "lead_div":
      tabLeads = divLeads;
      break;
    case "lead_com":
      tabLeads = comLeads;
      break;
    case "new_week":
      tabLeads = newThisWeek;
      break;
    case "warming":
      // Stub: show leads with engagement_score > 50
      tabLeads = leads.filter(l => (l.engagement_score ?? 0) > 50);
      break;
    default:
      tabLeads = leads;
  }

  // Apply community filter
  if (communityFilter) {
    if (communityFilter === "__none__") {
      tabLeads = tabLeads.filter(l => l.community_id === null);
    } else {
      tabLeads = tabLeads.filter(l => l.community_id === communityFilter);
    }
  }

  // ── Actions ──
  async function handlePromoteToQueue(oppId: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({ crm_stage: "queue", queued_at: new Date().toISOString() })
      .eq("id", oppId);

    if (error) {
      console.error("Promote to queue failed:", error);
      alert(`Error: ${error.message}`);
      return;
    }

    const item = leads.find(l => l.id === oppId);
    if (item) {
      await supabase.from("stage_transitions").insert({
        org_id: "00000000-0000-0000-0000-000000000001",
        opportunity_id: oppId,
        contact_id: item.contact_id,
        from_stage: item.crm_stage,
        to_stage: "queue",
        triggered_by: "manual",
        reason: "Promoted from marketing pipeline",
      });
    }
    fetchData();
  }

  async function handleAssignCommunity(oppId: string, communityId: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({ crm_stage: "lead_com", community_id: communityId })
      .eq("id", oppId);

    if (error) {
      console.error("Assign community failed:", error);
      alert(`Error: ${error.message}`);
      return;
    }

    const item = leads.find(l => l.id === oppId);
    if (item && item.crm_stage === "lead_div") {
      await supabase.from("stage_transitions").insert({
        org_id: "00000000-0000-0000-0000-000000000001",
        opportunity_id: oppId,
        contact_id: item.contact_id,
        from_stage: "lead_div",
        to_stage: "lead_com",
        triggered_by: "manual",
        reason: "Community assigned from marketing pipeline",
      });
    }
    fetchData();
  }

  // ── Tab metadata ──
  const TAB_META: { id: LeadTab; icon: string; label: string; count: number }[] = [
    { id: "lead_div", icon: "", label: "Division Leads", count: divLeads.length },
    { id: "lead_com", icon: "", label: "Community Leads", count: comLeads.length },
    { id: "new_week", icon: "", label: "New This Week", count: newThisWeek.length },
    { id: "warming", icon: "", label: "Warming Up", count: leads.filter(l => (l.engagement_score ?? 0) > 50).length },
  ];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#09090b", color: "#fafafa" }}>
      {/* ── Header ── */}
      <div style={{
        padding: "10px 24px", borderBottom: "1px solid #27272a",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Marketing Command Center</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#a855f7" }}>
            {labels.division ?? "Division"}
          </span>
          <span style={{ fontSize: 11, color: "#52525b" }}>{today}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value="all"
            onChange={() => {/* Team filter placeholder */}}
            style={{
              backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 6,
              color: "#a1a1aa", fontSize: 12, padding: "6px 12px", outline: "none",
            }}
          >
            <option value="all">All Team Members</option>
          </select>
          {communityFilter && (
            <button onClick={() => setCommunityFilter(null)} style={{
              padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
              backgroundColor: "#18181b", color: "#a1a1aa", fontSize: 11, cursor: "pointer",
            }}>
              ✕ Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#52525b", padding: 48 }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Metric Cards ── */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <MetricCard label="Total Leads" value={totalLeads} />
              <MetricCard label="Division Leads" value={divLeads.length} accent="#a855f7" />
              <MetricCard label="Community Leads" value={comLeads.length} accent="#3b82f6" />
              <MetricCard label="Converted to Queue" value={conversionsThisMonth} sub="This month" accent="#4ade80" />
              <MetricCard label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} sub="Queue / total leads" />
              <MetricCard label="New This Week" value={newThisWeek.length} accent="#fbbf24" />
            </div>

            {/* ── Two-column layout: Pipeline + Analytics ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "start" }}>

              {/* ── LEFT: Lead Pipeline ── */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Lead Pipeline</span>
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                    backgroundColor: totalLeads > 0 ? "rgba(168,85,247,0.15)" : "#052e16",
                    color: totalLeads > 0 ? "#a855f7" : "#4ade80",
                  }}>{totalLeads} leads</span>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", marginBottom: 12 }}>
                  {TAB_META.map(t => {
                    const isActive = activeTab === t.id;
                    return (
                      <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        padding: "8px 12px", fontSize: 11, fontWeight: isActive ? 600 : 400,
                        color: isActive ? "#fafafa" : "#52525b",
                        borderBottom: isActive ? "2px solid #fafafa" : "2px solid transparent",
                        background: "none", border: "none", borderBottomStyle: "solid",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        whiteSpace: "nowrap",
                      }}>
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                        <span style={{
                          fontSize: 10, padding: "0 5px", borderRadius: 3, fontWeight: 600,
                          backgroundColor: t.count > 0 ? "rgba(168,85,247,0.15)" : "#27272a",
                          color: t.count > 0 ? "#a855f7" : "#71717a",
                        }}>{t.count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Lead cards */}
                {tabLeads.length === 0 ? (
                  <div style={{
                    padding: 32, textAlign: "center", backgroundColor: "#18181b", border: "1px solid #27272a",
                    borderRadius: 8, color: "#52525b", fontSize: 12,
                  }}>
                    {activeTab === "warming"
                      ? "Warming detection coming soon — engagement scoring in progress"
                      : `No leads in ${TAB_META.find(t => t.id === activeTab)?.label ?? "this view"}`
                    }
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tabLeads.map(item => (
                      <LeadCard
                        key={item.id}
                        item={item}
                        communities={communities}
                        onPromoteToQueue={handlePromoteToQueue}
                        onAssignCommunity={handleAssignCommunity}
                        onNameClick={() => setPanelItem(item)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── RIGHT: Campaign & Analytics Panel ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Mailchimp Campaigns */}
                <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, fontWeight: 600 }}>
                    Recent Campaigns
                  </div>
                  {STUB_CAMPAIGNS.map((c, i) => (
                    <div key={i} style={{
                      padding: "10px 0",
                      borderBottom: i < STUB_CAMPAIGNS.length - 1 ? "1px solid #27272a" : "none",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#fafafa", marginBottom: 4 }}>{c.name}</div>
                      <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                        <span style={{ color: "#a1a1aa" }}>Open: <strong style={{ color: "#4ade80" }}>{c.openRate}%</strong></span>
                        <span style={{ color: "#a1a1aa" }}>Click: <strong style={{ color: "#3b82f6" }}>{c.clickRate}%</strong></span>
                        <span style={{ color: "#52525b" }}>{c.sentDate}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: "#52525b", marginTop: 8, fontStyle: "italic" }}>
                    Connect Mailchimp for live data
                  </div>
                </div>

                {/* Web Analytics */}
                <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, fontWeight: 600 }}>
                    Web Analytics
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Sessions</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>—</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Page Views</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>—</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Bounce Rate</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>—</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Top Pages</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>—</div>
                    </div>
                  </div>
                  <div style={{
                    padding: "10px 14px", backgroundColor: "#09090b", border: "1px solid #27272a",
                    borderRadius: 6, fontSize: 11, color: "#52525b", textAlign: "center",
                  }}>
                    Connect Google Analytics
                  </div>
                </div>

                {/* Ad Spend */}
                <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, fontWeight: 600 }}>
                    Ad Spend
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>Monthly Spend</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>—</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>CPL</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>—</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>ROI</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>—</div>
                    </div>
                  </div>
                  <div style={{
                    padding: "10px 14px", backgroundColor: "#09090b", border: "1px solid #27272a",
                    borderRadius: 6, fontSize: 11, color: "#52525b", textAlign: "center",
                  }}>
                    Connect Ad Platform
                  </div>
                </div>
              </div>
            </div>

            {/* ── Conversion Funnel ── */}
            <ConversionFunnel divToComRate={divToComRate} comToQueueRate={comToQueueRate} />

            {/* ── Community Breakdown ── */}
            <CommunityBreakdownTable
              data={communityBreakdown}
              onFilter={(id) => setCommunityFilter(id === communityFilter ? null : id)}
            />
          </div>
        )}
      </div>

      {/* Opportunity Side Panel */}
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
            stage: panelItem.crm_stage,
            source: panelItem.source ?? panelItem.opportunity_source,
            community_name: panelItem.communities?.name ?? null,
            division_name: labels.division ?? null,
            budget_min: null,
            budget_max: null,
            floor_plan_name: null,
            notes: null,
            last_activity_at: panelItem.last_activity_at,
            created_at: panelItem.created_at,
          }}
        />
      )}
    </div>
  );
}
