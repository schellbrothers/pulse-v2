"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalProspects: number;
  prospectA: number;
  prospectB: number;
  prospectC: number;
  appointmentsThisWeek: number;
}

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  crm_stage: string;
  community_name: string | null;
  floor_plan_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  last_activity_at: string | null;
  contract_date: string | null;
}

interface Props {
  stats: Stats;
  myProspects: Prospect[];
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

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
}

const STAGE_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  prospect_c: { color: "#f5a623", bg: "#2a2a1a", border: "#3f3a1f", label: "Prospect C" },
  prospect_b: { color: "#0070f3", bg: "#1a1f2e", border: "#1a2a3f", label: "Prospect B" },
  prospect_a: { color: "#00c853", bg: "#1a2a1a", border: "#1f3f1f", label: "Prospect A" },
};

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_COLORS[stage] ?? { color: "#555", bg: "#1a1a1a", border: "#2a2a2a", label: stage };
  return (
    <span style={{
      fontSize: 10, padding: "2px 6px", borderRadius: 4,
      backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CsmClient({ stats, myProspects }: Props) {
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
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>CSM Command Center</span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4,
              backgroundColor: "#1a2a1a", border: "1px solid #1f3f1f", color: "#00c853",
            }}>Community Sales Manager</span>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20, padding: "10px 24px",
          backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0,
        }}>
          {[
            { label: "Total Prospects", value: stats.totalProspects, color: "#a1a1a1" },
            { label: "A",              value: stats.prospectA,       color: "#00c853" },
            { label: "B",              value: stats.prospectB,       color: "#0070f3" },
            { label: "C",              value: stats.prospectC,       color: "#f5a623" },
            { label: "Appts This Week", value: stats.appointmentsThisWeek, color: "#a855f7" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* My Prospects */}
          <div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>My Prospects</span>
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555",
              }}>{myProspects.length}</span>
            </div>

            {myProspects.length === 0 ? (
              <div style={{
                padding: 32, textAlign: "center", fontSize: 12, color: "#444",
                backgroundColor: "#111111", borderRadius: 8, border: "1px solid #1f1f1f",
              }}>
                No prospects assigned — data will populate from Pv1 migration
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 900, width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Name", "Stage", "Community", "Floor Plan", "Budget", "Contract Date", "Last Activity"].map(h => (
                        <th key={h} style={{
                          padding: "6px 12px", textAlign: "left", fontSize: 11, color: "#666",
                          fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em",
                          backgroundColor: "#0a0a0a", borderBottom: "1px solid #1a1a1a", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myProspects.map(p => (
                      <tr key={p.id}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "#ededed", borderBottom: "1px solid #111111" }}>
                          {p.first_name} {p.last_name}
                        </td>
                        <td style={{ padding: "6px 12px", borderBottom: "1px solid #111111" }}>
                          <StageBadge stage={p.crm_stage} />
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111" }}>
                          {p.community_name ?? "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111" }}>
                          {p.floor_plan_name ?? "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111" }}>
                          {formatBudget(p.budget_min, p.budget_max)}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111", whiteSpace: "nowrap" }}>
                          {p.contract_date ? new Date(p.contract_date).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111", whiteSpace: "nowrap" }}>
                          {relativeTime(p.last_activity_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Placeholder sections */}
          {["Upcoming Appointments", "Follow-Up Queue", "Pipeline Summary"].map(title => (
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
