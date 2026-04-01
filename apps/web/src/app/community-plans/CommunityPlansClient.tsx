"use client";

import { useState, useEffect } from "react";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import DataTable, { type Column } from "@/components/DataTable";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import type { CommunityPlan, Community, Division } from "./page";

interface Props {
  communityPlans: CommunityPlan[];
  communities: Community[];
  divisions: Division[];
}

const STATS: StatConfig<CommunityPlan>[] = [
  { label: "Plans",       getValue: (r) => r.length },
  { label: "Communities", getValue: (r) => new Set(r.map(x => x.community_id)).size },
  { label: "Divisions",   getValue: (r) => new Set(r.map(x => x.division_parent_id)).size },
  { label: "Avg Price",   getValue: (r) => {
    const wp = r.filter(x => x.net_price && x.net_price > 0);
    if (!wp.length) return "—";
    return "$" + Math.round(wp.reduce((s, x) => s + (x.net_price ?? 0), 0) / wp.length / 1000) + "k";
  }},
];

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min === max || max == null) return fmt(min);
  return `${fmt(min)}–${fmt(max)}`;
}

export default function CommunityPlansClient({ communityPlans, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<CommunityPlan | null>(null);

  // Lookup maps
  const commMap = new Map<string, Community>(communities.map(c => [c.id, c]));
  const divMap = new Map<string, Division>(divisions.map(d => [d.id, d]));
  const hbDivMap = new Map<number, Division>(
    divisions.filter(d => d.heartbeat_division_id != null)
             .map(d => [Number(d.heartbeat_division_id!), d])
  );

  const globalHBDivId = filter.divisionId
    ? (divisions.find(d => d.id === filter.divisionId)?.heartbeat_division_id ?? null)
    : null;
  const globalCommName = filter.communityId
    ? communities.find(c => c.id === filter.communityId)?.name ?? null
    : null;

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  const rows = communityPlans.filter(p => {
    if (globalHBDivId != null && Number(p.division_parent_id) !== globalHBDivId) return false;
    if (globalCommName) {
      const comm = commMap.get(p.community_id ?? "");
      if (comm?.name !== globalCommName) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const commName = commMap.get(p.community_id ?? "")?.name ?? "";
      if (!(p.plan_name ?? "").toLowerCase().includes(q) &&
          !commName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const columns: Column<CommunityPlan>[] = [
    { key: "plan_name", label: "Plan Name", sticky: true, sortable: true,
      render: (_v, r) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{r.plan_name ?? r.marketing_name ?? "—"}</span> },
    { key: "community_id", label: "Community", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{commMap.get(r.community_id ?? "")?.name ?? "—"}</span> },
    { key: "division_parent_id", label: "Division", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{hbDivMap.get(Number(r.division_parent_id))?.name ?? "—"}</span> },
    { key: "net_price", label: "Net Price", sortable: true,
      render: (_v, r) => <span style={{ color: "#aaa", fontSize: 13, fontWeight: 500 }}>{r.price_formatted ?? (r.net_price ? "$" + r.net_price.toLocaleString() : "—")}</span> },
    { key: "base_price", label: "Base Price", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.base_price_formatted ?? (r.base_price ? "$" + r.base_price.toLocaleString() : "—")}</span> },
    { key: "incentive_amount", label: "Incentive", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.incentive_amount && r.incentive_amount > 0 ? "-$" + r.incentive_amount.toLocaleString() : "—"}</span> },
    { key: "min_bedrooms", label: "Beds", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{fmtRange(r.min_bedrooms, r.max_bedrooms)}</span> },
    { key: "min_bathrooms", label: "Baths", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{fmtRange(r.min_bathrooms, r.max_bathrooms)}</span> },
    { key: "min_heated_sqft", label: "Sqft", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{fmtRange(r.min_heated_sqft, r.max_heated_sqft)}</span> },
    { key: "page_url", label: "View", sortable: false,
      render: (_v, r) => r.page_url
        ? <a href={`https://www.schellbrothers.com${r.page_url}`} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()} style={{ color: "#555", fontSize: 13 }}>↗</a>
        : <span style={{ color: "#333" }}>—</span> },
  ];

  const commForSelected = selected ? commMap.get(selected.community_id ?? "") : null;
  const divForSelected = selected ? hbDivMap.get(Number(selected.division_parent_id)) : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Community Plans"
          rows={rows}
          totalRows={rows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search plans or communities…"
          onExport={() => exportToCSV(rows, "community-plans")}
          onExportAll={() => exportToCSV(communityPlans, "community-plans-all")}
        />
      }
    >
      <DataTable<CommunityPlan>
        columns={columns}
        rows={rows}
        controlledPage={page}
        controlledPageSize={pageSize}
        onRowClick={setSelected}
        emptyMessage="No community plans"
        minWidth={1000}
      />
      <SlideOver open={!!selected} onClose={() => setSelected(null)}
        title={selected?.plan_name ?? selected?.marketing_name ?? "—"}
        subtitle={commForSelected?.name ?? undefined}
        width={480}>
        {selected && (
          <>
            <Section title="Pricing">
              <div style={{ fontSize: 22, fontWeight: 700, color: "#aaa", marginBottom: 8 }}>
                {selected.price_formatted ?? (selected.net_price ? "$" + selected.net_price.toLocaleString() : "—")}
              </div>
              <Row label="Base Price" value={selected.base_price_formatted ?? (selected.base_price ? "$" + selected.base_price.toLocaleString() : null)} />
              {selected.incentive_amount && selected.incentive_amount > 0 && (
                <Row label="Incentive" value={`-$${selected.incentive_amount.toLocaleString()}`} />
              )}
            </Section>
            <Section title="Plan Details">
              <Row label="Plan"       value={selected.plan_name ?? selected.marketing_name} />
              <Row label="Community"  value={commForSelected?.name} />
              <Row label="Division"   value={divForSelected?.name} />
              <Row label="City"       value={commForSelected?.city} />
              <Row label="State"      value={commForSelected?.state} />
              <Row label="Type"       value={selected.plan_type} />
              <Row label="Bedrooms"   value={fmtRange(selected.min_bedrooms, selected.max_bedrooms)} />
              <Row label="Bathrooms"  value={fmtRange(selected.min_bathrooms, selected.max_bathrooms)} />
              <Row label="Heated Sqft" value={fmtRange(selected.min_heated_sqft, selected.max_heated_sqft)} />
            </Section>
            {selected.description && (
              <Section title="Description">
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
              </Section>
            )}
            {selected.page_url && (
              <Section title="Actions">
                <a href={`https://www.schellbrothers.com${selected.page_url}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a3f50", backgroundColor: "#0d2229", color: "#59a6bd", fontSize: 13, textDecoration: "none" }}>
                  ↗ View on schellbrothers.com
                </a>
              </Section>
            )}
          </>
        )}
      </SlideOver>
    </PageShell>
  );
}
