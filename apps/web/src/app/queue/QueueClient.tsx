"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import OpportunityPanel from "@/components/OpportunityPanel";
import type { OpportunityPanelData } from "@/components/OpportunityPanel";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import DataTable, { type Column } from "@/components/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community { id: string; name: string; slug: string | null; division_slug: string; division_name: string; }
interface Division { id: string; slug: string; name: string; }

interface Opportunity {
  id: string;
  contact_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  opportunity_source: string | null;
  community_id: string | null;
  community_name: string | null;
  division_id: string | null;
  division_name: string | null;
  osc_id: string | null;
  osc_route_decision: string | null;
  notes: string | null;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
}



type OppRow = Opportunity & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _status: string;
  _last_activity: string;
};

interface Props {
  opportunities: Opportunity[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function deriveStatus(opp: Opportunity): string {
  if (opp.osc_route_decision === "promoted_to_prospect") return "Promoted";
  if (opp.osc_route_decision === "demoted_to_lead" || opp.osc_route_decision === "demoted_to_marketing") return "Demoted";
  if (opp.osc_id) return "Assigned";
  return "New";
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<OppRow>[] = [
  { label: "New",      getValue: (r) => r.filter(x => x._status === "New").length },
  { label: "Assigned", getValue: (r) => r.filter(x => x._status === "Assigned").length },
  { label: "Promoted", getValue: (r) => r.filter(x => x._status === "Promoted").length },
  { label: "Demoted",  getValue: (r) => r.filter(x => x._status === "Demoted").length },
];

// ─── Component ────────────────────────────────────────────────────────────────

function QueueInner({ opportunities, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);


  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);



  const filtered = opportunities.filter(o => {
    if (filter.communityId && o.community_id !== filter.communityId) return false;
    if (filter.divisionId && o.division_id !== filter.divisionId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${o.first_name} ${o.last_name}`.toLowerCase().includes(q) &&
          !(o.email ?? "").toLowerCase().includes(q) &&
          !(o.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  const tableRows: OppRow[] = filtered.map(o => {
    const comm = communities.find(c => c.id === o.community_id);
    const div = divisions.find(d => d.id === o.division_id);
    return {
      ...o,
      _name: `${o.first_name} ${o.last_name}`,
      _community: comm?.name ?? o.community_name ?? "—",
      _division: div?.name ?? o.division_name ?? comm?.division_name ?? "—",
      _status: deriveStatus(o),
      _last_activity: relativeTime(o.last_activity_at),
    };
  });

  const allRows = opportunities.map(o => {
    const comm = communities.find(c => c.id === o.community_id);
    return { ...o, _name: `${o.first_name} ${o.last_name}`, _community: comm?.name ?? o.community_name ?? "—", _division: o.division_name ?? comm?.division_name ?? "—", _status: deriveStatus(o), _last_activity: relativeTime(o.last_activity_at) };
  });

  const tableColumns: Column<OppRow>[] = [
    { key: "_name", label: "Name", sortable: true, render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500, textDecoration: "underline", textDecorationColor: "#3f3f46", textUnderlineOffset: "2px", cursor: "pointer" }}>{row._name}</span> },
    { key: "_status", label: "Status", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._status}</span> },
    { key: "_community", label: "Community", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._community}</span> },
    { key: "_division", label: "Division", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._division}</span> },
    { key: "opportunity_source", label: "Form Type", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.opportunity_source ?? "—"}</span> },
    { key: "source", label: "Source", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.source ?? "—"}</span> },
    { key: "osc_route_decision", label: "Route Decision", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.osc_route_decision ?? "Pending"}</span> },
    { key: "created_at", label: "Created", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) + " " + new Date(row.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span> },
  ];

  const panelData: OpportunityPanelData | null = selected ? {
    id: selected.id,
    contact_id: selected.contact_id,
    first_name: selected.first_name,
    last_name: selected.last_name,
    email: selected.email,
    phone: selected.phone,
    stage: "queue",
    source: selected.source ?? selected.opportunity_source,
    community_name: selected.community_name ?? communities.find(c => c.id === selected.community_id)?.name ?? null,
    division_name: selected.division_name ?? divisions.find(d => d.id === selected.division_id)?.name ?? communities.find(c => c.id === selected.community_id)?.division_name ?? null,
    budget_min: null,
    budget_max: null,
    floor_plan_name: null,
    notes: selected.notes,
    last_activity_at: selected.last_activity_at,
    created_at: selected.created_at,
  } : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Queue"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search queue…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "opportunities")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "queue-all")}
        />
      }
    >
      <DataTable<OppRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No queue items match the current filter"
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

export default function QueueClient(props: Props) {
  return <QueueInner {...props} />;
}
