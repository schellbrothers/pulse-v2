"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
  division_id: string;
}

interface Lot {
  id: string;
  community_id: string | null;
  community_name_raw: string;
  division_raw: string;
  lot_number: string;
  block: string | null;
  phase: string | null;
  lot_status: string | null;
  construction_status: string | null;
  is_buildable: boolean | null;
  is_available: boolean;
  is_hide_from_marketing: boolean;
  address: string | null;
  lot_premium: number;
}

interface Props {
  lots: Lot[];
  divisions: Division[];
  communities: Community[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
];

const DIV_LABELS: Record<string, string> = {
  "boise":             "Boise",
  "delaware-beaches":  "Delaware Beaches",
  "nashville":         "Nashville",
  "richmond":          "Richmond",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Available Homesite":  { bg: "#1a2a1a", text: "#00c853", border: "#1f3f1f" },
  "Quick Delivery":      { bg: "#1a1f2e", text: "#0070f3", border: "#1a2a3f" },
  "Future Homesite":     { bg: "#2a2a1a", text: "#f5a623", border: "#3f3a1f" },
  "Model/Future Models": { bg: "#1f1a2e", text: "#a855f7", border: "#2a1f3f" },
  "Sold":                { bg: "#1a1a1a", text: "#555555", border: "#2a2a2a" },
};

const STATUS_OPTIONS = [
  "Available Homesite",
  "Quick Delivery",
  "Future Homesite",
  "Model/Future Models",
  "Sold",
];

type SortDir = "asc" | "desc";

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside
      style={{
        width: "220px",
        minWidth: "220px",
        backgroundColor: "#0a0a0a",
        borderRight: "1px solid #1f1f1f",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🦞</span>
          <div>
            <div style={{ color: "#ededed", fontSize: "14px", fontWeight: 600, lineHeight: 1.2 }}>
              Pulse v2
            </div>
            <div style={{ color: "#555", fontSize: "11px", lineHeight: 1.3 }}>
              HBx AI Factory
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {navItems.map((item) => {
          const isActive = item.href === "/lots";
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 16px",
                fontSize: "13px",
                color: isActive ? "#ededed" : "#666",
                backgroundColor: isActive ? "#161616" : "transparent",
                borderLeft: isActive ? "2px solid #00c853" : "2px solid transparent",
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span style={{ fontSize: "14px", width: "18px", textAlign: "center" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #1a1a1a",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            🦞
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              backgroundColor: "#00c853",
              border: "2px solid #0a0a0a",
            }}
          />
        </div>
        <div>
          <div style={{ color: "#ededed", fontSize: "13px", fontWeight: 500 }}>Schellie</div>
          <div style={{ color: "#555", fontSize: "11px" }}>Orchestrator · Online</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Select helper ────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: "#111",
        color: "#a1a1a1",
        border: "1px solid #2a2a2a",
        borderRadius: "6px",
        padding: "6px 10px",
        fontSize: "12px",
        cursor: "pointer",
        outline: "none",
        height: "32px",
      }}
    >
      {children}
    </select>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LotsClient({ lots, divisions, communities }: Props) {
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [constructionFilter, setConstructionFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("division_raw");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Reset community when division changes
  useEffect(() => {
    setCommunityFilter("all");
  }, [divisionFilter]);

  // Communities filtered by selected division
  const filteredCommunities = useMemo(() => {
    if (divisionFilter === "all") return communities;
    // Match by division slug → find division id
    const div = divisions.find((d) => d.slug === divisionFilter);
    if (!div) return communities;
    return communities.filter((c) => c.division_id === div.id);
  }, [divisionFilter, divisions, communities]);

  // Handle sort header click
  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  // Filtered + sorted rows
  const rows = useMemo(() => {
    return lots
      .filter((l) => divisionFilter === "all" || l.division_raw === divisionFilter)
      .filter((l) => communityFilter === "all" || l.community_name_raw === communityFilter)
      .filter((l) => statusFilter === "all" || l.lot_status === statusFilter)
      .filter((l) => !availableOnly || l.is_available)
      .filter((l) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (l.address ?? "").toLowerCase().includes(q) ||
          l.lot_number.toLowerCase().includes(q) ||
          l.community_name_raw.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortCol === "division_raw" && sortDir === "asc") {
          const d = a.division_raw.localeCompare(b.division_raw);
          if (d !== 0) return d;
          const c = a.community_name_raw.localeCompare(b.community_name_raw);
          if (c !== 0) return c;
          return (
            parseInt(a.lot_number) - parseInt(b.lot_number) ||
            a.lot_number.localeCompare(b.lot_number)
          );
        }
        const av = (a as unknown as Record<string, unknown>)[sortCol] ?? "";
        const bv = (b as unknown as Record<string, unknown>)[sortCol] ?? "";
        const cmp =
          typeof av === "number"
            ? av - (bv as number)
            : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [lots, divisionFilter, communityFilter, statusFilter, availableOnly, search, sortCol, sortDir]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: rows.length,
      available: rows.filter((l) => l.lot_status === "Available Homesite").length,
      quickDelivery: rows.filter((l) => l.lot_status === "Quick Delivery").length,
      future: rows.filter((l) => l.lot_status === "Future Homesite").length,
      sold: rows.filter((l) => l.lot_status === "Sold").length,
    };
  }, [rows]);

  // Sort indicator
  function sortIndicator(col: string) {
    if (sortCol !== col) return <span style={{ color: "#333", marginLeft: "4px" }}>↕</span>;
    return (
      <span style={{ color: "#00c853", marginLeft: "4px" }}>
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#555",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: "1px solid #1a1a1a",
    textAlign: "left",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: "13px",
    color: "#a1a1a1",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #141414",
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0d0d0d", overflow: "hidden" }}>
      <Sidebar />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Top bar */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            backgroundColor: "#0d0d0d",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {/* Title + count */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ color: "#ededed", fontSize: "16px", fontWeight: 600, margin: 0 }}>
              Lots
            </h1>
            <span
              style={{
                backgroundColor: "#1a1a1a",
                color: "#666",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                padding: "2px 9px",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {rows.length}
            </span>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search address or lot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                backgroundColor: "#111",
                color: "#ededed",
                border: "1px solid #2a2a2a",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "12px",
                outline: "none",
                width: "200px",
                height: "32px",
              }}
            />

            {/* Division filter */}
            <FilterSelect value={divisionFilter} onChange={setDivisionFilter}>
              <option value="all">All Divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.slug}>
                  {DIV_LABELS[d.slug] ?? d.name}
                </option>
              ))}
            </FilterSelect>

            {/* Community filter */}
            <FilterSelect value={communityFilter} onChange={setCommunityFilter}>
              <option value="all">All Communities</option>
              {filteredCommunities.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </FilterSelect>

            {/* Status filter */}
            <FilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FilterSelect>

            {/* Available Only toggle */}
            <button
              onClick={() => setAvailableOnly((v) => !v)}
              style={{
                backgroundColor: availableOnly ? "#1a2a1a" : "#111",
                color: availableOnly ? "#00c853" : "#555",
                border: `1px solid ${availableOnly ? "#1f3f1f" : "#2a2a2a"}`,
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                cursor: "pointer",
                height: "32px",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
              }}
            >
              Available Only
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            padding: "8px 20px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            backgroundColor: "#0d0d0d",
            flexShrink: 0,
          }}
        >
          <StatItem label="Total lots" value={stats.total} color="#666" />
          <StatItem label="Available" value={stats.available} color="#00c853" />
          <StatItem label="Quick Delivery" value={stats.quickDelivery} color="#0070f3" />
          <StatItem label="Future" value={stats.future} color="#f5a623" />
          <StatItem label="Sold" value={stats.sold} color="#444" />
        </div>

        {/* Table */}
        <div
          style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: "calc(100vh - 140px)",
            position: "relative",
          }}
        >
          <table
            style={{
              minWidth: "1100px",
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "auto",
            }}
          >
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "#0d0d0d" }}>
                <th
                  style={{
                    ...thStyle,
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    backgroundColor: "#0d0d0d",
                    minWidth: "120px",
                  }}
                  onClick={() => handleSort("division_raw")}
                >
                  Division{sortIndicator("division_raw")}
                </th>
                <th style={thStyle} onClick={() => handleSort("community_name_raw")}>
                  Community{sortIndicator("community_name_raw")}
                </th>
                <th style={thStyle} onClick={() => handleSort("lot_number")}>
                  Lot #{sortIndicator("lot_number")}
                </th>
                <th style={thStyle} onClick={() => handleSort("block")}>
                  Block{sortIndicator("block")}
                </th>
                <th style={thStyle} onClick={() => handleSort("lot_status")}>
                  Status{sortIndicator("lot_status")}
                </th>
                <th style={thStyle} onClick={() => handleSort("construction_status")}>
                  Construction{sortIndicator("construction_status")}
                </th>
                <th style={thStyle} onClick={() => handleSort("is_available")}>
                  Available{sortIndicator("is_available")}
                </th>
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => handleSort("lot_premium")}>
                  Premium{sortIndicator("lot_premium")}
                </th>
                <th style={thStyle} onClick={() => handleSort("address")}>
                  Address{sortIndicator("address")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "48px",
                      textAlign: "center",
                      color: "#444",
                      fontSize: "13px",
                    }}
                  >
                    No lots match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((lot) => {
                  const statusStyle = lot.lot_status ? STATUS_STYLES[lot.lot_status] : null;
                  return (
                    <tr
                      key={lot.id}
                      style={{ transition: "background 0.1s" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#111111")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent")
                      }
                    >
                      {/* Division — sticky left */}
                      <td
                        style={{
                          ...tdStyle,
                          position: "sticky",
                          left: 0,
                          backgroundColor: "#0a0a0a",
                          color: "#ededed",
                          fontWeight: 500,
                          zIndex: 1,
                          minWidth: "120px",
                        }}
                      >
                        {DIV_LABELS[lot.division_raw] ?? lot.division_raw}
                      </td>

                      {/* Community */}
                      <td style={tdStyle}>{lot.community_name_raw || "—"}</td>

                      {/* Lot # */}
                      <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>
                        {lot.lot_number}
                      </td>

                      {/* Block */}
                      <td style={tdStyle}>{lot.block ?? "—"}</td>

                      {/* Status */}
                      <td style={tdStyle}>
                        {lot.lot_status && statusStyle ? (
                          <span
                            style={{
                              display: "inline-block",
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                              border: `1px solid ${statusStyle.border}`,
                              borderRadius: "4px",
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {lot.lot_status}
                          </span>
                        ) : (
                          <span style={{ color: "#444" }}>—</span>
                        )}
                      </td>

                      {/* Construction */}
                      <td style={tdStyle}>{lot.construction_status ?? "—"}</td>

                      {/* Available */}
                      <td style={tdStyle}>
                        {lot.is_available ? (
                          <span style={{ color: "#00c853", fontWeight: 500 }}>Yes</span>
                        ) : (
                          <span style={{ color: "#333" }}>—</span>
                        )}
                      </td>

                      {/* Premium */}
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {lot.lot_premium > 0 ? `$${lot.lot_premium.toLocaleString()}` : "—"}
                      </td>

                      {/* Address */}
                      <td style={{ ...tdStyle, maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {lot.address ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Stat item ────────────────────────────────────────────────────────────────

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <span style={{ color: "#444", fontSize: "12px" }}>{label}:</span>
      <span style={{ color, fontSize: "12px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
