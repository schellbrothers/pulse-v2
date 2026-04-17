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
    lead: "Lead", prospect: "Prospect", customer: "Customer", homeowner: "Homeowner",
    marketing: "Marketing", opportunity: "Opportunity",
  };
  return map[stage] ?? stage;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<ContactRow>[] = [
  { label: "Total", getValue: (r) => r.length },
  { label: "Active Leads", getValue: (r) => r.filter(x => x.lifecycle_stage === "lead").length },
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
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500 }}>{row._name}</span>,
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

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name} ${selected.last_name}` : ""}
        subtitle={selected?.lifecycle_stage ? getLifecycleLabel(selected.lifecycle_stage) : undefined}
        badge={selected?.lifecycle_stage ? (
          <Badge variant="custom" label={getLifecycleLabel(selected.lifecycle_stage)}
            customColor={selected.lifecycle_stage === "homeowner" ? "#4ade80" : "#59a6bd"}
            customBg={selected.lifecycle_stage === "homeowner" ? "#1a2a1a" : "#1a2a3a"}
            customBorder={selected.lifecycle_stage === "homeowner" ? "#1f3f1f" : "#1f3f5f"} />
        ) : undefined}
        width={520}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            <Section title="Contact Info">
              <Row label="Email" value={selected.email ? <a href={`mailto:${selected.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>{selected.email}</a> : null} />
              <Row label="Phone" value={selected.phone} />
              <Row label="Source" value={selected.source} />
              <Row label="Lifecycle" value={getLifecycleLabel(selected.lifecycle_stage)} />
              <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />
            </Section>

            <Section title={`Members (${selected.members.length})`}>
              {selected.members.length === 0 ? (
                <p style={{ fontSize: 13, color: "#666", margin: 0 }}>No members</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.members.map(m => (
                    <div key={m.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: "#2a2b2e", borderRadius: 6,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#ededed", fontWeight: 500 }}>
                          {m.first_name ?? ""} {m.last_name ?? ""}
                        </div>
                        {m.relationship && (
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{m.relationship}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {m.role && (
                          <Badge variant="custom" label={m.role}
                            customColor="#888" customBg="#333" customBorder="#444" />
                        )}
                        {m.is_primary && (
                          <Badge variant="custom" label="Primary"
                            customColor="#4ade80" customBg="#1a2a1a" customBorder="#1f3f1f" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Opportunities (${selected.opportunities.length})`}>
              {selected.opportunities.length === 0 ? (
                <p style={{ fontSize: 13, color: "#666", margin: 0 }}>No opportunities</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.opportunities.map(o => (
                    <div key={o.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: "#2a2b2e", borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 13, color: "#ededed" }}>
                        {o.communities?.name ?? "Unknown Community"}
                      </div>
                      <Badge variant="custom" label={o.crm_stage ? getStageLabel(o.crm_stage) : "—"}
                        customColor="#59a6bd" customBg="#1a2a3a" customBorder="#1f3f5f" />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

export default function ContactsClient(props: Props) {
  return <ContactsInner {...props} />;
}
