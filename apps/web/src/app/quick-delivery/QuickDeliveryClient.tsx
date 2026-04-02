"use client";

import { useState, useEffect } from "react";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import DataTable, { type Column } from "@/components/DataTable";

interface Division { id: string; slug: string; name: string; heartbeat_division_id?: number | null; }

interface SpecHome {
  id: string; home_id: number; name: string | null; transaction_type: string | null;
  division_id: number | null; division_name: string | null;
  division_parent_id: number | null; division_parent_name: string | null;
  community_id: string | null; community_name: string | null; community_slug: string | null;
  address: string | null; city: string | null; state: string | null; zip: string | null;
  lot_number: string | null; block_number: string | null; lot_block_number: string | null;
  model_id: number | null; model_name: string | null; model_marketing_name: string | null;
  bedrooms: number | null; bathrooms: number | null;
  heated_sqft: number | null; total_sqft: number | null;
  base_price: number | null; incentive_price: number | null; net_price: number | null;
  base_price_formatted: string | null; incentive_price_formatted: string | null; price_formatted: string | null;
  is_marketing_active: boolean | null; description: string | null;
  url: string | null; featured_image_url: string | null; virtual_tour_url: string | null;
  [key: string]: unknown;
}

interface Props { specHomes: SpecHome[]; divisions: Division[]; }

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<SpecHome>[] = [
  { label: "Communities", getValue: (r) => new Set(r.map((x) => x.community_name)).size },
  { label: "States",      getValue: (r) => new Set(r.map((x) => x.state)).size },
  {
    label: "Avg Price",
    getValue: (r) => {
      const wp = r.filter((x) => x.net_price && (x.net_price as number) > 0);
      if (!wp.length) return "—";
      const avg = wp.reduce((s, x) => s + (x.net_price as number ?? 0), 0) / wp.length;
      return "$" + Math.round(avg / 1000) + "k";
    },
  },
];

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}


function s3ToHttps(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path.replace("s3://heartbeat-page-designer-production/",
    "https://heartbeat-page-designer-production.s3.amazonaws.com/");
}

export default function QuickDeliveryClient({ specHomes, divisions }: Props) {
  const { filter, labels } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SpecHome | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [filteredRows, setFilteredRows] = useState<SpecHome[]>([]);

  // Map global filter divisionId (UUID) → HB integer via heartbeat_division_id FK
  const globalHBDivId = filter.divisionId
    ? (divisions.find((d) => d.id === filter.divisionId)?.heartbeat_division_id ?? null)
    : null;

  // Reset page on search/filter change
  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  // All rows (unfiltered) for Export All
  const allRows = specHomes;

  // Apply filters
  const rows = specHomes.filter((r) => {
    if (globalHBDivId !== null && r.division_parent_id !== globalHBDivId) return false;
    if (filter.communityId) {
      const commName = labels.community;
      if (commName && r.community_name !== commName) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (
        !(r.community_name ?? "").toLowerCase().includes(q) &&
        !(r.model_marketing_name ?? "").toLowerCase().includes(q) &&
        !(r.address ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const columns: Column<SpecHome>[] = [
    { key: "model_marketing_name", label: "Plan Name", sticky: true, sortable: true,
      render: (_v, r) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{r.model_marketing_name ?? r.model_name ?? "—"}</span> },
    { key: "community_name", label: "Community", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.community_name ?? "—"}</span> },
    { key: "city",  label: "City",  sortable: true, render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.city ?? "—"}</span> },
    { key: "state", label: "State", sortable: true, render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.state ?? "—"}</span> },
    { key: "division_parent_name", label: "Division", sortable: true, filterable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.division_parent_name ?? "—"}</span> },
    { key: "lot_block_number", label: "Lot",
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.lot_block_number ?? r.lot_number ?? "—"}</span> },
    { key: "bedrooms",  label: "Beds",  render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.bedrooms ?? "—"}</span> },
    { key: "bathrooms", label: "Baths", render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.bathrooms ?? "—"}</span> },
    { key: "heated_sqft", label: "Sqft",
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.heated_sqft ? (r.heated_sqft as number).toLocaleString() : "—"}</span> },
    { key: "net_price", label: "Net Price", sortable: true,
      render: (_v, r) => r.net_price
        ? <span style={{ color: "#aaa", fontWeight: 700, fontSize: 13 }}>{r.price_formatted ?? formatCurrency(r.net_price as number)}</span>
        : <span style={{ color: "#444" }}>—</span> },
    { key: "incentive_price", label: "Incentive",
      render: (_v, r) => r.incentive_price && (r.incentive_price as number) > 0
        ? <span style={{ color: "#888", fontSize: 12 }}>-${(r.incentive_price as number).toLocaleString()}</span>
        : <span style={{ color: "#333" }}>—</span> },
  ];

  const planName = selected?.model_marketing_name ?? selected?.model_name ?? selected?.name ?? "—";

  return (
    <PageShell
      topBar={
        <TableSubHeader<SpecHome>
          title="Quick Delivery"
          rows={rows}
          totalRows={rows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={(q) => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search homes, plans, communities…"
          onExport={() => exportToCSV(rows as unknown as Record<string, unknown>[], "quick-delivery")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "quick-delivery-all")}
        />
      }
    >
      <DataTable<SpecHome>
        columns={columns}
        rows={rows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={setSelected}
        onFilteredRowsChange={(r) => setFilteredRows(r as SpecHome[])}
        emptyMessage="No quick delivery homes"
        minWidth={1100}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={planName}
        subtitle={selected?.community_name ?? undefined}
        width={520}
      >
        {selected && (
          <>
            {/* Images: exterior elevation first, then interior featured image — both full width */}
            {(() => {
              const elevations = selected?.elevations as {kova_name?: string; image_path?: string; [key: string]: unknown}[] | null;
              const featuredUrl = selected?.featured_image_url;
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
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--blue)", marginBottom: 8 }}>
                {selected.price_formatted ?? formatCurrency(selected.net_price as number | null)}
              </div>
              <Row label="Base Price" value={selected.base_price_formatted ?? formatCurrency(selected.base_price as number | null)} />
              {selected.incentive_price && (selected.incentive_price as number) > 0 && (
                <Row label="Incentive" value={<span style={{ color: "#80B602" }}>− {selected.incentive_price_formatted ?? formatCurrency(selected.incentive_price as number | null)}</span>} />
              )}
            </Section>
            <Section title="Home Specs">
              <Row label="Plan"        value={selected.model_marketing_name ?? selected.model_name} />
              <Row label="Bedrooms"    value={selected.bedrooms} />
              <Row label="Bathrooms"   value={selected.bathrooms} />
              <Row label="Heated Sqft" value={selected.heated_sqft ? (selected.heated_sqft as number).toLocaleString() : null} />
              <Row label="Total Sqft"  value={selected.total_sqft ? (selected.total_sqft as number).toLocaleString() : null} />
              <Row label="Lot"         value={selected.lot_block_number ?? selected.lot_number} />
            </Section>
            <Section title="Location">
              <Row label="Address"   value={selected.address} />
              <Row label="City"      value={selected.city} />
              <Row label="State"     value={selected.state} />
              <Row label="Community" value={selected.community_name} />
              <Row label="Division"  value={selected.division_parent_name} />
            </Section>
            {selected.description && (
              <Section title="Description">
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selected.description as string}</p>
              </Section>
            )}
            <Section title="Actions">
              {selected.virtual_tour_url && (
                <a href={selected.virtual_tour_url as string} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a3f1a", backgroundColor: "#1a2e1a", color: "#80B602", fontSize: 13, textDecoration: "none", fontWeight: 500, marginBottom: 8 }}>
                  ▶ Virtual Tour
                </a>
              )}
              {selected.url && (
                <a href={`https://www.schellbrothers.com${selected.url}`} target="_blank" rel="noopener noreferrer"
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
