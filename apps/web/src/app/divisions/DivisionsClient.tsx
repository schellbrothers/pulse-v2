"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import DataTable, { type Column } from "@/components/DataTable";
import type { DivisionStats } from "./page";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  divisions: DivisionStats[];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DivisionTableRow = DivisionStats & Record<string, unknown> & {
  _region: string;
  _states: string;
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<DivisionTableRow>[] = [
  { label: "Divisions", getValue: (r) => r.length },
  { label: "States",    getValue: () => 4 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DivisionsClient({ divisions }: Props) {
  const router = useRouter();
  const { setDivision, setLabels } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [filteredRows, setFilteredRows] = useState<DivisionStats[]>([]);

  const allRows: DivisionTableRow[] = divisions.map((d) => ({
    ...d,
    _region: d.region || "—",
    _states: d.state_codes?.join(", ") || "—",
  }));

  const rows: DivisionTableRow[] = allRows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.name ?? "").toLowerCase().includes(q) || (r._region ?? "").toLowerCase().includes(q);
  });

  const columns: Column<DivisionTableRow>[] = [
    {
      key: "name",
      label: "Division",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row.name}</span>,
    },
    {
      key: "_region",
      label: "Region",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._region}</span>,
    },
    {
      key: "community_count",
      label: "Communities",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.community_count}</span>,
    },
    {
      key: "plan_count",
      label: "Plans",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.plan_count}</span>,
    },
    {
      key: "available_lots",
      label: "Available Lots",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.available_lots ?? 0}</span>,
    },
    {
      key: "model_homes",
      label: "Model Homes",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.model_homes ?? 0}</span>,
    },
    {
      key: "qd_homes",
      label: "QD Homes",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.qd_homes ?? 0}</span>,
    },
  ];

  function handleRowClick(row: DivisionTableRow) {
    setDivision(row.id);
    setLabels({ division: row.name });
    router.push(`/?div=${row.id}`);
  }

  return (
    <PageShell
      topBar={
        <TableSubHeader<DivisionTableRow>
          title="Divisions"
          rows={rows}
          totalRows={rows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={(q) => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search divisions…"
          onExport={() => exportToCSV(rows as unknown as Record<string, unknown>[], "divisions")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "divisions-all")}
        />
      }
    >
      <DataTable<DivisionTableRow>
        columns={columns}
        rows={rows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={handleRowClick}
        onFilteredRowsChange={(r) => setFilteredRows(r as typeof rows)}
        emptyMessage="No divisions"
        minWidth={700}
      />
    </PageShell>
  );
}
