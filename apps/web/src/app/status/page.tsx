import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { TokenSyncButton } from "./TokenSyncButton";

export const revalidate = 60;

type SystemStatus = "online" | "ready" | "unreachable";

const systems = [
  { emoji: "🦞", name: "Schellie",  description: "Orchestrator — OpenClaw on Mac Mini",          status: "online"  as SystemStatus, url: null },
  { emoji: "🐟", name: "Nemo",      description: "Analysis sandbox — OpenShell NemoClaw",         status: "ready"   as SystemStatus, url: null },
  { emoji: "🪸", name: "GBR",       description: "Execution sandbox — OpenShell",                 status: "ready"   as SystemStatus, url: null },
  { emoji: "⚡", name: "Spark",     description: "Local inference — DGX Spark (192.168.101.178)", status: "ready"   as SystemStatus, url: null },
  { emoji: "🗄️", name: "Supabase",  description: "Data plane — Postgres via Supabase",            status: "ready"   as SystemStatus, url: "https://supabase.com/dashboard/project/mrpxtbuezqrlxybnhyne/editor" },
  { emoji: "🐙", name: "GitHub",    description: "Source control — pulse-v2 repo",                status: "ready"   as SystemStatus, url: "https://github.com/rob-hoeller/pulse-v2" },
  { emoji: "▲",  name: "Vercel",    description: "Deployment — CI/CD pipeline",                   status: "ready"   as SystemStatus, url: "https://vercel.com/heartbeat-v2/pulse-v2" },
];

const statusMap: Record<SystemStatus, { label: string; dot: string; text: string; pulse: boolean }> = {
  online:      { label: "Online",      dot: "bg-[#80B602]", text: "text-[#80B602]", pulse: true  },
  ready:       { label: "Ready",       dot: "bg-[#59a6bd]", text: "text-[#59a6bd]", pulse: false },
  unreachable: { label: "Unreachable", dot: "bg-[#E32027]", text: "text-[#E32027]", pulse: false },
};

// 6 sync feeds in execution order (some run in parallel at same time)
// Sequence: division_plans + model_homes + spec_homes fire at :00, lots + community_plans fire at :05
const SYNC_FEEDS: {
  feed: string;
  label: string;
  description: string;
  script: string;
  times: string[];
  seq: number;
}[] = [
  {
    feed: "division_plans",
    label: "Division Plans",
    description: "Plans offered at division level — no community, no pricing",
    script: "hbx-sync-division-plans.py",
    times: ["6:00 AM", "12:00 PM", "6:00 PM"],
    seq: 1,
  },
  {
    feed: "model_homes",
    label: "Model Homes",
    description: "Model homes from Heartbeat Page Designer",
    script: "hbx-sync-model.py",
    times: ["6:00 AM", "12:00 PM", "6:00 PM"],
    seq: 2,
  },
  {
    feed: "spec_homes",
    label: "Quick Delivery",
    description: "Spec/QD homes live on schellbrothers.com — Page Designer source of truth",
    script: "hbx-sync-quick-delivery.py",
    times: ["6:00 AM", "12:00 PM", "6:00 PM"],
    seq: 2,
  },
  {
    feed: "lots",
    label: "Lots",
    description: "All lots across all communities from HB Lot API",
    script: "hbx-sync-lots.py",
    times: ["6:05 AM", "12:05 PM", "6:05 PM"],
    seq: 3,
  },
  {
    feed: "community_plans",
    label: "Community Plans",
    description: "Plans × community intersection with pricing, images, incentives",
    script: "hbx-sync-community-plans.py",
    times: ["6:05 AM", "12:05 PM", "6:05 PM"],
    seq: 4,
  },
];

function nextRun(times: string[]): string {
  const et = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: false,
  }).format(new Date());
  const [hStr, mStr] = et.split(":");
  const nowMins = parseInt(hStr) * 60 + parseInt(mStr);

  const fmtDate = (offsetDays: number, label: string) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const datePart = d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
    return `${datePart}, ${label} EDT`;
  };

  for (const t of times) {
    const [time, ampm] = t.split(" ");
    const [h, m] = time.split(":").map(Number);
    let hours = h;
    if (ampm === "PM" && h !== 12) hours += 12;
    if (ampm === "AM" && h === 12) hours = 0;
    if (hours * 60 + (m ?? 0) > nowMins) return fmtDate(0, t);
  }
  return fmtDate(1, times[0]);
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function tokenBar(value: number, max: number, width = 12): string {
  if (max === 0) return "░".repeat(width);
  const filled = Math.round((value / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

// Token usage row type
type TokenRow = {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens?: number;
  total_tokens: number;
  estimated_cost_usd: number;
};

// Get ET date string (YYYY-MM-DD) without relying on toISOString() which is UTC
function etDateString(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // en-CA = YYYY-MM-DD
}

export default async function StatusPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Latest sync per feed
  const { data: syncRows } = await supabase
    .from("sync_log")
    .select("feed,status,rows_upserted,duration_ms,synced_at")
    .order("synced_at", { ascending: false })
    .limit(50);

  // Latest entry per feed
  const latestByFeed: Record<string, { status: string; rows_upserted: number; duration_ms: number; synced_at: string }> = {};
  for (const row of syncRows ?? []) {
    if (!latestByFeed[row.feed]) latestByFeed[row.feed] = row;
  }

  // ── Date math (ET-aware) ──────────────────────────────────────────────
  const now = new Date();

  // Today in ET
  const todayET = etDateString(now);

  // Start of current week (Monday 00:00 ET)
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartET = etDateString(weekStart);

  // Start of current month in ET
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartET = etDateString(monthStart);

  // 7 months ago for charts
  const sevenMonthsAgo = new Date(now);
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  sevenMonthsAgo.setDate(1);
  const sevenMonthsAgoStr = etDateString(sevenMonthsAgo);

  // ── Fetch all token_usage for last 7 months ───────────────────────────
  const { data: allUsageRaw } = await supabase
    .from("token_usage")
    .select("date,input_tokens,output_tokens,cache_read_tokens,total_tokens,estimated_cost_usd")
    .gte("date", sevenMonthsAgoStr)
    .order("date", { ascending: true });

  // Aggregate by date
  const tokenByDate: Record<string, TokenRow> = {};
  for (const r of allUsageRaw ?? []) {
    if (!tokenByDate[r.date]) {
      tokenByDate[r.date] = {
        date: r.date,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        total_tokens: 0,
        estimated_cost_usd: 0,
      };
    }
    tokenByDate[r.date].input_tokens += r.input_tokens ?? 0;
    tokenByDate[r.date].output_tokens += r.output_tokens ?? 0;
    tokenByDate[r.date].cache_read_tokens += r.cache_read_tokens ?? 0;
    tokenByDate[r.date].total_tokens += r.total_tokens ?? 0;
    tokenByDate[r.date].estimated_cost_usd += r.estimated_cost_usd ?? 0;
  }

  // ── Summary rows ─────────────────────────────────────────────────────

  // Today
  const todayData = tokenByDate[todayET];

  // This Week (Monday through today)
  const emptyRow = (label: string): TokenRow => ({
    date: label, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, total_tokens: 0, estimated_cost_usd: 0,
  });

  function sumDates(dates: string[]): TokenRow & { date: string } {
    return dates.reduce(
      (acc, d) => {
        const r = tokenByDate[d];
        if (!r) return acc;
        return {
          date: acc.date,
          input_tokens: acc.input_tokens + r.input_tokens,
          output_tokens: acc.output_tokens + r.output_tokens,
          cache_read_tokens: acc.cache_read_tokens + r.cache_read_tokens,
          total_tokens: acc.total_tokens + r.total_tokens,
          estimated_cost_usd: acc.estimated_cost_usd + r.estimated_cost_usd,
        };
      },
      emptyRow("acc")
    );
  }

  // Build week dates (Monday → today)
  const weekDates: string[] = [];
  {
    const cur = new Date(weekStart);
    while (etDateString(cur) <= todayET) {
      weekDates.push(etDateString(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  const thisWeekData = sumDates(weekDates);

  // Build month dates (1st → today)
  const monthDates: string[] = [];
  {
    const cur = new Date(monthStart);
    while (etDateString(cur) <= todayET) {
      monthDates.push(etDateString(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  const thisMonthData = sumDates(monthDates);

  // ── 7-day chart ───────────────────────────────────────────────────────
  const last7Days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    last7Days.push(etDateString(d));
  }
  const yesterday = last7Days[1];
  const maxDayTokens = Math.max(...last7Days.map(d => tokenByDate[d]?.total_tokens ?? 0), 1);

  // ── 7-week chart ──────────────────────────────────────────────────────
  // Build 7 Mon-Sun week buckets ending with the current week
  const weekBuckets: { label: string; dates: string[] }[] = [];
  for (let w = 0; w < 7; w++) {
    // w=0 = current week, w=6 = 6 weeks ago
    const bucketMonday = new Date(weekStart);
    bucketMonday.setDate(weekStart.getDate() - w * 7);
    const bucketSunday = new Date(bucketMonday);
    bucketSunday.setDate(bucketMonday.getDate() + 6);

    const dates: string[] = [];
    const cur = new Date(bucketMonday);
    for (let d = 0; d < 7; d++) {
      dates.push(etDateString(cur));
      cur.setDate(cur.getDate() + 1);
    }

    // Label: "Wk Apr 7"
    const monthName = bucketMonday.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short" });
    const dayNum = parseInt(etDateString(bucketMonday).slice(8));
    weekBuckets.push({ label: `Wk ${monthName} ${dayNum}`, dates });
  }
  // reverse so oldest first
  weekBuckets.reverse();
  const weekChartData = weekBuckets.map(b => ({ label: b.label, ...sumDates(b.dates) }));
  const maxWeekTokens = Math.max(...weekChartData.map(w => w.total_tokens), 1);

  // ── 7-month chart ─────────────────────────────────────────────────────
  const monthBuckets: { label: string; dates: string[] }[] = [];
  for (let m = 0; m < 7; m++) {
    // m=0 = current month, m=6 = 6 months ago
    const bucketDate = new Date(now);
    bucketDate.setDate(1);
    bucketDate.setMonth(bucketDate.getMonth() - m);
    const year = bucketDate.getFullYear();
    const month = bucketDate.getMonth(); // 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // last day of month

    const dates: string[] = [];
    const cur = new Date(firstDay);
    while (cur <= lastDay) {
      dates.push(etDateString(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const monthLabel = firstDay.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", year: "numeric" });
    monthBuckets.push({ label: monthLabel, dates });
  }
  monthBuckets.reverse();
  const monthChartData = monthBuckets.map(b => ({ label: b.label, ...sumDates(b.dates) }));
  const maxMonthTokens = Math.max(...monthChartData.map(m => m.total_tokens), 1);

  // ── Styles ────────────────────────────────────────────────────────────
  const s: React.CSSProperties = {
    fontFamily: "var(--font-body, 'Open Sans', Arial, sans-serif)",
    fontSize: 13,
    color: "#888",
  };

  const headerStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#555",
    marginBottom: 12,
  };

  const sectionCardStyle: React.CSSProperties = {
    border: "1px solid #1a1a1e",
    borderRadius: 3,
    overflow: "hidden",
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: "#0d0e10",
    borderBottom: "1px solid #222",
    padding: "8px 16px",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#444",
    display: "grid",
    gap: 0,
    alignItems: "center",
  };

  const tableRowStyle: React.CSSProperties = {
    padding: "10px 16px",
    background: "#0d0e10",
    borderBottom: "1px solid #1a1a1e",
    alignItems: "center",
    display: "grid",
    gap: 0,
  };

  return (
    <div style={{ ...s, display: "flex", flexDirection: "column", height: "100%", overflow: "auto", background: "#121314", padding: 24, gap: 32 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#ededed", marginBottom: 4 }}>System Status</div>
        <div style={{ fontSize: 12, color: "#555" }}>HBx AI Factory — Pulse v2</div>
      </div>

      {/* Systems */}
      <section>
        <div style={headerStyle}>Infrastructure</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {systems.map((sys) => {
            const st = statusMap[sys.status];
            const dotColor = st.dot.replace("bg-[","").replace("]","");
            const textColor = st.text.replace("text-[","").replace("]","");
            return (
              <div key={sys.name} style={{ background: "#0d0e10", border: "1px solid #1a1a1e", borderRadius: 3, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{sys.emoji}</span>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {sys.url
                        ? <a href={sys.url} target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", textDecoration: "none" }}>{sys.name}</a>
                        : <span style={{ color: "#ffffff" }}>{sys.name}</span>
                      }
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: textColor }}>{st.label}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>{sys.description}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Data Sync Schedules */}
      <section>
        <div style={headerStyle}>Data Sync — 3× Daily (6 AM · Noon · 6 PM EDT)</div>
        <div style={sectionCardStyle}>
          {/* Table header */}
          <div style={{ ...tableHeaderStyle, gridTemplateColumns: "28px 1fr 1fr 90px 80px 90px 80px" }}>
            <span>#</span>
            <span>Feed</span>
            <span>Script</span>
            <span>Last Run</span>
            <span>Rows</span>
            <span>Duration</span>
            <span>Status</span>
          </div>
          {SYNC_FEEDS.map((feed) => {
            const latest = latestByFeed[feed.feed];
            const isOk = latest?.status === "success";
            const statusColor = !latest ? "#444" : isOk ? "#80B602" : "#E32027";
            const statusLabel = !latest ? "Never" : isOk ? "OK" : "Error";
            return (
              <div key={feed.feed} style={{ ...tableRowStyle, gridTemplateColumns: "28px 1fr 1fr 90px 80px 90px 80px" }}>
                {/* Seq */}
                <span style={{ fontSize: 11, color: "#333", fontWeight: 700 }}>{feed.seq}</span>
                {/* Feed info */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>{feed.label}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{feed.description}</div>
                  <div style={{ fontSize: 10, color: "#333", marginTop: 3 }}>
                    Fires: {feed.times.join(" · ")} EDT
                  </div>
                </div>
                {/* Script */}
                <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{feed.script}</div>
                {/* Last run */}
                <div style={{ fontSize: 11, color: "#666" }}>{latest ? timeAgo(latest.synced_at) : "—"}</div>
                {/* Rows */}
                <div style={{ fontSize: 12, color: "#aaa", fontWeight: 500 }}>{latest ? latest.rows_upserted.toLocaleString() : "—"}</div>
                {/* Duration */}
                <div style={{ fontSize: 11, color: "#666" }}>{latest ? fmtDuration(latest.duration_ms) : "—"}</div>
                {/* Status */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                </div>
              </div>
            );
          })}
          {/* Next run footer */}
          <div style={{ padding: "8px 16px", background: "#0a0b0c", fontSize: 11, color: "#444", display: "flex", gap: 16 }}>
            <span>Next batch: {nextRun(["6:00 AM", "12:00 PM", "6:00 PM"])}</span>
            <span style={{ color: "#333" }}>·</span>
            <span>Sequence 1→2 fires at :00 · Sequence 3→4 fires at :05</span>
          </div>
        </div>
      </section>

      {/* ── Token Usage ── */}
      <section>
        {/* Section header with Sync Now button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ ...headerStyle, marginBottom: 0 }}>Token Usage — Claude API (Anthropic)</div>
          <TokenSyncButton />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Summary table: Today / This Week / This Month */}
          <div style={sectionCardStyle}>
            <div style={{ ...tableHeaderStyle, gridTemplateColumns: "100px 1fr 1fr 1fr 1fr 110px" }}>
              <span>Period</span>
              <span>Input</span>
              <span>Output</span>
              <span>Cache Read</span>
              <span>Total</span>
              <span>Est. Cost</span>
            </div>
            {(
              [
                { label: "Today",      data: todayData },
                { label: "This Week",  data: thisWeekData },
                { label: "This Month", data: thisMonthData },
              ] as { label: string; data: TokenRow | undefined }[]
            ).map(({ label, data }) => (
              <div key={label} style={{ ...tableRowStyle, gridTemplateColumns: "100px 1fr 1fr 1fr 1fr 110px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>{label}</span>
                <span style={{ fontSize: 12, color: "#ededed" }}>{data ? fmtTokens(data.input_tokens) : "—"}</span>
                <span style={{ fontSize: 12, color: "#ededed" }}>{data ? fmtTokens(data.output_tokens) : "—"}</span>
                <span style={{ fontSize: 12, color: "#666" }}>{data ? fmtTokens(data.cache_read_tokens) : "—"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>{data ? fmtTokens(data.total_tokens) : "—"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: data && data.total_tokens > 0 ? "#80B602" : "#444" }}>
                  {data && data.total_tokens > 0 ? fmtCost(data.estimated_cost_usd) : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Chart 1: 7-Day Activity */}
          <div style={{ background: "#0d0e10", border: "1px solid #1a1a1e", borderRadius: 3, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: 10 }}>
              7-Day Activity
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {last7Days.map((d) => {
                const row = tokenByDate[d];
                const total = row?.total_tokens ?? 0;
                const bar = tokenBar(total, maxDayTokens, 16);
                const label = d === todayET ? "Today    " : d === yesterday ? "Yesterday" : d.slice(5); // MM-DD
                const cost = row ? fmtCost(row.estimated_cost_usd) : null;
                return (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "monospace", fontSize: 12 }}>
                    <span style={{ color: d === todayET ? "#ededed" : "#555", minWidth: 74 }}>{label}</span>
                    <span style={{ color: total > 0 ? "#59a6bd" : "#222", letterSpacing: "-0.02em" }}>{bar}</span>
                    <span style={{ color: "#666", minWidth: 60 }}>{total > 0 ? fmtTokens(total) : "—"}</span>
                    {cost && total > 0 && <span style={{ color: "#80B602", fontSize: 11 }}>{cost}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: 7-Week Activity */}
          <div style={{ background: "#0d0e10", border: "1px solid #1a1a1e", borderRadius: 3, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: 10 }}>
              7-Week Activity
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {weekChartData.map((w, i) => {
                const isCurrentWeek = i === weekChartData.length - 1;
                const bar = tokenBar(w.total_tokens, maxWeekTokens, 16);
                return (
                  <div key={w.label} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "monospace", fontSize: 12 }}>
                    <span style={{ color: isCurrentWeek ? "#ededed" : "#555", minWidth: 74 }}>{w.label}</span>
                    <span style={{ color: w.total_tokens > 0 ? "#59a6bd" : "#222", letterSpacing: "-0.02em" }}>{bar}</span>
                    <span style={{ color: "#666", minWidth: 60 }}>{w.total_tokens > 0 ? fmtTokens(w.total_tokens) : "—"}</span>
                    {w.total_tokens > 0 && <span style={{ color: "#80B602", fontSize: 11 }}>{fmtCost(w.estimated_cost_usd)}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 3: 7-Month Activity */}
          <div style={{ background: "#0d0e10", border: "1px solid #1a1a1e", borderRadius: 3, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: 10 }}>
              7-Month Activity
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {monthChartData.map((m, i) => {
                const isCurrentMonth = i === monthChartData.length - 1;
                const bar = tokenBar(m.total_tokens, maxMonthTokens, 16);
                return (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "monospace", fontSize: 12 }}>
                    <span style={{ color: isCurrentMonth ? "#ededed" : "#555", minWidth: 74 }}>{m.label}</span>
                    <span style={{ color: m.total_tokens > 0 ? "#59a6bd" : "#222", letterSpacing: "-0.02em" }}>{bar}</span>
                    <span style={{ color: "#666", minWidth: 60 }}>{m.total_tokens > 0 ? fmtTokens(m.total_tokens) : "—"}</span>
                    {m.total_tokens > 0 && <span style={{ color: "#80B602", fontSize: 11 }}>{fmtCost(m.estimated_cost_usd)}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 10, color: "#333" }}>
              Source: ~/.openclaw/agents/main/sessions/ · Updated by hbx-sync-token-usage.py · Pricing: Claude Sonnet 4.6
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
