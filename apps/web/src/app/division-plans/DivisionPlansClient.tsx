"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import DataTable, { type Column } from "@/components/DataTable";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import type { DivisionPlan, Division } from "./page";

interface Props {
  divisionPlans: DivisionPlan[];
  divisions: Division[];
}

const STATS: StatConfig<DivisionPlan>[] = [
  { label: "Plans",     getValue: (r) => r.length },
  { label: "Divisions", getValue: (r) => new Set(r.map((x) => x.division_parent_id)).size },
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


function s3ToHttps(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path.replace("s3://heartbeat-page-designer-production/", 
    "https://heartbeat-page-designer-production.s3.amazonaws.com/");
}

export default function DivisionPlansClient({ divisionPlans, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<DivisionPlan | null>(null);

  // Map HB integer → division
  const hbDivMap = new Map<number, Division>(
    divisions.filter(d => d.heartbeat_division_id != null)
             .map(d => [Number(d.heartbeat_division_id!), d])
  );

  const globalHBDivId = filter.divisionId
    ? (divisions.find(d => d.id === filter.divisionId)?.heartbeat_division_id ?? null)
    : null;

  useEffect(() => { setPage(0); }, [search, filter.divisionId]);

  const rows = divisionPlans.filter(p => {
    if (globalHBDivId != null && Number(p.division_parent_id) !== globalHBDivId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(p.marketing_name ?? p.name ?? "").toLowerCase().includes(q) &&
          !(p.division_parent_name ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const columns: Column<DivisionPlan>[] = [
    { key: "marketing_name", label: "Plan Name", sticky: true, sortable: true,
      render: (_v, r) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{r.marketing_name ?? r.name ?? "—"}</span> },
    { key: "division_parent_name", label: "Division", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{hbDivMap.get(Number(r.division_parent_id))?.name ?? r.division_parent_name ?? "—"}</span> },
    { key: "plan_type", label: "Type", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 13 }}>{r.plan_type ?? "—"}</span> },
    { key: "min_bedrooms", label: "Beds", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{fmtRange(r.min_bedrooms, r.max_bedrooms)}</span> },
    { key: "min_bathrooms", label: "Baths", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{fmtRange(r.min_bathrooms, r.max_bathrooms)}</span> },
    { key: "min_heated_sqft", label: "Sqft", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{fmtRange(r.min_heated_sqft, r.max_heated_sqft)}</span> },
    { key: "min_floors", label: "Floors", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{fmtRange(r.min_floors, r.max_floors)}</span> },
    { key: "model_homes_count", label: "Model Homes", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.model_homes_count ?? 0}</span> },
    { key: "spec_homes_count", label: "QD Homes", sortable: true,
      render: (_v, r) => <span style={{ color: "#888", fontSize: 12 }}>{r.spec_homes_count ?? 0}</span> },
    { key: "page_url", label: "View", sortable: false,
      render: (_v, r) => r.page_url
        ? <a href={`https://www.schellbrothers.com${r.page_url}`} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()} style={{ color: "#555", fontSize: 13 }}>↗</a>
        : <span style={{ color: "#333" }}>—</span> },
  ];

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Division Plans"
          rows={rows}
          totalRows={rows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search plans…"
          onExport={() => exportToCSV(rows, "division-plans")}
          onExportAll={() => exportToCSV(divisionPlans, "division-plans-all")}
        />
      }
    >
      <DataTable<DivisionPlan>
        columns={columns}
        rows={rows}
        controlledPage={page}
        controlledPageSize={pageSize}
        onRowClick={setSelected}
        emptyMessage="No division plans"
        minWidth={900}
      />
      <SlideOver open={!!selected} onClose={() => setSelected(null)}
        title={selected?.marketing_name ?? selected?.name ?? "—"}
        subtitle={hbDivMap.get(Number(selected?.division_parent_id))?.name ?? selected?.division_parent_name ?? undefined}
        width={480}>
        {selected && (
          <>
            {/* Elevation image grid */}
            {Array.isArray(selected.elevations) && (selected.elevations as {kova_name?: string; image_path?: string}[]).filter(e => e.image_path && !e.is_hidden).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 8 }}>Elevations</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {(selected.elevations as {kova_name?: string; image_path?: string}[])
                    .filter(e => e.image_path)
                    .map((elev, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s3ToHttps(elev.image_path) ?? ""}
                          alt={elev.kova_name ?? `Elevation ${i + 1}`}
                          style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 3, display: "block", background: "#1a1a1e" }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>{elev.kova_name ?? `Elevation ${i + 1}`}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
            <Section title="Plan Details">
              <Row label="Plan Name"  value={selected.marketing_name ?? selected.name} />
              <Row label="Division"   value={hbDivMap.get(Number(selected.division_parent_id))?.name ?? selected.division_parent_name} />
              <Row label="Type"       value={selected.plan_type} />
              <Row label="Bedrooms"   value={fmtRange(selected.min_bedrooms, selected.max_bedrooms)} />
              <Row label="Bathrooms"  value={fmtRange(selected.min_bathrooms, selected.max_bathrooms)} />
              <Row label="Heated Sqft" value={fmtRange(selected.min_heated_sqft, selected.max_heated_sqft)} />
              <Row label="Total Sqft" value={fmtRange(selected.min_total_sqft, selected.max_total_sqft)} />
              <Row label="Floors"     value={fmtRange(selected.min_floors, selected.max_floors)} />
              <Row label="Basement"   value={selected.basement ? "Yes" : "No"} />
              <Row label="Model Homes" value={selected.model_homes_count ?? 0} />
              <Row label="QD Homes"   value={selected.spec_homes_count ?? 0} />
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
