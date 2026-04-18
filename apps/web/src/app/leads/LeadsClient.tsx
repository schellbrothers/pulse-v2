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

interface Lead {
  id: string;
  contact_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string | null;
  community_id: string | null;
  community_name: string | null;
  division_id: string | null;
  division_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  opportunity_source: string | null;
  notes: string | null;
  last_activity_at: string;
  is_active: boolean;
  created_at: string;
}



type LeadRow = Lead & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _budget: string;
  _last_activity: string;
};

interface Props {
  leads: Lead[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
}

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

function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    lead_div: "Division Lead",
    lead_com: "Community Lead",
  };
  return map[stage] ?? stage;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<LeadRow>[] = [
  { label: "Total", getValue: (r) => r.length },
  { label: "Division", getValue: (r) => r.filter(x => x.stage === "lead_div").length },
  { label: "Community", getValue: (r) => r.filter(x => x.stage === "lead_com").length },
  {
    label: "Avg Budget",
    getValue: (r) => {
      const wb = r.filter(x => x.budget_min);
      if (!wb.length) return "—";
      return "$" + Math.round(wb.reduce((s, x) => s + (x.budget_min ?? 0), 0) / wb.length / 1000) + "k";
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function LeadsInner({ leads, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [leadType, setLeadType] = useState<"all" | "lead_div" | "lead_com">("all");


  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId, leadType]);



  // Filter
  const filtered = leads.filter(l => {
    if (leadType !== "all" && l.stage !== leadType) return false;
    if (filter.communityId && l.community_id !== filter.communityId) return false;
    if (filter.divisionId && l.division_id !== filter.divisionId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${l.first_name} ${l.last_name}`.toLowerCase().includes(q) &&
          !(l.email ?? "").toLowerCase().includes(q) &&
          !(l.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  // Enrich rows
  const tableRows: LeadRow[] = filtered.map(l => {
    const comm = communities.find(c => c.id === l.community_id);
    const div = divisions.find(d => d.id === l.division_id);
    return {
      ...l,
      _name: `${l.first_name} ${l.last_name}`,
      _community: comm?.name ?? l.community_name ?? "—",
      _division: div?.name ?? l.division_name ?? comm?.division_name ?? "—",
      _budget: formatBudget(l.budget_min, l.budget_max),
      _last_activity: relativeTime(l.last_activity_at),
    };
  });

  const allRows = leads.map(l => {
    const comm = communities.find(c => c.id === l.community_id);
    const div = divisions.find(d => d.id === l.division_id);
    return { ...l, _name: `${l.first_name} ${l.last_name}`, _community: comm?.name ?? l.community_name ?? "—", _division: div?.name ?? l.division_name ?? "—", _budget: formatBudget(l.budget_min, l.budget_max), _last_activity: relativeTime(l.last_activity_at) };
  });

  const tableColumns: Column<LeadRow>[] = [
    {
      key: "_name", label: "Name", sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500, textDecoration: "underline", textDecorationColor: "#3f3f46", textUnderlineOffset: "2px", cursor: "pointer" }}>{row._name}</span>,
    },
    {
      key: "stage", label: "Stage", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{getStageLabel(row.stage)}</span>,
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
      key: "source", label: "Source", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.source ?? "—"}</span>,
    },
    {
      key: "_budget", label: "Budget", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._budget}</span>,
    },
    {
      key: "_last_activity", label: "Last Activity", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._last_activity}</span>,
    },
    {
      key: "created_at", label: "Created", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString()}</span>,
    },
  ];

  const panelData: OpportunityPanelData | null = selected ? {
    id: selected.id,
    contact_id: selected.contact_id,
    first_name: selected.first_name,
    last_name: selected.last_name,
    email: selected.email,
    phone: selected.phone,
    stage: selected.stage,
    source: selected.source,
    community_name: selected.community_name ?? communities.find(c => c.id === selected.community_id)?.name ?? null,
    division_name: selected.division_name ?? divisions.find(d => d.id === selected.division_id)?.name ?? communities.find(c => c.id === selected.community_id)?.division_name ?? null,
    budget_min: selected.budget_min,
    budget_max: selected.budget_max,
    floor_plan_name: null,
    notes: selected.notes,
    last_activity_at: selected.last_activity_at,
    created_at: selected.created_at,
  } : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Leads"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search leads…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "leads")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "leads-all")}
        />
      }
      filtersBar={
        <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 16px", backgroundColor: "#0d0e10", borderBottom: "1px solid #1a1a1e" }}>
          {(["all", "lead_div", "lead_com"] as const).map(t => (
            <button key={t} onClick={() => setLeadType(t)} style={{
              padding: "4px 12px", fontSize: 11, fontWeight: leadType === t ? 600 : 400, borderRadius: 4,
              border: leadType === t ? "1px solid #3f3f46" : "1px solid transparent",
              backgroundColor: leadType === t ? "#18181b" : "transparent",
              color: leadType === t ? "#fafafa" : "#71717a",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {t === "all" ? "All Leads" : t === "lead_div" ? "Division Leads" : "Community Leads"}
            </button>
          ))}
          <span style={{ fontSize: 11, color: "#3f3f46", marginLeft: 8 }}>
            {leadType === "all" ? "" : leadType === "lead_div" ? "Division-level interest — no community assigned" : "Community-level interest — assigned to specific community"}
          </span>
        </div>
      }
    >
      <DataTable<LeadRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No leads match the current filter"
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

export default function LeadsClient(props: Props) {
  return <LeadsInner {...props} />;
}
