"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import PageShell from "@/components/PageShell";
import TableSubHeader, { exportToCSV, type StatConfig } from "@/components/TableSubHeader";
import OpportunityPanel from "@/components/OpportunityPanel";
import type { OpportunityPanelData } from "@/components/OpportunityPanel";
import DataTable, { type Column } from "@/components/DataTable";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmTask {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  channel: string | null;
  status: string;
  sla_id: string | null;
  sla_breach_at: string | null;
  sla_target_minutes: number | null;
  actual_minutes: number | null;
  contact_id: string | null;
  opportunity_id: string | null;
  assigned_to_id: string | null;
  community_id: string | null;
  division_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string; phone: string | null } | null;
  users: { full_name: string } | null;
  communities: { name: string } | null;
  divisions: { name: string } | null;
}

type TaskRow = CrmTask & Record<string, unknown> & {
  _contact: string;
  _assignee: string;
  _community: string;
  _division: string;
  _age: string;
  _sla_label: string;
  _overdue: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SLA_LABELS: Record<string, string> = {
  osc_acknowledge: "OSC Acknowledge",
  osc_route: "OSC Route",
  csm_rank: "CSM Rank",
  csm_first_outreach: "CSM First Outreach",
  nr_sms: "SMS Response",
  nr_email: "Email Response",
  nr_call: "Callback",
  prospect_a_followup: "Prospect A Follow-up",
  prospect_b_followup: "Prospect B Follow-up",
  prospect_c_followup: "Prospect C Follow-up",
  prospect_stale: "Stale Prospect",
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS: StatConfig<TaskRow>[] = [
  { label: "Active", getValue: (r) => r.filter(x => x.status === "pending").length },
  { label: "SLA Breach", getValue: (r) => r.filter(x => x.channel === "sla_breach").length },
  { label: "Completed", getValue: (r) => r.filter(x => x.status === "completed").length },
];

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Deep-link helper: resolve the correct OpportunityPanel tab for an SLA violation ──
function resolveViolationTab(slaId: string | null): "contact" | "activity" | undefined {
  if (!slaId) return undefined;
  if (slaId.startsWith("nr_") || slaId.startsWith("prospect_")) return "activity";
  return undefined; // default tab for osc_*, csm_*
}

export default function ViolationsPage() {
  const { filter } = useGlobalFilter();
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed" | "all">("pending");
  const [panelData, setPanelData] = useState<OpportunityPanelData | null>(null);
  const [panelTab, setPanelTab] = useState<"contact" | "activity" | undefined>(undefined);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("tasks")
      .select("*, contacts(first_name, last_name, phone), users!tasks_assigned_to_id_fkey(full_name), communities(name), divisions(name)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (filter.divisionId) query = query.eq("division_id", filter.divisionId);
    if (filter.communityId) query = query.eq("community_id", filter.communityId);
    if (filter.userId) query = query.eq("assigned_to_id", filter.userId);

    const { data, error } = await query;
    if (error) {
      console.error("Tasks fetch error:", error);
      // Fallback without FK join on users
      const { data: fallback } = await supabase
        .from("tasks")
        .select("*, contacts(first_name, last_name, phone), communities(name), divisions(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      setTasks((fallback ?? []).map((t: any) => ({
        ...t,
        contacts: Array.isArray(t.contacts) ? t.contacts[0] : t.contacts,
        users: null,
        communities: Array.isArray(t.communities) ? t.communities[0] : t.communities,
        divisions: Array.isArray(t.divisions) ? t.divisions[0] : t.divisions,
      })));
    } else {
      setTasks((data ?? []).map((t: any) => ({
        ...t,
        contacts: Array.isArray(t.contacts) ? t.contacts[0] : t.contacts,
        users: Array.isArray(t.users) ? t.users[0] : t.users,
        communities: Array.isArray(t.communities) ? t.communities[0] : t.communities,
        divisions: Array.isArray(t.divisions) ? t.divisions[0] : t.divisions,
      })));
    }
    setLoading(false);
  }, [filter.divisionId, filter.communityId, filter.userId, statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { setPage(0); }, [search, statusFilter, filter.divisionId, filter.communityId, filter.userId]);

  async function handleComplete(taskId: string) {
    await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", taskId);
    fetchTasks();
  }

  async function handleDismiss(taskId: string) {
    await supabase.from("tasks").update({ status: "cancelled" }).eq("id", taskId);
    fetchTasks();
  }

  const filtered = tasks.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q) ||
      (t.contacts?.first_name ?? "").toLowerCase().includes(q) ||
      (t.contacts?.last_name ?? "").toLowerCase().includes(q);
  });

  const tableRows: TaskRow[] = filtered.map(t => ({
    ...t,
    _contact: t.contacts ? `${t.contacts.first_name} ${t.contacts.last_name}` : "—",
    _assignee: t.users?.full_name ?? "Unassigned",
    _community: t.communities?.name ?? "—",
    _division: t.divisions?.name ?? "—",
    _age: relativeTime(t.created_at),
    _sla_label: t.sla_id ? (SLA_LABELS[t.sla_id] ?? t.sla_id) : "Manual",
    _overdue: t.actual_minutes && t.sla_target_minutes
      ? `${Math.round(t.actual_minutes - t.sla_target_minutes)}m over`
      : "—",
  }));

  const columns: Column<TaskRow>[] = [
    {
      key: "title", label: "Violation", sortable: true,
      render: (_v, row) => (
        <div style={{ maxWidth: 300, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#fafafa", lineHeight: 1.4 }}>{row.title}</div>
            {row._contact !== "—" && <div style={{ fontSize: 10, color: "#52525b" }}>{row._contact}</div>}
          </div>
          {row.opportunity_id && <span style={{ color: "#71717a", fontSize: 12, flexShrink: 0 }}>→</span>}
        </div>
      ),
    },
    {
      key: "_sla_label", label: "SLA Type", sortable: true, filterable: true,
      render: (_v, row) => (
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
          backgroundColor: row.channel === "sla_breach" ? "#7f1d1d" : "#18181b",
          color: row.channel === "sla_breach" ? "#fca5a5" : "#a1a1aa",
        }}>{row._sla_label}</span>
      ),
    },
    { key: "_assignee", label: "Assigned To", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: row._assignee === "Unassigned" ? "#f87171" : "#a1a1aa", fontSize: 12 }}>{row._assignee}</span> },
    { key: "_community", label: "Community", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._community}</span> },
    { key: "_division", label: "Division", sortable: true, filterable: true, render: (_v, row) => <span style={{ color: "#888", fontSize: 12 }}>{row._division}</span> },
    { key: "_overdue", label: "Over SLA", sortable: true, render: (_v, row) => <span style={{ color: row._overdue !== "—" ? "#f87171" : "#52525b", fontSize: 12 }}>{row._overdue}</span> },
    { key: "_age", label: "Created", sortable: true, render: (_v, row) => <span style={{ color: "#71717a", fontSize: 12 }}>{row._age}</span> },
    {
      key: "status", label: "Actions", sortable: false,
      render: (_v, row) => (
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 3, fontWeight: 600,
          backgroundColor: row.status === "pending" ? "#7f1d1d" : row.status === "completed" ? "#052e16" : "#18181b",
          color: row.status === "pending" ? "#fca5a5" : row.status === "completed" ? "#4ade80" : "#71717a",
        }}>
          {row.status === "pending" ? "Active" : row.status === "completed" ? "Auto-completed" : row.status}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      topBar={
        <TableSubHeader
          title="Violations"
          rows={tableRows}
          totalRows={tableRows.length}
          stats={STATS}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(0); }}
          search={search}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search violations…"
          onExport={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "violations")}
          onExportAll={() => exportToCSV(tableRows as unknown as Record<string, unknown>[], "violations-all")}
        />
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", color: "#52525b", padding: 48, fontSize: 13 }}>Loading violations...</div>
      ) : (
        <DataTable<TaskRow>
          columns={columns}
          rows={tableRows}
          controlledPage={page}
          controlledPageSize={pageSize}
          defaultPageSize={pageSize}
          onRowClick={async (row) => {
            if (row.opportunity_id) {
              // Fetch opportunity data and open panel
              const { data: opp } = await supabase
                .from("opportunities")
                .select("id, contact_id, crm_stage, source, community_id, division_id, budget_min, budget_max, notes, last_activity_at, created_at, contacts(first_name, last_name, email, phone), communities(name), divisions(name)")
                .eq("id", row.opportunity_id)
                .single();
              if (opp) {
                const c = Array.isArray(opp.contacts) ? opp.contacts[0] : opp.contacts;
                const comm = Array.isArray(opp.communities) ? opp.communities[0] : opp.communities;
                const div = Array.isArray(opp.divisions) ? opp.divisions[0] : opp.divisions;
                setPanelData({
                  id: opp.id,
                  contact_id: opp.contact_id,
                  first_name: c?.first_name ?? "—",
                  last_name: c?.last_name ?? "",
                  email: c?.email ?? null,
                  phone: c?.phone ?? null,
                  stage: opp.crm_stage,
                  source: opp.source ?? null,
                  community_name: comm?.name ?? null,
                  division_name: div?.name ?? null,
                  budget_min: opp.budget_min ?? null,
                  budget_max: opp.budget_max ?? null,
                  floor_plan_name: null,
                  notes: opp.notes ?? null,
                  last_activity_at: opp.last_activity_at ?? null,
                  created_at: opp.created_at,
                });
                setPanelTab(resolveViolationTab(row.sla_id) ?? undefined);
              }
            }
          }}
          emptyMessage={statusFilter === "pending" ? "No violations — all clear" : "No violations match the current filter"}
          minWidth={1000}
        />
      )}

      {panelData && (
        <OpportunityPanel open={!!panelData} onClose={() => { setPanelData(null); setPanelTab(undefined); }} opportunity={panelData} initialTab={panelTab} />
      )}
    </PageShell>
  );
}
