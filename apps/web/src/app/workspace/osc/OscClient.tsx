"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  newOpportunities: number;
  assignedToday: number;
  routedToday: number;
  avgResponseMin: number;
}

interface Opportunity {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  community_name: string | null;
  division_name: string | null;
  created_at: string;
  last_activity_at: string | null;
}

interface Props {
  stats: Stats;
  recentOpportunities: Opportunity[];
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function OscClient({ stats, recentOpportunities }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#0a0a0a", color: "#ededed" }}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>

        {/* Top bar */}
        <div style={{
          padding: "10px 24px",
          borderBottom: "1px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>OSC Command Center</span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4,
              backgroundColor: "#1a1f2e", border: "1px solid #1a2a3f", color: "#0070f3",
            }}>Online Sales Consultant</span>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20, padding: "10px 24px",
          backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0,
        }}>
          {[
            { label: "New Opportunities", value: stats.newOpportunities, color: "#f5a623" },
            { label: "Assigned Today",    value: stats.assignedToday,    color: "#0070f3" },
            { label: "Routed Today",      value: stats.routedToday,      color: "#00c853" },
            { label: "Avg Response",      value: `${stats.avgResponseMin}m`, color: "#a1a1a1" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Opportunity Inbox */}
          <div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>Opportunity Inbox</span>
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                backgroundColor: "#2a2a1a", border: "1px solid #3f3a1f", color: "#f5a623",
              }}>{recentOpportunities.length} pending</span>
            </div>

            {recentOpportunities.length === 0 ? (
              <div style={{
                padding: 32, textAlign: "center", fontSize: 12, color: "#444",
                backgroundColor: "#111111", borderRadius: 8, border: "1px solid #1f1f1f",
              }}>
                No pending opportunities — all clear
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 800, width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Name", "Source", "Community", "Division", "Created", "Last Activity"].map(h => (
                        <th key={h} style={{
                          padding: "6px 12px", textAlign: "left", fontSize: 11, color: "#666",
                          fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em",
                          backgroundColor: "#0a0a0a", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOpportunities.map(opp => (
                      <tr key={opp.id}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "#ededed", borderBottom: "1px solid #111111" }}>
                          {opp.first_name} {opp.last_name}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111" }}>
                          {opp.source ?? "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111" }}>
                          {opp.community_name ?? "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111" }}>
                          {opp.division_name ?? "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111", whiteSpace: "nowrap" }}>
                          {relativeTime(opp.created_at)}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111", whiteSpace: "nowrap" }}>
                          {relativeTime(opp.last_activity_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Placeholder sections */}
          {["Recent Routing Activity", "Performance Metrics"].map(title => (
            <div key={title}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12 }}>{title}</div>
              <div style={{
                padding: 32, textAlign: "center", fontSize: 12, color: "#444",
                backgroundColor: "#111111", borderRadius: 8, border: "1px solid #1f1f1f",
              }}>
                Coming Soon
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
