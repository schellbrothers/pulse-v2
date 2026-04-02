"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import DataTable, { type Column } from "@/components/DataTable";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

// ─── Types ────────────────────────────────────────────────────────────────────


interface Division {
  id: string;
  slug: string;
  name: string;
  heartbeat_division_id?: number | null;
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
  communities: { id: string; name: string }[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<ModelHomeRow>[] = [
  { label: "Homes",     getValue: (r) => r.length },
  { label: "Leaseback", getValue: (r) => r.filter((x) => x.is_leaseback).length },
  { label: "Divisions", getValue: (r) => new Set(r.map((x) => x.division_parent_name)).size },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function filterSelectStyle(active: boolean): React.CSSProperties {
  return {
    background: "#161718",
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

// ─── Main ─────────────────────────────────────────────────────────────────────


function s3ToHttps(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path.replace("s3://heartbeat-page-designer-production/",
    "https://heartbeat-page-designer-production.s3.amazonaws.com/");
}

export default function ModelHomesClient({ modelHomes, divisions, communities }: Props) {
  const { filter, labels } = useGlobalFilter();

  const globalHBDivId = filter.divisionId
    ? (divisions.find((d) => d.id === filter.divisionId)?.heartbeat_division_id ?? null)
    : null;
  const globalCommName = filter.communityId
    ? communities.find((c) => c.id === filter.communityId)?.name ?? null
    : null;

  const [divFilter, setDivFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState("");
  const [commFilter, setCommFilter] = useState<string>(() => filter.communityId ? filter.communityId : "");
  const [search, setSearch] = useState("");
  const [selectedHome, setSelectedHome] = useState<ModelHomeRow | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [filteredRows, setFilteredRows] = useState<typeof rows>([]);



  // Reset page on filter/search change
  useEffect(() => { setPage(0); }, [search, divFilter, stateFilter, commFilter]);

  const allRows: ModelHomeRow[] = modelHomes as ModelHomeRow[];

  const divisionOptions = Array.from(
    new Map(allRows.filter((r) => r.division_parent_id && r.division_parent_name).map((r) => [String(r.division_parent_id), r.division_parent_name!])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));

  const stateOptions = Array.from(new Set(allRows.map((r) => r.state).filter(Boolean))).sort().map((s) => ({ value: s as string, label: s as string }));

  const filteredForComm = allRows
        .filter((r) => !stateFilter || r.state === stateFilter);

  const commOptions = Array.from(new Set(filteredForComm.map((r) => r.community_name).filter(Boolean))).sort().map((n) => ({ value: n as string, label: n as string }));

  const rows = allRows
    .filter((r) => !globalHBDivId || r.division_parent_id === globalHBDivId)
    .filter((r) => !stateFilter || r.state === stateFilter)
    .filter((r) => {
      if (!globalCommName && !commFilter) return true;
      if (globalCommName) return r.community_name === globalCommName;
      return r.community_name === commFilter;
    })
    .filter((r) =>
      !search ||
      (r.community_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.model_marketing_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.address ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const columns: Column<ModelHomeRow>[] = [
    {
      key: "model_marketing_name",
      label: "Plan Name",
      sticky: true,
      sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{row.model_marketing_name ?? row.model_name ?? "—"}</span>,
    },
    {
      key: "community_name",
      label: "Community",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.community_name ?? "—"}</span>,
    },
    { key: "city",  label: "City",  sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{(row.city as string) ?? "—"}</span> },
    { key: "state", label: "State", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{(row.state as string) ?? "—"}</span> },
    { key: "division_parent_name", label: "Division", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{(row.division_parent_name as string) ?? "—"}</span> },
    {
      key: "lot_block_number",
      label: "Lot",
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row.lot_block_number ?? row.lot_number ?? "—"}</span>,
    },
    {
      key: "bedrooms",
      label: "Beds",
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row.bedrooms ?? "—"}</span>,
    },
    {
      key: "bathrooms",
      label: "Baths",
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row.bathrooms ?? "—"}</span>,
    },
    {
      key: "heated_sqft",
      label: "Sqft",
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row.heated_sqft ? (row.heated_sqft as number).toLocaleString() : "—"}</span>,
    },
    {
      key: "base_price",
      label: "Base Price",
      sortable: true,
      render: (_v, row) =>
        row.base_price ? (
          <span style={{ color: "#aaa", fontWeight: 600, fontSize: 13 }}>
            {row.base_price_formatted ?? formatCurrency(row.base_price as number | null)}
          </span>
        ) : <span style={{ color: "#444" }}>—</span>,
    },
    {
      key: "transaction_type",
      label: "Status",
      filterable: true,
      render: (_v, row) =>
        <span style={{ color: "#888", fontSize: 12 }}>{row.transaction_type ?? "—"}</span>,
    },
  ];

  // Local filter dropdowns
  const localFilters = (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {!filter.divisionId && (
        <select value={divFilter} onChange={(e) => { setDivFilter(e.target.value); setCommFilter(""); }} style={filterSelectStyle(!!divFilter)}>
          <option value="">All Divisions</option>
          {divisionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {!filter.communityId && (
        <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setCommFilter(""); }} style={filterSelectStyle(!!stateFilter)}>
          <option value="">All States</option>
          {stateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {!filter.communityId && (
        <select value={commFilter} onChange={(e) => setCommFilter(e.target.value)} style={filterSelectStyle(!!commFilter)}>
          <option value="">All Communities</option>
          {commOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  );

  const planName = selectedHome?.model_marketing_name ?? selectedHome?.model_name ?? selectedHome?.name ?? "—";

  return (
    <PageShell
      topBar={
        <TableSubHeader<ModelHomeRow>
          title="Model Homes"
          rows={rows}
          totalRows={rows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={(q) => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search model homes…"
          onExport={() => exportToCSV(rows as unknown as Record<string, unknown>[], "model-homes")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "model-homes-all")}
        />
      }
    >
      <DataTable<ModelHomeRow>
        columns={columns}
        rows={rows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={setSelectedHome}
        onFilteredRowsChange={(r) => setFilteredRows(r as typeof rows)}
        emptyMessage="No model homes"
        minWidth={1100}
      />

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
            {/* Images: exterior elevation first, then interior featured image — both full width */}
            {(() => {
              const elevations = (selectedHome?.elevations) as {kova_name?: string; image_path?: string; [key: string]: unknown}[] | null;
              const featuredUrl = selectedHome?.featured_image_url;
              const firstElev = elevations?.find(e => e.image_path);
              const elevUrl = firstElev ? s3ToHttps(firstElev.image_path as string) : null;
              return (
                <>
                  {elevUrl && (
                    <div style={{ marginBottom: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={elevUrl} alt="Exterior Elevation"
                        style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 4, display: "block", background: "#1a1a1e" }}
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                      <div style={{ fontSize: 10, color: "#555", marginTop: 3, textAlign: "center" }}>{firstElev?.kova_name as string ?? "Exterior"}</div>
                    </div>
                  )}
                  {featuredUrl && (
                    <div style={{ marginBottom: 16 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={featuredUrl} alt="Interior"
                        style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 4, display: "block", background: "#1a1a1e" }}
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                      <div style={{ fontSize: 10, color: "#555", marginTop: 3, textAlign: "center" }}>Interior</div>
                    </div>
                  )}
                </>
              );
            })()}

                        <Section title="Pricing">
              <Row label="Base Price" value={<span style={{ color: "var(--blue)", fontWeight: 600 }}>{selectedHome.base_price_formatted ?? formatCurrency(selectedHome.base_price)}</span>} />
            </Section>

            <Section title="Home Specs">
              <Row label="Plan"        value={selectedHome.model_marketing_name ?? selectedHome.model_name} />
              <Row label="Bedrooms"    value={selectedHome.bedrooms} />
              <Row label="Bathrooms"   value={selectedHome.bathrooms} />
              <Row label="Heated Sqft" value={selectedHome.heated_sqft ? (selectedHome.heated_sqft as number).toLocaleString() : null} />
              <Row label="Total Sqft"  value={selectedHome.total_sqft ? (selectedHome.total_sqft as number).toLocaleString() : null} />
              <Row label="Lot"         value={selectedHome.lot_block_number ?? selectedHome.lot_number} />
            </Section>

            <Section title="Location">
              <Row label="Address"   value={selectedHome.address} />
              <Row label="City"      value={selectedHome.city} />
              <Row label="State"     value={selectedHome.state} />
              <Row label="Zip"       value={selectedHome.zip} />
              <Row label="Community" value={selectedHome.community_name} />
              <Row label="Division"  value={selectedHome.division_parent_name} />
            </Section>

            {selectedHome.hours_string && (
              <Section title="Hours">
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}
                  dangerouslySetInnerHTML={{ __html: (selectedHome.hours_string as string).replace(/<br[^>]*>/g, "\n") }}
                />
              </Section>
            )}

            {selectedHome.is_leaseback && (
              <Section title="Leaseback">
                <Row label="Start Date"     value={selectedHome.leaseback_start_date} />
                <Row label="End Date"       value={selectedHome.leaseback_end_date} />
                <Row label="Days Remaining" value={selectedHome.days_till_lease_end != null ? `${selectedHome.days_till_lease_end} days` : null} />
              </Section>
            )}

            {selectedHome.description && (
              <Section title="Description">
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selectedHome.description as string}</p>
              </Section>
            )}

            <Section title="Actions">
              {selectedHome.virtual_tour_url && (
                <a href={selectedHome.virtual_tour_url as string} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a3f1a", backgroundColor: "#1a2e1a", color: "#5a8a5a", fontSize: 13, textDecoration: "none", fontWeight: 500, marginBottom: 8 }}>
                  ▶ Virtual Tour
                </a>
              )}
              {selectedHome.url && (
                <a href={`https://www.schellbrothers.com${selectedHome.url}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a3f50", backgroundColor: "#0d2229", color: "var(--blue)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
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
