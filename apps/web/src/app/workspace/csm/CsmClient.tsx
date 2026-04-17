"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import CommunityView from "./CommunityDashboard";

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
        ) : !filter.divisionId ? (
          <EmptyState />
        ) : !filter.communityId ? (
          <DivisionOnlyState divisionName={labels.division ?? "Division"} />
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
          <EmptyState />
        )}
      </div>
    </div>
  );
}
