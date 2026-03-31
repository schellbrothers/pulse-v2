"use client";

import { useState, useEffect } from "react";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import FiltersBar from "@/components/FiltersBar";
import StatsBar from "@/components/StatsBar";
import ViewToggle from "@/components/ViewToggle";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import DataTable, { type Column, type StatConfigItem } from "@/components/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface SpecHome {
  id: string;
  home_id: number;
  name: string | null;
  transaction_type: string | null;
  division_id: number | null;
  division_name: string | null;
  division_parent_id: number | null;
  division_parent_name: string | null;
  community_id: string | null;
  community_name: string | null;
  community_slug: string | null;
  community_parent_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  lot_number: string | null;
  block_number: string | null;
  lot_block_number: string | null;
  model_id: number | null;
  model_name: string | null;
  model_marketing_name: string | null;
  is_market_home: boolean | null;
  is_market_home_sold: boolean | null;
  is_model: boolean | null;
  is_model_sold: boolean | null;
  is_leaseback: boolean | null;
  bedrooms: number | null;
  bathrooms: number | null;
  heated_sqft: number | null;
  total_sqft: number | null;
  base_price: number | null;
  incentive_price: number | null;
  net_price: number | null;
  base_price_formatted: string | null;
  incentive_price_formatted: string | null;
  price_formatted: string | null;
  listing_id: number | null;
  is_marketing_active: boolean | null;
  description: string | null;
  page_title: string | null;
  url: string | null;
  featured_image_url: string | null;
  featured_image_thumbnail_url: string | null;
  thumbnail_image_url: string | null;
  flickr_set: string | null;
  virtual_tour_url: string | null;
  filters: unknown[] | null;
  elevations: unknown[] | null;
  floor_plan_images: unknown[] | null;
  pdf_file_id: string | null;
  card_label: string | null;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type SpecHomeRow = SpecHome & Record<string, unknown>;

interface Props {
  specHomes: SpecHome[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function savingsLabel(incentive: number | null): string {
  if (!incentive || incentive <= 0) return "";
  return `Save $${incentive.toLocaleString()}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuickDeliveryClient({ specHomes, divisions }: Props) {
  const { filter: globalFilter, labels: globalLabels } = useGlobalFilter();

  // Map global filter division UUID → division name for matching division_parent_name
  const globalDivName = globalFilter.divisionId
    ? divisions.find(d => d.id === globalFilter.divisionId)?.name ?? null
    : null;

  const [view, setView] = useState<"card" | "table">("table");
  const [divFilter, setDivFilter] = useState<string>(() =>
    globalDivName
      ? (specHomes.find(r => r.division_parent_name === globalDivName)
          ? String(specHomes.find(r => r.division_parent_name === globalDivName)!.division_parent_id ?? "")
          : "")
      : ""
  );
  const [stateFilter, setStateFilter] = useState("");
  const [commFilter, setCommFilter] = useState<string>(() =>
    globalFilter.communityId ? globalFilter.communityId : ""
  );
  const [search, setSearch] = useState("");
  const [selectedHome, setSelectedHome] = useState<SpecHomeRow | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("quick-delivery-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  // Sync when global filter changes
  useEffect(() => {
    const divName = globalFilter.divisionId
      ? divisions.find(d => d.id === globalFilter.divisionId)?.name ?? null
      : null;
    if (divName) {
      const match = specHomes.find(r => r.division_parent_name === divName);
      setDivFilter(match ? String(match.division_parent_id ?? "") : "");
    } else {
      setDivFilter("");
    }
    if (globalFilter.communityId) {
      setCommFilter(globalFilter.communityId);
    } else {
      setCommFilter("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter.divisionId, globalFilter.communityId]);

  function handleViewChange(v: "card" | "table") {
    setView(v);
    localStorage.setItem("quick-delivery-view", v);
  }

  const allRows: SpecHomeRow[] = specHomes as SpecHomeRow[];

  // Filter options
  const divisionOptions = Array.from(
    new Map(
      allRows
        .filter((r) => r.division_parent_id && r.division_parent_name)
        .map((r) => [String(r.division_parent_id), r.division_parent_name!])
    ).entries()
  )
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));

  const stateOptions = Array.from(new Set(allRows.map((r) => r.state).filter(Boolean)))
    .sort()
    .map((s) => ({ value: s as string, label: s as string }));

  const filteredForComm = allRows
    .filter((r) => !divFilter || String(r.division_parent_id) === divFilter)
    .filter((r) => !stateFilter || r.state === stateFilter);

  const commOptions = Array.from(
    new Set(filteredForComm.map((r) => r.community_name).filter(Boolean))
  )
    .sort()
    .map((n) => ({ value: n as string, label: n as string }));

  // When global filter is set, use division name match; otherwise use local divFilter
  const globalCommName = globalFilter.communityId ? globalLabels.community : null;

  const rows = allRows
    .filter((r) => !globalDivName ? (!divFilter || String(r.division_parent_id) === divFilter) : r.division_parent_name === globalDivName)
    .filter((r) => !stateFilter || r.state === stateFilter)
    .filter((r) => {
      if (!globalFilter.communityId && !commFilter) return true;
      if (globalFilter.communityId) {
        return globalCommName ? r.community_name === globalCommName : true;
      }
      return r.community_name === commFilter;
    })
    .filter(
      (r) =>
        !search ||
        (r.community_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.model_marketing_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.address ?? "").toLowerCase().includes(search.toLowerCase())
    );

  // Stats
  const withPrice = rows.filter((r) => r.net_price && r.net_price > 0);
  const avgPrice = withPrice.length
    ? Math.round(
        withPrice.reduce((s, r) => s + (r.net_price ?? 0), 0) / withPrice.length
      )
    : null;

  const statsBarItems = [
    { label: "Total", value: rows.length, color: "var(--text-3)" },
    {
      label: "Communities",
      value: new Set(rows.map((r) => r.community_name)).size,
      color: "var(--text-2)",
    },
    {
      label: "States",
      value: new Set(rows.map((r) => r.state)).size,
      color: "var(--text-2)",
    },
    {
      label: "Avg Price",
      value: avgPrice != null ? `$${Math.round(avgPrice / 1000)}k` : "—",
      color: "var(--blue)",
    },
  ];

  const statConfig: StatConfigItem<SpecHomeRow>[] = [
    { label: "Total", color: "var(--text-3)", getValue: (r) => r.length },
    {
      label: "Communities",
      color: "var(--text-2)",
      getValue: (r) => new Set(r.map((x) => x.community_name)).size,
    },
    {
      label: "States",
      color: "var(--text-2)",
      getValue: (r) => new Set(r.map((x) => x.state)).size,
    },
    {
      label: "Avg Price",
      color: "var(--blue)",
      isString: true,
      getValue: (r) => {
        const wp = r.filter((x) => x.net_price && x.net_price > 0);
        if (!wp.length) return "—";
        const avg = wp.reduce((s, x) => s + (x.net_price ?? 0), 0) / wp.length;
        return `$${Math.round(avg / 1000)}k`;
      },
    },
  ];

  // Table columns
  const columns: Column<SpecHomeRow>[] = [
    {
      key: "community_name",
      label: "Community",
      sticky: true,
      render: (_v, row) => (
        <span style={{ color: "var(--text)", fontWeight: 500, fontSize: 13 }}>
          {row.community_name ?? "—"}
        </span>
      ),
    },
    {
      key: "model_marketing_name",
      label: "Plan Name",
      render: (_v, row) => (
        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "#c0c0c0",
            fontSize: 13,
          }}
        >
          {row.model_marketing_name ?? row.model_name ?? "—"}
        </span>
      ),
    },
    { key: "city", label: "City", filterable: true },
    { key: "state", label: "State", filterable: true },
    { key: "division_parent_name", label: "Division", filterable: true },
    {
      key: "bedrooms",
      label: "Beds/Baths",
      render: (_v, row) => (
        <span style={{ color: "var(--text-2)", fontSize: 12 }}>
          {row.bedrooms ?? "—"} / {row.bathrooms ?? "—"}
        </span>
      ),
    },
    {
      key: "heated_sqft",
      label: "Sqft",
      render: (_v, row) => (
        <span style={{ color: "var(--text-2)", fontSize: 12 }}>
          {row.heated_sqft ? row.heated_sqft.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "net_price",
      label: "Net Price",
      render: (_v, row) =>
        row.net_price ? (
          <span style={{ color: "var(--blue)", fontWeight: 700, fontSize: 14 }}>
            {row.price_formatted ?? formatCurrency(row.net_price)}
          </span>
        ) : (
          <span style={{ color: "#444" }}>—</span>
        ),
    },
    {
      key: "incentive_price",
      label: "Incentive",
      render: (_v, row) =>
        row.incentive_price && row.incentive_price > 0 ? (
          <Badge
            variant="active"
            label={savingsLabel(row.incentive_price)}
            customColor="#80B602"
            customBg="#162800"
            customBorder="#2a4a00"
          />
        ) : (
          <span style={{ color: "#333" }}>—</span>
        ),
    },
    {
      key: "address",
      label: "Address",
      render: (_v, row) => (
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>{row.address ?? "—"}</span>
      ),
    },
    {
      key: "url",
      label: "View",
      sortable: false,
      render: (_v, row) =>
        row.url ? (
          <a
            href={`https://www.schellbrothers.com${row.url}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "var(--blue)", fontSize: 13, textDecoration: "none" }}
          >
            ↗
          </a>
        ) : (
          <span style={{ color: "#444" }}>—</span>
        ),
    },
  ];

  // ── Card view ───────────────────────────────────────────────────────────────
  const cardView = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
        padding: 16,
      }}
    >
      {rows.map((home) => (
        <div
          key={home.id}
          onClick={() => setSelectedHome(home)}
          style={{
            borderRadius: 10,
            border: "1px solid #555",
            backgroundColor: "#3E3F44",
            overflow: "hidden",
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#59a6bd")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#555")}
        >
          {home.featured_image_url ? (
            <img
              src={home.featured_image_url}
              alt={home.community_name ?? ""}
              style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 160,
                backgroundColor: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 32, opacity: 0.2 }}>⌂</span>
            </div>
          )}
          <div style={{ padding: 12 }}>
            {/* Plan name */}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: 2,
              }}
            >
              {home.model_marketing_name ?? home.model_name ?? home.name ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
              {home.community_name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>
              {home.city}, {home.state}
            </div>

            {/* Net price — HBv1 blue (#59a6bd) */}
            {home.net_price && (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--blue)",
                  marginBottom: 4,
                  fontFamily: "var(--font-display)",
                }}
              >
                {home.price_formatted ?? formatCurrency(home.net_price)}
              </div>
            )}

            {/* Specs */}
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>
              {home.bedrooms ?? "—"} bd · {home.bathrooms ?? "—"} ba ·{" "}
              {home.heated_sqft ? home.heated_sqft.toLocaleString() : "—"} sqft
            </div>

            {/* Incentive badge (green) */}
            {home.incentive_price && home.incentive_price > 0 && (
              <div style={{ marginTop: 2 }}>
                <Badge
                  variant="active"
                  label={savingsLabel(home.incentive_price)}
                  customColor="#80B602"
                  customBg="#162800"
                  customBorder="#2a4a00"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Slide-over ──────────────────────────────────────────────────────────────
  const planName =
    selectedHome?.model_marketing_name ??
    selectedHome?.model_name ??
    selectedHome?.name ??
    "—";

  const hasIncentive =
    selectedHome?.incentive_price != null && selectedHome.incentive_price > 0;

  return (
    <PageShell
      topBar={
        <TopBar
          title="Quick Delivery"
          right={<ViewToggle view={view} onChange={handleViewChange} />}
        />
      }
      filtersBar={
        <>
          {(globalFilter.divisionId || globalFilter.communityId) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-3)" }}>
              <span>Filtered:</span>
              {globalLabels.division && <span style={{ color: "var(--text-2)" }}>{globalLabels.division}</span>}
              {globalLabels.community && <><span>›</span><span style={{ color: "var(--text-2)" }}>{globalLabels.community}</span></>}
              {globalLabels.plan && <><span>›</span><span style={{ color: "var(--text-2)" }}>{globalLabels.plan}</span></>}
            </div>
          )}
          <FiltersBar
            filters={[
              ...(!globalFilter.divisionId ? [{
                value: divFilter,
                onChange: (v: string) => {
                  setDivFilter(v);
                  setCommFilter("");
                },
                options: divisionOptions,
                placeholder: "All Divisions",
              }] : []),
              ...(!globalFilter.communityId ? [{
                value: stateFilter,
                onChange: (v: string) => {
                  setStateFilter(v);
                  setCommFilter("");
                },
                options: stateOptions,
                placeholder: "All States",
              }] : []),
              ...(!globalFilter.communityId ? [{
                value: commFilter,
                onChange: setCommFilter,
                options: commOptions,
                placeholder: "All Communities",
              }] : []),
            ]}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search quick delivery homes…"
          />
          {view === "card" && <StatsBar stats={statsBarItems} />}
        </>
      }
    >
      {view === "table" ? (
        <DataTable<SpecHomeRow>
          columns={columns}
          rows={rows}
          statConfig={statConfig}
          defaultPageSize={100}
          onRowClick={setSelectedHome}
          emptyMessage="No quick delivery homes"
          minWidth={1100}
        />
      ) : (
        cardView
      )}

      {/* Slide-over */}
      <SlideOver
        open={!!selectedHome}
        onClose={() => setSelectedHome(null)}
        title={planName}
        subtitle={selectedHome?.community_name ?? undefined}
        badge={
          hasIncentive ? (
            <Badge
              variant="active"
              label={savingsLabel(selectedHome?.incentive_price ?? null)}
              customColor="#80B602"
              customBg="#162800"
              customBorder="#2a4a00"
            />
          ) : undefined
        }
        width={520}
      >
        {selectedHome && (
          <>
            {/* Hero image */}
            {selectedHome.featured_image_url ? (
              <img
                src={selectedHome.featured_image_url}
                alt={planName}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  marginBottom: 20,
                  objectFit: "cover",
                  maxHeight: 220,
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 160,
                  backgroundColor: "var(--surface-2)",
                  borderRadius: 8,
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 32, opacity: 0.2 }}>⌂</span>
              </div>
            )}

            <Section title="Pricing">
              {/* Net price — prominent HBv1 blue */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--blue)",
                  fontFamily: "var(--font-display)",
                  marginBottom: 8,
                }}
              >
                {selectedHome.price_formatted ?? formatCurrency(selectedHome.net_price)}
              </div>
              <Row
                label="Base Price"
                value={
                  selectedHome.base_price_formatted ?? formatCurrency(selectedHome.base_price)
                }
              />
              {hasIncentive && (
                <Row
                  label="Incentive"
                  value={
                    <span style={{ color: "#80B602" }}>
                      −{" "}
                      {selectedHome.incentive_price_formatted ??
                        formatCurrency(selectedHome.incentive_price)}
                    </span>
                  }
                />
              )}
            </Section>

            <Section title="Home Specs">
              <Row
                label="Plan"
                value={selectedHome.model_marketing_name ?? selectedHome.model_name}
              />
              <Row label="Bedrooms" value={selectedHome.bedrooms} />
              <Row label="Bathrooms" value={selectedHome.bathrooms} />
              <Row
                label="Heated Sqft"
                value={
                  selectedHome.heated_sqft
                    ? selectedHome.heated_sqft.toLocaleString()
                    : null
                }
              />
              <Row
                label="Total Sqft"
                value={
                  selectedHome.total_sqft
                    ? selectedHome.total_sqft.toLocaleString()
                    : null
                }
              />
              <Row
                label="Lot"
                value={selectedHome.lot_block_number ?? selectedHome.lot_number}
              />
            </Section>

            <Section title="Address">
              <Row label="Address" value={selectedHome.address} />
              <Row label="City" value={selectedHome.city} />
              <Row label="State" value={selectedHome.state} />
              <Row label="Zip" value={selectedHome.zip} />
              <Row label="Community" value={selectedHome.community_name} />
              <Row label="Division" value={selectedHome.division_parent_name} />
            </Section>

            {selectedHome.description && (
              <Section title="Description">
                <p
                  style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}
                >
                  {selectedHome.description}
                </p>
              </Section>
            )}

            <Section title="Actions">
              {selectedHome.virtual_tour_url && (
                <a
                  href={selectedHome.virtual_tour_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #1a3f1a",
                    backgroundColor: "#1a2e1a",
                    color: "#80B602",
                    fontSize: 13,
                    textDecoration: "none",
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  ▶ Virtual Tour
                </a>
              )}
              {selectedHome.url && (
                <a
                  href={`https://www.schellbrothers.com${selectedHome.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #1a3f50",
                    backgroundColor: "#0d2229",
                    color: "var(--blue)",
                    fontSize: 13,
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  ↗ View on schellbrothers.com
                </a>
              )}
            </Section>
          </>
        )}
      </SlideOver>
    </PageShell>
  );
}
