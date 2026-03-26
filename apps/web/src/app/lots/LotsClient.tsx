"use client";

import { useState, useMemo } from "react";
import DataTable, { type Column, type StatItem } from "@/components/DataTable";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lot {
  id: string | number;
  community_name_raw: string;
  division_raw: string;
  lot_number: string;
  block: string;
  lot_status: string;
  construction_status: string;
  is_available: boolean;
  foundation: string;
  lot_premium: number;
  address: string;
  [key: string]: unknown;
}

type LotRow = Lot & Record<string, unknown>;

interface LotsClientProps {
  lots: Lot[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIV_LABELS: Record<string, string> = {
  SB: "Schell Brothers",
  NV: "Neighborhood Ventures",
  CC: "Charter Homes",
  CV: "Covell",
  RB: "Robino",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Available Homesite": { bg: "#0a2e1a", text: "#00c853", border: "#1a5c33" },
  "Quick Delivery":     { bg: "#0a1e3a", text: "#2196f3", border: "#1a3f7a" },
  "Future Homesite":    { bg: "#2e1f00", text: "#f5a623", border: "#5c3f00" },
  "Sold":               { bg: "#1a1a1a", text: "#555",    border: "#2a2a2a" },
  "Under Contract":     { bg: "#2e1a00", text: "#ff9800", border: "#5c3500" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LotsClient({ lots }: LotsClientProps) {
  const [search, setSearch] = useState("");

  // Top-bar search pre-filters by address and lot_number only.
  // All column-level filtering (division, community, status, foundation, etc.)
  // is handled internally by DataTable.
  const rows = useMemo<LotRow[]>(() => {
    if (!search.trim()) return lots as LotRow[];
    const q = search.toLowerCase();
    return lots.filter(
      (l) =>
        l.address?.toLowerCase().includes(q) ||
        l.lot_number?.toLowerCase().includes(q)
    ) as LotRow[];
  }, [lots, search]);

  // ─── Column definitions ──────────────────────────────────────────────────

  const lotColumns: Column<LotRow>[] = [
    {
      key: "community_name_raw",
      label: "Community",
      sticky: true,
      sortable: true,
      filterable: true,
    },
    {
      key: "division_raw",
      label: "Division",
      sortable: true,
      filterable: true,
      render: (v) => (
        <span style={{ fontSize: 11, color: "#a1a1a1" }}>
          {DIV_LABELS[v as string] ?? String(v ?? "—")}
        </span>
      ),
    },
    {
      key: "lot_number",
      label: "Lot #",
      sortable: true,
    },
    {
      key: "block",
      label: "Block",
      sortable: true,
    },
    {
      key: "lot_status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (v) => {
        const s = STATUS_STYLES[v as string];
        return s ? (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: s.bg,
              color: s.text,
              border: `1px solid ${s.border}`,
            }}
          >
            {String(v)}
          </span>
        ) : (
          <span style={{ color: "#555" }}>—</span>
        );
      },
    },
    {
      key: "construction_status",
      label: "Construction",
      sortable: true,
      filterable: true,
    },
    {
      key: "is_available",
      label: "Available",
      sortable: true,
      filterable: true,
      render: (v) =>
        v ? (
          <span style={{ color: "#00c853" }}>Yes</span>
        ) : (
          <span style={{ color: "#444" }}>—</span>
        ),
    },
    {
      key: "foundation",
      label: "Foundation",
      sortable: true,
      filterable: true,
      render: (v) =>
        v ? (
          <span
            style={{
              fontSize: 11,
              color:
                v === "Basement Only"
                  ? "#a855f7"
                  : v === "Crawl/Basement"
                  ? "#0070f3"
                  : "#666",
            }}
          >
            {String(v)}
          </span>
        ) : (
          <span style={{ color: "#444" }}>—</span>
        ),
    },
    {
      key: "lot_premium",
      label: "Premium",
      sortable: true,
      align: "right" as const,
      render: (v) =>
        (v as number) > 0 ? (
          <span style={{ color: "#f5a623" }}>
            +${(v as number).toLocaleString()}
          </span>
        ) : (
          <span style={{ color: "#444" }}>—</span>
        ),
    },
    {
      key: "address",
      label: "Address",
      sortable: true,
    },
  ];

  // ─── Stats ribbon (reflects top-bar-filtered rows) ───────────────────────

  const lotStats: StatItem[] = [
    { label: "Total lots",     value: rows.length,                                                     color: "#666"    },
    { label: "Available",      value: rows.filter((l) => l.lot_status === "Available Homesite").length, color: "#00c853" },
    { label: "Quick Delivery", value: rows.filter((l) => l.lot_status === "Quick Delivery").length,     color: "#0070f3" },
    { label: "Future",         value: rows.filter((l) => l.lot_status === "Future Homesite").length,    color: "#f5a623" },
    { label: "Sold",           value: rows.filter((l) => l.lot_status === "Sold").length,               color: "#444"    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/lots" />
      <main className="flex-1 overflow-y-auto flex flex-col">
      {/* Top bar: title left, search right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          backgroundColor: "#0d0d0d",
          borderBottom: "1px solid #1a1a1a",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "#ededed",
            letterSpacing: "-0.01em",
          }}
        >
          Lots
        </h1>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address or lot..."
          style={{
            background: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12,
            color: "#a1a1a1",
            outline: "none",
            width: 240,
          }}
        />
      </div>

      {/* DataTable owns stats ribbon, column filters, sort, pagination */}
      <DataTable<LotRow>
        columns={lotColumns}
        rows={rows}
        stats={lotStats}
        defaultPageSize={100}
        minWidth={1100}
        emptyMessage="No lots match the current filters"
      />
      </main>
    </div>
  );
}
