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

const selectStyle: React.CSSProperties = {
  background: "#3E3F44",
  border: "1px solid #555",
  borderRadius: 3,
  color: "rgba(255,255,255,0.6)",
  fontSize: 12,
  padding: "4px 8px",
  outline: "none",
  cursor: "pointer",
  height: 28,
  minWidth: 140,
  transition: "border-color 0.15s, color 0.15s",
};

const activeSelectStyle: React.CSSProperties = {
  ...selectStyle,
  border: "1px solid #59a6bd",
  color: "rgba(255,255,255,0.9)",
};

export default function GlobalFilterBarClient({ divisions, communities }: Props) {
  const { filter, setDivision, setCommunity, setPlan, clearFilter, setLabels } =
    useGlobalFilter();

  const [plans, setPlans] = useState<CommunityPlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Cascade: when communityId changes, fetch plans for that community
  useEffect(() => {
    if (!filter.communityId) {
      setPlans([]);
      return;
    }
    setLoadingPlans(true);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    supabase
      .from("community_plans")
      .select("id,plan_name")
      .eq("community_id", filter.communityId)
      .order("plan_name")
      .then(({ data }) => {
        setPlans((data ?? []) as CommunityPlanOption[]);
        setLoadingPlans(false);
      });
  }, [filter.communityId]);

  // Keep labels in sync with current selection
  useEffect(() => {
    const divLabel = divisions.find((d) => d.id === filter.divisionId)?.name;
    const commLabel = filteredCommunities.find((c) => c.id === filter.communityId)?.name;
    const planLabel = plans.find((p) => p.id === filter.planModelId)?.plan_name;
    setLabels({
      division: divLabel,
      community: commLabel,
      plan: planLabel,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.divisionId, filter.communityId, filter.planModelId, plans]);

  const isActive =
    filter.divisionId !== null ||
    filter.communityId !== null ||
    filter.planModelId !== null;

  // Cascade community list by division
  const filteredCommunities = filter.divisionId
    ? communities.filter((c) => c.division_id === filter.divisionId)
    : communities;

  // Build breadcrumb
  const breadcrumbs: string[] = [];
  const divLabel = divisions.find((d) => d.id === filter.divisionId)?.name;
  const commLabel = filteredCommunities.find((c) => c.id === filter.communityId)?.name;
  const planLabel = plans.find((p) => p.id === filter.planModelId)?.plan_name;
  if (divLabel) breadcrumbs.push(divLabel);
  if (commLabel) breadcrumbs.push(commLabel);
  if (planLabel) breadcrumbs.push(planLabel);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 44,
        paddingLeft: 12,
        paddingRight: 12,
        borderBottom: "1px solid #444444",
        backgroundColor: "#2a2b2e",
        flexShrink: 0,
      }}
    >
      {/* Division select */}
      <select
        style={filter.divisionId ? activeSelectStyle : selectStyle}
        value={filter.divisionId ?? ""}
        onChange={(e) => setDivision(e.target.value || null)}
        onFocus={(e) => { (e.currentTarget as HTMLSelectElement).style.borderColor = "#59a6bd"; }}
        onBlur={(e) => { (e.currentTarget as HTMLSelectElement).style.borderColor = filter.divisionId ? "#59a6bd" : "#555"; }}
      >
        <option value="">◈ All Divisions</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <span style={{ color: "#555", fontSize: 12 }}>›</span>

      {/* Community select */}
      <select
        style={filter.communityId ? activeSelectStyle : selectStyle}
        value={filter.communityId ?? ""}
        onChange={(e) => setCommunity(e.target.value || null)}
        onFocus={(e) => { (e.currentTarget as HTMLSelectElement).style.borderColor = "#59a6bd"; }}
        onBlur={(e) => { (e.currentTarget as HTMLSelectElement).style.borderColor = filter.communityId ? "#59a6bd" : "#555"; }}
      >
        <option value="">⌂ All Communities</option>
        {filteredCommunities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <span style={{ color: "#555", fontSize: 12 }}>›</span>

      {/* Plan select */}
      <select
        style={filter.planModelId ? activeSelectStyle : selectStyle}
        value={filter.planModelId ?? ""}
        onChange={(e) => setPlan(e.target.value || null)}
        disabled={!filter.communityId || loadingPlans}
        onFocus={(e) => { (e.currentTarget as HTMLSelectElement).style.borderColor = "#59a6bd"; }}
        onBlur={(e) => { (e.currentTarget as HTMLSelectElement).style.borderColor = filter.planModelId ? "#59a6bd" : "#555"; }}
      >
        <option value="">◱ All Plans</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.plan_name}
          </option>
        ))}
      </select>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Breadcrumb or no-filter hint */}
      {isActive && breadcrumbs.length > 0 ? (
        <span
          style={{
            fontSize: 11,
            color: "#59a6bd",
            fontStyle: "italic",
            marginRight: 8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 260,
          }}
        >
          {breadcrumbs.join(" › ")}
        </span>
      ) : !isActive ? (
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            fontStyle: "italic",
            marginRight: 8,
            whiteSpace: "nowrap",
          }}
        >
          No filter — showing all data
        </span>
      ) : null}

      {/* Clear button */}
      {isActive && (
        <button
          onClick={clearFilter}
          title="Clear filter"
          style={{
            background: "none",
            border: "1px solid #555",
            borderRadius: 4,
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            padding: "2px 8px",
            cursor: "pointer",
            height: 24,
            lineHeight: "20px",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#E32027";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#E32027";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#555";
          }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}
