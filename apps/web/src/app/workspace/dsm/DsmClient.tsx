"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalLeads: number;
  totalOpportunities: number;
  totalProspects: number;
  totalCustomers: number;
  conversionRate: number;
}

interface CommunityPipeline {
  community_name: string;
  leads: number;
  opportunities: number;
  prospects: number;
  customers: number;
}

interface Props {
  stats: Stats;
  pipeline: CommunityPipeline[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DsmClient({ stats, pipeline }: Props) {
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
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>DSM Command Center</span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4,
              backgroundColor: "#1f1a2e", border: "1px solid #2a1f3f", color: "#a855f7",
            }}>Division Sales Manager</span>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20, padding: "10px 24px",
          backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0,
        }}>
          {[
            { label: "Leads",         value: stats.totalLeads,         color: "#a1a1a1" },
            { label: "Opportunities", value: stats.totalOpportunities, color: "#f5a623" },
            { label: "Prospects",     value: stats.totalProspects,     color: "#0070f3" },
            { label: "Customers",     value: stats.totalCustomers,     color: "#00c853" },
            { label: "Conversion",    value: `${stats.conversionRate}%`, color: "#a855f7" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Division Pipeline */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12 }}>
              Division Pipeline by Community
            </div>

            {pipeline.length === 0 ? (
              <div style={{
                padding: 32, textAlign: "center", fontSize: 12, color: "#444",
                backgroundColor: "#111111", borderRadius: 8, border: "1px solid #1f1f1f",
              }}>
                No pipeline data — will populate from Pv1 migration
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 700, width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Community", "Leads", "Opportunities", "Prospects", "Customers"].map(h => (
                        <th key={h} style={{
                          padding: "6px 12px", textAlign: "left", fontSize: 11, color: "#666",
                          fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em",
                          backgroundColor: "#0a0a0a", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.map(row => (
                      <tr key={row.community_name}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "#ededed", borderBottom: "1px solid #111111" }}>
                          {row.community_name}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111" }}>{row.leads}</td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#f5a623", borderBottom: "1px solid #111111" }}>{row.opportunities}</td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#0070f3", borderBottom: "1px solid #111111" }}>{row.prospects}</td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#00c853", borderBottom: "1px solid #111111" }}>{row.customers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Placeholder sections */}
          {["Team Performance", "Conversion Funnel", "Weekly Trends"].map(title => (
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
