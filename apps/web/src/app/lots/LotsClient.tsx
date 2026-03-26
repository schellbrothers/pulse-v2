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

  // ── New: column filter state ──────────────────────────────────────────────
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Reset community when division changes
  useEffect(() => {
    setCommunityFilter("all");
  }, [divisionFilter]);

  // Close column filter dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) setOpenDropdown(null);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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

  // ── New: get unique values for a column (from full lots list) ─────────────
  function getUniqueValues(col: string): string[] {
    const vals = new Set<string>();
    lots.forEach((l) => {
      let v = "";
      if (col === "division_raw") v = l.division_raw;
      else if (col === "community_name_raw") v = l.community_name_raw;
      else if (col === "lot_status") v = l.lot_status ?? "";
      else if (col === "construction_status") v = l.construction_status ?? "";
      else if (col === "is_available") v = l.is_available ? "Yes" : "No";
      else if (col === "foundation") v = l.foundation ?? "";
      if (v) vals.add(v);
    });
    return Array.from(vals).sort();
  }

  // Filtered + sorted rows (column filters applied after existing filters)
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
      // ── New: column header filters ────────────────────────────────────────
      .filter((l) => {
        for (const [col, vals] of Object.entries(columnFilters)) {
          if (vals.length === 0) continue;
          let cellVal = "";
          if (col === "division_raw") cellVal = l.division_raw;
          else if (col === "community_name_raw") cellVal = l.community_name_raw;
          else if (col === "lot_status") cellVal = l.lot_status ?? "";
          else if (col === "construction_status") cellVal = l.construction_status ?? "";
          else if (col === "is_available") cellVal = l.is_available ? "Yes" : "No";
          else if (col === "foundation") cellVal = l.foundation ?? "";
          if (!vals.includes(cellVal)) return false;
        }
        return true;
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
  }, [lots, divisionFilter, communityFilter, statusFilter, availableOnly, search, sortCol, sortDir, columnFilters]);

  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => { setCurrentPage(1); }, [divisionFilter, communityFilter, statusFilter, availableOnly, search, columnFilters]);

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

  // ── New: FilterableHeader nested component ────────────────────────────────
  function FilterableHeader({
    col,
    label,
    extraStyle,
  }: {
    col: string;
    label: string;
    extraStyle?: React.CSSProperties;
  }) {
    const isOpen = openDropdown === col;
    const activeFilters = columnFilters[col] ?? [];
    const hasFilter = activeFilters.length > 0;
    const values = getUniqueValues(col);

    return (
      <th
        data-dropdown
        style={{
          padding: "6px 12px",
          textAlign: "left",
          fontWeight: 500,
          fontSize: 11,
          color: hasFilter ? "#0070f3" : "#555",
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          borderBottom: hasFilter ? "2px solid #0070f3" : "1px solid #1a1a1a",
          whiteSpace: "nowrap",
          cursor: "pointer",
          position: "relative",
          userSelect: "none" as const,
          ...extraStyle,
        }}
        onClick={() => setOpenDropdown(isOpen ? null : col)}
      >
        {label}
        {hasFilter && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 9,
              backgroundColor: "#0070f3",
              color: "#fff",
              borderRadius: 10,
              padding: "1px 5px",
            }}
          >
            {activeFilters.length}
          </span>
        )}
        {sortCol === col && (
          <span style={{ marginLeft: 4, fontSize: 10, color: "#888" }}>
            {sortDir === "asc" ? "↑" : "↓"}
          </span>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div
            data-dropdown
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 100,
              backgroundColor: "#111111",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              minWidth: 180,
              maxHeight: 280,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sort options */}
            <div style={{ padding: "6px 0", borderBottom: "1px solid #1f1f1f" }}>
              {(
                [
                  ["asc", "↑ Sort A → Z"],
                  ["desc", "↓ Sort Z → A"],
                ] as [SortDir, string][]
              ).map(([dir, lbl]) => {
                const isActive = sortCol === col && sortDir === dir;
                return (
                  <div
                    key={dir}
                    onClick={() => {
                      handleSort(col);
                      setOpenDropdown(null);
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: 11,
                      color: isActive ? "#ededed" : "#666",
                      cursor: "pointer",
                      backgroundColor: isActive ? "#1a1a1a" : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#1a1a1a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = isActive
                        ? "#1a1a1a"
                        : "transparent")
                    }
                  >
                    {lbl}
                  </div>
                );
              })}
            </div>

            {/* Filter header */}
            <div
              style={{
                padding: "6px 12px 4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Filter
              </span>
              {activeFilters.length > 0 && (
                <button
                  onClick={() =>
                    setColumnFilters((prev) => {
                      const n = { ...prev };
                      delete n[col];
                      return n;
                    })
                  }
                  style={{
                    fontSize: 10,
                    color: "#ff6b6b",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Value list */}
            <div style={{ overflowY: "auto", maxHeight: 180 }}>
              {values.map((val) => {
                const checked = activeFilters.includes(val);
                return (
                  <div
                    key={val}
                    onClick={() =>
                      setColumnFilters((prev) => {
                        const cur = prev[col] ?? [];
                        return {
                          ...prev,
                          [col]: checked
                            ? cur.filter((v) => v !== val)
                            : [...cur, val],
                        };
                      })
                    }
                    style={{
                      padding: "5px 12px",
                      fontSize: 11,
                      color: checked ? "#ededed" : "#a1a1a1",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: checked ? "#1a1f2e" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!checked)
                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                    }}
                    onMouseLeave={(e) => {
                      if (!checked)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        border: `1px solid ${checked ? "#0070f3" : "#2a2a2a"}`,
                        backgroundColor: checked ? "#0070f3" : "transparent",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        color: "#fff",
                      }}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    {val || "(blank)"}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </th>
    );
  }

  // Derived: any active column filters?
  const hasColumnFilters = Object.values(columnFilters).some((v) => v.length > 0);

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

          {/* ── New: clear column filters button ── */}
          {hasColumnFilters && (
            <button
              onClick={() => setColumnFilters({})}
              style={{
                fontSize: 11,
                color: "#ff6b6b",
                background: "none",
                border: "1px solid #3f1f1f",
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              × Clear filters
            </button>
          )}

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
                {/* Division — sticky left, filterable */}
                <FilterableHeader
                  col="division_raw"
                  label="Division"
                  extraStyle={{
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    backgroundColor: "#0d0d0d",
                    minWidth: "120px",
                  }}
                />

                {/* Community — filterable */}
                <FilterableHeader col="community_name_raw" label="Community" />

                {/* Lot # — plain sort header */}
                <th style={thStyle} onClick={() => handleSort("lot_number")}>
                  Lot #{sortIndicator("lot_number")}
                </th>

                {/* Block — plain sort header */}
                <th style={thStyle} onClick={() => handleSort("block")}>
                  Block{sortIndicator("block")}
                </th>

                {/* Status — filterable */}
                <FilterableHeader col="lot_status" label="Status" />

                {/* Construction — filterable */}
                <FilterableHeader col="construction_status" label="Construction" />

                {/* Available — filterable */}
                <FilterableHeader col="is_available" label="Available" />

                {/* Foundation — filterable */}
                <FilterableHeader col="foundation" label="Foundation" />

                {/* Premium — plain sort header */}
                <th style={{ ...thStyle, textAlign: "right" }} onClick={() => handleSort("lot_premium")}>
                  Premium{sortIndicator("lot_premium")}
                </th>

                {/* Address — plain sort header */}
                <th style={thStyle} onClick={() => handleSort("address")}>
                  Address{sortIndicator("address")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                          <span
                            style={{
                              color:
                                lot.foundation === "Basement Only"
                                  ? "#a855f7"
                                  : lot.foundation === "Crawl/Basement"
                                  ? "#0070f3"
                                  : "#666",
                              fontSize: 11,
                            }}
                          >
                            {lot.foundation}
                          </span>
                        ) : (
                          "—"
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
