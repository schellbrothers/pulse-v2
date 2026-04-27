"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import OpportunityPanel, { type OpportunityPanelData } from "@/components/OpportunityPanel";
import CommunityView from "../csm/CommunityDashboard";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  division_id: string;
}

interface CommunityBreakdown {
  communityId: string;
  communityName: string;
  lead_div: number;
  lead_com: number;
  queue: number;
  csm_queue: number;
  prospect_a: number;
  prospect_b: number;
  prospect_c: number;
  homeowner: number;
  totalPipeline: number;
  avgDaysInStage: number;
  lastActivity: string | null;
}

interface PipelineCounts {
  lead_div: number;
  lead_com: number;
  queue: number;
  csm_queue: number;
  prospect_a: number;
  prospect_b: number;
  prospect_c: number;
  homeowner: number;
}

interface FunnelRates {
  leadDivToLeadCom: number;
  leadComToQueue: number;
  queueToProspect: number;
  prospectToHomeowner: number;
}

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
}

interface StageTransition {
  id: string;
  contact_id: string;
  opportunity_id: string;
  created_at: string;
  from_stage: string;
  to_stage: string;
  triggered_by: string | null;
  contacts: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  communities: { name: string } | null;
}

interface MonthSales {
  month: string;
  sales: number;
  goal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_ORDER = ["lead_div", "lead_com", "queue", "prospect_c", "prospect_b", "prospect_a", "homeowner"] as const;

const STUBBED_MONTHLY_GOALS: MonthSales[] = [
  { month: "JAN", sales: 0, goal: 8 },
  { month: "FEB", sales: 0, goal: 8 },
  { month: "MAR", sales: 0, goal: 10 },
  { month: "APR", sales: 0, goal: 10 },
  { month: "MAY", sales: 0, goal: 12 },
  { month: "JUN", sales: 0, goal: 12 },
  { month: "JUL", sales: 0, goal: 12 },
  { month: "AUG", sales: 0, goal: 12 },
  { month: "SEP", sales: 0, goal: 10 },
  { month: "OCT", sales: 0, goal: 10 },
  { month: "NOV", sales: 0, goal: 8 },
  { month: "DEC", sales: 0, goal: 8 },
];

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

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    lead_div: "Lead (Division)",
    lead_com: "Lead (Community)",
    queue: "Queue",
    prospect_c: "Prospect C",
    prospect_b: "Prospect B",
    prospect_a: "Prospect A",
    homeowner: "Homeowner",
  };
  return map[stage] ?? stage;
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 13, fontWeight: 600, color: "#fafafa", marginBottom: 16,
        paddingBottom: 8, borderBottom: "1px solid #27272a",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, subtitle, alert: isAlert, color,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  alert?: boolean;
  color?: string;
}) {
  return (
    <div style={{
      padding: "16px 20px",
      backgroundColor: "#18181b",
      border: `1px solid ${isAlert ? "#991b1b" : "#27272a"}`,
      borderRadius: 8,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
      flex: 1,
    }}>
      <span style={{
        fontSize: 11, color: "#71717a", fontWeight: 500,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>{label}</span>
      <span style={{
        fontSize: 24, fontWeight: 600, lineHeight: 1.2,
        color: isAlert ? "#f87171" : color ?? "#fafafa",
      }}>{value}</span>
      {subtitle && <span style={{ fontSize: 11, color: "#52525b" }}>{subtitle}</span>}
    </div>
  );
}

// ─── Sales Performance Strip ──────────────────────────────────────────────────

function SalesPerformanceStrip({ monthData }: { monthData: MonthSales[] }) {
  const ytdSales = monthData.reduce((s, m) => s + m.sales, 0);
  const ytdGoal = monthData.reduce((s, m) => s + m.goal, 0);
  const variance = ytdSales - ytdGoal;

  return (
    <div style={{
      display: "flex", alignItems: "stretch", gap: 0,
      border: "1px solid #27272a", borderRadius: 8, overflow: "hidden", backgroundColor: "#09090b",
    }}>
      <div style={{
        padding: "12px 20px", borderRight: "1px solid #27272a",
        display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 140, gap: 2,
      }}>
        <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>YTD Sales</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: "#fafafa" }}>{ytdSales}</span>
        <span style={{ fontSize: 11, color: "#52525b" }}>Goal: {ytdGoal}</span>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: variance >= 0 ? "#4ade80" : "#f87171",
        }}>
          {variance >= 0 ? "+" : ""}{variance} variance
        </span>
      </div>
      {monthData.map((m) => {
        const met = m.sales >= m.goal && m.goal > 0;
        return (
          <div key={m.month} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "10px 4px", borderRight: "1px solid #18181b",
            borderBottom: `2px solid ${met ? "#22c55e" : "#27272a"}`, minWidth: 0,
          }}>
            <span style={{ fontSize: 10, color: "#52525b", fontWeight: 500, letterSpacing: "0.05em" }}>{m.month}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: m.sales > 0 ? "#fafafa" : "#3f3f46", marginTop: 2 }}>{m.sales}</span>
            <span style={{ fontSize: 9, color: "#3f3f46" }}>/{m.goal}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Conversion Funnel ────────────────────────────────────────────────────────

function ConversionFunnel({ rates }: { rates: FunnelRates }) {
  const steps = [
    { from: "Lead (Div)", to: "Lead (Com)", rate: rates.leadDivToLeadCom },
    { from: "Lead (Com)", to: "Queue", rate: rates.leadComToQueue },
    { from: "Queue", to: "Prospect", rate: rates.queueToProspect },
    { from: "Prospect", to: "Homeowner", rate: rates.prospectToHomeowner },
  ];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      border: "1px solid #27272a", borderRadius: 8, overflow: "hidden", backgroundColor: "#09090b",
    }}>
      {steps.map((step, i) => (
        <div key={step.from} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          padding: "16px 8px", borderRight: i < steps.length - 1 ? "1px solid #27272a" : "none",
          position: "relative",
        }}>
          <span style={{ fontSize: 10, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {step.from}
          </span>
          <span style={{ fontSize: 11, color: "#52525b", margin: "4px 0" }}>→</span>
          <span style={{ fontSize: 10, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {step.to}
          </span>
          <span style={{
            fontSize: 18, fontWeight: 700, marginTop: 8,
            color: step.rate > 50 ? "#4ade80" : step.rate > 20 ? "#fbbf24" : "#f87171",
          }}>
            {step.rate.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Community Drill-Down (Mode 2) ───────────────────────────────────────────

function CommunityDrillDown({
  communityId,
  communityName,
}: {
  communityId: string;
  communityName: string;
}) {
  const [community, setCommunity] = useState<Record<string, any> | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [modelHome, setModelHome] = useState<any>(null);
  const [specHomes, setSpecHomes] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      const [commRes, planRes, lotRes, modelRes, specRes, divRes] = await Promise.all([
        supabase.from("communities").select("*").eq("id", communityId).single(),
        supabase.from("community_plans").select("*").eq("community_id", communityId).order("net_price"),
        supabase.from("lots").select("id,community_id,lot_number,lot_status,construction_status,is_available,lot_premium,address,phase,is_buildable").eq("community_id", communityId).order("lot_number"),
        supabase.from("model_homes").select("*").eq("community_id", communityId).maybeSingle(),
        supabase.from("spec_homes").select("*").eq("community_id", communityId),
        supabase.from("divisions").select("id,name,slug"),
      ]);

      if (cancelled) return;

      let resolvedModelHome = modelRes.data;
      if (!resolvedModelHome && commRes.data?.name) {
        const { data: mhByName } = await supabase
          .from("model_homes").select("*").eq("community_name", commRes.data.name).maybeSingle();
        resolvedModelHome = mhByName;
      }

      let resolvedSpecHomes = specRes.data ?? [];
      if (resolvedSpecHomes.length === 0 && commRes.data?.name) {
        const { data: shByName } = await supabase
          .from("spec_homes").select("*").eq("community_name", commRes.data.name);
        resolvedSpecHomes = shByName ?? [];
      }

      if (cancelled) return;
      setCommunity(commRes.data);
      setPlans(planRes.data ?? []);
      setLots(lotRes.data ?? []);
      setModelHome(resolvedModelHome);
      setSpecHomes(resolvedSpecHomes);
      setDivisions(divRes.data ?? []);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [communityId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 13 }}>
        Loading community data...
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 13 }}>
        Community not found
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* DSM Banner */}
      <div style={{
        padding: "10px 24px",
        backgroundColor: "#172554",
        borderBottom: "1px solid #1e3a8a",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 13, color: "#93c5fd" }}>
          Viewing as DSM — <strong style={{ color: "#fafafa" }}>{communityName}</strong> — Read Only
        </span>
      </div>
      <CommunityView
        community={community}
        plans={plans}
        lots={lots}
        modelHome={modelHome}
        specHomes={specHomes}
        divisions={divisions}
        readOnly
      />
    </div>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, color: "#555", padding: 48,
    }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>Stats</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#888" }}>DSM Command Center</div>
      <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Select a <strong style={{ color: "#a855f7" }}>Division</strong> from
        the global filters above to load your division overview.
      </div>
      <div style={{
        marginTop: 8, fontSize: 11, color: "#444", padding: "8px 16px",
        backgroundColor: "#161616", borderRadius: 6, border: "1px solid #2a2a2a",
      }}>
        Division → Overview loads automatically
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DsmClient() {
  const { filter, labels, setCommunity: setGlobalCommunity } = useGlobalFilter();

  // Division overview data
  const [communities, setCommunities] = useState<Community[]>([]);
  const [pipeline, setPipeline] = useState<PipelineCounts>({
    lead_div: 0, lead_com: 0, queue: 0, csm_queue: 0, prospect_a: 0, prospect_b: 0, prospect_c: 0, homeowner: 0,
  });
  const [communityBreakdown, setCommunityBreakdown] = useState<CommunityBreakdown[]>([]);
  const [funnelRates, setFunnelRates] = useState<FunnelRates>({
    leadDivToLeadCom: 0, leadComToQueue: 0, queueToProspect: 0, prospectToHomeowner: 0,
  });
  const [monthData, setMonthData] = useState<MonthSales[]>(STUBBED_MONTHLY_GOALS);
  const [oscTeam, setOscTeam] = useState<TeamMember[]>([]);
  const [csmTeam, setCsmTeam] = useState<TeamMember[]>([]);
  const [panelData, setPanelData] = useState<OpportunityPanelData | null>(null);
  const [recentTransitions, setRecentTransitions] = useState<StageTransition[]>([]);
  const [oscQueueCounts, setOscQueueCounts] = useState<Record<string, number>>({});
  const [csmProspectCounts, setCsmProspectCounts] = useState<Record<string, number>>({});
  const [csmCommAssignments, setCsmCommAssignments] = useState<Record<string, string>>({});
  const [taskCount, setTaskCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Fetch division overview data
  const fetchDivisionData = useCallback(async () => {
    setLoading(true);

    try {
      // Communities — all or filtered by division
      const commQuery = supabase
        .from("communities")
        .select("id, name, division_id")
        .order("name");
      if (filter.divisionId) commQuery.eq("division_id", filter.divisionId);
      const { data: comms } = await commQuery;
      const commList = (comms ?? []) as Community[];
      setCommunities(commList);
      const commIds = commList.map(c => c.id);

      // All opportunities in division
      const oppQuery = supabase
        .from("opportunities")
        .select("id, crm_stage, community_id, csm_id, created_at, last_activity_at");
      if (filter.divisionId) oppQuery.eq("division_id", filter.divisionId);
      const { data: opps } = await oppQuery;
      const oppList = opps ?? [];

      // Pipeline counts
      const counts: PipelineCounts = {
        lead_div: 0, lead_com: 0, queue: 0, csm_queue: 0, prospect_a: 0, prospect_b: 0, prospect_c: 0, homeowner: 0,
      };
      for (const o of oppList) {
        const stage = o.crm_stage as keyof PipelineCounts;
        if (stage in counts) counts[stage]++;
      }
      setPipeline(counts);

      // Monthly sales (homeowners created by month this year)
      const currentYear = new Date().getFullYear();
      const homeowners = oppList.filter(o => o.crm_stage === "homeowner");
      const updatedMonths = STUBBED_MONTHLY_GOALS.map((m, i) => {
        const sales = homeowners.filter(h => {
          const d = new Date(h.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === i;
        }).length;
        return { ...m, sales };
      });
      setMonthData(updatedMonths);

      // Community breakdown
      const breakdown: CommunityBreakdown[] = commList.map(comm => {
        const commOpps = oppList.filter(o => o.community_id === comm.id);
        const stages: Record<string, number> = {
          lead_div: 0, lead_com: 0, queue: 0, csm_queue: 0, prospect_a: 0, prospect_b: 0, prospect_c: 0, homeowner: 0,
        };
        let totalDays = 0;
        let countWithActivity = 0;
        let latestActivity: string | null = null;

        for (const o of commOpps) {
          if (o.crm_stage in stages) stages[o.crm_stage]++;
          if (o.last_activity_at) {
            const days = Math.floor((Date.now() - new Date(o.last_activity_at).getTime()) / 86400000);
            totalDays += days;
            countWithActivity++;
            if (!latestActivity || o.last_activity_at > latestActivity) {
              latestActivity = o.last_activity_at;
            }
          }
        }

        return {
          communityId: comm.id,
          communityName: comm.name,
          lead_div: stages.lead_div,
          lead_com: stages.lead_com,
          queue: stages.queue,
          csm_queue: stages.csm_queue,
          prospect_a: stages.prospect_a,
          prospect_b: stages.prospect_b,
          prospect_c: stages.prospect_c,
          homeowner: stages.homeowner,
          totalPipeline: commOpps.length,
          avgDaysInStage: countWithActivity > 0 ? Math.round(totalDays / countWithActivity) : 0,
          lastActivity: latestActivity,
        };
      });
      setCommunityBreakdown(breakdown);

      // Funnel rates (approximate from current counts)
      const totalLeadDiv = counts.lead_div || 1;
      const totalLeadCom = counts.lead_com || 1;
      const totalQueue = counts.queue || 1;
      const totalProspects = counts.prospect_a + counts.prospect_b + counts.prospect_c || 1;
      setFunnelRates({
        leadDivToLeadCom: (counts.lead_com / totalLeadDiv) * 100,
        leadComToQueue: (counts.queue / totalLeadCom) * 100,
        queueToProspect: (totalProspects / totalQueue) * 100,
        prospectToHomeowner: (counts.homeowner / totalProspects) * 100,
      });

      // Team members
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, role")
        .in("role", ["osc", "csm"])
        .eq("is_active", true);
      const userList = (users ?? []) as TeamMember[];
      setOscTeam(userList.filter(u => u.role === "osc"));
      setCsmTeam(userList.filter(u => u.role === "csm"));

      // OSC queue counts (tasks assigned to each OSC)
      const { data: queueTasks } = await supabase
        .from("tasks")
        .select("assigned_to_id")
        .eq("status", "pending")
        .in("community_id", commIds.length > 0 ? commIds : ["__none__"]);
      const qCounts: Record<string, number> = {};
      for (const t of queueTasks ?? []) {
        if (t.assigned_to_id) {
          qCounts[t.assigned_to_id] = (qCounts[t.assigned_to_id] || 0) + 1;
        }
      }
      setOscQueueCounts(qCounts);

      // Division task count (SLA breaches)
      const taskQuery = supabase
        .from("tasks")
        .select("id")
        .eq("status", "pending");
      if (filter.divisionId) taskQuery.eq("division_id", filter.divisionId);
      const { data: divTasks } = await taskQuery;
      setTaskCount((divTasks ?? []).length);

      // CSM prospect counts + community assignments
      const csmPCounts: Record<string, number> = {};
      const csmComms: Record<string, string> = {};
      for (const o of oppList) {
        if (o.csm_id && ["prospect_a", "prospect_b", "prospect_c"].includes(o.crm_stage)) {
          csmPCounts[o.csm_id] = (csmPCounts[o.csm_id] || 0) + 1;
        }
        if (o.csm_id && o.community_id) {
          const commName = commList.find(c => c.id === o.community_id)?.name;
          if (commName) csmComms[o.csm_id] = commName;
        }
      }
      setCsmProspectCounts(csmPCounts);
      setCsmCommAssignments(csmComms);

      // Recent stage transitions
      const { data: transitions } = await supabase
        .from("stage_transitions")
        .select("id, contact_id, opportunity_id, created_at, from_stage, to_stage, triggered_by, contacts(first_name, last_name, email, phone), communities(name)")
        .in("community_id", commIds.length > 0 ? commIds : ["__none__"])
        .order("created_at", { ascending: false })
        .limit(20);

      const flatTransitions = (transitions ?? []).map((t: Record<string, unknown>) => ({
        ...t,
        contacts: Array.isArray(t.contacts) ? (t.contacts as Record<string, unknown>[])[0] ?? null : t.contacts,
        communities: Array.isArray(t.communities) ? (t.communities as Record<string, unknown>[])[0] ?? null : t.communities,
      })) as StageTransition[];
      setRecentTransitions(flatTransitions);
    } catch (err) {
      console.error("DSM data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter.divisionId]);

  useEffect(() => {
    if (!filter.communityId) {
      fetchDivisionData();
    }
  }, [filter.divisionId, filter.communityId, fetchDivisionData]);

  // ── Community name lookup for drill-down
  const communityName = labels.community ?? "Community";

  // ── Render ──

  const isDivisionView = !filter.communityId;
  const isCommunityDrill = filter.communityId;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
      backgroundColor: "#09090b", color: "#fafafa",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "10px 24px", borderBottom: "1px solid #27272a",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fafafa" }}>DSM Command Center</span>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 4,
          backgroundColor: "#1f1a2e", border: "1px solid #2a1f3f", color: "#a855f7",
        }}>Division Sales Manager</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", color: "#555", fontSize: 13,
          }}>
            Loading division data...
          </div>
        ) : false ? (
          null
        ) : isCommunityDrill ? (
          <CommunityDrillDown
            communityId={filter.communityId!}
            communityName={communityName}
          />
        ) : isDivisionView ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 0 }}>

            {/* ── HEADER ── */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fafafa", margin: 0 }}>
                Division Sales Manager | {labels.division ?? "Division"}
              </h1>
              <span style={{ fontSize: 12, color: "#71717a" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            {/* ── SALES PERFORMANCE STRIP ── */}
            <Section title="Sales Performance">
              <SalesPerformanceStrip monthData={monthData} />
            </Section>

            {/* ── PIPELINE SUMMARY ── */}
            <Section title="Pipeline Summary">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricCard label="Lead (Div)" value={pipeline.lead_div} />
                <MetricCard label="Lead (Com)" value={pipeline.lead_com} />
                <MetricCard
                  label="OSC Queue"
                  value={pipeline.queue}
                  alert={pipeline.queue > 0}
                  subtitle={pipeline.queue > 0 ? "needs routing" : undefined}
                />
                <MetricCard
                  label="CSM Queue"
                  value={pipeline.csm_queue}
                  alert={pipeline.csm_queue > 0}
                  subtitle={pipeline.csm_queue > 0 ? "needs ranking" : undefined}
                />
                <MetricCard label="Prospect A" value={pipeline.prospect_a} color="#4ade80" />
                <MetricCard label="Prospect B" value={pipeline.prospect_b} color="#60a5fa" />
                <MetricCard label="Prospect C" value={pipeline.prospect_c} color="#fbbf24" />
                <MetricCard 
                  label="Violations" 
                  value={taskCount} 
                  color={taskCount > 0 ? "#f87171" : "#4ade80"}
                  subtitle="SLA breaches"
                />
              </div>
            </Section>

            {/* ── COMMUNITY BREAKDOWN TABLE ── */}
            <Section title="Community Breakdown">
              <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr>
                      {["Community", "L-Div", "L-Com", "OSC-Q", "CSM-Q", "Pr-C", "Pr-B", "Pr-A", "Pipeline", "Avg Days", "Last Activity"].map(h => (
                        <th key={h} style={{
                          padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#71717a",
                          fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
                          backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {communityBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{
                          padding: 24, textAlign: "center", fontSize: 12, color: "#3f3f46",
                        }}>No communities in this division</td>
                      </tr>
                    ) : communityBreakdown.map(row => (
                      <tr
                        key={row.communityId}
                        onClick={() => setGlobalCommunity(row.communityId)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{
                          padding: "8px 12px", fontSize: 13, fontWeight: 500, color: "#fafafa",
                          borderBottom: "1px solid #18181b",
                        }}>
                          {row.communityName}
                          <span style={{ fontSize: 10, color: "#52525b", marginLeft: 6 }}>→</span>
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#a1a1aa", borderBottom: "1px solid #18181b" }}>{row.lead_div}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#a1a1aa", borderBottom: "1px solid #18181b" }}>{row.lead_com}</td>
                        <td style={{
                          padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #18181b",
                          color: row.queue > 0 ? "#f87171" : "#a1a1aa",
                          fontWeight: row.queue > 0 ? 600 : 400,
                        }}>{row.queue}</td>
                        <td style={{
                          padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #18181b",
                          color: row.csm_queue > 0 ? "#c084fc" : "#a1a1aa",
                          fontWeight: row.csm_queue > 0 ? 600 : 400,
                        }}>{row.csm_queue}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#fbbf24", borderBottom: "1px solid #18181b" }}>{row.prospect_c}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#60a5fa", borderBottom: "1px solid #18181b" }}>{row.prospect_b}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#4ade80", borderBottom: "1px solid #18181b" }}>{row.prospect_a}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#fafafa", fontWeight: 500, borderBottom: "1px solid #18181b" }}>{row.totalPipeline}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#a1a1aa", borderBottom: "1px solid #18181b" }}>{row.avgDaysInStage}d</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid #18181b" }}>{relativeTime(row.lastActivity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ── TEAM PERFORMANCE ── */}
            <Section title="Team Performance">
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                {/* OSC Performance */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 12,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span>OSC Performance</span>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 4,
                      backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a",
                    }}>{oscTeam.length}</span>
                  </div>
                  <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Name", "Queue", "Avg Response", "Routed Today"].map(h => (
                            <th key={h} style={{
                              padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#71717a",
                              fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
                              backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {oscTeam.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#3f3f46" }}>No OSC members</td></tr>
                        ) : oscTeam.map(u => (
                          <tr key={u.id}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#fafafa", fontWeight: 500, borderBottom: "1px solid #18181b" }}>{u.full_name}</td>
                            <td style={{
                              padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #18181b",
                              color: (oscQueueCounts[u.id] ?? 0) > 0 ? "#f87171" : "#a1a1aa",
                              fontWeight: (oscQueueCounts[u.id] ?? 0) > 0 ? 600 : 400,
                            }}>{oscQueueCounts[u.id] ?? 0}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid #18181b" }}>—</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid #18181b" }}>—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CSM Performance */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 12,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span>CSM Performance</span>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 4,
                      backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a",
                    }}>{csmTeam.length}</span>
                  </div>
                  <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Name", "Community", "Prospects", "Sales/Mo", "Pipeline"].map(h => (
                            <th key={h} style={{
                              padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#71717a",
                              fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
                              backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csmTeam.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#3f3f46" }}>No CSM members</td></tr>
                        ) : csmTeam.map(u => (
                          <tr key={u.id}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#fafafa", fontWeight: 500, borderBottom: "1px solid #18181b" }}>{u.full_name}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#a1a1aa", borderBottom: "1px solid #18181b" }}>{csmCommAssignments[u.id] ?? "—"}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#60a5fa", borderBottom: "1px solid #18181b" }}>{csmProspectCounts[u.id] ?? 0}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid #18181b" }}>—</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid #18181b" }}>—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Section>

            {/* ── RECENT ACTIVITY FEED ── */}
            <Section title="Recent Activity">
              <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      {["Time", "Contact", "From", "To", "Community", "Triggered By"].map(h => (
                        <th key={h} style={{
                          padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#71717a",
                          fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
                          backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransitions.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#3f3f46" }}>No recent activity</td></tr>
                    ) : recentTransitions.map(t => (
                      <tr key={t.id}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid #18181b", whiteSpace: "nowrap" }}>
                          {relativeTime(t.created_at)}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#fafafa", fontWeight: 500, borderBottom: "1px solid #18181b" }}>
                          {t.contacts ? (
                            <span
                              onClick={e => { e.stopPropagation(); setPanelData({
                                id: t.opportunity_id,
                                contact_id: t.contact_id,
                                first_name: t.contacts!.first_name,
                                last_name: t.contacts!.last_name,
                                email: t.contacts!.email ?? null,
                                phone: t.contacts!.phone ?? null,
                                stage: t.to_stage,
                                source: null,
                                community_name: t.communities?.name ?? null,
                                division_name: labels.division ?? null,
                                budget_min: null,
                                budget_max: null,
                                floor_plan_name: null,
                                notes: null,
                                last_activity_at: t.created_at,
                                created_at: t.created_at,
                              }); }}
                              style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: "#3f3f46", textUnderlineOffset: "2px" }}
                            >
                              {t.contacts.first_name} {t.contacts.last_name}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#a1a1aa", borderBottom: "1px solid #18181b" }}>
                          {stageLabel(t.from_stage)}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#a1a1aa", borderBottom: "1px solid #18181b" }}>
                          <span style={{ color: "#71717a" }}>→</span> {stageLabel(t.to_stage)}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#a1a1aa", borderBottom: "1px solid #18181b" }}>
                          {t.communities?.name ?? "—"}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: "#71717a", borderBottom: "1px solid #18181b" }}>
                          {t.triggered_by ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Universal Opportunity Side Panel */}
      <OpportunityPanel
        open={!!panelData}
        onClose={() => setPanelData(null)}
        opportunity={panelData}
      />
    </div>
  );
}
