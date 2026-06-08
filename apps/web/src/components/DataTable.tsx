"use client";

import React, { useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// DataTable — generic, paginated table used across every list page in Pv2.
//
// This component's API is defined by its ~18 consumers (communities, contacts,
// leads, prospects, lots, plans, queue, violations, etc.). They all use:
//   - a DEFAULT import + a named `Column<T>` type
//   - `columns` of shape { key, label, sortable?, filterable?, render?, ... }
//   - `rows` (not `data`)
//   - a `render(value, row)` cell renderer
//   - controlled pagination props (controlledPage / controlledPageSize /
//     defaultPageSize) plus onRowClick / emptyMessage / minWidth.
//
// An earlier stub exported a different ({ header, accessor }, default-less)
// shape that matched none of the pages — the source of 500+ build errors.
// ---------------------------------------------------------------------------

export interface Column<T> {
  /** Stable column id (also used as React key). */
  key: string;
  /** Header label. */
  label: string;
  /** Whether the column participates in client sorting. */
  sortable?: boolean;
  /** Whether the column is offered as a filter facet. */
  filterable?: boolean;
  /** Fixed column width (px or CSS length). */
  width?: number | string;
  /** Cell text alignment. */
  align?: "left" | "center" | "right";
  /** Pin the column (left) while scrolling horizontally. */
  sticky?: boolean;
  /**
   * Custom cell renderer. Receives the raw cell value (row[key] when key is a
   * field of T, else undefined) and the full row. When omitted, the raw value
   * is rendered.
   */
  render?: (value: unknown, row: T) => ReactNode;
}

export interface StatItem {
  label: string;
  value: string | number;
  color?: string;
  /** When true, render `value` as-is instead of as a localized number. */
  isString?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  minWidth?: number | string;
  loading?: boolean;
  /** Optional summary stats rendered as a bar above the table. */
  stats?: StatItem[];

  // Controlled pagination (page state is owned by the parent page).
  controlledPage?: number;
  controlledPageSize?: number;
  defaultPageSize?: number;
}

function cellValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function DataTable<T extends object>({
  columns,
  rows,
  onRowClick,
  emptyMessage = "No data",
  minWidth,
  loading = false,
  stats,
  controlledPage,
  controlledPageSize,
  defaultPageSize = 25,
}: DataTableProps<T>) {
  const statsBar =
    stats && stats.length > 0 ? (
      <div style={{ display: "flex", gap: 24, padding: "8px 12px", flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ fontSize: 12, color: s.color ?? "#a1a1aa" }}>
            <span style={{ opacity: 0.7 }}>{s.label}: </span>
            <span style={{ fontWeight: 600 }}>
              {s.isString || typeof s.value === "string"
                ? s.value
                : (s.value as number).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    ) : null;
  // Pagination is parent-controlled when controlledPage/Size are supplied;
  // otherwise the component manages its own page locally.
  const [localPage] = useState(0);
  const page = controlledPage ?? localPage;
  const pageSize = controlledPageSize ?? defaultPageSize;

  const start = page * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#71717a", fontSize: 13 }}>Loading…</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div>
        {statsBar}
        <div style={{ padding: 24, color: "#71717a", fontSize: 13 }}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      {statsBar}
      <table style={{ width: "100%", minWidth, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: col.align ?? "left",
                  width: col.width,
                  position: col.sticky ? "sticky" : undefined,
                  left: col.sticky ? 0 : undefined,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "#a1a1aa",
                  borderBottom: "1px solid #27272a",
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{
                cursor: onRowClick ? "pointer" : "default",
                borderBottom: "1px solid #1f1f23",
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    textAlign: col.align ?? "left",
                    position: col.sticky ? "sticky" : undefined,
                    left: col.sticky ? 0 : undefined,
                    padding: "8px 12px",
                    fontSize: 13,
                    color: "#ededed",
                  }}
                >
                  {col.render
                    ? col.render(cellValue(row, col.key), row)
                    : ((cellValue(row, col.key) as ReactNode) ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
