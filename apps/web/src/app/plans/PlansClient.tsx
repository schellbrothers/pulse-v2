"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import FiltersBar from "@/components/FiltersBar";
import StatsBar from "@/components/StatsBar";
import ViewToggle from "@/components/ViewToggle";
import PlanCard from "@/components/PlanCard";
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
  _price_display: string;
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

// ─── Mode toggle ──────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    background: active ? "#1a1a1a" : "transparent",
    color: active ? "#ededed" : "#555",
    borderColor: active ? "#2a2a2a" : "#1f1f1f",
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

  const [mode, setMode] = useState<Mode>(() =>
    filter.communityId ? "by-community" : "by-plan"
  );
  const [view, setView] = useState<"card" | "table">("card");
  const [divisionFilter, setDivisionFilter] = useState<string>(() =>
    filter.divisionId ?? "all"
  );
  const [styleFilter, setStyleFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState<string>(() =>
    filter.communityId ?? searchParams.get("community") ?? "all"
  );
  const [selectedPlan, setSelectedPlan] = useState<DivisionPlan | null>(null);
  const [selectedCommunityPlan, setSelectedCommunityPlan] = useState<CommunityPlan | null>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem("plans-mode") as Mode | null;
    const savedView = localStorage.getItem("plans-view") as "card" | "table" | null;
    if (savedMode === "by-plan" || savedMode === "by-community") setMode(savedMode);
    if (savedView === "card" || savedView === "table") setView(savedView);
  }, []);

  // Sync local state when global filter changes
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

  const handleViewChange = (v: "card" | "table") => {
    setView(v);
    localStorage.setItem("plans-view", v);
  };

  // Build lookup maps
  const communityById = new Map(communities.map((c) => [c.id, c]));
  const divisionById = new Map(divisions.map((d) => [d.id, d]));

  // Unique styles from community plans
  const allStyles = Array.from(
    new Set(
      communityPlans
        .flatMap((p) => p.style_filters ?? [])
        .filter(Boolean)
    )
  ).sort();

  const divisionOptions = [
    { value: "all", label: "All Divisions" },
    ...divisions.map((d) => ({ value: d.id, label: d.name })),
  ];

  const styleOptions = [
    { value: "all", label: "All Styles" },
    ...allStyles.map((s) => ({ value: s, label: s })),
  ];

  const communityOptions = [
    { value: "all", label: "All Communities" },
    ...communities.map((c) => ({ value: c.id, label: c.name })),
  ];

  // ── MODE: By Plan ──────────────────────────────────────────────────────────

  // Filter division plans
  const filteredDivisionPlans = divisionPlans.filter((p) => {
    if (divisionFilter !== "all" && p.division_id !== divisionFilter) return false;
    if (styleFilter !== "all" && p.style !== styleFilter) return false;
    return true;
  });

  // For each division plan, find community_plans that reference it (by plan_id or name match)
  function communityPlansForDivPlan(dp: DivisionPlan): CommunityPlan[] {
    return communityPlans.filter(
      (cp) =>
        cp.plan_id === dp.id ||
        cp.plan_name.toLowerCase() === dp.marketing_name.toLowerCase()
    );
  }

  // Price range for a division plan across all communities
  function priceRangeForPlan(dp: DivisionPlan): string {
    const cps = communityPlansForDivPlan(dp);
    const prices = cps
      .map((cp) => cp.net_price ?? cp.base_price)
      .filter((p): p is number => p != null);
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

  // Group community plans by community
  const groupedByCommunity = communities
    .map((comm) => ({
      community: comm,
      plans: filteredCommunityPlans.filter((cp) => cp.community_id === comm.id),
    }))
    .filter((g) => g.plans.length > 0);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const statsItems =
    mode === "by-plan"
      ? [
          { label: "Plans",      value: filteredDivisionPlans.length },
          { label: "Divisions",  value: new Set(filteredDivisionPlans.map((p) => p.division_id)).size },
          { label: "Communities",value: new Set(communityPlans.map((cp) => cp.community_id)).size },
        ]
      : [
          { label: "Plans",       value: filteredCommunityPlans.length },
          { label: "Communities", value: groupedByCommunity.length },
        ];

  // ── Card view — By Plan ────────────────────────────────────────────────────

  const byPlanCardView = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 14,
        padding: 24,
      }}
    >
      {filteredDivisionPlans.map((dp) => {
        const div = divisionById.get(dp.division_id);
        return (
          <PlanCard
            key={dp.id}
            planName={dp.marketing_name}
            divisionName={div?.name}
            beds={dp.beds}
            baths={dp.baths}
            sqft={dp.sqft ?? dp.sqft_min}
            priceFormatted={priceRangeForPlan(dp)}
            imageUrl={dp.featured_image_url}
            onClick={() => setSelectedPlan(dp)}
          />
        );
      })}
      {filteredDivisionPlans.length === 0 && (
        <div style={{ gridColumn: "1 / -1", padding: 48, textAlign: "center", color: "#555", fontSize: 13 }}>
          No plans match filters.
        </div>
      )}
    </div>
  );

  // ── Table view — By Plan ───────────────────────────────────────────────────

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
      render: (_v, row) => (
        <span style={{ color: "#ededed", fontWeight: 500 }}>{row.marketing_name}</span>
      ),
    },
    { key: "_division_name", label: "Division", sortable: true },
    { key: "style",          label: "Style",    sortable: true },
    { key: "_beds",          label: "Beds",     sortable: true },
    { key: "_baths",         label: "Baths",    sortable: true },
    { key: "_sqft",          label: "Sq Ft",    sortable: true },
    { key: "_community_count", label: "Communities", sortable: true },
    { key: "_price_range",   label: "Price Range" },
    {
      key: "page_url",
      label: "View",
      render: (_v, row) =>
        row.page_url ? (
          <a
            href={row.page_url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#818cf8", fontSize: 11, textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            ↗
          </a>
        ) : null,
    },
  ];

  const byPlanTableStats: DataTableStatItem[] = [
    { label: "Plans", value: filteredDivisionPlans.length, color: "#ededed" },
  ];

  // ── Card view — By Community ───────────────────────────────────────────────

  const byCommunityCardView = (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 32 }}>
      {groupedByCommunity.map(({ community, plans }) => (
        <div key={community.id}>
          {/* Community header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: "1px solid #1f1f1f",
            }}
          >
            {community.featured_image_url && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#1a1a1a",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={community.featured_image_url}
                  alt={community.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#ededed",
                }}
              >
                {community.name}
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>
                {[community.city, community.state].filter(Boolean).join(", ")} ·{" "}
                {plans.length} plan{plans.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Plan cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {plans.map((cp) => (
              <PlanCard
                key={cp.id}
                planName={cp.plan_name}
                communityName={community.name}
                city={community.city}
                state={community.state}
                beds={cp.beds}
                baths={cp.baths}
                sqft={cp.sqft_max ?? cp.sqft_min}
                basePrice={cp.base_price}
                netPrice={cp.net_price}
                incentiveAmount={cp.incentive_amount}
                imageUrl={cp.featured_image_url}
                pageUrl={cp.page_url ?? undefined}
                onClick={() => setSelectedCommunityPlan(cp)}
              />
            ))}
          </div>
        </div>
      ))}
      {groupedByCommunity.length === 0 && (
        <div style={{ padding: 48, textAlign: "center", color: "#555", fontSize: 13 }}>
          No plans match filters.
        </div>
      )}
    </div>
  );

  // ── Table view — By Community ──────────────────────────────────────────────

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
      _price_display: displayPrice(cp),
    };
  });

  const byCommunityColumns: Column<CommunityPlanTableRow>[] = [
    {
      key: "plan_name",
      label: "Plan Name",
      sortable: true,
      render: (_v, row) => (
        <span style={{ color: "#ededed", fontWeight: 500 }}>{row.plan_name}</span>
      ),
    },
    { key: "_community_name", label: "Community",  sortable: true },
    { key: "_division_name",  label: "Division",   sortable: true },
    { key: "_beds",           label: "Beds",       sortable: true },
    { key: "_baths",          label: "Baths",      sortable: true },
    { key: "_sqft",           label: "Sq Ft",      sortable: true },
    { key: "_price_display",  label: "Price",      sortable: true },
    {
      key: "page_url",
      label: "View",
      render: (_v, row) =>
        row.page_url ? (
          <a
            href={row.page_url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#818cf8", fontSize: 11, textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            ↗
          </a>
        ) : null,
    },
  ];

  const byCommunityTableStats: DataTableStatItem[] = [
    { label: "Plans", value: filteredCommunityPlans.length, color: "#ededed" },
    { label: "Communities", value: groupedByCommunity.length, color: "#818cf8" },
  ];

  // ── Slide-over: division plan detail ──────────────────────────────────────

  const planCommunities = selectedPlan
    ? communityPlansForDivPlan(selectedPlan).map((cp) => ({
        plan: cp,
        community: communityById.get(cp.community_id),
      }))
    : [];

  // ── Layout ─────────────────────────────────────────────────────────────────

  const activeFilters =
    mode === "by-plan"
      ? [
          ...(!filter.divisionId ? [{ value: divisionFilter, onChange: setDivisionFilter, options: divisionOptions, placeholder: "All Divisions" }] : []),
          { value: styleFilter,    onChange: setStyleFilter,    options: styleOptions,    placeholder: "All Styles" },
        ]
      : [
          ...(!filter.divisionId ? [{ value: divisionFilter,  onChange: setDivisionFilter,  options: divisionOptions,  placeholder: "All Divisions" }] : []),
          ...(!filter.communityId ? [{ value: communityFilter, onChange: setCommunityFilter, options: communityOptions, placeholder: "All Communities" }] : []),
          { value: styleFilter,     onChange: setStyleFilter,     options: styleOptions,     placeholder: "All Styles" },
        ];

  return (
    <PageShell
      topBar={
        <TopBar
          title="Plans"
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ModeToggle mode={mode} onChange={handleModeChange} />
              <ViewToggle view={view} onChange={handleViewChange} />
            </div>
          }
        />
      }
      filtersBar={
        <>
          {(filter.divisionId || filter.communityId) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px", background: "#0d0d0d", borderBottom: "1px solid #1f1f1f", fontSize: 11, color: "#555" }}>
              <span>Filtered:</span>
              {labels.division && <span style={{ color: "#a1a1a1" }}>{labels.division}</span>}
              {labels.community && <><span>›</span><span style={{ color: "#a1a1a1" }}>{labels.community}</span></>}
              {labels.plan && <><span>›</span><span style={{ color: "#a1a1a1" }}>{labels.plan}</span></>}
            </div>
          )}
          <FiltersBar
            filters={activeFilters}
          />
          <StatsBar stats={statsItems} />
        </>
      }
    >
      {mode === "by-plan" ? (
        view === "card" ? (
          byPlanCardView
        ) : (
          <DataTable<DivisionPlanTableRow>
            columns={byPlanColumns}
            rows={byPlanTableRows}
            stats={byPlanTableStats}
            defaultPageSize={100}
            onRowClick={(row) => setSelectedPlan(row)}
            emptyMessage="No plans"
            minWidth={1000}
          />
        )
      ) : view === "card" ? (
        byCommunityCardView
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

      {/* Slide-over: By Plan — shows which communities offer it */}
      <SlideOver
        open={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title={selectedPlan?.marketing_name ?? ""}
        subtitle={
          selectedPlan
            ? [
                selectedPlan.style,
                selectedPlan.beds != null ? `${selectedPlan.beds} bd` : null,
                selectedPlan.baths != null ? `${selectedPlan.baths} ba` : null,
                selectedPlan.sqft != null ? `${selectedPlan.sqft.toLocaleString()} sf` : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        width={500}
      >
        {selectedPlan && (
          <div style={{ padding: "20px 24px" }}>
            {selectedPlan.featured_image_url && (
              <div
                style={{
                  width: "100%",
                  height: 160,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 20,
                  background: "#1a1a1a",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPlan.featured_image_url}
                  alt={selectedPlan.marketing_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Plan Details
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedPlan.style && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666", fontSize: 12 }}>Style</span>
                    <span style={{ color: "#a1a1a1", fontSize: 12 }}>{selectedPlan.style}</span>
                  </div>
                )}
                {selectedPlan.beds != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666", fontSize: 12 }}>Bedrooms</span>
                    <span style={{ color: "#a1a1a1", fontSize: 12 }}>{selectedPlan.beds}</span>
                  </div>
                )}
                {selectedPlan.baths != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666", fontSize: 12 }}>Bathrooms</span>
                    <span style={{ color: "#a1a1a1", fontSize: 12 }}>{selectedPlan.baths}</span>
                  </div>
                )}
                {(selectedPlan.sqft ?? selectedPlan.sqft_min) != null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666", fontSize: 12 }}>Sq Ft</span>
                    <span style={{ color: "#a1a1a1", fontSize: 12 }}>
                      {formatSqft(selectedPlan.sqft_min, selectedPlan.sqft)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedPlan.page_url && (
              <a
                href={selectedPlan.page_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: "#1a1a2e",
                  border: "1px solid #2a2a4a",
                  color: "#818cf8",
                  textDecoration: "none",
                  fontWeight: 500,
                  marginBottom: 20,
                }}
              >
                ↗ View Plan
              </a>
            )}

            {/* Communities offering this plan */}
            <div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Available In ({planCommunities.length} {planCommunities.length === 1 ? "community" : "communities"})
              </div>
              {planCommunities.length === 0 ? (
                <div style={{ fontSize: 12, color: "#444" }}>No community pricing available.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {planCommunities.map(({ plan: cp, community }) => (
                    <div
                      key={cp.id}
                      style={{
                        background: "#161616",
                        border: "1px solid #1f1f1f",
                        borderRadius: 8,
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, color: "#ededed", fontWeight: 500 }}>
                          {community?.name ?? "Unknown"}
                        </div>
                        <div style={{ fontSize: 11, color: "#555" }}>
                          {[community?.city, community?.state].filter(Boolean).join(", ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#8a7a5a",
                            fontFamily: "var(--font-display, serif)",
                          }}
                        >
                          {displayPrice(cp)}
                        </div>
                        {cp.incentive_amount != null && cp.incentive_amount > 0 && (
                          <div style={{ fontSize: 10, color: "#4ade80" }}>
                            Save ${cp.incentive_amount.toLocaleString()}
                          </div>
                        )}
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
                return comm
                  ? `${comm.name} · ${[comm.city, comm.state].filter(Boolean).join(", ")}`
                  : undefined;
              })()
            : undefined
        }
        width={460}
      >
        {selectedCommunityPlan && (
          <div style={{ padding: "20px 24px" }}>
            {selectedCommunityPlan.featured_image_url && (
              <div
                style={{
                  width: "100%",
                  height: 160,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 20,
                  background: "#1a1a1a",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedCommunityPlan.featured_image_url}
                  alt={selectedCommunityPlan.plan_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {selectedCommunityPlan.beds != null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666", fontSize: 12 }}>Bedrooms</span>
                  <span style={{ color: "#a1a1a1", fontSize: 12 }}>{selectedCommunityPlan.beds}</span>
                </div>
              )}
              {selectedCommunityPlan.baths != null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666", fontSize: 12 }}>Bathrooms</span>
                  <span style={{ color: "#a1a1a1", fontSize: 12 }}>{selectedCommunityPlan.baths}</span>
                </div>
              )}
              {(selectedCommunityPlan.sqft_min != null || selectedCommunityPlan.sqft_max != null) && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666", fontSize: 12 }}>Sq Ft</span>
                  <span style={{ color: "#a1a1a1", fontSize: 12 }}>
                    {formatSqft(selectedCommunityPlan.sqft_min, selectedCommunityPlan.sqft_max)}
                  </span>
                </div>
              )}
              {selectedCommunityPlan.base_price != null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666", fontSize: 12 }}>Base Price</span>
                  <span style={{ color: "#a1a1a1", fontSize: 12 }}>{formatPrice(selectedCommunityPlan.base_price)}</span>
                </div>
              )}
              {selectedCommunityPlan.incentive_amount != null && selectedCommunityPlan.incentive_amount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666", fontSize: 12 }}>Incentive</span>
                  <span style={{ color: "#4ade80", fontSize: 12 }}>-{formatPrice(selectedCommunityPlan.incentive_amount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #1f1f1f", marginTop: 4 }}>
                <span style={{ color: "#ededed", fontSize: 13, fontWeight: 600 }}>Net Price</span>
                <span style={{ color: "#8a7a5a", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display, serif)" }}>
                  {displayPrice(selectedCommunityPlan)}
                </span>
              </div>
            </div>
            {selectedCommunityPlan.page_url && (
              <a
                href={selectedCommunityPlan.page_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 20,
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: "#1a1a2e",
                  border: "1px solid #2a2a4a",
                  color: "#818cf8",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                ↗ View Plan Details
              </a>
            )}
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

// ─── Export (wrapped in Suspense) ─────────────────────────────────────────────

export default function PlansClient(props: Props) {
  return (
    <Suspense>
      <PlansInner {...props} />
    </Suspense>
  );
}
