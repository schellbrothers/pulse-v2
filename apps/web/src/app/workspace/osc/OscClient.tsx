"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  substage: string | null;
  community_id: string | null;
  last_activity_at: string | null;
  created_at: string;
  notes: string | null;
}

interface LeadRow {
  id: string;
  first_name: string;
  last_name: string;
  stage: string;
  source: string | null;
  community_id: string | null;
  last_activity_at: string | null;
  created_at: string;
}

interface CommunityRef {
  id: string;
  name: string;
}

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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, color: "#555", padding: 48,
    }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>◎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>OSC Command Center</div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#80B602" }}>Division</strong> from the global filter above
        to view the opportunity inbox and lead pipeline for that division.
      </div>
      <div style={{
        marginTop: 8, fontSize: 11, color: "#444", padding: "8px 16px",
        backgroundColor: "#161616", borderRadius: 6, border: "1px solid #2a2a2a",
      }}>
        Division → Opportunities + Leads load automatically
      </div>
    </div>
  );
}

// ─── Division Dashboard ───────────────────────────────────────────────────────

function DivisionDashboard({
  divisionName, opportunities, leads, communities,
}: {
  divisionName: string;
  opportunities: Opportunity[];
  leads: LeadRow[];
  communities: CommunityRef[];
}) {
  const commMap = Object.fromEntries(communities.map(c => [c.id, c.name]));

  const thStyle: React.CSSProperties = {
    padding: "6px 12px", textAlign: "left", fontSize: 11, color: "#666",
    fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em",
    backgroundColor: "#0d0e10", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "8px 12px", fontSize: 12, color: "#a1a1a1",
    borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{
        padding: "12px 24px", borderBottom: "1px solid #1a1a1a",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#ededed" }}>{divisionName}</span>
        </div>
        <span style={{ fontSize: 12, color: "#555" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Stats */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, padding: "10px 24px",
        backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a",
      }}>
        {[
          { label: "Opportunities", value: opportunities.length, color: "#f5a623" },
          { label: "Leads", value: leads.length, color: "#a855f7" },
          { label: "Communities", value: communities.length, color: "#59a6bd" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Opportunity Inbox */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Opportunity Inbox</span>
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 4,
              backgroundColor: "#2a2a1a", border: "1px solid #3f3a1f", color: "#f5a623",
            }}>{opportunities.length} pending</span>
          </div>
          {opportunities.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#444", backgroundColor: "#111", borderRadius: 8, border: "1px solid #1f1f1f" }}>
              No pending opportunities — all clear
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 900, width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Community</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Last Activity</th>
                  <th style={thStyle}>Created</th>
                </tr></thead>
                <tbody>
                  {opportunities.map(o => (
                    <tr key={o.id}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#161616")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ ...tdStyle, color: "#ededed", fontWeight: 500 }}>{o.first_name} {o.last_name}</td>
                      <td style={tdStyle}>{o.source ?? "—"}</td>
                      <td style={tdStyle}>{o.substage ?? "—"}</td>
                      <td style={tdStyle}>{o.community_id ? (commMap[o.community_id] ?? "—") : "—"}</td>
                      <td style={tdStyle}>{o.phone ?? "—"}</td>
                      <td style={tdStyle}>{relativeTime(o.last_activity_at)}</td>
                      <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lead Pipeline */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Lead Pipeline</span>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555" }}>{leads.length}</span>
          </div>
          {leads.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#444", backgroundColor: "#111", borderRadius: 8, border: "1px solid #1f1f1f" }}>
              No leads for this division
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 700, width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Stage</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Community</th>
                  <th style={thStyle}>Last Activity</th>
                  <th style={thStyle}>Created</th>
                </tr></thead>
                <tbody>
                  {leads.slice(0, 25).map(l => (
                    <tr key={l.id}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#161616")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ ...tdStyle, color: "#ededed", fontWeight: 500 }}>{l.first_name} {l.last_name}</td>
                      <td style={tdStyle}>{l.stage}</td>
                      <td style={tdStyle}>{l.source ?? "—"}</td>
                      <td style={tdStyle}>{l.community_id ? (commMap[l.community_id] ?? "—") : "—"}</td>
                      <td style={tdStyle}>{relativeTime(l.last_activity_at)}</td>
                      <td style={tdStyle}>{new Date(l.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OscClient() {
  const { filter, labels } = useGlobalFilter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [communities, setCommunities] = useState<CommunityRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filter.divisionId) {
      setOpportunities([]);
      setLeads([]);
      setCommunities([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      const divId = filter.divisionId!;

      // First get communities for this division (to filter leads/opps)
      const { data: comms } = await supabase
        .from("communities")
        .select("id, name")
        .eq("division_id", divId);

      const commIds = (comms ?? []).map(c => c.id);

      if (commIds.length === 0) {
        if (!cancelled) {
          setCommunities(comms ?? []);
          setOpportunities([]);
          setLeads([]);
          setLoading(false);
        }
        return;
      }

      const [oppRes, leadRes] = await Promise.all([
        supabase.from("leads").select("*").eq("stage", "opportunity").in("community_id", commIds).order("last_activity_at", { ascending: false }),
        supabase.from("leads").select("*").neq("stage", "opportunity").in("community_id", commIds).order("last_activity_at", { ascending: false }),
      ]);

      if (!cancelled) {
        setCommunities(comms ?? []);
        setOpportunities(oppRes.data ?? []);
        setLeads(leadRes.data ?? []);
        setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [filter.divisionId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#0a0a0a", color: "#ededed" }}>
      {/* Top bar */}
      <div style={{
        padding: "10px 24px", borderBottom: "1px solid #1a1a1a",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>OSC Command Center</span>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 4,
          backgroundColor: "#1a1f2e", border: "1px solid #1a2a3f", color: "#0070f3",
        }}>Online Sales Consultant</span>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 13 }}>
            Loading division data...
          </div>
        ) : !filter.divisionId ? (
          <EmptyState />
        ) : (
          <DivisionDashboard
            divisionName={labels.division ?? "Division"}
            opportunities={opportunities}
            leads={leads}
            communities={communities}
          />
        )}
      </div>
    </div>
  );
}
