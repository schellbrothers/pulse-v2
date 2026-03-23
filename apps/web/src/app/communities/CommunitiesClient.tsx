"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
}

interface Community {
  id: string;
  division_id: string;
  name: string;
  slug: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  price_from: number | null;
  price_to: number | null;
  is_55_plus: boolean;
  has_model: boolean;
  has_lotworks: boolean;
  hoa_fee: number | null;
  hoa_period: string | null;
  natural_gas: string | null;
  electric: string | null;
  water: string | null;
  sewer: string | null;
  cable_internet: string | null;
  trash: string | null;
  amenities: string | null;
  // joined fields
  division_slug: string;
  division_name: string;
  region: string;
  timezone: string;
}

interface Props {
  communities: Community[];
  divisions: Division[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"            },
  { icon: "⊡", label: "Agents",        href: "#"            },
  { icon: "✓", label: "Tasks",         href: "#"            },
  { icon: "⊕", label: "Leads",         href: "#"            },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "◫", label: "Lots",          href: "/lots"        },
    { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"            },
  { icon: "◉", label: "Notifications", href: "#"            },
  { icon: "⚙", label: "Settings",      href: "#"            },
  { icon: "◈", label: "Status",        href: "/status"      },
];

const STATUS_STYLES: Record<string, string> = {
  "active":      "bg-[#1a2a1a] text-[#00c853] border border-[#1f3f1f]",
  "now-selling": "bg-[#1a1f2e] text-[#0070f3] border border-[#1a2a3f]",
  "coming-soon": "bg-[#2a2a1a] text-[#f5a623] border border-[#3f3a1f]",
  "last-chance": "bg-[#2a1a1a] text-[#ff6b6b] border border-[#3f1f1f]",
  "sold-out":    "bg-[#1a1a1a] text-[#555]    border border-[#2a2a2a]",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string | null) {
  const key = status ?? "";
  const cls = STATUS_STYLES[key] ?? "bg-[#1a1a1a] text-[#666] border border-[#2a2a2a]";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>
      {status ?? "unknown"}
    </span>
  );
}

function formatPrice(n: number | null) {
  if (n == null) return "—";
  return `$${(n / 1000).toFixed(0)}K`;
}

function formatHoa(fee: number | null, period: string | null) {
  if (fee == null) return "—";
  return `$${fee.toLocaleString()}/${period ?? "mo"}`;
}

// ─── Slide-over helpers ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 style={{ color: "#888", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#666", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#e0e0e0", fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function CommunitiesInner(props: Props) {
  const { communities, divisions } = props;
  const searchParams = useSearchParams();

  const [view, setView] = useState<"card" | "table">("card");
  const [divisionFilter, setDivisionFilter] = useState<string>(
    searchParams.get("division") ?? "all"
  );
  const [selected, setSelected] = useState<Community | null>(null);
  const [sortCol, setSortCol] = useState<keyof Community>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Hydrate view from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem("communities-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "card" | "table") {
    setView(v);
    localStorage.setItem("communities-view", v);
  }

  function handleSort(col: keyof Community) {
    if (col === sortCol) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const rows = communities
    .filter(c => divisionFilter === "all" || c.division_slug === divisionFilter)
    .sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortCol as string] ?? "";
      const bv = (b as unknown as Record<string, unknown>)[sortCol as string] ?? "";
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv), undefined, { numeric: true })
        : String(bv).localeCompare(String(av), undefined, { numeric: true });
    });

  const sortArrow = (col: keyof Community) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── Sidebar ────────────────────────────────────────────────────────────────

  const sidebar = (
    <aside
      style={{
        width: 220,
        background: "#0a0a0a",
        borderRight: "1px solid #1f1f1f",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🦞</span>
          <div>
            <div style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Pulse v2</div>
            <div style={{ color: "#555", fontSize: 11 }}>HBx AI Factory</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(item => {
          const isActive = item.href === "/communities";
          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                textDecoration: "none",
                background: isActive ? "#1a1a1a" : "transparent",
                color: isActive ? "#e0e0e0" : "#555",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid #1f1f1f", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#1a1a1a",
            border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🦞</div>
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 8, height: 8, borderRadius: "50%",
            background: "#00c853", border: "2px solid #0a0a0a",
          }} />
        </div>
        <div>
          <div style={{ color: "#e0e0e0", fontSize: 13, fontWeight: 600 }}>Schellie</div>
          <div style={{ color: "#555", fontSize: 11 }}>Orchestrator · Online</div>
        </div>
      </div>
    </aside>
  );

  // ── Top bar ────────────────────────────────────────────────────────────────

  const topBar = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 60, borderBottom: "1px solid #1f1f1f",
      background: "#0d0d0d", flexShrink: 0,
    }}>
      <h1 style={{ color: "#e0e0e0", fontSize: 18, fontWeight: 700, margin: 0 }}>Communities</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Division filter */}
        <select
          value={divisionFilter}
          onChange={e => setDivisionFilter(e.target.value)}
          style={{
            background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#e0e0e0",
            borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="all">All Divisions</option>
          {divisions.map(d => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 2, background: "#1a1a1a", borderRadius: 8, padding: 3, border: "1px solid #2a2a2a" }}>
          {(["card", "table"] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              style={{
                background: view === v ? "#2a2a2a" : "transparent",
                border: "none", color: view === v ? "#e0e0e0" : "#555",
                borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 16,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {i === 0 ? "⊞" : "≡"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Card view ──────────────────────────────────────────────────────────────

  const cardView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ padding: 24 }}>
      {rows.map(c => {
        const amenityList = c.amenities
          ? c.amenities.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        const visibleAmenities = amenityList.slice(0, 3);
        const overflow = amenityList.length - 3;

        return (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            style={{
              background: "#111", border: "1px solid #1f1f1f", borderRadius: 12,
              padding: 16, cursor: "pointer", transition: "border-color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#333")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
          >
            {/* Badges row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                background: "#1a1a2e", color: "#818cf8", border: "1px solid #2a2a4a",
                borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {c.division_name || c.division_slug}
              </span>
              {c.status && statusBadge(c.status)}
            </div>

            {/* Name */}
            <div style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {c.name}
              {c.is_55_plus && (
                <span style={{ color: "#f5a623", fontSize: 10, fontWeight: 600, marginLeft: 6,
                  background: "#2a2a1a", border: "1px solid #3f3a1f", borderRadius: 4, padding: "1px 5px" }}>
                  55+
                </span>
              )}
            </div>

            {/* Location */}
            {(c.city || c.state) && (
              <div style={{ color: "#666", fontSize: 13, marginBottom: 10 }}>
                {[c.city, c.state].filter(Boolean).join(", ")}
              </div>
            )}

            {/* Price / HOA */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ color: "#555", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>From</div>
                <div style={{ color: "#e0e0e0", fontSize: 14, fontWeight: 600 }}>{formatPrice(c.price_from)}</div>
              </div>
              {c.hoa_fee != null && (
                <div>
                  <div style={{ color: "#555", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>HOA</div>
                  <div style={{ color: "#e0e0e0", fontSize: 14, fontWeight: 600 }}>{formatHoa(c.hoa_fee, c.hoa_period)}</div>
                </div>
              )}
            </div>

            {/* Amenity tags */}
            {visibleAmenities.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {visibleAmenities.map(a => (
                  <span key={a} style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888",
                    borderRadius: 4, fontSize: 10, padding: "2px 7px",
                  }}>
                    {a}
                  </span>
                ))}
                {overflow > 0 && (
                  <span style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555",
                    borderRadius: 4, fontSize: 10, padding: "2px 7px",
                  }}>
                    +{overflow}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Table view ─────────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    background: "#111", color: "#555", fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.07em",
    padding: "10px 14px", whiteSpace: "nowrap", cursor: "pointer",
    borderBottom: "1px solid #1f1f1f", userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 14px", color: "#c0c0c0", fontSize: 13,
    borderBottom: "1px solid #161616", whiteSpace: "nowrap",
  };

  type SortableCol = keyof Community;

  const columns: { label: string; col: SortableCol; render?: (c: Community) => React.ReactNode }[] = [
    { label: "Name",          col: "name",          render: c => <span style={{ color: "#e0e0e0", fontWeight: 600 }}>{c.name}</span> },
    { label: "Division",      col: "division_name",  render: c => c.division_name || c.division_slug },
    { label: "Status",        col: "status",         render: c => statusBadge(c.status) },
    { label: "Location",      col: "city",           render: c => [c.city, c.state].filter(Boolean).join(", ") || "—" },
    { label: "Price From",    col: "price_from",     render: c => formatPrice(c.price_from) },
    { label: "HOA",           col: "hoa_fee",        render: c => formatHoa(c.hoa_fee, c.hoa_period) },
    { label: "55+",           col: "is_55_plus",     render: c => c.is_55_plus ? "✓" : "—" },
    { label: "Model",         col: "has_model",      render: c => c.has_model ? "✓" : "—" },
    { label: "Amenities",     col: "amenities",      render: c => {
      const list = c.amenities ? c.amenities.split(",").map(s => s.trim()).filter(Boolean) : [];
      return list.length ? `${list.slice(0, 2).join(", ")}${list.length > 2 ? ` +${list.length - 2}` : ""}` : "—";
    }},
    { label: "Nat. Gas",      col: "natural_gas",    render: c => c.natural_gas ?? "—" },
    { label: "Electric",      col: "electric",       render: c => c.electric ?? "—" },
    { label: "Water",         col: "water",          render: c => c.water ?? "—" },
    { label: "Sewer",         col: "sewer",          render: c => c.sewer ?? "—" },
    { label: "Cable/Internet",col: "cable_internet", render: c => c.cable_internet ?? "—" },
    { label: "Trash",         col: "trash",          render: c => c.trash ?? "—" },
  ];

  const tableView = (
    <div style={{
      overflow: "auto", maxHeight: "calc(100vh - 140px)",
      position: "relative", margin: "0 24px 24px",
    }}>
      <table style={{ minWidth: 1400, borderCollapse: "collapse", width: "100%" }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.label}
                style={{
                  ...thStyle,
                  ...(i === 0 ? { position: "sticky", left: 0, zIndex: 3, background: "#111" } : {}),
                }}
                onClick={() => handleSort(col.col)}
              >
                {col.label}{sortArrow(col.col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(c => (
            <tr
              key={c.id}
              onClick={() => setSelected(c)}
              style={{ cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {columns.map((col, i) => (
                <td
                  key={col.label}
                  style={{
                    ...tdStyle,
                    ...(i === 0 ? { position: "sticky", left: 0, background: "#0d0d0d", zIndex: 1, fontWeight: 600, color: "#e0e0e0" } : {}),
                  }}
                >
                  {col.render ? col.render(c) : String((c as unknown as Record<string, unknown>)[col.col] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Slide-over panel ───────────────────────────────────────────────────────

  const allUtilsNull = selected
    ? [selected.natural_gas, selected.electric, selected.water, selected.sewer, selected.cable_internet, selected.trash].every(v => v == null)
    : true;

  const slideOver = selected && (
    <>
      {/* Overlay */}
      <div
        onClick={() => setSelected(null)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40,
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: 480, height: "100vh",
        background: "#111", borderLeft: "1px solid #1f1f1f", zIndex: 50,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #1f1f1f",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{
                background: "#1a1a2e", color: "#818cf8", border: "1px solid #2a2a4a",
                borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {selected.division_name || selected.division_slug}
              </span>
              {selected.status && statusBadge(selected.status)}
            </div>
            <h2 style={{ color: "#e0e0e0", fontSize: 18, fontWeight: 700, margin: 0 }}>
              {selected.name}
              {selected.is_55_plus && (
                <span style={{ color: "#f5a623", fontSize: 11, fontWeight: 600, marginLeft: 8,
                  background: "#2a2a1a", border: "1px solid #3f3a1f", borderRadius: 4, padding: "2px 6px" }}>
                  55+
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: "transparent", border: "none", color: "#555",
              fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1,
              marginTop: 2,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <Section title="Overview">
            <Row label="Division" value={selected.division_name || selected.division_slug} />
            <Row label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ") || null} />
            <Row label="Region"   value={selected.region} />
            <Row label="Timezone" value={selected.timezone} />
          </Section>

          <Section title="Pricing">
            <Row label="Price From" value={formatPrice(selected.price_from)} />
            <Row label="Price To"   value={formatPrice(selected.price_to)} />
            <Row label="HOA"        value={selected.hoa_fee != null ? formatHoa(selected.hoa_fee, selected.hoa_period) : null} />
          </Section>

          <Section title="Features">
            <Row label="Model Home"  value={selected.has_model  ? "Yes" : "No"} />
            <Row label="Lot Works"   value={selected.has_lotworks ? "Yes" : "No"} />
            <Row label="55+ Comm."   value={selected.is_55_plus  ? "Yes" : "No"} />
          </Section>

          {!allUtilsNull && (
            <Section title="Utilities">
              {selected.natural_gas    != null && <Row label="Natural Gas"    value={selected.natural_gas} />}
              {selected.electric       != null && <Row label="Electric"       value={selected.electric} />}
              {selected.water          != null && <Row label="Water"          value={selected.water} />}
              {selected.sewer          != null && <Row label="Sewer"          value={selected.sewer} />}
              {selected.cable_internet != null && <Row label="Cable/Internet" value={selected.cable_internet} />}
              {selected.trash          != null && <Row label="Trash"          value={selected.trash} />}
            </Section>
          )}

          {selected.amenities && (
            <Section title="Amenities">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selected.amenities.split(",").map(a => a.trim()).filter(Boolean).map(a => (
                  <span key={a} style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa",
                    borderRadius: 6, fontSize: 12, padding: "3px 10px",
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d0d0d", overflow: "hidden" }}>
      {sidebar}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {topBar}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "card" ? cardView : tableView}
        </div>
      </div>

      {slideOver}
    </div>
  );
}

// ─── Default export (wraps inner with Suspense) ───────────────────────────────

export default function CommunitiesClient(props: Props) {
  return (
    <Suspense>
      <CommunitiesInner {...props} />
    </Suspense>
  );
}
