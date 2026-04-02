"use client";

import { useState, useMemo, useEffect, useCallback } from "react";

// Column definition
interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  sticky?: boolean;
  width?: string | number;
  align?: "left" | "right" | "center";
  render?: (value: unknown, row: T) => React.ReactNode;
  filterValues?: string[];
}

// Stat item for the ribbon (static — parent pre-computes value)
interface StatItem {
  label: string;
  value: number | string;
  color: string;
  isString?: boolean;
}

// Dynamic stat config — DataTable computes value from its internal filtered rows
interface StatConfigItem<T> {
  label: string;
  color: string;
  isString?: boolean;
  getValue: (rows: T[]) => number | string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  /** Static stats — parent pre-computes the values (not filter-aware). */
  stats?: StatItem[];
  /**
   * Dynamic stats — DataTable computes values from its internal `filtered` array.
   * Whenever column filters / search / sort changes, these update automatically.
   * Takes precedence over `stats` when both are provided.
   */
  statConfig?: StatConfigItem<T>[];
  defaultPageSize?: number;
  stickyFirstColumn?: boolean;
  emptyMessage?: string;
  minWidth?: number;
  maxHeight?: string;
  searchKeys?: (keyof T)[];
  showSearch?: boolean;
  onRowClick?: (row: T) => void;
  /** @deprecated — use statConfig instead for filter-reactive stats */
  onFilteredRowsChange?: (rows: T[]) => void;
  /** Controlled pagination — when provided, DataTable skips its own pagination UI */
  controlledPage?: number;
  controlledPageSize?: number;
  onControlledPageChange?: (page: number) => void;
}

const thStyle = {
  padding: "6px 16px",
  borderTop: "1px solid #3a3a3a",
  textAlign: "left" as const,
  fontWeight: 500,
  fontSize: 11,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  borderBottom: "1px solid #444",
  borderRight: "1px solid #1e1e1e",
  whiteSpace: "nowrap" as const,
  cursor: "pointer",
  userSelect: "none" as const,
  backgroundColor: "#222323",
};

function DataTable<T extends Record<string, unknown>>(props: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(props.defaultPageSize ?? 100);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  // Outside-click handler
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-dropdown]")) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Data pipeline
  const filtered = useMemo(() => {
    let data = [...props.rows];

    // Search
    if (search && props.searchKeys?.length) {
      const q = search.toLowerCase();
      data = data.filter((r) =>
        props.searchKeys!.some((k) =>
          String(r[k as string] ?? "")
            .toLowerCase()
            .includes(q)
        )
      );
    }

    // Column filters
    for (const [col, vals] of Object.entries(columnFilters)) {
      if (!vals.length) continue;
      data = data.filter((r) => vals.includes(String(r[col] ?? "")));
    }

    // Sort
    if (sortCol) {
      data.sort((a, b) => {
        const av = String(a[sortCol] ?? "");
        const bv = String(b[sortCol] ?? "");
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return data;
  }, [props.rows, search, columnFilters, sortCol, sortDir, props.searchKeys]);

  // Compute dynamic ribbon stats from filtered rows (Approach D).
  // This is derived directly from `filtered` via useMemo — no useEffect, no callbacks,
  // no stale closures. Stats are always in sync with the visible filtered set.
  const ribbonStats = useMemo<StatItem[] | null>(() => {
    if (!props.statConfig || props.statConfig.length === 0) return null;
    return props.statConfig.map((s) => ({
      label: s.label,
      color: s.color,
      isString: s.isString,
      value: s.getValue(filtered),
    }));
  }, [filtered, props.statConfig]);

  // The stats to render: dynamic (ribbonStats) takes precedence over static (props.stats)
  const activeStats = ribbonStats ?? props.stats;

  const isControlled = props.controlledPage !== undefined;
  const internalEffectivePageSize = pageSize === 9999 ? filtered.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / internalEffectivePageSize));
  const effectivePageSize = isControlled ? (props.controlledPageSize ?? 25) : internalEffectivePageSize;
  // 0-based page index: controlled uses props.controlledPage directly; internal uses currentPage - 1
  const effectivePage0 = isControlled ? (props.controlledPage ?? 0) : (currentPage - 1);
  const paged = filtered.slice(effectivePage0 * effectivePageSize, (effectivePage0 + 1) * effectivePageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [columnFilters, search, sortCol]);

  // Notify parent of filtered rows (for stats sync)
  useEffect(() => {
    props.onFilteredRowsChange?.(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // Legacy callback support (deprecated — prefer statConfig)
  useEffect(() => {
    if (props.onFilteredRowsChange) {
      props.onFilteredRowsChange(filtered);
    }
  }, [filtered, props.onFilteredRowsChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters =
    Object.values(columnFilters).some((v) => v.length > 0) ||
    (search.length > 0);

  const getUniqueValues = useCallback(
    (col: string): string[] => {
      const vals = new Set<string>();
      props.rows.forEach((r) => {
        const v = String(r[col] ?? "");
        if (v) vals.add(v);
      });
      return Array.from(vals).sort();
    },
    [props.rows]
  );

  function handleSortClick(colKey: string) {
    if (sortCol === colKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("asc");
    }
  }

  function toggleFilter(colKey: string, val: string) {
    setColumnFilters((prev) => {
      const current = prev[colKey] ?? [];
      const next = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      return { ...prev, [colKey]: next };
    });
  }

  // FilterableHeader (internal render function)
  function renderHeader(col: Column<T>, index: number) {
    const colKey = col.key as string;
    const isFilterable = col.filterable === true;
    const isSortable = col.sortable !== false;
    const isActiveSort = sortCol === colKey;
    const activeFilters = columnFilters[colKey] ?? [];
    const hasActiveFilter = activeFilters.length > 0;
    const isOpen = openDropdown === colKey;

    // Sticky header for first column
    const isSticky =
      col.sticky || (index === 0 && props.stickyFirstColumn !== false && col.sticky !== false);

    const headerStyle: React.CSSProperties = {
      ...thStyle,
      color: hasActiveFilter ? "#59a6bd" : isActiveSort ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
      borderBottom: hasActiveFilter
        ? "2px solid #59a6bd"
        : "1px solid #555",
      width: col.width ?? undefined,
      textAlign: col.align ?? "left",
      ...(isSticky
        ? { position: "sticky", left: 0, zIndex: 3, backgroundColor: "#222323" }
        : {}),
      position: isSticky ? "sticky" : "relative",
    };

    if (!isFilterable) {
      // Sort-only header
      return (
        <th
          key={colKey}
          style={headerStyle}
          onClick={() => isSortable && handleSortClick(colKey)}
        >
          {col.label}
          {isActiveSort && (
            <span style={{ marginLeft: 4, color: "rgba(255,255,255,0.6)" }}>
              {sortDir === "asc" ? "↑" : "↓"}
            </span>
          )}
        </th>
      );
    }

    // Filterable header with dropdown
    const filterOptions =
      col.filterValues ?? getUniqueValues(colKey);

    return (
      <th
        key={colKey}
        style={{ ...headerStyle, position: isSticky ? "sticky" : "relative" }}
        data-dropdown
      >
        <div
          data-dropdown
          style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
          onClick={() => setOpenDropdown(isOpen ? null : colKey)}
        >
          <span>{col.label}</span>
          {hasActiveFilter && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#59a6bd",
                color: "#fff",
                borderRadius: "50%",
                width: 14,
                height: 14,
                fontSize: 9,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {activeFilters.length}
            </span>
          )}
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>▼</span>
        </div>

        {isOpen && (
          <div
            data-dropdown
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 100,
              backgroundColor: "#0d0e10",
              border: "1px solid #555",
              borderRadius: 6,
              minWidth: 180,
              maxHeight: 300,
              overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              padding: "4px 0",
            }}
          >
            {/* Sort options */}
            {isSortable && (
              <>
                <button
                  data-dropdown
                  onClick={() => {
                    setSortCol(colKey);
                    setSortDir("asc");
                    setOpenDropdown(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 11,
                    color: sortCol === colKey && sortDir === "asc" ? "#59a6bd" : "rgba(255,255,255,0.5)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ↑ Sort A → Z
                </button>
                <button
                  data-dropdown
                  onClick={() => {
                    setSortCol(colKey);
                    setSortDir("desc");
                    setOpenDropdown(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 11,
                    color: sortCol === colKey && sortDir === "desc" ? "#59a6bd" : "rgba(255,255,255,0.5)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ↓ Sort Z → A
                </button>
                <div
                  style={{
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    margin: "4px 0",
                  }}
                />
              </>
            )}

            {/* Filter value list */}
            {filterOptions.length === 0 ? (
              <div
                style={{
                  padding: "10px 16px",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                No values
              </div>
            ) : (
              filterOptions.map((val) => (
                <label
                  key={val}
                  data-dropdown
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 12px",
                    fontSize: 11,
                    color: activeFilters.includes(val) ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    backgroundColor: activeFilters.includes(val)
                      ? "#0d1520"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!activeFilters.includes(val))
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!activeFilters.includes(val))
                      e.currentTarget.style.backgroundColor = "transparent";
                    else e.currentTarget.style.backgroundColor = "#0d1520";
                  }}
                >
                  <div
                    data-dropdown
                    onClick={(e) => { e.stopPropagation(); toggleFilter(colKey, val); }}
                    style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `1px solid ${activeFilters.includes(val) ? "#59a6bd" : "#555"}`,
                      backgroundColor: activeFilters.includes(val) ? "#0a2540" : "#1a1a1e",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", fontSize: 9, color: "#59a6bd", lineHeight: "1",
                    }}
                  >{activeFilters.includes(val) ? "✓" : ""}</div>
                  <span data-dropdown>{val}</span>
                </label>
              ))
            )}

            {/* Clear column filter */}
            {activeFilters.length > 0 && (
              <>
                <div
                  style={{
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    margin: "4px 0",
                  }}
                />
                <button
                  data-dropdown
                  onClick={() => {
                    setColumnFilters((prev) => ({ ...prev, [colKey]: [] }));
                    setOpenDropdown(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 11,
                    color: "#E32027",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  × Clear filter
                </button>
              </>
            )}
          </div>
        )}
      </th>
    );
  }

  const rangeStart = filtered.length === 0 ? 0 : effectivePage0 * effectivePageSize + 1;
  const rangeEnd = Math.min((effectivePage0 + 1) * effectivePageSize, filtered.length);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#121314",
      }}
    >
      {/* Search bar */}
      {props.showSearch && (
        <div
          style={{
            padding: "8px 24px",
            backgroundColor: "#0d0e10",
            borderBottom: "1px solid #444",
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              background: "#0d0e10",
              border: "1px solid #555",
              borderRadius: 6,
              padding: "10px 16px",
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              outline: "none",
              width: 240,
            }}
          />
        </div>
      )}

      {/* Stats ribbon + pagination — hidden when using controlled pagination from TableSubHeader */}
      {!isControlled && <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "6px 24px",
          backgroundColor: "#0d0e10",
          borderBottom: "1px solid #444",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {/* Stats — rendered from ribbonStats (dynamic) or props.stats (static) */}
        {activeStats && activeStats.length > 0 && (
          <>
            {activeStats.map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{s.label}:</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>
                  {s.isString
                    ? s.value
                    : typeof s.value === "number"
                    ? s.value.toLocaleString()
                    : s.value}
                </span>
              </div>
            ))}
          </>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setColumnFilters({});
              setSearch("");
            }}
            style={{
              marginLeft: activeStats && activeStats.length > 0 ? 0 : "auto",
              fontSize: 11,
              color: "#E32027",
              background: "none",
              border: "1px solid #5a2020",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
            }}
          >
            × Clear filters
          </button>
        )}

        {/* Pagination controls */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              background: "#0d0e10",
              border: "1px solid #555",
              color: "rgba(255,255,255,0.6)",
              fontSize: 11,
              borderRadius: 4,
              padding: "3px 8px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value={100}>100 / page</option>
            <option value={250}>250 / page</option>
            <option value={500}>500 / page</option>
            <option value={9999}>All</option>
          </select>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {filtered.length === 0
              ? "0 results"
              : `${rangeStart}–${rangeEnd} of ${filtered.length}`}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              background: "#0d0e10",
              border: "1px solid #555",
              fontSize: 12,
              borderRadius: 4,
              padding: "3px 8px",
              color: currentPage === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              cursor: currentPage === 1 ? "default" : "pointer",
            }}
          >
            ←
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            style={{
              background: "#0d0e10",
              border: "1px solid #555",
              fontSize: 12,
              borderRadius: 4,
              padding: "3px 8px",
              color: currentPage >= totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              cursor: currentPage >= totalPages ? "default" : "pointer",
            }}
          >
            →
          </button>
        </div>
      </div>}

      {/* Table */}
      <div
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: props.maxHeight ?? "calc(100vh - 140px)",
          position: "relative",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: props.minWidth ?? 800,
            fontSize: 12,
            borderCollapse: "collapse",
          }}
        >
          <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
            <tr style={{ backgroundColor: "#222323" }}>
              {props.columns.map((col, i) => renderHeader(col, i))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={props.columns.length}
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 12,
                  }}
                >
                  {props.emptyMessage ?? "No data"}
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr
                  key={ri}
                  onClick={() => props.onRowClick?.(row)}
                  style={{
                    borderBottom: "1px solid #444",
                    cursor: props.onRowClick ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => {
                    if (props.onRowClick)
                      e.currentTarget.style.backgroundColor = "#444950";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
{props.columns.map((col, ci) => {
                    const val = row[col.key as string];
                    const isSticky =
                      col.sticky ||
                      (ci === 0 &&
                        props.stickyFirstColumn !== false &&
                        col.sticky !== false);
                    return (
                      <td
                        key={col.key as string}
                        style={{
                          padding: "10px 16px",
                          fontSize: 12,
                          color: isSticky ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)",
                          fontWeight: isSticky ? 500 : 400,
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid #444",
                          borderRight: "1px solid #1e1e1e",
                          textAlign: col.align ?? "left",
                          ...(isSticky
                            ? {
                                position: "sticky",
                                left: 0,
                                backgroundColor: "#0d0e10",
                                zIndex: 1,
                              }
                            : {}),
                        }}
                      >
                        {isSticky && ci === 0
                          ? <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                              <span style={{ fontSize: 10, color: "#3a3a3a", marginRight: 7, fontFamily: "monospace", userSelect: "none" as const, flexShrink: 0 }}>{ri + 1}.</span>
                              {col.render ? col.render(val, row) : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{String(val ?? "—")}</span>}
                            </div>
                          : col.render ? col.render(val, row) : String(val ?? "—")
                        }
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
export type { Column, StatItem, StatConfigItem, DataTableProps };
