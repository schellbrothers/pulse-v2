import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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
  cache_write_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
};

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

  // Token usage: last 7 days, aggregated by date
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data: tokenRawRows } = await supabase
    .from("token_usage")
    .select("date,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,total_tokens,estimated_cost_usd")
    .gte("date", sevenDaysAgo)
    .order("date", { ascending: false });

  // Aggregate by date (sum across sessions)
  const tokenByDate: Record<string, TokenRow> = {};
  for (const r of tokenRawRows ?? []) {
    if (!tokenByDate[r.date]) {
      tokenByDate[r.date] = {
        date: r.date,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        total_tokens: 0,
        estimated_cost_usd: 0,
      };
    }
    tokenByDate[r.date].input_tokens += r.input_tokens ?? 0;
    tokenByDate[r.date].output_tokens += r.output_tokens ?? 0;
    tokenByDate[r.date].cache_read_tokens += r.cache_read_tokens ?? 0;
    tokenByDate[r.date].cache_write_tokens += r.cache_write_tokens ?? 0;
    tokenByDate[r.date].total_tokens += r.total_tokens ?? 0;
    tokenByDate[r.date].estimated_cost_usd += r.estimated_cost_usd ?? 0;
  }

  // Build ordered array (last 7 days)
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const last7Days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last7Days.push(d);
  }

  const todayData = tokenByDate[today];
  const yestData = tokenByDate[yesterday];
  const weekTotal: TokenRow = last7Days.reduce(
    (acc, d) => {
      const r = tokenByDate[d];
      if (!r) return acc;
      return {
        date: "week",
        input_tokens: acc.input_tokens + r.input_tokens,
        output_tokens: acc.output_tokens + r.output_tokens,
        cache_read_tokens: acc.cache_read_tokens + r.cache_read_tokens,
        cache_write_tokens: acc.cache_write_tokens + r.cache_write_tokens,
        total_tokens: acc.total_tokens + r.total_tokens,
        estimated_cost_usd: acc.estimated_cost_usd + r.estimated_cost_usd,
      };
    },
    { date: "week", input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, total_tokens: 0, estimated_cost_usd: 0 }
  );

  const maxDayTokens = Math.max(...last7Days.map(d => tokenByDate[d]?.total_tokens ?? 0), 1);

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
        <div style={headerStyle}>Token Usage — Claude API (Anthropic)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Summary table: Today / Yesterday / This week */}
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
                { label: "Today", data: todayData },
                { label: "Yesterday", data: yestData },
                { label: "This Week", data: weekTotal },
              ] as { label: string; data: TokenRow | undefined }[]
            ).map(({ label, data }) => (
              <div key={label} style={{ ...tableRowStyle, gridTemplateColumns: "100px 1fr 1fr 1fr 1fr 110px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>{label}</span>
                <span style={{ fontSize: 12, color: "#ededed" }}>{data ? fmtTokens(data.input_tokens) : "—"}</span>
                <span style={{ fontSize: 12, color: "#ededed" }}>{data ? fmtTokens(data.output_tokens) : "—"}</span>
                <span style={{ fontSize: 12, color: "#666" }}>{data ? fmtTokens(data.cache_read_tokens) : "—"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>{data ? fmtTokens(data.total_tokens) : "—"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: data ? "#80B602" : "#444" }}>
                  {data ? fmtCost(data.estimated_cost_usd) : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* 7-day bar chart (text-based) */}
          <div style={{ background: "#0d0e10", border: "1px solid #1a1a1e", borderRadius: 3, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#444", marginBottom: 10 }}>
              7-Day Activity
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {last7Days.map((d) => {
                const row = tokenByDate[d];
                const total = row?.total_tokens ?? 0;
                const bar = tokenBar(total, maxDayTokens, 16);
                const label = d === today ? "Today    " : d === yesterday ? "Yesterday" : d.slice(5); // MM-DD
                const cost = row ? fmtCost(row.estimated_cost_usd) : null;
                return (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "monospace", fontSize: 12 }}>
                    <span style={{ color: d === today ? "#ededed" : "#555", minWidth: 74 }}>{label}</span>
                    <span style={{ color: total > 0 ? "#59a6bd" : "#222", letterSpacing: "-0.02em" }}>{bar}</span>
                    <span style={{ color: "#666", minWidth: 60 }}>{total > 0 ? fmtTokens(total) : "—"}</span>
                    {cost && <span style={{ color: "#80B602", fontSize: 11 }}>{cost}</span>}
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
