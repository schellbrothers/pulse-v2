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

// ─── Pill styles ──────────────────────────────────────────────────────────────

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 12px",
  borderRadius: 3,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  outline: "none",
  border: "1px solid #444",
  background: "transparent",
  color: "#888",
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

  // Cascade: fetch plans when community selected
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

  // Update labels for breadcrumb
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
    <div style={{ flexShrink: 0 }}>
      {/* ── Top bar: Logo · Search · Account ────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 44,
        background: "#121314",
        borderBottom: "1px solid #222",
        gap: 16,
      }}>
        {/* Left: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: "#80B602", letterSpacing: "0.05em" }}>
            PULSE
          </span>
          <span style={{ fontSize: 11, color: "#444", fontWeight: 400 }}>2026</span>
        </div>

        {/* Center: search */}
        <div style={{ flex: 1, maxWidth: 360, position: "relative" }}>
          <input
            type="text"
            placeholder="🔍  Search communities, plans, lots..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              background: "#1e1f22",
              border: "1px solid #333",
              borderRadius: 3,
              color: "#aaa",
              fontSize: 12,
              padding: "5px 12px",
              outline: "none",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>

        {/* Right: account */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {/* Notification bell */}
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 16, padding: 0 }}>
            🔔
          </button>
          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#80B602",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff",
            }}>
              L
            </div>
            <span style={{ fontSize: 12, color: "#aaa", fontFamily: "var(--font-body)" }}>
              Hello, Lance!
            </span>
            <span style={{ color: "#444", fontSize: 12 }}>▾</span>
          </div>
        </div>
      </div>

      {/* ── Filter bar: Overview · Division · Community · Plan ───────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 16px",
        background: "#121314",
        borderBottom: "1px solid #222",
        flexWrap: "wrap",
      }}>
        {/* Overview pill — always shown, navigates to / */}
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{
            ...pillBase,
            color: !filter.divisionId && !filter.communityId ? "#fff" : "#666",
            borderColor: !filter.divisionId && !filter.communityId ? "#59a6bd" : "#333",
            background: !filter.divisionId && !filter.communityId ? "rgba(89,166,189,0.15)" : "transparent",
          }}>
            Overview
          </span>
        </a>

        {/* Division select */}
        <select
          value={filter.divisionId ?? ""}
          onChange={e => { setDivision(e.target.value || null); }}
          style={filter.divisionId ? pillActive : pillBase}
        >
          <option value="">Division ▾</option>
          {divisions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Community select */}
        <select
          value={filter.communityId ?? ""}
          onChange={e => { setCommunity(e.target.value || null); }}
          style={filter.communityId ? pillActive : pillBase}
        >
          <option value="">Community ▾</option>
          {filteredCommunities.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Plan select */}
        <select
          value={filter.planModelId ?? ""}
          onChange={e => { setPlan(e.target.value || null); }}
          style={filter.planModelId ? pillActive : pillBase}
        >
          <option value="">Floor Plan ▾</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>{p.plan_name}</option>
          ))}
        </select>

        {/* Clear — only when filter active */}
        {activePillCount > 0 && (
          <button
            onClick={clearFilter}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              cursor: "pointer",
              fontSize: 12,
              padding: "0 6px",
              fontFamily: "var(--font-body)",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#E32027")}
            onMouseLeave={e => (e.currentTarget.style.color = "#555")}
            title="Clear all filters"
          >
            ✕ Clear
          </button>
        )}

        {/* Breadcrumb — right side */}
        {(filter.divisionId || filter.communityId) && (
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#555", display: "flex", gap: 4, alignItems: "center" }}>
            {filter.divisionId && (
              <span style={{ color: "#80B602" }}>
                {divisions.find(d => d.id === filter.divisionId)?.name}
              </span>
            )}
            {filter.communityId && (
              <>
                <span style={{ color: "#333" }}>›</span>
                <span style={{ color: "#80B602" }}>
                  {communities.find(c => c.id === filter.communityId)?.name}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
