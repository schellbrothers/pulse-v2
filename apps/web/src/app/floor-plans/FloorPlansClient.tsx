"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DataTable, { type Column, type StatItem as DataTableStatItem } from "@/components/DataTable";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface FloorPlan {
  id: string;
  community_id: string | null;
  plan_name: string;
  plan_type: string | null;
  base_price: number | null;
  incentive_amount: number | null;
  net_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  min_bathrooms: number | null;
  max_bathrooms: number | null;
  min_heated_sqft: number | null;
  max_heated_sqft: number | null;
  style_filters: string[] | null;
  popularity: number | null;
  featured_image_url: string | null;
  virtual_tour_url: string | null;
  page_url: string | null;
  pdf_url: string | null;
  elevations: { kova_name?: string; image_path?: string; is_hidden?: boolean | null; index?: number }[] | null;
}

// Augmented row type for DataTable (adds computed/display fields)
type FloorPlanTableRow = FloorPlan & Record<string, unknown> & {
  _community_name: string;
  _division_name: string;
  _style_display: string;   // pipe-joined string for filter matching
  _beds: string;
  _baths: string;
  _sqft: string;
  _net_price_display: string;
  _base_price_display: string;
  _incentive_display: string;
};

interface Props {
  plans: FloorPlan[];
  communities: Community[];
  divisions: Division[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STYLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Ranch":             { bg: "#161616", text: "#6b9e6b", border: "#222" },
  "First Floor Suite": { bg: "#161616", text: "#5b80a0", border: "#222" },
  "2-Story":           { bg: "#161616", text: "#8a7a5a", border: "#222" },
  "3-Story":           { bg: "#161616", text: "#7a6a8a", border: "#222" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function formatBedsOrBaths(min: number | null, max: number | null): string {
  if (min == null) return "—";
  if (max == null || max === min) return String(min);
  return `${min}–${max}`;
}

function formatSqft(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min == null) return (max ?? 0).toLocaleString();
  if (max == null || max === min) return min.toLocaleString();
  return `${min.toLocaleString()} – ${max.toLocaleString()}`;
}

function s3ToHttps(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path.replace("s3://heartbeat-page-designer-production/", "https://heartbeat-page-designer-production.s3.amazonaws.com/");
}

function popularityColor(pop: number | null): string {
  if (pop == null) return "#444";
  if (pop > 10) return "#888";
  if (pop >= 5) return "#666";
  return "#555";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  color,
  isString,
}: {
  label: string;
  value: number | string;
  color: string;
  isString?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "#555" }}>{label}:</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>
        {isString ? value : (value as number).toLocaleString()}
      </span>
    </div>
  );
}

function StyleBadge({ style }: { style: string }) {
  const colors = STYLE_COLORS[style] ?? { bg: "#1a1a1a", text: "#a1a1a1", border: "#2a2a2a" };
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 7px",
        borderRadius: 4,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {style}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        style={{
          color: "#555",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
          margin: "0 0 12px 0",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#666", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#a1a1a1", fontSize: 12, textAlign: "right", maxWidth: "60%" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FloorPlansClient({ plans, communities, divisions }: Props) {
  const [view, setView] = useState<"table" | "card">("table");
  const [divFilter, setDivFilter] = useState("all");
  const [commFilter, setCommFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [bedsFilter, setBedsFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<FloorPlan | null>(null);

  // Hydrate view from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("floorplans-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "table" | "card") {
    setView(v);
    localStorage.setItem("floorplans-view", v);
  }

  // When division filter changes, reset community filter
  function handleDivChange(val: string) {
    setDivFilter(val);
    setCommFilter("all");
  }

  // Cascaded community list
  const filteredCommunities =
    divFilter === "all"
      ? communities
      : communities.filter((c) => c.division_id === divFilter);

  // Community / division lookup maps
  const commMap = new Map(communities.map((c) => [c.id, c]));
  const divMap = new Map(divisions.map((d) => [d.id, d]));

  function getCommunityName(plan: FloorPlan): string {
    return plan.community_id ? (commMap.get(plan.community_id)?.name ?? "—") : "—";
  }

  function getDivisionName(plan: FloorPlan): string {
    if (!plan.community_id) return "—";
    const comm = commMap.get(plan.community_id);
    if (!comm) return "—";
    return divMap.get(comm.division_id)?.name ?? "—";
  }

  // Filtered rows (top-bar filters applied here; DataTable handles column filters / sort / pagination)
  const rows = plans
    .filter(
      (p) =>
        divFilter === "all" ||
        communities.find((c) => c.id === p.community_id)?.division_id === divFilter
    )
    .filter((p) => commFilter === "all" || p.community_id === commFilter)
    .filter(
      (p) =>
        styleFilter === "all" || (p.style_filters ?? []).includes(styleFilter)
    )
    .filter(
      (p) => bedsFilter === "all" || (p.min_bedrooms ?? 0) >= parseInt(bedsFilter)
    )
    .filter(
      (p) =>
        priceFilter === "all" || (p.net_price ?? 0) <= parseInt(priceFilter)
    )
    .filter(
      (p) =>
        !search || p.plan_name.toLowerCase().includes(search.toLowerCase())
    );

  // Augmented rows for DataTable
  const tableRows: FloorPlanTableRow[] = rows.map((p) => ({
    ...p,
    _community_name: getCommunityName(p),
    _division_name: getDivisionName(p),
    _style_display: (p.style_filters ?? []).join(", "),
    _beds: formatBedsOrBaths(p.min_bedrooms, p.max_bedrooms),
    _baths: formatBedsOrBaths(p.min_bathrooms, p.max_bathrooms),
    _sqft: formatSqft(p.min_heated_sqft, p.max_heated_sqft),
    _net_price_display: formatCurrency(p.net_price),
    _base_price_display: formatCurrency(p.base_price),
    _incentive_display: p.incentive_amount != null ? `-$${p.incentive_amount.toLocaleString()}` : "—",
  }));

  // Stats (computed from filtered rows)
  const withPrice = rows.filter((p) => p.net_price);
  const stats = {
    total: rows.length,
    avgPrice:
      withPrice.reduce((s, p) => s + (p.net_price ?? 0), 0) / (withPrice.length || 1),
    ranch: rows.filter((p) => (p.style_filters ?? []).includes("Ranch")).length,
    firstFloor: rows.filter((p) => (p.style_filters ?? []).includes("First Floor Suite")).length,
    withTour: rows.filter((p) => p.virtual_tour_url).length,
  };

  const dataTableStats: DataTableStatItem[] = [
    { label: "Total",          value: stats.total,     color: "#666" },
    { label: "Avg Net Price",  value: "$" + Math.round(stats.avgPrice / 1000) + "k", color: "#888", isString: true },
    { label: "Ranch",          value: stats.ranch,     color: "#666" },
    { label: "1st Floor Suite",value: stats.firstFloor, color: "#666" },
    { label: "w/ Tour",        value: stats.withTour,  color: "#666" },
  ];

  // DataTable column definitions
  const tableColumns: Column<FloorPlanTableRow>[] = [
    {
      key: "plan_name",
      label: "Plan Name",
      sticky: true,
      render: (_val, row) => (
        <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{row.plan_name}</span>
      ),
    },
    {
      key: "_community_name",
      label: "Community",
      filterable: true,
    },
    {
      key: "_division_name",
      label: "Division",
      filterable: true,
    },
    {
      key: "_style_display",
      label: "Style",
      filterable: true,
      render: (_val, row) => (
        <div style={{ display: "flex", gap: 4 }}>
          {(row.style_filters ?? []).map((s) => (
            <StyleBadge key={s} style={s} />
          ))}
        </div>
      ),
    },
    {
      key: "_beds",
      label: "Beds",
      sortable: false,
    },
    {
      key: "_baths",
      label: "Baths",
      sortable: false,
    },
    {
      key: "_sqft",
      label: "SqFt",
      sortable: false,
    },
    {
      key: "net_price",
      label: "Net Price",
      render: (_val, row) =>
        row.net_price != null ? (
          <span style={{ color: "#c8c8c8", fontWeight: 600 }}>
            {formatCurrency(row.net_price)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "base_price",
      label: "Base Price",
      render: (_val, row) => formatCurrency(row.base_price),
    },
    {
      key: "incentive_amount",
      label: "Incentive",
      render: (_val, row) =>
        row.incentive_amount != null ? (
          <span style={{ color: "#f5a623" }}>
            -${row.incentive_amount.toLocaleString()}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "popularity",
      label: "Popularity",
      render: (_val, row) => (
        <span style={{ color: popularityColor(row.popularity), fontWeight: 600 }}>
          {row.popularity ?? "—"}
        </span>
      ),
    },
    {
      key: "virtual_tour_url",
      label: "Tour",
      sortable: false,
      render: (_val, row) =>
        row.virtual_tour_url ? (
          <a
            href={row.virtual_tour_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "#777", textDecoration: "none", fontSize: 14 }}
          >
            ◉
          </a>
        ) : (
          "—"
        ),
    },
  ];

  // ── Top bar ──────────────────────────────────────────────────────────────────

  const topBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 44,
        borderBottom: "1px solid #1f1f1f",
        background: "#0d0d0d",
        flexShrink: 0,
      }}
    >
      <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>Floor Plans</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="text" placeholder="Search plans..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ background: "#111", border: "1px solid #2a2a2a", color: "#a1a1a1", borderRadius: 6, padding: "5px 12px", fontSize: 12, outline: "none", width: 180 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#1a1a1a", borderRadius: 8, padding: 3, border: "1px solid #2a2a2a" }}>
        {(["card", "table"] as const).map((v, i) => (
          <button
            key={v}
            onClick={() => handleViewChange(v)}
            style={{
              background: view === v ? "#2a2a2a" : "transparent",
              border: "none",
              color: view === v ? "#ededed" : "#555",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 14,
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

  // ── Stats bar (card view only — DataTable renders its own in table view) ──────

  const statsBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "6px 24px",
        backgroundColor: "#0d0d0d",
        borderBottom: "1px solid #1a1a1a",
        flexShrink: 0,
      }}
    >
      <StatItem label="Total" value={stats.total} color="#666" />
      <StatItem
        label="Avg Net Price"
        value={"$" + Math.round(stats.avgPrice / 1000) + "k"}
        color="#a1a1a1"
        isString
      />
      <StatItem label="Ranch" value={stats.ranch} color="#777" />
      <StatItem label="1st Floor Suite" value={stats.firstFloor} color="#777" />
      <StatItem label="w/ Virtual Tour" value={stats.withTour} color="#777" />
    </div>
  );

  // ── Filters bar ───────────────────────────────────────────────────────────────

  const selectStyle: React.CSSProperties = {
    background: "#111",
    border: "1px solid #2a2a2a",
    color: "#a1a1a1",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
    outline: "none",
  };

  const filtersBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 24px",
        borderBottom: "1px solid #1a1a1a",
        background: "#0a0a0a",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {/* Division */}
      <select value={divFilter} onChange={(e) => handleDivChange(e.target.value)} style={selectStyle}>
        <option value="all">All Divisions</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Community (cascaded) */}
      <select value={commFilter} onChange={(e) => setCommFilter(e.target.value)} style={selectStyle}>
        <option value="all">All Communities</option>
        {filteredCommunities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Style */}
      <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} style={selectStyle}>
        <option value="all">All Styles</option>
        <option value="Ranch">Ranch</option>
        <option value="First Floor Suite">First Floor Suite</option>
        <option value="2-Story">2-Story</option>
        <option value="3-Story">3-Story</option>
      </select>

      {/* Min beds */}
      <select value={bedsFilter} onChange={(e) => setBedsFilter(e.target.value)} style={selectStyle}>
        <option value="all">Any Beds</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5+</option>
      </select>

      {/* Max price */}
      <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} style={selectStyle}>
        <option value="all">Any Price</option>
        <option value="500000">Under $500k</option>
        <option value="600000">Under $600k</option>
        <option value="700000">Under $700k</option>
        <option value="800000">Under $800k</option>
        <option value="1000000">Under $1M</option>
      </select>

      {/* Search */}
      <input
        type="text"
        placeholder="Search plans…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          ...selectStyle,
          minWidth: 160,
          color: "#ededed",
          background: "#111",
        }}
      />
    </div>
  );

  // ── Table view (DataTable) ────────────────────────────────────────────────────

  const tableView = (
    <DataTable<FloorPlanTableRow>
      columns={tableColumns}
      rows={tableRows}
      stats={dataTableStats}
      defaultPageSize={100}
      onRowClick={(row) => setSelectedPlan(row)}
      emptyMessage="No floor plans"
      minWidth={1400}
    />
  );

  // ── Card view ─────────────────────────────────────────────────────────────────

  const cardView = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "16px" }}>
      {rows.map((p) => {
        const commName = getCommunityName(p);
        const imgUrl = p.featured_image_url;

        return (
          <div
            key={p.id}
            onClick={() => setSelectedPlan(p)}
            style={{
              borderRadius: 10,
              border: "1px solid #1a1a1a",
              backgroundColor: "#111",
              padding: 16,
              cursor: "pointer",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
          >
            {/* Left: content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#ededed", marginBottom: 2 }}>
                {p.plan_name}
              </div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>{commName}</div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                {p.net_price != null && (
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#c8c8c8" }}>
                    {formatCurrency(p.net_price)}
                  </span>
                )}
                {p.base_price != null && p.net_price !== p.base_price && (
                  <span style={{ fontSize: 12, color: "#444", textDecoration: "line-through" }}>
                    {formatCurrency(p.base_price)}
                  </span>
                )}
              </div>

              {p.incentive_amount != null && p.incentive_amount > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    backgroundColor: "#2a2a1a", color: "#888",
                    border: "1px solid #2a2a2a", fontWeight: 500,
                  }}>
                    -{formatCurrency(p.incentive_amount)}
                  </span>
                </div>
              )}

              <div style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>
                {formatBedsOrBaths(p.min_bedrooms, p.max_bedrooms)}bd
                {" · "}
                {formatBedsOrBaths(p.min_bathrooms, p.max_bathrooms)}ba
                {(p.min_heated_sqft != null || p.max_heated_sqft != null)
                  ? ` · ${formatSqft(p.min_heated_sqft, p.max_heated_sqft)} sf` : ""}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: popularityColor(p.popularity), fontWeight: 600 }}>
                  {p.popularity != null ? `★ ${p.popularity}` : ""}
                </span>
                <div style={{ display: "flex", gap: 14 }}>
                  {p.virtual_tour_url && (
                    <a href={p.virtual_tour_url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#777", fontSize: 13, textDecoration: "none" }}>
                      ◉ Tour
                    </a>
                  )}
                  {p.pdf_url && (
                    <a href={p.pdf_url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#777", fontSize: 13, textDecoration: "none" }}>
                      ⬇ PDF
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: featured image */}
            {imgUrl ? (
              <div style={{ flexShrink: 0, width: 200, height: 140, borderRadius: 8, overflow: "hidden" }}>
                <img src={imgUrl} alt={p.plan_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ) : (
              <div style={{ flexShrink: 0, width: 200, height: 140, borderRadius: 8, background: "#1a1a1a" }} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Slide-over ────────────────────────────────────────────────────────────────

  const slideOver = selectedPlan && (
    <>
      {/* Overlay */}
      <div
        onClick={() => setSelectedPlan(null)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 40,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 560,
          height: "100vh",
          background: "#111",
          borderLeft: "1px solid #1f1f1f",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #1f1f1f",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {(selectedPlan.style_filters ?? []).map((s) => (
                <StyleBadge key={s} style={s} />
              ))}
            </div>
            <h2 style={{ color: "#ededed", fontSize: 16, fontWeight: 600, margin: 0 }}>
              {selectedPlan.plan_name}
            </h2>
          </div>
          <button
            onClick={() => setSelectedPlan(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#555",
              fontSize: 22,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Pricing */}
          <Section title="Pricing">
            {selectedPlan.net_price != null && (
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{ fontSize: 22, fontWeight: 700, color: "#c8c8c8" }}
                >
                  {formatCurrency(selectedPlan.net_price)}
                </span>
                <span style={{ fontSize: 12, color: "#555", marginLeft: 6 }}>net price</span>
              </div>
            )}
            <Row label="Base Price" value={formatCurrency(selectedPlan.base_price)} />
            <Row
              label="Incentive Amount"
              value={
                selectedPlan.incentive_amount != null
                  ? (
                      <span style={{ color: "#888" }}>
                        -${selectedPlan.incentive_amount.toLocaleString()}
                      </span>
                    )
                  : null
              }
            />
          </Section>

          {/* Specs */}
          <Section title="Specs">
            <Row
              label="Bedrooms"
              value={formatBedsOrBaths(selectedPlan.min_bedrooms, selectedPlan.max_bedrooms)}
            />
            <Row
              label="Bathrooms"
              value={formatBedsOrBaths(selectedPlan.min_bathrooms, selectedPlan.max_bathrooms)}
            />
            <Row
              label="Heated SqFt"
              value={formatSqft(selectedPlan.min_heated_sqft, selectedPlan.max_heated_sqft)}
            />
            <Row label="Plan Type" value={selectedPlan.plan_type} />
          </Section>

          {/* Community */}
          <Section title="Community">
            <Row label="Community" value={getCommunityName(selectedPlan)} />
            <Row label="Division" value={getDivisionName(selectedPlan)} />
          </Section>

          {/* Elevations */}
          {(() => {
            const elevs = Array.isArray(selectedPlan.elevations) ? selectedPlan.elevations : [];
            const visible = elevs.filter((e: { is_hidden?: boolean | null }) => !e.is_hidden);
            if (!visible.length) return null;
            return (
              <Section title="Elevations">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {visible.map((e: { kova_name?: string; image_path?: string }, i: number) => {
                    const url = s3ToHttps(e.image_path);
                    return url ? (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <img src={url} alt={e.kova_name ?? `Elevation ${i+1}`}
                          style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 4, border: "1px solid #2a2a2a" }} />
                        {e.kova_name && <span style={{ fontSize: 10, color: "#555" }}>{e.kova_name}</span>}
                      </div>
                    ) : null;
                  })}
                </div>
              </Section>
            );
          })()}

          {/* Assets */}
          {(selectedPlan.virtual_tour_url || selectedPlan.pdf_url || selectedPlan.page_url) && (
            <Section title="Assets">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedPlan.virtual_tour_url && (
                  <a
                    href={selectedPlan.virtual_tour_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid #2a1f3f",
                      backgroundColor: "#1f1a2e",
                      color: "#777",
                      fontSize: 13,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    ◉ Virtual Tour
                  </a>
                )}
                {selectedPlan.pdf_url && (
                  <a
                    href={selectedPlan.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid #1a2a3f",
                      backgroundColor: "#1a1f2e",
                      color: "#777",
                      fontSize: 13,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    ⬇ PDF Download
                  </a>
                )}
                {selectedPlan.page_url && (
                  <a
                    href={selectedPlan.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid #2a2a2a",
                      backgroundColor: "#1a1a1a",
                      color: "#a1a1a1",
                      fontSize: 13,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    ↗ View on Website
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Popularity */}
          {selectedPlan.popularity != null && (
            <Section title="Popularity">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: popularityColor(selectedPlan.popularity),
                  }}
                >
                  {selectedPlan.popularity}
                </span>
                <span style={{ fontSize: 13, color: "#555" }}>Interest Score</span>
              </div>
            </Section>
          )}

        </div>
      </div>
    </>
  );

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/floor-plans" />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {topBar}
        {filtersBar}
        {/* Stats bar shown in card view; DataTable renders its own ribbon in table view */}
        {view === "card" && statsBar}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "table" ? tableView : cardView}
        </div>
      </main>
      {slideOver}
    </div>
  );
}
