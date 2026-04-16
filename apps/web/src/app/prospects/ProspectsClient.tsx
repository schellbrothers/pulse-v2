"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import DataTable, { type Column } from "@/components/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community { id: string; name: string; slug: string | null; division_slug: string; division_name: string; }
interface Division { id: string; slug: string; name: string; }

interface Prospect {
  id: string;
  contact_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  crm_stage: string;
  community_id: string | null;
  community_name: string | null;
  division_id: string | null;
  floor_plan_name: string | null;
  csm_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  contract_date: string | null;
  estimated_move_in: string | null;
  last_activity_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

type ProspectRow = Prospect & Record<string, unknown> & {
  _name: string;
  _community: string;
  _division: string;
  _stage_label: string;
  _budget: string;
  _last_activity: string;
};

interface Props {
  prospects: Prospect[];
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

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
}

function getStageLabel(stage: string): string {
  const map: Record<string, string> = { prospect_c: "Prospect C", prospect_b: "Prospect B", prospect_a: "Prospect A" };
  return map[stage] ?? stage;
}

function getStageColor(stage: string): { color: string; bg: string; border: string } {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    prospect_c: { color: "#f5a623", bg: "#2a2a1a", border: "#3f3a1f" },
    prospect_b: { color: "#0070f3", bg: "#1a1f2e", border: "#1a2a3f" },
    prospect_a: { color: "#00c853", bg: "#1a2a1a", border: "#1f3f1f" },
  };
  return map[stage] ?? { color: "#888", bg: "#2a2b2e", border: "#444" };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<ProspectRow>[] = [
  { label: "Prospect A", getValue: (r) => r.filter(x => x.crm_stage === "prospect_a").length },
  { label: "Prospect B", getValue: (r) => r.filter(x => x.crm_stage === "prospect_b").length },
  { label: "Prospect C", getValue: (r) => r.filter(x => x.crm_stage === "prospect_c").length },
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

function ProspectsInner({ prospects, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  const filtered = prospects.filter(p => {
    if (filter.communityId && p.community_id !== filter.communityId) return false;
    if (filter.divisionId && p.division_id !== filter.divisionId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${p.first_name} ${p.last_name}`.toLowerCase().includes(q) &&
          !(p.email ?? "").toLowerCase().includes(q) &&
          !(p.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  const tableRows: ProspectRow[] = filtered.map(p => {
    const comm = communities.find(c => c.id === p.community_id);
    const div = divisions.find(d => d.id === p.division_id);
    return {
      ...p,
      _name: `${p.first_name} ${p.last_name}`,
      _community: comm?.name ?? p.community_name ?? "—",
      _division: div?.name ?? comm?.division_name ?? "—",
      _stage_label: getStageLabel(p.crm_stage),
      _budget: formatBudget(p.budget_min, p.budget_max),
      _last_activity: relativeTime(p.last_activity_at),
    };
  });

  const allRows = prospects.map(p => {
    const comm = communities.find(c => c.id === p.community_id);
    return { ...p, _name: `${p.first_name} ${p.last_name}`, _community: comm?.name ?? "—", _division: comm?.division_name ?? "—", _stage_label: getStageLabel(p.crm_stage), _budget: formatBudget(p.budget_min, p.budget_max), _last_activity: relativeTime(p.last_activity_at) };
  });

  const tableColumns: Column<ProspectRow>[] = [
    { key: "_name", label: "Name", sortable: true, render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._name}</span> },
    { key: "_stage_label", label: "Stage", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._stage_label}</span> },
    { key: "_community", label: "Community", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._community}</span> },
    { key: "_division", label: "Division", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._division}</span> },
    { key: "floor_plan_name", label: "Floor Plan", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.floor_plan_name ?? "—"}</span> },
    { key: "_budget", label: "Budget", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._budget}</span> },
    { key: "contract_date", label: "Contract Date", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.contract_date ? new Date(row.contract_date).toLocaleDateString() : "—"}</span> },
    { key: "_last_activity", label: "Last Activity", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._last_activity}</span> },
    { key: "created_at", label: "Created", sortable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString()}</span> },
  ];

  const community = selected ? communities.find(c => c.id === selected.community_id) : null;
  const stageCfg = selected ? getStageColor(selected.crm_stage) : null;

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Prospects"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search prospects…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "prospects")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "prospects-all")}
        />
      }
    >
      <DataTable<ProspectRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No prospects match the current filter"
        minWidth={1200}
      />

      <SlideOver open={!!selected} onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={community?.name ?? selected?.community_name ?? undefined}
        badge={selected && stageCfg ? <Badge variant="custom" label={getStageLabel(selected.crm_stage)} customColor={stageCfg.color} customBg={stageCfg.bg} customBorder={stageCfg.border} /> : undefined}
        width={480}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
            </Section>
            <Section title="Interest">
              <Row label="Community" value={community?.name ?? selected.community_name} />
              <Row label="Floor Plan" value={selected.floor_plan_name} />
              <Row label="Budget" value={formatBudget(selected.budget_min, selected.budget_max)} />
              <Row label="Contract Date" value={selected.contract_date ? new Date(selected.contract_date).toLocaleDateString() : null} />
              <Row label="Est. Move-In" value={selected.estimated_move_in ? new Date(selected.estimated_move_in).toLocaleDateString() : null} />
            </Section>
            <Section title="Activity">
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

export default function ProspectsClient(props: Props) {
  return <ProspectsInner {...props} />;
}
