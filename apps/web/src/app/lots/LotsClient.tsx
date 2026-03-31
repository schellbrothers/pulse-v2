"use client";

import { useState, useEffect, useMemo } from "react";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import FiltersBar from "@/components/FiltersBar";
import StatsBar from "@/components/StatsBar";
import ViewToggle from "@/components/ViewToggle";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import Badge from "@/components/Badge";
import DataTable, { type Column, type StatConfigItem } from "@/components/DataTable";
import type { LotRow, CommunityRow, DivisionRow } from "./page";

// ─── Types ────────────────────────────────────────────────────────────────────

type LotTableRow = LotRow & Record<string, unknown>;

interface Props {
  lots: LotRow[];
  communities: CommunityRow[];
  divisions: DivisionRow[];
}

// ─── Lot status config ────────────────────────────────────────────────────────

const LOT_STATUS_STYLES: Record<
  string,
  { bg: string; color: string; border: string; variant?: string }
> = {
  "Available Homesite": { bg: "#0a2e1a", color: "#00c853", border: "#1a5c33" },
  "Quick Delivery": { bg: "#0a1e3a", color: "#2196f3", border: "#1a3f7a" },
  "Future Homesite": { bg: "#2e1f00", color: "#f5a623", border: "#5c3f00" },
  "Under Contract": { bg: "#2e1a00", color: "#ff9800", border: "#5c3500" },
  "Sold": { bg: "#1a1a1a", color: "#555", border: "#2a2a2a" },
};

function getLotStatusStyle(status: string | null): { bg: string; color: string; border: string } {
  if (status && LOT_STATUS_STYLES[status]) {
    return LOT_STATUS_STYLES[status];
  }
  return { bg: "#1a1a1a", color: "#555", border: "#2a2a2a" };
}

function LotStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#333" }}>—</span>;
  const s = getLotStatusStyle(status);
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 4,
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontWeight: 600,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {status}
    </span>
  );
}

function ConstructionBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#333" }}>—</span>;
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 4,
        backgroundColor: "#1a1a2e",
        color: "#7a7aaa",
        border: "1px solid #2a2a4f",
        fontWeight: 600,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {status}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LotsClient({ lots, communities, divisions }: Props) {
  const [view, setView] = useState<"card" | "table">("table");
  const [divFilter, setDivFilter] = useState("");
  const [commFilter, setCommFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [constructionFilter, setConstructionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLot, setSelectedLot] = useState<LotTableRow | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lots-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "card" | "table") {
    setView(v);
    localStorage.setItem("lots-view", v);
  }

  // Build a community lookup map for enrichment
  const communityMap = useMemo(
    () => new Map(communities.map((c) => [c.id, c])),
    [communities]
  );

  // Build a division lookup map for enrichment
  const divisionMap = useMemo(
    () => new Map(divisions.map((d) => [d.id, d])),
    [divisions]
  );

  // Build filter options
  const divisionOptions = useMemo(
    () =>
      divisions.map((d) => ({ value: d.id, label: d.name })),
    [divisions]
  );

  // Get unique community names filtered by division
  const commOptions = useMemo(() => {
    const relevant = !divFilter
      ? lots
      : lots.filter((l) => {
          const comm = l.community_id ? communityMap.get(l.community_id) : null;
          const div = comm?.division_id ? divisionMap.get(comm.division_id) : null;
          return div?.id === divFilter;
        });
    return Array.from(new Set(relevant.map((l) => l.community_name_raw).filter(Boolean)))
      .sort()
      .map((n) => ({ value: n as string, label: n as string }));
  }, [lots, divFilter, communityMap, divisionMap]);

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(lots.map((l) => l.lot_status).filter(Boolean)))
        .sort()
        .map((s) => ({ value: s as string, label: s as string })),
    [lots]
  );

  const constructionOptions = useMemo(
    () =>
      Array.from(new Set(lots.map((l) => l.construction_status).filter(Boolean)))
        .sort()
        .map((s) => ({ value: s as string, label: s as string })),
    [lots]
  );

  // Filtered rows
  const rows = useMemo<LotTableRow[]>(() => {
    return (lots as LotTableRow[]).filter((l) => {
      if (divFilter) {
        const comm = l.community_id ? communityMap.get(l.community_id as string) : null;
        const div = comm?.division_id ? divisionMap.get(comm.division_id) : null;
        if (div?.id !== divFilter) return false;
      }
      if (commFilter && l.community_name_raw !== commFilter) return false;
      if (statusFilter && l.lot_status !== statusFilter) return false;
      if (constructionFilter && l.construction_status !== constructionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (l.address ?? "").toLowerCase().includes(q) ||
          (l.lot_number ?? "").toLowerCase().includes(q) ||
          (l.community_name_raw ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [lots, divFilter, commFilter, statusFilter, constructionFilter, search, communityMap, divisionMap]);

  // Stats
  const statsBarItems = useMemo(
    () => [
      { label: "Total Lots", value: rows.length, color: "#666" },
      {
        label: "Available",
        value: rows.filter((l) => l.lot_status === "Available Homesite").length,
        color: "#00c853",
      },
      {
        label: "Under Construction",
        value: rows.filter(
          (l) => l.construction_status && l.construction_status !== "Not Started"
        ).length,
        color: "#7a7aaa",
      },
      {
        label: "Quick Delivery",
        value: rows.filter((l) => l.lot_status === "Quick Delivery").length,
        color: "#2196f3",
      },
    ],
    [rows]
  );

  // Table stat config (filter-reactive)
  const statConfig: StatConfigItem<LotTableRow>[] = [
    { label: "Total Lots", color: "#666", getValue: (r) => r.length },
    {
      label: "Available",
      color: "#00c853",
      getValue: (r) => r.filter((l) => l.lot_status === "Available Homesite").length,
    },
    {
      label: "Under Construction",
      color: "#7a7aaa",
      getValue: (r) =>
        r.filter(
          (l) => l.construction_status && l.construction_status !== "Not Started"
        ).length,
    },
    {
      label: "Quick Delivery",
      color: "#2196f3",
      getValue: (r) => r.filter((l) => l.lot_status === "Quick Delivery").length,
    },
  ];

  // Helper to get division name for a lot
  function getDivisionName(lot: LotTableRow): string {
    const comm = lot.community_id
      ? communityMap.get(lot.community_id as string)
      : null;
    if (!comm?.division_id) return lot.division_raw ?? "—";
    return divisionMap.get(comm.division_id)?.name ?? lot.division_raw ?? "—";
  }

  // Table columns
  const columns: Column<LotTableRow>[] = [
    {
      key: "community_name_raw",
      label: "Community",
      sticky: true,
      sortable: true,
      filterable: true,
      render: (_v, row) => (
        <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>
          {row.community_name_raw ?? "—"}
        </span>
      ),
    },
    {
      key: "lot_number",
      label: "Lot #",
      sortable: true,
      render: (_v, row) => (
        <span style={{ color: "#c0c0c0", fontSize: 12 }}>
          {row.lot_number ?? "—"}
          {row.block ? ` / ${row.block}` : ""}
        </span>
      ),
    },
    {
      key: "address",
      label: "Address",
      sortable: true,
      render: (_v, row) => (
        <span style={{ color: "#888", fontSize: 12 }}>{row.address ?? "—"}</span>
      ),
    },
    {
      key: "lot_status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (_v, row) => <LotStatusBadge status={row.lot_status} />,
    },
    {
      key: "construction_status",
      label: "Construction",
      sortable: true,
      filterable: true,
      render: (_v, row) => <ConstructionBadge status={row.construction_status} />,
    },
    {
      key: "division_raw",
      label: "Division",
      sortable: true,
      filterable: true,
      render: (_v, row) => (
        <span style={{ fontSize: 12, color: "#a1a1a1" }}>{getDivisionName(row)}</span>
      ),
    },
    {
      key: "lot_premium",
      label: "Premium",
      sortable: true,
      align: "right" as const,
      render: (_v, row) =>
        (row.lot_premium as number) > 0 ? (
          <span style={{ color: "#f5a623", fontSize: 12, fontWeight: 600 }}>
            +${(row.lot_premium as number).toLocaleString()}
          </span>
        ) : (
          <span style={{ color: "#333" }}>—</span>
        ),
    },
    {
      key: "foundation",
      label: "Foundation",
      sortable: true,
      filterable: true,
      render: (_v, row) =>
        row.foundation ? (
          <span
            style={{
              fontSize: 11,
              color:
                row.foundation === "Basement Only"
                  ? "#a855f7"
                  : row.foundation === "Crawl/Basement"
                  ? "#0070f3"
                  : "#666",
            }}
          >
            {row.foundation as string}
          </span>
        ) : (
          <span style={{ color: "#333" }}>—</span>
        ),
    },
  ];

  // ── Card view ───────────────────────────────────────────────────────────────
  const cardView = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 10,
        padding: 16,
      }}
    >
      {rows.map((lot) => {
        const divName = getDivisionName(lot);
        const hasPremium = (lot.lot_premium as number) > 0;
        return (
          <div
            key={String(lot.id)}
            onClick={() => setSelectedLot(lot)}
            style={{
              borderRadius: 8,
              border: "1px solid #1f1f1f",
              backgroundColor: "#111",
              padding: 12,
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
          >
            {/* Community name */}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 600,
                color: "#ededed",
                marginBottom: 2,
              }}
            >
              {lot.community_name_raw ?? "—"}
            </div>

            {/* Lot # and block */}
            <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
              Lot {lot.lot_number ?? "—"}
              {lot.block ? ` · Block ${lot.block}` : ""}
              {lot.phase ? ` · Phase ${lot.phase}` : ""}
            </div>

            {/* Address */}
            {lot.address && (
              <div
                style={{
                  fontSize: 11,
                  color: "#555",
                  marginBottom: 8,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {lot.address}
              </div>
            )}

            {/* Status badges */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: lot.lot_premium ? 6 : 0,
              }}
            >
              <LotStatusBadge status={lot.lot_status} />
              {lot.construction_status && (
                <ConstructionBadge status={lot.construction_status} />
              )}
            </div>

            {/* Lot premium */}
            {hasPremium && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#f5a623",
                  marginTop: 6,
                }}
              >
                +${(lot.lot_premium as number).toLocaleString()} premium
              </div>
            )}

            {/* Division */}
            <div style={{ fontSize: 10, color: "#444", marginTop: 6 }}>{divName}</div>
          </div>
        );
      })}
    </div>
  );

  // ── Slide-over content ──────────────────────────────────────────────────────
  const selectedDivName = selectedLot ? getDivisionName(selectedLot) : "—";

  return (
    <PageShell
      topBar={
        <TopBar
          title="Lots"
          right={<ViewToggle view={view} onChange={handleViewChange} />}
        />
      }
      filtersBar={
        <>
          <FiltersBar
            filters={[
              {
                value: divFilter,
                onChange: (v) => {
                  setDivFilter(v);
                  setCommFilter("");
                },
                options: divisionOptions,
                placeholder: "All Divisions",
              },
              {
                value: commFilter,
                onChange: setCommFilter,
                options: commOptions,
                placeholder: "All Communities",
              },
              {
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
                placeholder: "All Statuses",
              },
              {
                value: constructionFilter,
                onChange: setConstructionFilter,
                options: constructionOptions,
                placeholder: "All Construction",
              },
            ]}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search address or lot…"
          />
          {view === "card" && <StatsBar stats={statsBarItems} />}
        </>
      }
    >
      {view === "table" ? (
        <DataTable<LotTableRow>
          columns={columns}
          rows={rows}
          statConfig={statConfig}
          defaultPageSize={100}
          onRowClick={setSelectedLot}
          emptyMessage="No lots match the current filters"
          minWidth={1000}
        />
      ) : (
        cardView
      )}

      {/* Slide-over */}
      <SlideOver
        open={!!selectedLot}
        onClose={() => setSelectedLot(null)}
        title={
          selectedLot
            ? `Lot ${selectedLot.lot_number ?? "—"}${selectedLot.block ? ` / Block ${selectedLot.block}` : ""}`
            : "Lot Detail"
        }
        subtitle={selectedLot?.community_name_raw ?? undefined}
        badge={<LotStatusBadge status={selectedLot?.lot_status ?? null} />}
        width={480}
      >
        {selectedLot && (
          <>
            <Section title="Community">
              <Row label="Community" value={selectedLot.community_name_raw} />
              <Row label="Division" value={selectedDivName} />
            </Section>

            <Section title="Address">
              <Row label="Address" value={selectedLot.address} />
            </Section>

            <Section title="Lot Info">
              <Row label="Lot Number" value={selectedLot.lot_number} />
              <Row label="Block" value={selectedLot.block} />
              <Row label="Phase" value={selectedLot.phase} />
              <Row
                label="Lot Premium"
                value={
                  (selectedLot.lot_premium as number) > 0 ? (
                    <span style={{ color: "#f5a623", fontWeight: 600 }}>
                      +${(selectedLot.lot_premium as number).toLocaleString()}
                    </span>
                  ) : null
                }
              />
              <Row label="Foundation" value={selectedLot.foundation} />
            </Section>

            <Section title="Status">
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <LotStatusBadge status={selectedLot.lot_status} />
                {selectedLot.construction_status && (
                  <ConstructionBadge status={selectedLot.construction_status} />
                )}
              </div>
              <Row
                label="Buildable"
                value={
                  selectedLot.is_buildable != null
                    ? selectedLot.is_buildable
                      ? "Yes"
                      : "No"
                    : null
                }
              />
              <Row
                label="Available"
                value={
                  selectedLot.is_available != null
                    ? selectedLot.is_available
                      ? "Yes"
                      : "No"
                    : null
                }
              />
            </Section>

            {selectedLot.synced_at && (
              <Section title="System">
                <Row
                  label="Last Synced"
                  value={new Date(selectedLot.synced_at as string).toLocaleString()}
                />
              </Section>
            )}
          </>
        )}
      </SlideOver>
    </PageShell>
  );
}
