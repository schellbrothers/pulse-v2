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

interface CommunityData {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: string | null;
  price_from: number | null;
  featured_image_url: string | null;
  short_description: string | null;
  total_homesites: number | null;
  has_model: boolean;
}

interface ProspectRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  community_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  last_contacted_at: string | null;
  created_at: string;
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

interface PlanRow {
  id: string;
  plan_name: string;
  marketing_name: string | null;
  net_price: number | null;
  community_id: string;
}

interface LotRow {
  id: string;
  lot_number: string;
  lot_status: string | null;
  is_available: boolean;
  community_id: string;
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

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
}

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return `$${(n / 1000).toFixed(0)}K`;
}

const STAGE_COLORS: Record<string, string> = {
  prospect_a: "#00c853",
  prospect_b: "#0070f3",
  prospect_c: "#f5a623",
};

function StageBadge({ stage }: { stage: string }) {
  const labels: Record<string, string> = { prospect_a: "A", prospect_b: "B", prospect_c: "C" };
  const color = STAGE_COLORS[stage] ?? "#666";
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
      backgroundColor: `${color}20`, border: `1px solid ${color}40`, color,
    }}>{labels[stage] ?? stage}</span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, color: "#555", padding: 48,
    }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>⌂</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>CSM Command Center</div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#80B602" }}>Division</strong> and <strong style={{ color: "#80B602" }}>Community</strong> from
        the global filters above to load your community pipeline.
      </div>
      <div style={{
        marginTop: 8, fontSize: 11, color: "#444", padding: "8px 16px",
        backgroundColor: "#161616", borderRadius: 6, border: "1px solid #2a2a2a",
      }}>
        Division → Community → Pipeline loads automatically
      </div>
    </div>
  );
}

function DivisionOnlyState({ divisionName }: { divisionName: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, color: "#555", padding: 48,
    }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>⌂</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>
        {divisionName}
      </div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Now select a <strong style={{ color: "#80B602" }}>Community</strong> to view the prospect pipeline,
        lot availability, plans, and activity for that community.
      </div>
    </div>
  );
}

// ─── Community Dashboard ──────────────────────────────────────────────────────

function CommunityDashboard({
  community, prospects, leads, plans, lots,
}: {
  community: CommunityData;
  prospects: ProspectRow[];
  leads: LeadRow[];
  plans: PlanRow[];
  lots: LotRow[];
}) {
  const availableLots = lots.filter(l => l.is_available);
  const prospectA = prospects.filter(p => p.stage === "prospect_a");
  const prospectB = prospects.filter(p => p.stage === "prospect_b");
  const prospectC = prospects.filter(p => p.stage === "prospect_c");

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
      {/* Community header */}
      <div style={{
        padding: "12px 24px", borderBottom: "1px solid #1a1a1a",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#ededed" }}>{community.name}</span>
          {community.city && community.state && (
            <span style={{ fontSize: 12, color: "#666" }}>{community.city}, {community.state}</span>
          )}
          {community.status && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
              backgroundColor: "#1a2a1a", border: "1px solid #1f3f1f", color: "#4ade80",
            }}>{community.status}</span>
          )}
        </div>
        <span style={{ fontSize: 12, color: "#555" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Stats ribbon */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, padding: "10px 24px",
        backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a",
      }}>
        {[
          { label: "Prospects", value: prospects.length, color: "#a1a1a1" },
          { label: "A", value: prospectA.length, color: "#00c853" },
          { label: "B", value: prospectB.length, color: "#0070f3" },
          { label: "C", value: prospectC.length, color: "#f5a623" },
          { label: "Leads", value: leads.length, color: "#a855f7" },
          { label: "Plans", value: plans.length, color: "#59a6bd" },
          { label: "Avail Lots", value: availableLots.length, color: "#80B602" },
          { label: "Price From", value: formatPrice(community.price_from), color: "#888" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Prospects table */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Prospect Pipeline</span>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555" }}>{prospects.length}</span>
          </div>
          {prospects.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#444", backgroundColor: "#111", borderRadius: 8, border: "1px solid #1f1f1f" }}>
              No prospects for this community yet
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 800, width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Stage</th>
                  <th style={thStyle}>Budget</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Last Contact</th>
                  <th style={thStyle}>Created</th>
                </tr></thead>
                <tbody>
                  {prospects.map(p => (
                    <tr key={p.id}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#161616")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ ...tdStyle, color: "#ededed", fontWeight: 500 }}>{p.first_name} {p.last_name}</td>
                      <td style={tdStyle}><StageBadge stage={p.stage} /></td>
                      <td style={tdStyle}>{formatBudget(p.budget_min, p.budget_max)}</td>
                      <td style={tdStyle}>{p.phone ?? "—"}</td>
                      <td style={tdStyle}>{relativeTime(p.last_contacted_at)}</td>
                      <td style={tdStyle}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leads table */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Leads</span>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555" }}>{leads.length}</span>
          </div>
          {leads.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#444", backgroundColor: "#111", borderRadius: 8, border: "1px solid #1f1f1f" }}>
              No leads for this community yet
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 700, width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Stage</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Last Activity</th>
                  <th style={thStyle}>Created</th>
                </tr></thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#161616")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ ...tdStyle, color: "#ededed", fontWeight: 500 }}>{l.first_name} {l.last_name}</td>
                      <td style={tdStyle}>{l.stage}</td>
                      <td style={tdStyle}>{l.source ?? "—"}</td>
                      <td style={tdStyle}>{relativeTime(l.last_activity_at)}</td>
                      <td style={tdStyle}>{new Date(l.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Plans + Lots summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12 }}>
              Plans ({plans.length})
            </div>
            {plans.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#444", backgroundColor: "#111", borderRadius: 8, border: "1px solid #1f1f1f" }}>
                No plans
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {plans.slice(0, 10).map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", backgroundColor: "#111", borderRadius: 4, border: "1px solid #1f1f1f" }}>
                    <span style={{ fontSize: 12, color: "#a1a1a1" }}>{p.marketing_name ?? p.plan_name}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{formatPrice(p.net_price)}</span>
                  </div>
                ))}
                {plans.length > 10 && <span style={{ fontSize: 11, color: "#555", paddingLeft: 12 }}>+{plans.length - 10} more</span>}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12 }}>
              Lots ({lots.length} total, {availableLots.length} available)
            </div>
            <div style={{ padding: 16, backgroundColor: "#111", borderRadius: 8, border: "1px solid #1f1f1f" }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Available", value: availableLots.length, color: "#80B602" },
                  { label: "Sold", value: lots.filter(l => l.lot_status === "sold").length, color: "#ff6b6b" },
                  { label: "Under Construction", value: lots.filter(l => l.lot_status === "under-construction").length, color: "#0070f3" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CsmClient() {
  const { filter, labels } = useGlobalFilter();
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data when community is selected
  useEffect(() => {
    if (!filter.communityId) {
      setCommunity(null);
      setProspects([]);
      setLeads([]);
      setPlans([]);
      setLots([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      const commId = filter.communityId!;
      const [commRes, prospRes, leadRes, planRes, lotRes] = await Promise.all([
        supabase.from("communities").select("*").eq("id", commId).single(),
        supabase.from("prospects").select("*").eq("community_id", commId).order("last_contacted_at", { ascending: false }),
        supabase.from("leads").select("*").eq("community_id", commId).neq("stage", "opportunity").order("last_activity_at", { ascending: false }),
        supabase.from("community_plans").select("*").eq("community_id", commId).order("net_price"),
        supabase.from("lots").select("*").eq("community_id", commId).order("lot_number"),
      ]);

      if (cancelled) return;
      setCommunity(commRes.data);
      setProspects(prospRes.data ?? []);
      setLeads(leadRes.data ?? []);
      setPlans(planRes.data ?? []);
      setLots(lotRes.data ?? []);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [filter.communityId]);

  // ── Render ──

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#0a0a0a", color: "#ededed" }}>
      {/* Top bar */}
      <div style={{
        padding: "10px 24px", borderBottom: "1px solid #1a1a1a",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>CSM Command Center</span>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 4,
          backgroundColor: "#1a2a1a", border: "1px solid #1f3f1f", color: "#00c853",
        }}>Community Sales Manager</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 13 }}>
            Loading community data...
          </div>
        ) : !filter.divisionId ? (
          <EmptyState />
        ) : !filter.communityId ? (
          <DivisionOnlyState divisionName={labels.division ?? "Division"} />
        ) : community ? (
          <CommunityDashboard
            community={community}
            prospects={prospects}
            leads={leads}
            plans={plans}
            lots={lots}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
