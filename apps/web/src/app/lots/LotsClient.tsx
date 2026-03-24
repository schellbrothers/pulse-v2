"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

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
  foundation: string | null;
}

interface Props {
  lots: Lot[];
  divisions: Division[];
  communities: Community[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  const [basementOnly, setBasementOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("division_raw");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pageSize, setPageSize] = useState(250);
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => { setCurrentPage(1); }, [divisionFilter, communityFilter, statusFilter, availableOnly, search]);

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
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/lots" />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3 flex items-center justify-between">
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
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#555" }}>
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} of {rows.length}
            </span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ background: "#111", border: "1px solid #2a2a2a", color: "#a1a1a1", fontSize: 11, borderRadius: 4, padding: "3px 8px", outline: "none" }}
            >
              <option value={100}>100 / page</option>
              <option value={250}>250 / page</option>
              <option value={500}>500 / page</option>
              <option value={9999}>All</option>
            </select>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ background: "#111", border: "1px solid #2a2a2a", color: currentPage === 1 ? "#333" : "#a1a1a1", fontSize: 12, borderRadius: 4, padding: "3px 8px", cursor: currentPage === 1 ? "default" : "pointer" }}
            >←</button>
            <span style={{ fontSize: 11, color: "#555" }}>{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ background: "#111", border: "1px solid #2a2a2a", color: currentPage === totalPages ? "#333" : "#a1a1a1", fontSize: 12, borderRadius: 4, padding: "3px 8px", cursor: currentPage === totalPages ? "default" : "pointer" }}
            >→</button>
          </div>
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
                <th style={thStyle} onClick={() => handleSort("foundation")}>
                  Foundation{sortIndicator("foundation")}
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
                paginatedRows.map((lot) => {
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
                      {/* Foundation */}
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {lot.foundation ? (
                          <span style={{ color: lot.foundation === "Basement Only" ? "#a855f7" : lot.foundation === "Crawl/Basement" ? "#0070f3" : "#666", fontSize: 11 }}>
                            {lot.foundation}
                          </span>
                        ) : "—"}
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
      </main>
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
