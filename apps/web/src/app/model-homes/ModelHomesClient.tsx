"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DataTable, { type Column, type StatConfigItem } from "@/components/DataTable";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface ModelHomeEntry {
  url: string;
  name: string;
  home_id: number;
  lot_block_number: string;
  model_url: string;
}

interface Community {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string | null;
  price_from: number | null;
  featured_image_url: string | null;
  division_id: string;
  page_url: string | null;
  model_homes: ModelHomeEntry[] | string | null;
}

// Flattened row type
interface ModelHomeRow extends Record<string, unknown> {
  id: string;
  community_id: string;
  community_name: string;
  city: string;
  state: string;
  plan_name: string;
  home_id: number;
  lot: string;
  model_url: string;
  community_status: string | null;
  featured_image_url: string | null;
  price_from: number | null;
  division_id: string;
  _division_name: string;
}

interface Props {
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function flattenModelHomes(communities: Community[]): ModelHomeRow[] {
  const rows: ModelHomeRow[] = [];
  for (const c of communities) {
    const mhArr = Array.isArray(c.model_homes) ? c.model_homes : (typeof c.model_homes === "string" ? JSON.parse(c.model_homes) : []); if (!mhArr.length) continue;
    for (const mh of mhArr) {
      rows.push({
        id: `${c.id}-${mh.home_id}`,
        community_id: c.id,
        community_name: c.name,
        city: c.city,
        state: c.state,
        plan_name: mh.name,
        home_id: mh.home_id,
        lot: mh.lot_block_number,
        model_url: `https://www.schellbrothers.com${mh.url}`,
        community_status: c.status,
        featured_image_url: c.featured_image_url,
        price_from: c.price_from,
        division_id: c.division_id,
        _division_name: "",  // filled below
      });
    }
  }
  return rows;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

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

export default function ModelHomesClient({ communities, divisions }: Props) {
  const [view, setView] = useState<"table" | "card">("table");
  const [divFilter, setDivFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [commFilter, setCommFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedHome, setSelectedHome] = useState<ModelHomeRow | null>(null);

  // Hydrate view from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("model-homes-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "table" | "card") {
    setView(v);
    localStorage.setItem("model-homes-view", v);
  }

  function handleDivChange(val: string) {
    setDivFilter(val);
    setCommFilter("all");
  }

  // Division lookup map
  const divMap = new Map(divisions.map((d) => [d.id, d]));

  // All flattened rows (with division names filled in)
  const allRows: ModelHomeRow[] = flattenModelHomes(communities).map((r) => ({
    ...r,
    _division_name: divMap.get(r.division_id)?.name ?? "—",
  }));

  // Cascaded community list for filter (based on div filter)
  const filteredCommunitiesForSelect =
    divFilter === "all"
      ? communities
      : communities.filter((c) => c.division_id === divFilter);

  // All unique states
  const allStates = Array.from(new Set(allRows.map((r) => r.state))).sort();

  // Filtered rows (top-level filters)
  const rows = allRows
    .filter((r) => divFilter === "all" || r.division_id === divFilter)
    .filter((r) => stateFilter === "all" || r.state === stateFilter)
    .filter((r) => commFilter === "all" || r.community_id === commFilter)
    .filter(
      (r) =>
        !search ||
        r.plan_name.toLowerCase().includes(search.toLowerCase()) ||
        r.community_name.toLowerCase().includes(search.toLowerCase())
    );

  // DataTable columns
  const tableColumns: Column<ModelHomeRow>[] = [
    {
      key: "plan_name",
      label: "Plan Name",
      sticky: true,
      render: (_val, row) => (
        <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{row.plan_name}</span>
      ),
    },
    {
      key: "community_name",
      label: "Community",
      filterable: true,
    },
    {
      key: "city",
      label: "City",
      filterable: true,
    },
    {
      key: "state",
      label: "State",
      filterable: true,
    },
    {
      key: "_division_name",
      label: "Division",
      filterable: true,
    },
    {
      key: "lot",
      label: "Lot #",
    },

    {
      key: "model_url",
      label: "View",
      sortable: false,
      render: (_val, row) => (
        <a
          href={row.model_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
          title="View Model Home"
        >
          ↗
        </a>
      ),
    },
  ];

  // statConfig for DataTable (filter-reactive stats)
  const statConfig: StatConfigItem<ModelHomeRow>[] = [
    {
      label: "Total",
      color: "#666",
      getValue: (r) => r.length,
    },
    {
      label: "Communities",
      color: "#a1a1a1",
      getValue: (r) => new Set(r.map((x) => x.community_id)).size,
    },
    {
      label: "States",
      color: "#0070f3",
      getValue: (r) => new Set(r.map((x) => x.state)).size,
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
      <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>Model Homes</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          placeholder="Search model homes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "#111",
            border: "1px solid #2a2a2a",
            color: "#a1a1a1",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            outline: "none",
            width: 200,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "#1a1a1a",
            borderRadius: 8,
            padding: 3,
            border: "1px solid #2a2a2a",
          }}
        >
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

  // ── Stats bar (card view only) ────────────────────────────────────────────────

  const totalHomes = rows.length;
  const uniqueComms = new Set(rows.map((r) => r.community_id)).size;
  const uniqueStates = new Set(rows.map((r) => r.state)).size;

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
      {[
        { label: "Total", value: totalHomes, color: "#666" },
        { label: "Communities", value: uniqueComms, color: "#a1a1a1" },
        { label: "States", value: uniqueStates, color: "#0070f3" },
      ].map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>
            {s.value.toLocaleString()}
          </span>
        </div>
      ))}
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

      {/* State */}
      <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={selectStyle}>
        <option value="all">All States</option>
        {allStates.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Community (cascaded from division) */}
      <select value={commFilter} onChange={(e) => setCommFilter(e.target.value)} style={selectStyle}>
        <option value="all">All Communities</option>
        {filteredCommunitiesForSelect.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );

  // ── Table view ────────────────────────────────────────────────────────────────

  const tableView = (
    <DataTable<ModelHomeRow>
      columns={tableColumns}
      rows={rows}
      statConfig={statConfig}
      defaultPageSize={100}
      onRowClick={(row) => setSelectedHome(row)}
      emptyMessage="No model homes"
      minWidth={1000}
    />
  );

  // ── Card view ─────────────────────────────────────────────────────────────────

  const cardView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
      {rows.map((mh) => (
        <div
          key={mh.id}
          onClick={() => setSelectedHome(mh)}
          style={{
            borderRadius: 8,
            border: "1px solid #1f1f1f",
            backgroundColor: "#111111",
            overflow: "hidden",
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
        >
          {/* Thumbnail */}
          {mh.featured_image_url ? (
            <img
              src={mh.featured_image_url}
              alt={mh.plan_name}
              style={{
                width: "100%",
                height: 120,
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 120,
                backgroundColor: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 24, opacity: 0.3 }}>⌂</span>
            </div>
          )}

          {/* Card body */}
          <div style={{ padding: 12 }}>
            {/* Plan name */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#ededed",
                marginBottom: 2,
              }}
            >
              {mh.plan_name}
            </div>

            {/* Community */}
            <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>
              {mh.community_name}
            </div>

            {/* City + State */}
            <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
              {mh.city}, {mh.state}
            </div>

            {/* Lot */}
            {mh.lot && (
              <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
                Lot #{mh.lot}
              </div>
            )}
{/* Link */}
            <a
              href={mh.model_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 12,
                color: "#0070f3",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              View Model Home →
            </a>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Slide-over ────────────────────────────────────────────────────────────────

  const slideOver = selectedHome && (
    <>
      {/* Overlay */}
      <div
        onClick={() => setSelectedHome(null)}
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
          width: 520,
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
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Model Home</div>
            <h2 style={{ color: "#ededed", fontSize: 16, fontWeight: 600, margin: 0 }}>
              {selectedHome.plan_name}
            </h2>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {selectedHome.community_name}
            </div>
          </div>
          <button
            onClick={() => setSelectedHome(null)}
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
          {/* Thumbnail */}
          {selectedHome.featured_image_url ? (
            <img
              src={selectedHome.featured_image_url}
              alt={selectedHome.plan_name}
              style={{
                width: "100%",
                borderRadius: 8,
                marginBottom: 20,
                objectFit: "cover",
                maxHeight: 200,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 160,
                backgroundColor: "#1a1a1a",
                borderRadius: 8,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 32, opacity: 0.2 }}>⌂</span>
            </div>
          )}

          {/* Location */}
          <Section title="Location">
            <Row label="City" value={selectedHome.city} />
            <Row label="State" value={selectedHome.state} />
            <Row label="Community" value={selectedHome.community_name} />
            <Row label="Division" value={selectedHome._division_name} />
          </Section>

          {/* Model Home Details */}
          <Section title="Details">
            <Row label="Plan Name" value={selectedHome.plan_name} />
            <Row label="Lot #" value={selectedHome.lot || "—"} />
            <Row label="Home ID" value={String(selectedHome.home_id)} />
            <Row label="Status" value={selectedHome.community_status} />
          </Section>



          {/* Link */}
          <Section title="Actions">
            <a
              href={selectedHome.model_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #1a2a3f",
                backgroundColor: "#1a1f2e",
                color: "#0070f3",
                fontSize: 13,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              ↗ View Model Home
            </a>
          </Section>
        </div>
      </div>
    </>
  );

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/model-homes" />
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
        {view === "card" && statsBar}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "table" ? tableView : cardView}
        </div>
      </main>
      {slideOver}
    </div>
  );
}
