"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import OpportunityPanel from "@/components/OpportunityPanel";
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

interface ContactMember {
  id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  is_primary: boolean | null;
  relationship: string | null;
}

interface Opportunity {
  id: string;
  crm_stage: string | null;
  community_id: string | null;
  communities: { name: string } | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  lifecycle_stage: string | null;
  created_at: string;
  members: ContactMember[];
  member_count: number;
  opportunities: Opportunity[];
  opportunity_count: number;
  stages: string[];
  communities: string[];
}

type ContactRow = Contact & Record<string, unknown> & {
  _name: string;
  _stages: string;
  _communities: string;
};

interface Props {
  contacts: Contact[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    marketing: "Marketing", lead: "Lead", opportunity: "Opportunity",
    new: "New", contacted: "Contacted", touring: "Touring",
    prospect: "Prospect", customer: "Customer", homeowner: "Homeowner",
    "under-contract": "Under Contract", "closed-won": "Closed Won", "closed-lost": "Closed Lost",
  };
  return map[stage] ?? stage;
}

function getLifecycleLabel(stage: string | null): string {
  if (!stage) return "—";
  const map: Record<string, string> = {
    lead: "Lead", lead_com: "Lead (Community)", lead_div: "Lead (Division)",
    prospect: "Prospect", customer: "Customer", homeowner: "Homeowner",
    opportunity: "Opportunity",
  };
  return map[stage] ?? stage;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<ContactRow>[] = [
  { label: "Total", getValue: (r) => r.length },
  { label: "Active Leads", getValue: (r) => r.filter(x => x.lifecycle_stage === "lead" || x.lifecycle_stage === "lead_com" || x.lifecycle_stage === "lead_div").length },
  { label: "Prospects", getValue: (r) => r.filter(x => x.lifecycle_stage === "prospect").length },
  { label: "Homeowners", getValue: (r) => r.filter(x => x.lifecycle_stage === "homeowner").length },
];

// ─── Component ────────────────────────────────────────────────────────────────

function ContactsInner({ contacts, communities, divisions }: Props) {
  const { filter } = useGlobalFilter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => { setPage(0); }, [search, filter.divisionId, filter.communityId]);

  // Filter
  const filtered = contacts.filter(c => {
    if (filter.communityId) {
      const hasComm = c.opportunities.some(o => o.community_id === filter.communityId);
      if (!hasComm) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!`${c.first_name} ${c.last_name}`.toLowerCase().includes(q) &&
          !(c.email ?? "").toLowerCase().includes(q) &&
          !(c.phone ?? "").includes(q)) return false;
    }
    return true;
  });

  // Enrich rows
  const tableRows: ContactRow[] = filtered.map(c => ({
    ...c,
    _name: `${c.first_name} ${c.last_name}`,
    _stages: c.stages.map(getStageLabel).join(", ") || "—",
    _communities: c.communities.join(", ") || "—",
  }));

  const allRows = contacts.map(c => ({
    ...c,
    _name: `${c.first_name} ${c.last_name}`,
    _stages: c.stages.map(getStageLabel).join(", ") || "—",
    _communities: c.communities.join(", ") || "—",
  }));

  const tableColumns: Column<ContactRow>[] = [
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
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.source ?? "—"}</span>,
    },
    {
      key: "lifecycle_stage", label: "Lifecycle", sortable: true, filterable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{getLifecycleLabel(row.lifecycle_stage)}</span>,
    },
    {
      key: "member_count", label: "Members", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.member_count}</span>,
    },
    {
      key: "opportunity_count", label: "Opportunities", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.opportunity_count}</span>,
    },
    {
      key: "_stages", label: "Stages", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._stages}</span>,
    },
    {
      key: "_communities", label: "Communities", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._communities}</span>,
    },
    {
      key: "created_at", label: "Created", sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{new Date(row.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Contacts"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search contacts…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "contacts")}
          onExportAll={() => exportToCSV(allRows as unknown as Record<string, unknown>[], "contacts-all")}
        />
      }
    >
      <DataTable<ContactRow>
        columns={tableColumns}
        rows={tableRows}
        controlledPage={page}
        controlledPageSize={pageSize}
        defaultPageSize={pageSize}
        onRowClick={row => setSelected(row)}
        emptyMessage="No contacts match the current filter"
        minWidth={1200}
      />

      <OpportunityPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        opportunity={selected ? {
          id: selected.id,
          contact_id: selected.id,
          first_name: selected.first_name,
          last_name: selected.last_name,
          email: selected.email,
          phone: selected.phone,
          stage: selected.lifecycle_stage ?? "lead",
          source: selected.source,
          community_name: selected.communities[0] ?? null,
          division_name: null,
          budget_min: null,
          budget_max: null,
          floor_plan_name: null,
          notes: null,
          last_activity_at: null,
          created_at: selected.created_at,
        } : null}
      />
    </PageShell>
  );
}

export default function ContactsClient(props: Props) {
  return <ContactsInner {...props} />;
}
