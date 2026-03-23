import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const revalidate = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunityRef {
  id: string;
  status: string | null;
  price_from: number | null;
}

interface RawDivision {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  communities: CommunityRef[];
}

interface DivisionStats {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  community_count: number;
  active_count: number;
  coming_soon_count: number;
  sold_out_count: number;
  price_min: number | null;
  price_max: number | null;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"            },
  { icon: "⊡", label: "Agents",        href: "#"            },
  { icon: "✓", label: "Tasks",         href: "#"            },
  { icon: "⊕", label: "Leads",         href: "/leads"       },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "◫", label: "Lots",          href: "/lots"        },
  { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"            },
  { icon: "◉", label: "Notifications", href: "#"            },
  { icon: "⚙", label: "Settings",      href: "#"            },
  { icon: "◈", label: "Status",        href: "/status"      },
    { icon: "◧", label: "Docs",          href: "/docs"        },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "TBD";
  if (min != null && max != null)
    return `$${(min / 1000).toFixed(0)}K – $${(max / 1000).toFixed(0)}K`;
  if (min != null)
    return `From $${(min / 1000).toFixed(0)}K`;
  return `Up to $${(max! / 1000).toFixed(0)}K`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DivisionsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: rawDivisions } = await supabase
    .from("divisions")
    .select("*, communities(id, status, price_from)")
    .order("name")
    .returns<RawDivision[]>();

  const divStats: DivisionStats[] = (rawDivisions ?? []).map((d: RawDivision) => {
    const comms = d.communities ?? [];
    const prices = comms.map((c: CommunityRef) => c.price_from).filter((p): p is number => p != null);
    return {
      id:               d.id,
      slug:             d.slug,
      name:             d.name,
      region:           d.region,
      timezone:         d.timezone,
      state_codes:      d.state_codes ?? [],
      is_active:        d.is_active,
      community_count:  comms.length,
      active_count:     comms.filter((c: CommunityRef) => c.status === "active").length,
      coming_soon_count: comms.filter((c: CommunityRef) => c.status === "coming-soon").length,
      sold_out_count:   comms.filter((c: CommunityRef) => c.status === "sold-out").length,
      price_min:        prices.length ? Math.min(...prices) : null,
      price_max:        prices.length ? Math.max(...prices) : null,
    };
  });

  // ── Card grid ──────────────────────────────────────────────────────────────

  const cardGrid = (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: 16,
      padding: "0 0 32px",
    }}>
      {divStats.map(d => (
        <div
          key={d.id}
          style={{
            background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20,
          }}
        >
          {/* Name + Active badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ color: "#e0e0e0", fontSize: 16, fontWeight: 700, margin: 0 }}>{d.name}</h2>
            {d.is_active && (
              <span style={{
                background: "#1a2a1a", color: "#00c853", border: "1px solid #1f3f1f",
                borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "2px 10px",
                textTransform: "uppercase", letterSpacing: "0.07em",
              }}>
                Active
              </span>
            )}
          </div>

          {/* Region · State · Timezone */}
          <div style={{ color: "#666", fontSize: 12, marginBottom: 16 }}>
            {[
              d.region,
              d.state_codes?.join(", "),
              d.timezone,
            ].filter(Boolean).join(" · ")}
          </div>

          {/* 4-stat grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16,
          }}>
            {[
              { label: "Total",       value: d.community_count },
              { label: "Active",      value: d.active_count },
              { label: "Coming Soon", value: d.coming_soon_count },
              { label: "Price Range", value: formatPriceRange(d.price_min, d.price_max) },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#161616", borderRadius: 8, padding: "10px 14px",
                border: "1px solid #1f1f1f",
              }}>
                <div style={{ color: "#555", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ color: "#e0e0e0", fontSize: 16, fontWeight: 700 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* View Communities link */}
          <Link
            href={`/communities?division=${d.slug}`}
            style={{
              display: "block", textAlign: "center",
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              color: "#818cf8", borderRadius: 8, padding: "8px 16px",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            View Communities →
          </Link>
        </div>
      ))}
    </div>
  );

  // ── Comparison table ───────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    background: "#111", color: "#555", fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.07em",
    padding: "10px 16px", whiteSpace: "nowrap",
    borderBottom: "1px solid #1f1f1f", textAlign: "left",
  };

  const tdStyle: React.CSSProperties = {
    padding: "11px 16px", color: "#c0c0c0", fontSize: 13,
    borderBottom: "1px solid #161616", whiteSpace: "nowrap",
  };

  const comparisonTable = (
    <div style={{ overflowX: "auto", marginBottom: 40 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr>
            {["Division", "Region", "States", "Timezone", "Total", "Active", "Coming Soon", "Price Range"].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {divStats.map(d => (
            <tr key={d.id}>
              <td style={{ ...tdStyle, color: "#e0e0e0", fontWeight: 600 }}>{d.name}</td>
              <td style={tdStyle}>{d.region || "—"}</td>
              <td style={tdStyle}>{d.state_codes?.join(", ") || "—"}</td>
              <td style={tdStyle}>{d.timezone || "—"}</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>{d.community_count}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#00c853" }}>{d.active_count}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#f5a623" }}>{d.coming_soon_count}</td>
              <td style={tdStyle}>{formatPriceRange(d.price_min, d.price_max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Full layout ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] h-screen sticky top-0">
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
                item.href === "/divisions"
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

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3 flex items-center justify-between">
          <h1 className="text-[14px] font-semibold text-[#ededed]">Divisions</h1>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Section heading */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: "#888", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              All Divisions
            </h2>
          </div>

          {cardGrid}

          {/* Table section */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ color: "#888", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              Comparison
            </h2>
          </div>

          {comparisonTable}
        </div>
      </main>
    </div>
  );
}
