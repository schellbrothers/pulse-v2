"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import CommunityView from "./CommunityDashboard";
import CommHub from "@/components/CommHub";
import OpportunityPanel from "@/components/OpportunityPanel";
import type { OpportunityPanelData } from "@/components/OpportunityPanel";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Empty States ─────────────────────────────────────────────────────────────

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
        the global filters above to load your community dashboard.
      </div>
      <div style={{
        marginTop: 8, fontSize: 11, color: "#444", padding: "8px 16px",
        backgroundColor: "#161616", borderRadius: 6, border: "1px solid #2a2a2a",
      }}>
        Division → Community → Dashboard loads automatically
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
      <div style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>{divisionName}</div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Now select a <strong style={{ color: "#80B602" }}>Community</strong> to view the full
        community dashboard — prospects, plans, lots, site plan, and more.
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── CSM Overview (no community selected — show all user's data) ──────────────

function CsmOverview({ divisionId, userId, divisionLabel, userLabel }: {
  divisionId: string | null;
  userId: string | null;
  divisionLabel?: string;
  userLabel?: string;
}) {
  const [prospects, setProspects] = useState<any[]>([]);
  const [csmQueueItems, setCsmQueueItems] = useState<any[]>([]);
  const [userComms, setUserComms] = useState<string[]>([]);
  const [panelItem, setPanelItem] = useState<OpportunityPanelData | null>(null);

  useEffect(() => {
    async function load() {
      // Get user's community assignments
      let commIds: string[] = [];
      if (userId) {
        const { data: assignments } = await supabase
          .from("user_community_assignments")
          .select("community_id")
          .eq("user_id", userId);
        commIds = (assignments ?? []).map((a: any) => a.community_id);
      }
      setUserComms(commIds);

      // Build query for prospects across user's communities
      if (commIds.length > 0) {
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id, contact_id, crm_stage, community_id, division_id, notes, last_activity_at, created_at, communities(name), contacts(first_name, last_name, email, phone)")
          .in("community_id", commIds)
          .in("crm_stage", ["prospect_a", "prospect_b", "prospect_c"])
          .order("last_activity_at", { ascending: false });
        setProspects((opps ?? []).map((o: any) => ({
          ...o,
          contacts: Array.isArray(o.contacts) ? o.contacts[0] : o.contacts,
          communities: Array.isArray(o.communities) ? o.communities[0] : o.communities,
        })));

        const { data: queue } = await supabase
          .from("opportunities")
          .select("id, contact_id, crm_stage, community_id, division_id, notes, last_activity_at, created_at, communities(name), contacts(first_name, last_name, email, phone)")
          .in("community_id", commIds)
          .eq("crm_stage", "csm_queue")
          .order("created_at", { ascending: false });
        setCsmQueueItems((queue ?? []).map((o: any) => ({
          ...o,
          contacts: Array.isArray(o.contacts) ? o.contacts[0] : o.contacts,
          communities: Array.isArray(o.communities) ? o.communities[0] : o.communities,
        })));
      } else if (divisionId) {
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id, contact_id, crm_stage, community_id, division_id, notes, last_activity_at, created_at, communities(name), contacts(first_name, last_name, email, phone)")
          .eq("division_id", divisionId)
          .in("crm_stage", ["prospect_a", "prospect_b", "prospect_c"])
          .order("last_activity_at", { ascending: false })
          .limit(200);
        setProspects((opps ?? []).map((o: any) => ({
          ...o,
          contacts: Array.isArray(o.contacts) ? o.contacts[0] : o.contacts,
          communities: Array.isArray(o.communities) ? o.communities[0] : o.communities,
        })));
      }
    }
    load();
  }, [userId, divisionId]);

  const prospA = prospects.filter(p => p.crm_stage === "prospect_a");
  const prospB = prospects.filter(p => p.crm_stage === "prospect_b");
  const prospC = prospects.filter(p => p.crm_stage === "prospect_c");

  const title = userLabel
    ? `${userLabel}'s Dashboard`
    : divisionLabel
      ? `${divisionLabel} — select a community for full dashboard`
      : "CSM Command Center";

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", marginBottom: 4 }}>{title}</div>
      {userId && !divisionLabel && (
        <div style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>Select a division and community for the full dashboard</div>
      )}

      {/* Metric cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ label: "CSM Queue", count: csmQueueItems.length, color: "#c084fc" },
          { label: "Prospect A", count: prospA.length, color: "#4ade80" },
          { label: "Prospect B", count: prospB.length, color: "#60a5fa" },
          { label: "Prospect C", count: prospC.length, color: "#fbbf24" },
          { label: "Total", count: prospects.length, color: "#a1a1aa" },
        ].map(m => (
          <div key={m.label} style={{
            padding: "12px 16px", backgroundColor: "#18181b", border: "1px solid #27272a",
            borderRadius: 6, minWidth: 100, textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.count}</div>
            <div style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column: Prospects + Comm Hub */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Left: prospect list */}
        <div style={{ flex: "1 1 50%", minWidth: 0 }}>
          {csmQueueItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#c084fc", marginBottom: 8 }}>CSM Queue ({csmQueueItems.length})</div>
              {csmQueueItems.map(p => (
                <div key={p.id} onClick={() => setPanelItem({
                  id: p.id, contact_id: p.contact_id,
                  first_name: p.contacts?.first_name ?? "—", last_name: p.contacts?.last_name ?? "",
                  email: p.contacts?.email, phone: p.contacts?.phone,
                  stage: p.crm_stage, source: null,
                  community_name: p.communities?.name ?? null, division_name: null,
                  budget_min: null, budget_max: null, floor_plan_name: null,
                  notes: p.notes, last_activity_at: p.last_activity_at, created_at: p.created_at,
                })} style={{
                  padding: "8px 12px", backgroundColor: "#18181b", border: "1px solid #27272a",
                  borderRadius: 4, marginBottom: 4, cursor: "pointer", display: "flex", justifyContent: "space-between",
                }}>
                  <span style={{ color: "#fafafa", fontSize: 12, textDecoration: "underline", textDecorationColor: "#3f3f46" }}>
                    {p.contacts?.first_name ?? "—"} {p.contacts?.last_name ?? ""}
                  </span>
                  <span style={{ color: "#52525b", fontSize: 11 }}>{p.communities?.name ?? ""}</span>
                </div>
              ))}
            </div>
          )}

          {[{ label: "Prospect A", items: prospA, color: "#4ade80" },
            { label: "Prospect B", items: prospB, color: "#60a5fa" },
            { label: "Prospect C", items: prospC, color: "#fbbf24" },
          ].map(group => group.items.length > 0 && (
            <div key={group.label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: group.color, marginBottom: 8 }}>{group.label} ({group.items.length})</div>
              {group.items.slice(0, 20).map(p => (
                <div key={p.id} onClick={() => setPanelItem({
                  id: p.id, contact_id: p.contact_id,
                  first_name: p.contacts?.first_name ?? "—", last_name: p.contacts?.last_name ?? "",
                  email: p.contacts?.email, phone: p.contacts?.phone,
                  stage: p.crm_stage, source: null,
                  community_name: p.communities?.name ?? null, division_name: null,
                  budget_min: null, budget_max: null, floor_plan_name: null,
                  notes: p.notes, last_activity_at: p.last_activity_at, created_at: p.created_at,
                })} style={{
                  padding: "8px 12px", backgroundColor: "#18181b", border: "1px solid #27272a",
                  borderRadius: 4, marginBottom: 4, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ color: "#fafafa", fontSize: 12, textDecoration: "underline", textDecorationColor: "#3f3f46" }}>
                    {p.contacts?.first_name ?? "—"} {p.contacts?.last_name ?? ""}
                  </span>
                  <span style={{ color: "#52525b", fontSize: 11 }}>{p.communities?.name ?? ""}</span>
                </div>
              ))}
              {group.items.length > 20 && <div style={{ fontSize: 11, color: "#52525b", padding: "4px 12px" }}>+{group.items.length - 20} more</div>}
            </div>
          ))}
        </div>

        {/* Right: Comm Hub */}
        <div style={{ flex: "1 1 50%", minWidth: 0 }}>
          <CommHub
            divisionId={divisionId ?? undefined}
            excludeChannel={["webform", "schellie"]}
          />
        </div>
      </div>

      {panelItem && (
        <OpportunityPanel
          open={!!panelItem}
          onClose={() => setPanelItem(null)}
          opportunity={panelItem}
        />
      )}
    </div>
  );
}

export default function CsmClient() {
  const { filter, labels } = useGlobalFilter();
  const [community, setCommunity] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [modelHome, setModelHome] = useState<any>(null);
  const [specHomes, setSpecHomes] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch full community data when community is selected
  useEffect(() => {
    if (!filter.communityId) {
      setCommunity(null);
      setPlans([]);
      setLots([]);
      setModelHome(null);
      setSpecHomes([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      const commId = filter.communityId!;

      const [commRes, planRes, lotRes, modelRes, specRes, divRes] = await Promise.all([
        supabase.from("communities").select("*").eq("id", commId).single(),
        supabase.from("community_plans").select("*").eq("community_id", commId).order("net_price"),
        supabase.from("lots").select("id,community_id,lot_number,lot_status,construction_status,is_available,lot_premium,address,phase,is_buildable").eq("community_id", commId).order("lot_number"),
        supabase.from("model_homes").select("*").eq("community_id", commId).maybeSingle(),
        supabase.from("spec_homes").select("*").eq("community_id", commId),
        supabase.from("divisions").select("id,name,slug"),
      ]);

      if (cancelled) return;

      // If model_homes.community_id didn't match, try by name
      let resolvedModelHome = modelRes.data;
      if (!resolvedModelHome && commRes.data?.name) {
        const { data: mhByName } = await supabase
          .from("model_homes").select("*").eq("community_name", commRes.data.name).maybeSingle();
        resolvedModelHome = mhByName;
      }

      // Same for spec_homes
      let resolvedSpecHomes = specRes.data ?? [];
      if (resolvedSpecHomes.length === 0 && commRes.data?.name) {
        const { data: shByName } = await supabase
          .from("spec_homes").select("*").eq("community_name", commRes.data.name);
        resolvedSpecHomes = shByName ?? [];
      }

      if (cancelled) return;
      setCommunity(commRes.data);
      setPlans(planRes.data ?? []);
      setLots(lotRes.data ?? []);
      setModelHome(resolvedModelHome);
      setSpecHomes(resolvedSpecHomes);
      setDivisions(divRes.data ?? []);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [filter.communityId]);

  // ── Render ──

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#0a0a0a", color: "#ededed" }}>
      {/* Content — no header, global filters drive context */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 13 }}>
            Loading community data...
          </div>
        ) : community ? (
          <CommunityView
            community={community}
            plans={plans}
            lots={lots}
            modelHome={modelHome}
            specHomes={specHomes}
            divisions={divisions}
          />
        ) : (
          <CsmOverview
            divisionId={filter.divisionId}
            userId={filter.userId}
            divisionLabel={labels.division}
            userLabel={labels.user}
          />
        )}
      </div>
    </div>
  );
}
