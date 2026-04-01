"use client";

import { useRouter } from "next/navigation";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import DataTable, { type Column } from "@/components/DataTable";
import type { DivisionStats } from "./page";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  divisions: DivisionStats[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DivisionTableRow = DivisionStats & Record<string, unknown> & {
  _region: string;
  _states: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DivisionsClient({ divisions }: Props) {
  const router = useRouter();
  const { filter, labels, setDivision, setLabels } = useGlobalFilter();

  const rows: DivisionTableRow[] = divisions.map((d) => ({
    ...d,
    _region: d.region || "—",
    _states: d.state_codes?.join(", ") || "—",
  }));

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
      key: "active_count",
      label: "Available Lots",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>—</span>,
    },
    {
      key: "is_active",
      label: "Model Homes",
      render: () => <span style={{ color: "#555", fontSize: 13 }}>—</span>,
    },
    {
      key: "coming_soon_count",
      label: "QD Homes",
      render: () => <span style={{ color: "#555", fontSize: 13 }}>—</span>,
    },
  ];

  function handleRowClick(row: DivisionTableRow) {
    setDivision(row.id);
    setLabels({ division: row.name });
    router.push(`/?div=${row.id}`);
  }

  return (
    <PageShell
      topBar={<TopBar title="Divisions" />}
      filtersBar={
        (filter.divisionId || filter.communityId) ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-3)" }}>
            <span>Filtered:</span>
            {labels.division && <span style={{ color: "var(--text-2)" }}>{labels.division}</span>}
            {labels.community && <><span>›</span><span style={{ color: "var(--text-2)" }}>{labels.community}</span></>}
          </div>
        ) : undefined
      }
    >
      <DataTable<DivisionTableRow>
        columns={columns}
        rows={rows}
        defaultPageSize={100}
        onRowClick={handleRowClick}
        emptyMessage="No divisions"
        minWidth={700}
      />
    </PageShell>
  );
}
