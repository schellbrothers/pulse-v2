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

  const s: React.CSSProperties = {
    fontFamily: "var(--font-body, 'Open Sans', Arial, sans-serif)",
    fontSize: 13,
    color: "#888",
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
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 12 }}>
          Infrastructure
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid #1a1a1e", borderRadius: 3, overflow: "hidden" }}>
          {systems.map((sys) => {
            const st = statusMap[sys.status];
            return (
              <div key={sys.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#0d0e10", borderBottom: "1px solid #1a1a1e" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15 }}>{sys.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {sys.url
                      ? <a href={sys.url} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd", textDecoration: "none" }}>{sys.name} ↗</a>
                      : <span style={{ color: "#ededed" }}>{sys.name}</span>
                    }
                  </div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{sys.description}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: st.dot.replace("bg-[","").replace("]","") }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: st.text.replace("text-[","").replace("]","") }}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Data Sync Schedules */}
      <section>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 12 }}>
          Data Sync — 3× Daily (6 AM · Noon · 6 PM EDT)
        </div>
        <div style={{ border: "1px solid #1a1a1e", borderRadius: 3, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 90px 80px 90px 80px", gap: 0, background: "#0d0e10", borderBottom: "1px solid #222", padding: "8px 16px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#444" }}>
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
              <div key={feed.feed} style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 90px 80px 90px 80px", gap: 0, padding: "10px 16px", background: "#0d0e10", borderBottom: "1px solid #1a1a1e", alignItems: "center" }}>
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
    </div>
  );

}
