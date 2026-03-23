import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

type SystemStatus = "online" | "ready" | "unreachable";

const systems = [
  { emoji: "🦞", name: "Schellie",  description: "Orchestrator — OpenClaw on Mac Mini",          status: "online"  as SystemStatus },
  { emoji: "🐟", name: "Nemo",      description: "Analysis sandbox — OpenShell NemoClaw",         status: "ready"   as SystemStatus },
  { emoji: "🪸", name: "GBR",       description: "Execution sandbox — OpenShell",                 status: "ready"   as SystemStatus },
  { emoji: "⚡", name: "Spark",     description: "Local inference — DGX Spark (192.168.101.178)", status: "ready"   as SystemStatus },
  { emoji: "🗄️", name: "Supabase",  description: "Data plane — Postgres via Supabase",            status: "ready"   as SystemStatus },
  { emoji: "🐙", name: "GitHub",    description: "Source control — pulse-v2 repo",                status: "ready"   as SystemStatus },
  { emoji: "▲",  name: "Vercel",    description: "Deployment — CI/CD pipeline",                   status: "ready"   as SystemStatus },
];

const statusMap: Record<SystemStatus, { label: string; dot: string; text: string; pulse: boolean }> = {
  online:      { label: "Online",      dot: "bg-[#00c853]", text: "text-[#00c853]", pulse: true  },
  ready:       { label: "Ready",       dot: "bg-[#0070f3]", text: "text-[#0070f3]", pulse: false },
  unreachable: { label: "Unreachable", dot: "bg-[#ff4444]", text: "text-[#ff4444]", pulse: false },
};

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"       },
  { icon: "⊡", label: "Agents",        href: "#"       },
  { icon: "✓", label: "Tasks",         href: "#"       },
  { icon: "⊕", label: "Leads",         href: "#"       },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "◫", label: "Lots",          href: "/lots"        },
    { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"       },
  { icon: "◉", label: "Notifications", href: "#"       },
  { icon: "⚙", label: "Settings",      href: "#"       },
  { icon: "◈", label: "Status",        href: "/status"      },
    { icon: "◧", label: "Docs",          href: "/docs"        },
];

const SYNC_SCHEDULE: Record<string, { label: string; times: string[]; freq: string }> = {
  "lots":        { label: "Lots Explorer", times: ["8:00 AM", "1:00 PM", "6:30 PM"], freq: "3× daily" },
  "model_homes": { label: "Model Homes",   times: ["8:00 AM", "6:30 PM"],            freq: "2× daily" },
  "zillow":      { label: "Zillow Feed",   times: ["2:00 AM"],                        freq: "Nightly"  },
  "floor_plans": { label: "Floor Plans",   times: ["2:00 AM"],                        freq: "Nightly"  },
};

function nextRun(times: string[]): string {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const t of times) {
    const [time, period] = t.split(" ");
    const [h, m] = time.split(":").map(Number);
    let hours = h;
    if (period === "PM" && h !== 12) hours += 12;
    if (period === "AM" && h === 12) hours = 0;
    const mins = hours * 60 + (m ?? 0);
    if (mins > nowMins) return t + " EDT";
  }
  return times[0] + " EDT tomorrow";
}

export default async function StatusPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Latest sync per feed
  const { data: syncStatus } = await supabase
    .from("sync_log")
    .select("feed, status, rows_upserted, rows_total, error_message, duration_ms, synced_at")
    .order("synced_at", { ascending: false })
    .limit(40);

  // Dedupe to latest per feed
  const latestPerFeed: Record<string, NonNullable<typeof syncStatus>[0]> = {};
  for (const row of syncStatus ?? []) {
    if (!latestPerFeed[row.feed]) latestPerFeed[row.feed] = row;
  }

  // Recent errors
  const recentErrors = (syncStatus ?? []).filter(r => r.status === "error").slice(0, 5);

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a]">
        <div className="px-4 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <span className="text-base">🦞</span>
            <div>
              <span className="font-semibold text-[13px] text-[#ededed]">Pulse v2</span>
              <div className="text-[10px] text-[#555]">HBx AI Factory</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                item.label === "Status"
                  ? "bg-[#1a1a1a] text-[#ededed]"
                  : "text-[#888] hover:text-[#ededed] hover:bg-[#111111]"
              }`}
            >
              <span className="text-[14px] w-4 text-center opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs">🦞</div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#00c853] rounded-full border border-[#0a0a0a] animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[#ededed] truncate">Schellie</div>
              <div className="text-[11px] text-[#555] truncate">Orchestrator · Online</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3">
          <h1 className="text-[14px] font-semibold text-[#ededed]">System Status</h1>
        </div>

        <div className="px-6 py-6 max-w-[1400px]">
          <div className="grid grid-cols-3 gap-3">
            {systems.map((system) => {
              const s = statusMap[system.status];
              return (
                <div key={system.name} className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-5 hover:border-[#2a2a2a] transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-md bg-[#1a1a1a] flex items-center justify-center text-lg">
                        {system.emoji}
                      </div>
                      <div className="font-medium text-[13px] text-[#ededed]">{system.name}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium ${s.text}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
                      {s.label}
                    </div>
                  </div>
                  <p className="text-[12px] text-[#a1a1a1]">{system.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Data Sync Status ── */}
        <div className="px-6 pb-6 space-y-4">
          <h2 style={{ color: "#ededed", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Data Sync
          </h2>

          {/* Sync table */}
          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1f1f1f" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#0d0d0d" }}>
                  {["Feed", "Last Run", "Result", "Rows", "Duration", "Next Run", "Schedule"].map(h => (
                    <th key={h} style={{
                      padding: "8px 14px", textAlign: "left", whiteSpace: "nowrap",
                      borderBottom: "1px solid #1f1f1f", fontSize: 11,
                      textTransform: "uppercase", letterSpacing: "0.07em", color: "#555",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SYNC_SCHEDULE).map(([key, cfg]) => {
                  const row = latestPerFeed[key];
                  const isSuccess = row?.status === "success";
                  const isError = row?.status === "error";
                  const lastRun = row
                    ? new Date(row.synced_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                    : "—";
                  const dur = row?.duration_ms
                    ? row.duration_ms < 1000 ? "< 1s" : `${(row.duration_ms / 1000).toFixed(1)}s`
                    : "—";
                  const rows = row?.rows_upserted != null
                    ? row.rows_upserted.toLocaleString() + (row.rows_total && row.rows_total !== row.rows_upserted ? ` / ${row.rows_total.toLocaleString()}` : "")
                    : "—";
                  return (
                    <tr key={key} style={{ borderBottom: "1px solid #1a1a1a" }}>
                      <td style={{ padding: "9px 14px", color: "#ededed", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {cfg.label}
                      </td>
                      <td style={{ padding: "9px 14px", color: "#666", whiteSpace: "nowrap" }}>{lastRun}</td>
                      <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                        {!row ? (
                          <span style={{ color: "#333", fontSize: 11 }}>No data</span>
                        ) : isSuccess ? (
                          <span style={{ color: "#00c853", fontSize: 11 }}>✓ success</span>
                        ) : isError ? (
                          <span style={{ color: "#ff6b6b", fontSize: 11 }}>✗ error</span>
                        ) : null}
                      </td>
                      <td style={{ padding: "9px 14px", color: "#a1a1a1", whiteSpace: "nowrap" }}>{rows}</td>
                      <td style={{ padding: "9px 14px", color: "#666", whiteSpace: "nowrap" }}>{dur}</td>
                      <td style={{ padding: "9px 14px", color: "#a1a1a1", whiteSpace: "nowrap" }}>{nextRun(cfg.times)}</td>
                      <td style={{ padding: "9px 14px", color: "#555", whiteSpace: "nowrap", fontSize: 11 }}>{cfg.freq}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recent errors — only if any */}
          {recentErrors.length > 0 && (
            <div style={{ borderRadius: 8, border: "1px solid #3f1f1f", backgroundColor: "#1a0a0a", padding: "12px 16px" }}>
              <div style={{ color: "#ff6b6b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Recent Sync Errors
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recentErrors.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#a1a1a1" }}>
                    <span style={{ color: "#ff6b6b", fontWeight: 500 }}>
                      {SYNC_SCHEDULE[e.feed]?.label ?? e.feed}
                    </span>
                    {" · "}
                    <span style={{ color: "#555" }}>
                      {new Date(e.synced_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                    {" · "}
                    {(e.error_message ?? "").slice(0, 120)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
