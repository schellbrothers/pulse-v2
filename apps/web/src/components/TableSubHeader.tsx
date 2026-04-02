"use client";

// ─── Export utility (importable by pages) ─────────────────────────────────────

export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]).filter(
    (k) => !k.startsWith("_") && typeof rows[0][k] !== "object"
  );
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") ? `"${str}"` : str;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatConfig<T> {
  label: string;
  getValue: (rows: T[]) => string | number;
}

interface Props<T> {
  title: string;
  rows: T[];         // current filtered rows (for stat calculation)
  totalRows: number; // total after filtering (for pagination display)
  stats: StatConfig<T>[];
  // Pagination (controlled)
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // Search
  search: string;
  onSearch: (q: string) => void;
  searchPlaceholder?: string;
  // Export
  onExportAll: () => void;
  onExport: () => void;
  exportFilename?: string;
}

// ─── Arrow button style ───────────────────────────────────────────────────────

const arrowBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #2a2a2a",
  color: "#666",
  borderRadius: 3,
  width: 26,
  height: 26,
  cursor: "pointer",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TableSubHeader<T>({
  title,
  rows,
  totalRows,
  stats,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  search,
  onSearch,
  searchPlaceholder,
  onExportAll,
  onExport,
}: Props<T>) {
  const start = totalRows === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalRows);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        height: 40,
        flexShrink: 0,
        background: "#0d0e10",
        borderTop: "1px solid #222323",
        borderBottom: "1px solid #1a1a1e",
        gap: 16,
        overflowX: "auto",
      }}
    >
      {/* Title + badge */}
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#1a1a1e",
            border: "1px solid #2a2a2a",
            borderRadius: 3,
            padding: "1px 7px",
            fontSize: 11,
            color: "#666",
            marginLeft: 8,
          }}
        >
          {totalRows}
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 18, background: "#2a2a2a", flexShrink: 0 }} />

      {/* Stats */}
      {stats.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            flexShrink: 0,
          }}
        >
          {stats.map((stat, i) => (
            <span key={stat.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              {i > 0 && (
                <span style={{ color: "#2a2a2a", margin: "0 4px" }}>·</span>
              )}
              <span style={{ fontSize: 11, color: "#666" }}>{stat.label}</span>
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: "#1a1a1e", border: "1px solid #2a2a2a",
                borderRadius: 3, padding: "1px 6px",
                fontSize: 11, color: "#aaa", fontWeight: 500,
              }}>
                {stat.getValue(rows)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Entries per page */}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            background: "#1a1a1e",
            border: "1px solid #2a2a2a",
            color: "#888",
            borderRadius: 3,
            height: 26,
            fontSize: 12,
            padding: "0 6px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {[25, 50, 100, 250].map((n) => (
            <option key={n} value={n}>
              {n}/page
            </option>
          ))}
        </select>

        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          style={{
            ...arrowBtnStyle,
            color: page === 0 ? "#333" : "#666",
            cursor: page === 0 ? "default" : "pointer",
          }}
        >
          ←
        </button>

        {/* Range */}
        <span style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>
          {totalRows === 0 ? "0 results" : `${start}–${end} of ${totalRows}`}
        </span>

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={end >= totalRows}
          style={{
            ...arrowBtnStyle,
            color: end >= totalRows ? "#333" : "#666",
            cursor: end >= totalRows ? "default" : "pointer",
          }}
        >
          →
        </button>

        {/* Export All */}
        <button
          onClick={onExportAll}
          style={{
            background: "#1a1a1e",
            border: "1px solid #2a2a2a",
            color: "#666",
            borderRadius: 3,
            height: 26,
            padding: "0 10px",
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ↓ Export All
        </button>

        {/* Export filtered */}
        <button
          onClick={onExport}
          style={{
            background: "#1a2a1a",
            border: "1px solid #2a4a2a",
            color: "#80B602",
            borderRadius: 3,
            height: 26,
            padding: "0 10px",
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ↓ Export
        </button>

        {/* Search */}
        <input
          type="text"
          placeholder={searchPlaceholder ?? "Search…"}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            background: "#1a1a1e",
            border: "1px solid #2a2a2a",
            color: search ? "#ededed" : "#555",
            borderRadius: 3,
            height: 26,
            fontSize: 12,
            padding: "0 8px",
            outline: "none",
            width: 180,
          }}
        />
      </div>
    </div>
  );
}
