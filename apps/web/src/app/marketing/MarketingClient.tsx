"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import OpportunityPanel from "@/components/OpportunityPanel";
import type { OpportunityPanelData } from "@/components/OpportunityPanel";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import DataTable, { type Column } from "@/components/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  slug: string | null;
  division_slug: string;
  division_name: string;
}

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface MarketingContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  community_id: string | null;
  division_id: string | null;
  subscribed_at: string;
  is_active: boolean;
  created_at: string;
}

type MarketingRow = MarketingContact & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _subscribed: string;
};

interface Props {
  contacts: MarketingContact[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function capitalize(s: string | null): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<MarketingRow>[] = [
  { label: "Total", getValue: (r) => r.length },
  { label: "Active", getValue: (r) => r.filter(x => x.is_active).length },
  {
    label: "This Month",
    getValue: (r) => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      return r.filter(x => {
        const d = new Date(x.subscribed_at);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
    },
  },
  {
    label: "Conversion Rate",
    getValue: (r) => {
      if (!r.length) return "—";
      const inactive = r.filter(x => !x.is_active).length;
      // Conversion = contacts who moved past marketing (became inactive / converted)
      return `${Math.round((inactive / r.length) * 100)}%`;
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function MarketingInner({ contacts, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MarketingContact | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  // Filter
  const filtered = contacts.filter(c => {
    if (filter.communityId && c.community_id !== filter.communityId) return false;
    if (filter.divisionId && c.division_id !== filter.divisionId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${c.first_name} ${c.last_name}`.toLowerCase().includes(q) &&
          !(c.email ?? "").toLowerCase().includes(q) &&
          !(c.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  // Enrich rows
  const tableRows: MarketingRow[] = filtered.map(c => {
    const comm = communities.find(cm => cm.id === c.community_id);
    const div = divisions.find(d => d.id === c.division_id);
    return {
      ...c,
      _name: `${c.first_name} ${c.last_name}`,
      _community: comm?.name ?? "—",
      _division: div?.name ?? comm?.division_name ?? "—",
      _subscribed: formatDate(c.subscribed_at),
    };
  });

  const allRows = contacts.map(c => {
    const comm = communities.find(cm => cm.id === c.community_id);
    const div = divisions.find(d => d.id === c.division_id);
    return { ...c, _name: `${c.first_name} ${c.last_name}`, _community: comm?.name ?? "—", _division: div?.name ?? "—", _subscribed: formatDate(c.subscribed_at) };
  });

  const tableColumns: Column<MarketingRow>[] = [
    {
      key: "_name", label: "Name", sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500, textDecoration: "underline", textDecorationColor: "#3f3f46", textUnderlineOffset: "2px", cursor: "pointer" }}>{row._name}</span>,
    },
    {
      key: "email", label: "Email", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.email ?? "—"}</span>,
    },
    {
      key: "phone", label: "Phone", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.phone ?? "—"}</span>,
    },
    {
      key: "source", label: "Source", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{capitalize(row.source)}</span>,
    },
    {
      key: "_community", label: "Community", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._community}</span>,
    },
    {
      key: "_division", label: "Division", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._division}</span>,
    },
    {
      key: "_subscribed", label: "Subscribed", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._subscribed}</span>,
    },
    {
      key: "is_active", label: "Status", sortable: true, filterable: true,
      render: (_v, row) => (
        <span style={{ fontSize: 12, color: row.is_active ? "#4ade80" : "#888" }}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  const panelData: OpportunityPanelData | null = selected ? {
    id: selected.id,
    contact_id: selected.id,
    first_name: selected.first_name,
    last_name: selected.last_name,
    email: selected.email,
    phone: selected.phone,
    stage: "marketing",
    source: selected.source,
    community_name: communities.find(c => c.id === selected.community_id)?.name ?? null,
    division_name: divisions.find(d => d.id === selected.division_id)?.name ?? communities.find(c => c.id === selected.community_id)?.division_name ?? null,
    budget_min: null,
    budget_max: null,
    floor_plan_name: null,
    notes: null,
    last_activity_at: null,
    created_at: selected.created_at,
  } : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Marketing"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search marketing contacts…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "marketing")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "marketing-all")}
        />
      }
    >
      <DataTable<MarketingRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No marketing contacts match the current filter"
        minWidth={1100}
      />

      <OpportunityPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        opportunity={panelData}
      />
    </PageShell>
  );
}

export default function MarketingClient(props: Props) {
  return <MarketingInner {...props} />;
}
