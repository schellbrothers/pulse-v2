"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
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
  substage: string | null;
  source: string | null;
  community_id: string | null;
  division_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_move_date: string | null;
  bedrooms: number | null;
  agent_name: string | null;
  last_activity_at: string;
  notes: string | null;
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
    marketing: "Marketing", lead: "Lead", opportunity: "Opportunity",
    new: "New", contacted: "Contacted", touring: "Touring",
    "under-contract": "Under Contract", "closed-won": "Closed Won", "closed-lost": "Closed Lost",
  };
  return map[stage] ?? stage;
}

function isActiveStage(stage: string): boolean {
  return !["closed-won", "closed-lost"].includes(stage);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<LeadRow>[] = [
  { label: "Active", getValue: (r) => r.filter(x => x.is_active).length },
  { label: "New", getValue: (r) => r.filter(x => x.stage === "new" || x.stage === "marketing").length },
  { label: "Contacted", getValue: (r) => r.filter(x => x.stage === "contacted" || x.stage === "lead").length },
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

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  // Filter
  const filtered = leads.filter(l => {
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
      _community: comm?.name ?? "—",
      _division: div?.name ?? comm?.division_name ?? "—",
      _budget: formatBudget(l.budget_min, l.budget_max),
      _last_activity: relativeTime(l.last_activity_at),
    };
  });

  const allRows = leads.map(l => {
    const comm = communities.find(c => c.id === l.community_id);
    const div = divisions.find(d => d.id === l.division_id);
    return { ...l, _name: `${l.first_name} ${l.last_name}`, _community: comm?.name ?? "—", _division: div?.name ?? "—", _budget: formatBudget(l.budget_min, l.budget_max), _last_activity: relativeTime(l.last_activity_at) };
  });

  const tableColumns: Column<LeadRow>[] = [
    {
      key: "_name", label: "Name", sortable: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._name}</span>,
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
      key: "agent_name", label: "Agent", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.agent_name ?? "—"}</span>,
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

  const community = selected ? communities.find(c => c.id === selected.community_id) : null;

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

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={community?.name ?? undefined}
        badge={selected ? (
          <Badge variant="custom" label={getStageLabel(selected.stage)}
            customColor={isActiveStage(selected.stage) ? "#4ade80" : "#888"}
            customBg={isActiveStage(selected.stage) ? "#1a2a1a" : "#2a2b2e"}
            customBorder={isActiveStage(selected.stage) ? "#1f3f1f" : "#444"} />
        ) : undefined}
        width={480}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
              <Row label="Source" value={selected.source} />
            </Section>
            <Section title="Interest">
              <Row label="Community" value={community?.name} />
              <Row label="Budget" value={formatBudget(selected.budget_min, selected.budget_max)} />
              <Row label="Bedrooms" value={selected.bedrooms != null ? String(selected.bedrooms) : null} />
              <Row label="Desired Move" value={selected.desired_move_date ? new Date(selected.desired_move_date).toLocaleDateString() : null} />
            </Section>
            <Section title="Assignment">
              <Row label="Agent" value={selected.agent_name} />
              <Row label="Substage" value={selected.substage} />
              <Row label="Last Activity" value={selected.last_activity_at ? new Date(selected.last_activity_at).toLocaleString() : null} />
              <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />
            </Section>
            {selected.notes && (
              <Section title="Notes">
                <p style={{ fontSize: 13, color: "#888", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{selected.notes}</p>
              </Section>
            )}
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

export default function LeadsClient(props: Props) {
  return <LeadsInner {...props} />;
}
