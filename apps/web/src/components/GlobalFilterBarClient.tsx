"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import type { DivisionOption, CommunityOption } from "./GlobalFilterBar";

interface CommunityPlanOption {
  id: string;
  plan_name: string;
}

interface Props {
  divisions: DivisionOption[];
  communities: CommunityOption[];
}

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  padding: "0 12px",
  borderRadius: 3,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  outline: "none",
  border: "1px solid #333",
  background: "transparent",
  color: "#666",
  fontFamily: "var(--font-body)",
  transition: "all 0.15s",
  appearance: "none" as const,
  minWidth: 120,
};

const pillActive: React.CSSProperties = {
  ...pillBase,
  background: "#80B602",
  border: "1px solid #80B602",
  color: "#ffffff",
  fontWeight: 600,
};

export default function GlobalFilterBarClient({ divisions, communities }: Props) {
  const { filter, setDivision, setCommunity, setPlan, clearFilter, setLabels } =
    useGlobalFilter();

  const [plans, setPlans] = useState<CommunityPlanOption[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!filter.communityId) { setPlans([]); return; }
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    sb.from("community_plans")
      .select("id,plan_name")
      .eq("community_id", filter.communityId)
      .order("plan_name")
      .then(({ data }) => setPlans(data ?? []));
  }, [filter.communityId]);

  useEffect(() => {
    const divLabel = divisions.find(d => d.id === filter.divisionId)?.name;
    const commLabel = communities.find(c => c.id === filter.communityId)?.name;
    const planLabel = plans.find(p => p.id === String(filter.planModelId))?.plan_name;
    if (typeof setLabels === "function") {
      setLabels({ division: divLabel, community: commLabel, plan: planLabel });
    }
  }, [filter, divisions, communities, plans, setLabels]);

  const filteredCommunities = filter.divisionId
    ? communities.filter(c => c.division_id === filter.divisionId)
    : communities;

  const activePillCount = [filter.divisionId, filter.communityId, filter.planModelId].filter(Boolean).length;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      height: 44,
      background: "#121314",
      borderBottom: "1px solid #222",
      gap: 6,
      flexShrink: 0,
    }}>
      {/* ── Filter pills ── */}
      <select
        value={filter.divisionId ?? ""}
        onChange={e => setDivision(e.target.value || null)}
        style={filter.divisionId ? pillActive : pillBase}
      >
        <option value="">Division ▾</option>
        {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <select
        value={filter.communityId ?? ""}
        onChange={e => setCommunity(e.target.value || null)}
        style={filter.communityId ? pillActive : pillBase}
      >
        <option value="">Community ▾</option>
        {filteredCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select
        value={filter.planModelId ?? ""}
        onChange={e => setPlan(e.target.value || null)}
        style={filter.planModelId ? pillActive : pillBase}
      >
        <option value="">Floor Plan ▾</option>
        {plans.map(p => <option key={p.id} value={p.id}>{p.plan_name}</option>)}
      </select>

      {activePillCount > 0 && (
        <button
          onClick={clearFilter}
          style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:12, padding:"0 6px", fontFamily:"var(--font-body)" }}
          onMouseEnter={e => (e.currentTarget.style.color="#E32027")}
          onMouseLeave={e => (e.currentTarget.style.color="#555")}
        >
          ✕ Clear
        </button>
      )}

      {/* ── Breadcrumb ── */}
      {(filter.divisionId || filter.communityId) && (
        <div style={{ fontSize:11, color:"#80B602", display:"flex", gap:4, alignItems:"center", marginLeft:8 }}>
          {filter.divisionId && <span>{divisions.find(d => d.id === filter.divisionId)?.name}</span>}
          {filter.communityId && <><span style={{color:"#333"}}>›</span><span>{communities.find(c => c.id === filter.communityId)?.name}</span></>}
        </div>
      )}

      {/* ── Right side: search + account ── */}
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
        <input
          type="text"
          placeholder="🔍  Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background:"#1e1f22", border:"1px solid #333", borderRadius:3, color:"#aaa", fontSize:12, padding:"4px 10px", outline:"none", fontFamily:"var(--font-body)", width:180 }}
        />
        <button style={{ background:"none", border:"none", cursor:"pointer", color:"#555", fontSize:15, padding:0 }}>🔔</button>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:26, height:26, borderRadius:"50%", background:"#80B602", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>L</div>
          <span style={{ fontSize:12, color:"#888" }}>Hello, Lance!</span>
        </div>
      </div>
    </div>
  );
}
