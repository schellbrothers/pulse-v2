"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import FiltersBar from "@/components/FiltersBar";
import StatsBar from "@/components/StatsBar";
import ViewToggle from "@/components/ViewToggle";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import DataTable, { type Column, type StatConfigItem } from "@/components/DataTable";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface ModelHome {
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
  is_ended_leaseback: boolean | null;
  leaseback_start_date: string | null;
  leaseback_end_date: string | null;
  days_till_lease_end: number | null;
  hours: unknown | null;
  hours_string: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  heated_sqft: number | null;
  total_sqft: number | null;
  base_price: number | null;
  incentive_price: number | null;
  net_price: number | null;
  base_price_formatted: string | null;
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
  sales_center_address: string | null;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type ModelHomeRow = ModelHome & Record<string, unknown>;

interface Props {
  modelHomes: ModelHome[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ModelHomesClient({ modelHomes, divisions }: Props) {
  const { filter, labels } = useGlobalFilter();

  // Map global filter division UUID → division name for matching division_parent_name
  const globalDivName = filter.divisionId
    ? divisions.find(d => d.id === filter.divisionId)?.name ?? null
    : null;

  const [view, setView] = useState<"card" | "table">("table");
  const [divFilter, setDivFilter] = useState<string>(() =>
    globalDivName
      ? (modelHomes.find(r => r.division_parent_name === globalDivName)
          ? String(modelHomes.find(r => r.division_parent_name === globalDivName)!.division_parent_id ?? "")
          : "")
      : ""
  );
  const [stateFilter, setStateFilter] = useState("");
  const [commFilter, setCommFilter] = useState<string>(() =>
    filter.communityId ? filter.communityId : ""
  );
  const [search, setSearch] = useState("");
  const [selectedHome, setSelectedHome] = useState<ModelHomeRow | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("model-homes-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  // Sync when global filter changes
  useEffect(() => {
    const divName = filter.divisionId
      ? divisions.find(d => d.id === filter.divisionId)?.name ?? null
      : null;
    if (divName) {
      const match = modelHomes.find(r => r.division_parent_name === divName);
      setDivFilter(match ? String(match.division_parent_id ?? "") : "");
    } else {
      setDivFilter("");
    }
    if (filter.communityId) {
      // For model_homes community matching: try by community_id field (HB string)
      // community_id in model_homes is a string like "123" not our UUID
      // Fall back to communityId param as the community_name lookup if no match
      setCommFilter(filter.communityId);
    } else {
      setCommFilter("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.divisionId, filter.communityId]);

  function handleViewChange(v: "card" | "table") {
    setView(v);
    localStorage.setItem("model-homes-view", v);
  }

  const allRows: ModelHomeRow[] = modelHomes as ModelHomeRow[];

  // Build filter options
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

  // When global filter community is set, match by name label (communityId is UUID, model_homes has HB string id)
  const globalCommName = filter.communityId ? labels.community : null;

  const rows = allRows
    .filter((r) => !globalDivName ? (!divFilter || String(r.division_parent_id) === divFilter) : r.division_parent_name === globalDivName)
    .filter((r) => !stateFilter || r.state === stateFilter)
    .filter((r) => {
      if (!filter.communityId && !commFilter) return true;
      if (filter.communityId) {
        // Match by community_name label if available, otherwise pass through
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
  const statsBarItems = [
    { label: "Total", value: rows.length, color: "#666" },
    {
      label: "Communities",
      value: new Set(rows.map((r) => r.community_name)).size,
      color: "#a1a1a1",
    },
    {
      label: "States",
      value: new Set(rows.map((r) => r.state)).size,
      color: "#0070f3",
    },
    {
      label: "Leaseback",
      value: rows.filter((r) => r.is_leaseback).length,
      color: "#7a5a8a",
    },
  ];

  // Table stat config (filter-reactive via DataTable)
  const statConfig: StatConfigItem<ModelHomeRow>[] = [
    { label: "Total", color: "#666", getValue: (r) => r.length },
    {
      label: "Communities",
      color: "#a1a1a1",
      getValue: (r) => new Set(r.map((x) => x.community_name)).size,
    },
    {
      label: "States",
      color: "#0070f3",
      getValue: (r) => new Set(r.map((x) => x.state)).size,
    },
    {
      label: "Leaseback",
      color: "#7a5a8a",
      getValue: (r) => r.filter((x) => x.is_leaseback).length,
    },
  ];

  // Table columns
  const columns: Column<ModelHomeRow>[] = [
    {
      key: "model_marketing_name",
      label: "Plan Name",
      sticky: true,
      render: (_v, row) => (
        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "#ededed",
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          {row.model_marketing_name ?? row.model_name ?? "—"}
        </span>
      ),
    },
    {
      key: "community_name",
      label: "Community",
      render: (_v, row) => (
        <span style={{ color: "#c0c0c0", fontSize: 13 }}>
          {row.community_name ?? "—"}
        </span>
      ),
    },
    { key: "city", label: "City", filterable: true },
    { key: "state", label: "State", filterable: true },
    { key: "division_parent_name", label: "Division", filterable: true },
    {
      key: "lot_block_number",
      label: "Lot",
      render: (_v, row) => (
        <span style={{ color: "#a1a1a1", fontSize: 12 }}>
          {row.lot_block_number ?? row.lot_number ?? "—"}
        </span>
      ),
    },
    {
      key: "bedrooms",
      label: "Beds",
      render: (_v, row) => (
        <span style={{ color: "#a1a1a1", fontSize: 12 }}>
          {row.bedrooms ?? "—"}
        </span>
      ),
    },
    {
      key: "bathrooms",
      label: "Baths",
      render: (_v, row) => (
        <span style={{ color: "#a1a1a1", fontSize: 12 }}>
          {row.bathrooms ?? "—"}
        </span>
      ),
    },
    {
      key: "heated_sqft",
      label: "Sqft",
      render: (_v, row) => (
        <span style={{ color: "#a1a1a1", fontSize: 12 }}>
          {row.heated_sqft ? row.heated_sqft.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "base_price",
      label: "Base Price",
      render: (_v, row) =>
        row.base_price ? (
          <span style={{ color: "#8a7a5a", fontWeight: 600, fontSize: 13 }}>
            {row.base_price_formatted ?? formatCurrency(row.base_price)}
          </span>
        ) : (
          <span style={{ color: "#444" }}>—</span>
        ),
    },
    {
      key: "is_leaseback",
      label: "Leaseback",
      render: (_v, row) =>
        row.is_leaseback ? (
          <Badge variant="leaseback" />
        ) : (
          <span style={{ color: "#333" }}>—</span>
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
            style={{ color: "#0070f3", fontSize: 13, textDecoration: "none" }}
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
            borderRadius: 8,
            border: "1px solid #1f1f1f",
            backgroundColor: "#111",
            overflow: "hidden",
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
        >
          {home.featured_image_url ? (
            <img
              src={home.featured_image_url}
              alt={home.model_marketing_name ?? ""}
              style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 160,
                backgroundColor: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 32, opacity: 0.2 }}>⌂</span>
            </div>
          )}
          <div style={{ padding: 12 }}>
            {/* Plan name — Playfair Display */}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 600,
                color: "#ededed",
                marginBottom: 2,
              }}
            >
              {home.model_marketing_name ?? home.model_name ?? home.name ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
              {home.community_name}
            </div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
              {home.city}, {home.state}
            </div>

            {/* Price */}
            {home.base_price && (
              <div
                style={{ fontSize: 14, fontWeight: 600, color: "#8a7a5a", marginBottom: 6 }}
              >
                {home.base_price_formatted ?? formatCurrency(home.base_price)}
              </div>
            )}

            {/* Specs */}
            <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
              {home.bedrooms ?? "—"} bd · {home.bathrooms ?? "—"} ba ·{" "}
              {home.heated_sqft ? home.heated_sqft.toLocaleString() : "—"} sqft
            </div>

            {/* Leaseback badge */}
            {home.is_leaseback && (
              <div style={{ marginTop: 2 }}>
                <Badge variant="leaseback" />
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

  return (
    <PageShell
      topBar={
        <TopBar
          title="Model Homes"
          right={<ViewToggle view={view} onChange={handleViewChange} />}
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
            filters={[
              ...(!filter.divisionId ? [{
                value: divFilter,
                onChange: (v: string) => { setDivFilter(v); setCommFilter(""); },
                options: divisionOptions,
                placeholder: "All Divisions",
              }] : []),
              {
                value: stateFilter,
                onChange: (v: string) => { setStateFilter(v); setCommFilter(""); },
                options: stateOptions,
                placeholder: "All States",
              },
              ...(!filter.communityId ? [{
                value: commFilter,
                onChange: setCommFilter,
                options: commOptions,
                placeholder: "All Communities",
              }] : []),
            ]}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search model homes…"
          />
          {view === "card" && <StatsBar stats={statsBarItems} />}
        </>
      }
    >
      {view === "table" ? (
        <DataTable<ModelHomeRow>
          columns={columns}
          rows={rows}
          statConfig={statConfig}
          defaultPageSize={100}
          onRowClick={setSelectedHome}
          emptyMessage="No model homes"
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
        badge={selectedHome?.is_leaseback ? <Badge variant="leaseback" /> : undefined}
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
                  backgroundColor: "#1a1a1a",
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
              <Row
                label="Base Price"
                value={
                  <span style={{ color: "#8a7a5a", fontWeight: 600 }}>
                    {selectedHome.base_price_formatted ?? formatCurrency(selectedHome.base_price)}
                  </span>
                }
              />
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

            <Section title="Location">
              <Row label="Address" value={selectedHome.address} />
              <Row label="City" value={selectedHome.city} />
              <Row label="State" value={selectedHome.state} />
              <Row label="Zip" value={selectedHome.zip} />
              <Row label="Community" value={selectedHome.community_name} />
              <Row label="Division" value={selectedHome.division_parent_name} />
            </Section>

            {selectedHome.hours_string && (
              <Section title="Hours">
                <p
                  style={{
                    color: "#888",
                    fontSize: 13,
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: "pre-line",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: selectedHome.hours_string.replace(/<br[^>]*>/g, "\n"),
                  }}
                />
              </Section>
            )}

            {selectedHome.is_leaseback && (
              <Section title="Leaseback">
                <Row label="Start Date" value={selectedHome.leaseback_start_date} />
                <Row label="End Date" value={selectedHome.leaseback_end_date} />
                <Row
                  label="Days Remaining"
                  value={
                    selectedHome.days_till_lease_end != null
                      ? `${selectedHome.days_till_lease_end} days`
                      : null
                  }
                />
              </Section>
            )}

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
                    color: "#5a8a5a",
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
                    border: "1px solid #1a2a3f",
                    backgroundColor: "#1a1f2e",
                    color: "#0070f3",
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
