"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import SlideOver from "@/components/SlideOver";
import DataTable, { type Column, type StatItem as DataTableStatItem } from "@/components/DataTable";
import type { DivisionPlan, CommunityPlan, Community, Division } from "./page";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  divisionPlans: DivisionPlan[];
  communityPlans: CommunityPlan[];
  communities: Community[];
  divisions: Division[];
}

type Mode = "by-plan" | "by-community";

type CommunityPlanTableRow = CommunityPlan & Record<string, unknown> & {
  _community_name: string;
  _division_name: string;
  _beds: string;
  _baths: string;
  _sqft: string;
  _base_price: string;
  _incentive: string;
  _net_price: string;
};

type DivisionPlanTableRow = DivisionPlan & Record<string, unknown> & {
  _division_name: string;
  _beds: string;
  _baths: string;
  _sqft: string;
  _community_count: string;
  _price_range: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function formatBedsOrBaths(val: number | null): string {
  if (val == null) return "—";
  return String(val);
}

function formatSqft(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min == null) return (max ?? 0).toLocaleString();
  if (max == null || max === min) return min.toLocaleString();
  return `${min.toLocaleString()} – ${max.toLocaleString()}`;
}

function displayPrice(plan: CommunityPlan): string {
  const net = plan.net_price ?? (plan.base_price != null && plan.incentive_amount != null
    ? plan.base_price - plan.incentive_amount
    : plan.base_price);
  return formatPrice(net);
}

function filterSelectStyle(active: boolean): React.CSSProperties {
  return {
    background: "#1a1a1e",
    border: `1px solid ${active ? "#80B602" : "#333"}`,
    color: active ? "#80B602" : "#888",
    borderRadius: 3,
    height: 28,
    fontSize: 12,
    padding: "0 6px",
    cursor: "pointer",
    outline: "none",
  };
}

// ─── Mode toggle ──────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: 3,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    background: active ? "var(--surface-2)" : "transparent",
    color: active ? "var(--text)" : "var(--text-3)",
    borderColor: active ? "#555" : "var(--border)",
  });

  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button style={btnStyle(mode === "by-plan")} onClick={() => onChange("by-plan")}>
        By Plan
      </button>
      <button style={btnStyle(mode === "by-community")} onClick={() => onChange("by-community")}>
        By Community
      </button>
    </div>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function PlansInner({ divisionPlans, communityPlans, communities, divisions }: Props) {
  const searchParams = useSearchParams();
  const { filter, labels } = useGlobalFilter();

  const [mode, setMode] = useState<Mode>(() => filter.communityId ? "by-community" : "by-plan");
  const [divisionFilter, setDivisionFilter] = useState<string>(() => filter.divisionId ?? "all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState<string>(() =>
    filter.communityId ?? searchParams.get("community") ?? "all"
  );
  const [selectedPlan, setSelectedPlan] = useState<DivisionPlan | null>(null);
  const [selectedCommunityPlan, setSelectedCommunityPlan] = useState<CommunityPlan | null>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem("plans-mode") as Mode | null;
    if (savedMode === "by-plan" || savedMode === "by-community") setMode(savedMode);
  }, []);

  // Sync when global filter changes
  useEffect(() => {
    if (filter.divisionId) setDivisionFilter(filter.divisionId);
    else setDivisionFilter("all");
    if (filter.communityId) {
      setCommunityFilter(filter.communityId);
      setMode("by-community");
    } else {
      setCommunityFilter(searchParams.get("community") ?? "all");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.divisionId, filter.communityId]);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    localStorage.setItem("plans-mode", m);
  };

  const communityById = new Map(communities.map((c) => [c.id, c]));
  const divisionById = new Map(divisions.map((d) => [d.id, d]));

  const allStyles = Array.from(
    new Set(communityPlans.flatMap((p) => p.style_filters ?? []).filter(Boolean))
  ).sort();

  const divisionOptions = divisions.map((d) => ({ value: d.id, label: d.name }));
  const styleOptions = allStyles.map((s) => ({ value: s, label: s }));
  const communityOptions = communities.map((c) => ({ value: c.id, label: c.name }));

  // ── MODE: By Plan ──────────────────────────────────────────────────────────

  const filteredDivisionPlans = divisionPlans.filter((p) => {
    if (divisionFilter !== "all" && p.division_id !== divisionFilter) return false;
    if (styleFilter !== "all" && p.style !== styleFilter) return false;
    return true;
  });

  function communityPlansForDivPlan(dp: DivisionPlan): CommunityPlan[] {
    return communityPlans.filter(
      (cp) => cp.plan_id === dp.id || cp.plan_name.toLowerCase() === dp.marketing_name.toLowerCase()
    );
  }

  function priceRangeForPlan(dp: DivisionPlan): string {
    const cps = communityPlansForDivPlan(dp);
    const prices = cps.map((cp) => cp.net_price ?? cp.base_price).filter((p): p is number => p != null);
    if (prices.length === 0) return "—";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatPrice(min);
    return `${formatPrice(min)} – ${formatPrice(max)}`;
  }

  // ── MODE: By Community ─────────────────────────────────────────────────────

  const filteredCommunityPlans = communityPlans.filter((cp) => {
    const comm = communityById.get(cp.community_id);
    if (divisionFilter !== "all" && cp.division_id !== divisionFilter && comm?.division_id !== divisionFilter) return false;
    if (communityFilter !== "all" && cp.community_id !== communityFilter) return false;
    if (styleFilter !== "all") {
      const styles = cp.style_filters ?? [];
      if (!styles.includes(styleFilter)) return false;
    }
    return true;
  });

  const groupedByCommunity = communities
    .map((comm) => ({ community: comm, plans: filteredCommunityPlans.filter((cp) => cp.community_id === comm.id) }))
    .filter((g) => g.plans.length > 0);

  // ── Table — By Plan ────────────────────────────────────────────────────────

  const byPlanTableRows: DivisionPlanTableRow[] = filteredDivisionPlans.map((dp) => ({
    ...dp,
    _division_name: divisionById.get(dp.division_id)?.name ?? "—",
    _beds:  formatBedsOrBaths(dp.beds),
    _baths: formatBedsOrBaths(dp.baths),
    _sqft:  formatSqft(dp.sqft_min, dp.sqft),
    _community_count: String(communityPlansForDivPlan(dp).length),
    _price_range: priceRangeForPlan(dp),
  }));

  const byPlanColumns: Column<DivisionPlanTableRow>[] = [
    {
      key: "marketing_name",
      label: "Plan Name",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row.marketing_name}</span>,
    },
    { key: "_division_name", label: "Division", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._division_name}</span> },
    { key: "_beds",          label: "Beds",     sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._beds}</span> },
    { key: "_baths",         label: "Baths",    sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._baths}</span> },
    { key: "_sqft",          label: "Sqft",     sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._sqft}</span> },
    { key: "_community_count", label: "# Communities", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._community_count}</span> },
    { key: "_price_range",   label: "Price Range", render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._price_range}</span> },
    {
      key: "page_url",
      label: "Actions",
      render: (_v, row) =>
        row.page_url ? (
          <a href={row.page_url} target="_blank" rel="noreferrer" style={{ color: "#818cf8", fontSize: 11, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>↗</a>
        ) : null,
    },
  ];

  const byPlanTableStats: DataTableStatItem[] = [
    { label: "Plans", value: filteredDivisionPlans.length, color: "var(--text)" },
  ];

  // ── Table — By Community ───────────────────────────────────────────────────

  const byCommunityTableRows: CommunityPlanTableRow[] = filteredCommunityPlans.map((cp) => {
    const comm = communityById.get(cp.community_id);
    const div = cp.division_id ? divisionById.get(cp.division_id) : (comm ? divisionById.get(comm.division_id) : null);
    return {
      ...cp,
      _community_name: comm?.name ?? "—",
      _division_name: div?.name ?? "—",
      _beds:  formatBedsOrBaths(cp.beds),
      _baths: formatBedsOrBaths(cp.baths),
      _sqft:  formatSqft(cp.sqft_min, cp.sqft_max),
      _base_price: formatPrice(cp.base_price),
      _incentive: cp.incentive_amount && cp.incentive_amount > 0 ? `-${formatPrice(cp.incentive_amount)}` : "—",
      _net_price: displayPrice(cp),
    };
  });

  const byCommunityColumns: Column<CommunityPlanTableRow>[] = [
    {
      key: "_community_name",
      label: "Community",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._community_name}</span>,
    },
    { key: "plan_name",      label: "Plan",       sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.plan_name}</span> },
    { key: "_base_price",    label: "Base Price", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._base_price}</span> },
    { key: "_incentive",     label: "Incentive",  sortable: true, render: (_v, row) => <span style={{ color: row._incentive !== "—" ? "#4ade80" : "#555", fontSize: 13 }}>{row._incentive}</span> },
    { key: "_net_price",     label: "Net Price",  sortable: true, render: (_v, row) => <span style={{ color: "var(--blue)", fontWeight: 600, fontSize: 13 }}>{row._net_price}</span> },
    { key: "_sqft",          label: "Sqft",       sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._sqft}</span> },
    { key: "_beds",          label: "Beds",       sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._beds}</span> },
    { key: "_baths",         label: "Baths",      sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._baths}</span> },
  ];

  const byCommunityTableStats: DataTableStatItem[] = [
    { label: "Plans",       value: filteredCommunityPlans.length, color: "var(--text)" },
    { label: "Communities", value: groupedByCommunity.length,     color: "#818cf8" },
  ];

  // ── Inline filters ─────────────────────────────────────────────────────────

  const inlineFilters = (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <ModeToggle mode={mode} onChange={handleModeChange} />
      {!filter.divisionId && (
        <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} style={filterSelectStyle(divisionFilter !== "all")}>
          <option value="all">All Divisions</option>
          {divisionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {mode === "by-community" && !filter.communityId && (
        <select value={communityFilter} onChange={(e) => setCommunityFilter(e.target.value)} style={filterSelectStyle(communityFilter !== "all")}>
          <option value="all">All Communities</option>
          {communityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} style={filterSelectStyle(styleFilter !== "all")}>
        <option value="all">All Styles</option>
        {styleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  // ── Slide-over: division plan ──────────────────────────────────────────────

  const planCommunities = selectedPlan
    ? communityPlansForDivPlan(selectedPlan).map((cp) => ({ plan: cp, community: communityById.get(cp.community_id) }))
    : [];

  return (
    <PageShell
      topBar={<TopBar title="Plans" right={inlineFilters} />}
      filtersBar={
        (filter.divisionId || filter.communityId) ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-3)" }}>
            <span>Filtered:</span>
            {labels.division && <span style={{ color: "var(--text-2)" }}>{labels.division}</span>}
            {labels.community && <><span>›</span><span style={{ color: "var(--text-2)" }}>{labels.community}</span></>}
            {labels.plan && <><span>›</span><span style={{ color: "var(--text-2)" }}>{labels.plan}</span></>}
          </div>
        ) : undefined
      }
    >
      {mode === "by-plan" ? (
        <DataTable<DivisionPlanTableRow>
          columns={byPlanColumns}
          rows={byPlanTableRows}
          stats={byPlanTableStats}
          defaultPageSize={100}
          onRowClick={(row) => setSelectedPlan(row)}
          emptyMessage="No plans"
          minWidth={1000}
        />
      ) : (
        <DataTable<CommunityPlanTableRow>
          columns={byCommunityColumns}
          rows={byCommunityTableRows}
          stats={byCommunityTableStats}
          defaultPageSize={100}
          onRowClick={(row) => setSelectedCommunityPlan(row)}
          emptyMessage="No plans"
          minWidth={1000}
        />
      )}

      {/* Slide-over: By Plan */}
      <SlideOver
        open={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title={selectedPlan?.marketing_name ?? ""}
        subtitle={
          selectedPlan
            ? [selectedPlan.style, selectedPlan.beds != null ? `${selectedPlan.beds} bd` : null, selectedPlan.baths != null ? `${selectedPlan.baths} ba` : null, selectedPlan.sqft != null ? `${selectedPlan.sqft.toLocaleString()} sf` : null].filter(Boolean).join(" · ")
            : undefined
        }
        width={500}
      >
        {selectedPlan && (
          <div style={{ padding: "20px 24px" }}>
            {selectedPlan.featured_image_url && (
              <div style={{ width: "100%", height: 160, borderRadius: 8, overflow: "hidden", marginBottom: 20, background: "var(--surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedPlan.featured_image_url} alt={selectedPlan.marketing_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Plan Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedPlan.style && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Style</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{selectedPlan.style}</span></div>}
                {selectedPlan.beds != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Bedrooms</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{selectedPlan.beds}</span></div>}
                {selectedPlan.baths != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Bathrooms</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{selectedPlan.baths}</span></div>}
                {(selectedPlan.sqft ?? selectedPlan.sqft_min) != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Sq Ft</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{formatSqft(selectedPlan.sqft_min, selectedPlan.sqft)}</span></div>}
              </div>
            </div>
            {selectedPlan.page_url && (
              <a href={selectedPlan.page_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", fontSize: 12, padding: "6px 14px", borderRadius: 6, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#818cf8", textDecoration: "none", fontWeight: 500, marginBottom: 20 }}>↗ View Plan</a>
            )}
            <div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Available In ({planCommunities.length} {planCommunities.length === 1 ? "community" : "communities"})
              </div>
              {planCommunities.length === 0 ? (
                <div style={{ fontSize: 12, color: "#444" }}>No community pricing available.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {planCommunities.map(({ plan: cp, community }) => (
                    <div key={cp.id} style={{ background: "var(--surface-2)", border: "1px solid #555", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{community?.name ?? "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{[community?.city, community?.state].filter(Boolean).join(", ")}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)", fontFamily: "var(--font-display, serif)" }}>{displayPrice(cp)}</div>
                        {cp.incentive_amount != null && cp.incentive_amount > 0 && <div style={{ fontSize: 10, color: "#4ade80" }}>Save ${cp.incentive_amount.toLocaleString()}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SlideOver>

      {/* Slide-over: By Community plan */}
      <SlideOver
        open={!!selectedCommunityPlan}
        onClose={() => setSelectedCommunityPlan(null)}
        title={selectedCommunityPlan?.plan_name ?? ""}
        subtitle={
          selectedCommunityPlan
            ? (() => {
                const comm = communityById.get(selectedCommunityPlan.community_id);
                return comm ? `${comm.name} · ${[comm.city, comm.state].filter(Boolean).join(", ")}` : undefined;
              })()
            : undefined
        }
        width={460}
      >
        {selectedCommunityPlan && (
          <div style={{ padding: "20px 24px" }}>
            {selectedCommunityPlan.featured_image_url && (
              <div style={{ width: "100%", height: 160, borderRadius: 8, overflow: "hidden", marginBottom: 20, background: "var(--surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedCommunityPlan.featured_image_url} alt={selectedCommunityPlan.plan_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {selectedCommunityPlan.beds != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Bedrooms</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{selectedCommunityPlan.beds}</span></div>}
              {selectedCommunityPlan.baths != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Bathrooms</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{selectedCommunityPlan.baths}</span></div>}
              {(selectedCommunityPlan.sqft_min != null || selectedCommunityPlan.sqft_max != null) && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Sq Ft</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{formatSqft(selectedCommunityPlan.sqft_min, selectedCommunityPlan.sqft_max)}</span></div>}
              {selectedCommunityPlan.base_price != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Base Price</span><span style={{ color: "var(--text-2)", fontSize: 12 }}>{formatPrice(selectedCommunityPlan.base_price)}</span></div>}
              {selectedCommunityPlan.incentive_amount != null && selectedCommunityPlan.incentive_amount > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-3)", fontSize: 12 }}>Incentive</span><span style={{ color: "#4ade80", fontSize: 12 }}>-{formatPrice(selectedCommunityPlan.incentive_amount)}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>Net Price</span>
                <span style={{ color: "var(--blue)", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display, serif)" }}>{displayPrice(selectedCommunityPlan)}</span>
              </div>
            </div>
            {selectedCommunityPlan.page_url && (
              <a href={selectedCommunityPlan.page_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 20, fontSize: 12, padding: "6px 14px", borderRadius: 6, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>↗ View Plan Details</a>
            )}
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function PlansClient(props: Props) {
  return (
    <Suspense>
      <PlansInner {...props} />
    </Suspense>
  );
}
