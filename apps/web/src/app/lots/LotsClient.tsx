"use client";

import { useState, useEffect, useMemo } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import DataTable, { type Column } from "@/components/DataTable";
import type { LotRow, CommunityRow, DivisionRow } from "./page";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type LotTableRow = LotRow & Record<string, unknown>;

interface Props {
  lots: LotRow[];
  communities: CommunityRow[];
  divisions: DivisionRow[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<LotTableRow>[] = [
  { label: "Available",      getValue: (r) => r.filter((x) => x.lot_status === "Available Homesite").length },
  { label: "Under Const",    getValue: (r) => r.filter((x) => x.construction_status === "Under Construction").length },
  { label: "Quick Delivery", getValue: (r) => r.filter((x) => x.lot_status === "Quick Delivery").length },
  { label: "Future",         getValue: (r) => r.filter((x) => x.lot_status === "Future Homesite").length },
];

// ─── Lot status config ────────────────────────────────────────────────────────

const LOT_STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "Available Homesite": { bg: "#162800", color: "#80B602", border: "#2a4a00" },
  "Quick Delivery":     { bg: "#0d2229", color: "#59a6bd", border: "#1a3f50" },
  "Future Homesite":    { bg: "#2e1800", color: "#e07000", border: "#5c3000" },
  "Under Contract":     { bg: "#2e1800", color: "#e07000", border: "#5c3000" },
  "Sold":               { bg: "#2a0a0a", color: "#E32027", border: "#4a1a1a" },
};

function getLotStatusStyle(status: string | null) {
  if (status && LOT_STATUS_STYLES[status]) return LOT_STATUS_STYLES[status];
  return { bg: "var(--surface-2)", color: "var(--text-3)", border: "var(--border)" };
}

function LotStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#555" }}>—</span>;
  const s = getLotStatusStyle(status);
  const label = status.replace(" Homesite", "").replace(" Home", "");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{label}</span>
    </span>
  );
}

function ConstructionBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#555" }}>—</span>;
  const color = status === "Under Construction" ? "#59a6bd" : "#666";
  return <span style={{ fontSize: 12, color, fontWeight: 400 }}>{status}</span>;
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function LotsClient({ lots, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();

  const [divFilter, setDivFilter] = useState<string>(() => filter.divisionId ?? "");
  const [commFilter, setCommFilter] = useState<string>(() => filter.communityId ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [constructionFilter, setConstructionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLot, setSelectedLot] = useState<LotTableRow | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Sync local state when global filter changes
  useEffect(() => {
    if (filter.divisionId) setDivFilter(filter.divisionId);
    else setDivFilter("");
    if (filter.communityId) setCommFilter(filter.communityId);
    else setCommFilter("");
    setPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.divisionId, filter.communityId]);

  const communityMap = useMemo(() => new Map(communities.map((c) => [c.id, c])), [communities]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  const divisionOptions = useMemo(() => divisions.map((d) => ({ value: d.id, label: d.name })), [divisions]);

  const commOptions = useMemo(() => {
    const relevant = !divFilter
      ? lots
      : lots.filter((l) => {
          const comm = l.community_id ? communityMap.get(l.community_id) : null;
          const div = comm?.division_id ? divisionMap.get(comm.division_id) : null;
          return div?.id === divFilter;
        });
    return Array.from(new Set(relevant.map((l) => l.community_name_raw).filter(Boolean)))
      .sort()
      .map((n) => ({ value: n as string, label: n as string }));
  }, [lots, divFilter, communityMap, divisionMap]);

  const statusOptions = useMemo(
    () => Array.from(new Set(lots.map((l) => l.lot_status).filter(Boolean))).sort().map((s) => ({ value: s as string, label: s as string })),
    [lots]
  );

  const constructionOptions = useMemo(
    () => Array.from(new Set(lots.map((l) => l.construction_status).filter(Boolean))).sort().map((s) => ({ value: s as string, label: s as string })),
    [lots]
  );

  // All rows (unfiltered) for Export All
  const allRows = useMemo<LotTableRow[]>(() => lots as LotTableRow[], [lots]);

  const rows = useMemo<LotTableRow[]>(() => {
    return (lots as LotTableRow[]).filter((l) => {
      if (filter.communityId && l.community_id !== filter.communityId) return false;
      if (filter.divisionId && !divFilter) {
        const comm = l.community_id ? communityMap.get(l.community_id as string) : null;
        const div = comm?.division_id ? divisionMap.get(comm.division_id) : null;
        if (div?.id !== filter.divisionId) return false;
      }
      if (divFilter) {
        const comm = l.community_id ? communityMap.get(l.community_id as string) : null;
        const div = comm?.division_id ? divisionMap.get(comm.division_id) : null;
        if (div?.id !== divFilter) return false;
      }
      if (!filter.communityId && commFilter && l.community_name_raw !== commFilter) return false;
      if (statusFilter && l.lot_status !== statusFilter) return false;
      if (constructionFilter && l.construction_status !== constructionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (l.address ?? "").toLowerCase().includes(q) ||
          (l.lot_number ?? "").toLowerCase().includes(q) ||
          (l.community_name_raw ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [lots, divFilter, commFilter, statusFilter, constructionFilter, search, communityMap, divisionMap, filter]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, divFilter, commFilter, statusFilter, constructionFilter]);

  function getDivisionName(lot: LotTableRow): string {
    const comm = lot.community_id ? communityMap.get(lot.community_id as string) : null;
    if (!comm?.division_id) return (lot.division_raw as string) ?? "—";
    return divisionMap.get(comm.division_id)?.name ?? (lot.division_raw as string) ?? "—";
  }

  const columns: Column<LotTableRow>[] = [
    {
      key: "community_name_raw",
      label: "Community",
      sticky: true,
      sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{row.community_name_raw ?? "—"}</span>,
    },
    {
      key: "lot_number",
      label: "Lot #",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row.lot_number ?? "—"}{row.block ? ` / ${row.block}` : ""}</span>,
    },
    {
      key: "address",
      label: "Address",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row.address ?? "—"}</span>,
    },
    {
      key: "lot_status",
      label: "Status",
      sortable: true,
      render: (_v, row) => <LotStatusBadge status={row.lot_status} />,
    },
    {
      key: "construction_status",
      label: "Construction",
      sortable: true,
      render: (_v, row) => <ConstructionBadge status={row.construction_status} />,
    },
    {
      key: "phase",
      label: "Phase",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{(row.phase as string) ?? "—"}</span>,
    },
    {
      key: "lot_premium",
      label: "Premium",
      sortable: true,
      align: "right" as const,
      render: (_v, row) =>
        (row.lot_premium as number) > 0 ? (
          <span style={{ color: "var(--blue)", fontSize: 12, fontWeight: 600 }}>+${(row.lot_premium as number).toLocaleString()}</span>
        ) : (
          <span style={{ color: "#333" }}>—</span>
        ),
    },
    {
      key: "foundation",
      label: "Foundation",
      sortable: true,
      render: (_v, row) =>
        row.foundation ? (
          <span style={{ fontSize: 11, color: row.foundation === "Basement Only" ? "#a855f7" : row.foundation === "Crawl/Basement" ? "var(--blue)" : "var(--text-3)" }}>
            {row.foundation as string}
          </span>
        ) : (
          <span style={{ color: "#333" }}>—</span>
        ),
    },
  ];

  // Local filter dropdowns
  const localFilters = (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {!filter.divisionId && (
        <select
          value={divFilter}
          onChange={(e) => { setDivFilter(e.target.value); setCommFilter(""); }}
          style={filterSelectStyle(!!divFilter)}
        >
          <option value="">All Divisions</option>
          {divisionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {!filter.communityId && (
        <select
          value={commFilter}
          onChange={(e) => setCommFilter(e.target.value)}
          style={filterSelectStyle(!!commFilter)}
        >
          <option value="">All Communities</option>
          {commOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={filterSelectStyle(!!statusFilter)}
      >
        <option value="">All Statuses</option>
        {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        value={constructionFilter}
        onChange={(e) => setConstructionFilter(e.target.value)}
        style={filterSelectStyle(!!constructionFilter)}
      >
        <option value="">All Construction</option>
        {constructionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const selectedDivName = selectedLot ? getDivisionName(selectedLot) : "—";

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Lots"
          rows={rows}
          totalRows={rows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={(q) => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search address or lot…"
          onExport={() => exportToCSV(rows as unknown as Record<string, unknown>[], "lots")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "lots-all")}
        />
      }
    >
      <DataTable<LotTableRow>
        columns={columns}
        rows={rows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={setSelectedLot}
        emptyMessage="No lots match the current filters"
        minWidth={1000}
      />

      <SlideOver
        open={!!selectedLot}
        onClose={() => setSelectedLot(null)}
        title={selectedLot ? `Lot ${selectedLot.lot_number ?? "—"}${selectedLot.block ? ` / Block ${selectedLot.block}` : ""}` : "Lot Detail"}
        subtitle={selectedLot?.community_name_raw ?? undefined}
        badge={<LotStatusBadge status={selectedLot?.lot_status ?? null} />}
        width={480}
      >
        {selectedLot && (
          <>
            <Section title="Community">
              <Row label="Community" value={selectedLot.community_name_raw} />
              <Row label="Division" value={selectedDivName} />
            </Section>
            <Section title="Address">
              <Row label="Address" value={selectedLot.address} />
            </Section>
            <Section title="Lot Info">
              <Row label="Lot Number" value={selectedLot.lot_number} />
              <Row label="Block" value={selectedLot.block} />
              <Row label="Phase" value={selectedLot.phase} />
              <Row label="Lot Premium" value={(selectedLot.lot_premium as number) > 0 ? <span style={{ color: "var(--blue)", fontWeight: 600 }}>+${(selectedLot.lot_premium as number).toLocaleString()}</span> : null} />
              <Row label="Foundation" value={selectedLot.foundation} />
            </Section>
            <Section title="Status">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <LotStatusBadge status={selectedLot.lot_status} />
                {selectedLot.construction_status && <ConstructionBadge status={selectedLot.construction_status} />}
              </div>
              <Row label="Buildable" value={selectedLot.is_buildable != null ? (selectedLot.is_buildable ? "Yes" : "No") : null} />
              <Row label="Available" value={selectedLot.is_available != null ? (selectedLot.is_available ? "Yes" : "No") : null} />
            </Section>
            {selectedLot.synced_at && (
              <Section title="System">
                <Row label="Last Synced" value={new Date(selectedLot.synced_at as string).toLocaleString()} />
              </Section>
            )}
          </>
        )}
      </SlideOver>
    </PageShell>
  );
}
