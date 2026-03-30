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

interface SpecHomeEntry {
  name: string;
  home_id: number;
  lot_block_number: string;
  url: string;
}

interface Community {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string | null;
  featured_image_url: string | null;
  division_id: string;
  page_url: string | null;
  spec_homes: SpecHomeEntry[] | string | null;
}

interface LotRow {
  community_id: string;
  lot_number: string;
  construction_status: string | null;
  lot_premium: number | null;
  address: string | null;
  lot_status: string | null;
}

// Flattened row type
interface QuickDeliveryRow extends Record<string, unknown> {
  id: string;
  community_id: string;
  community_name: string;
  city: string;
  state: string;
  division_id: string;
  plan_name: string;
  home_id: number;
  lot: string;
  spec_url: string;
  construction_status: string | null;
  lot_premium: number | null;
  address: string | null;
  featured_image_url: string | null;
  community_status: string | null;
  _division_name: string;
}

interface Props {
  communities: Community[];
  divisions: Division[];
  lots: LotRow[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseJSON<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T[];
    } catch {
      return [];
    }
  }
  return [];
}

function flattenSpecHomes(communities: Community[], lotMap: Map<string, LotRow>): QuickDeliveryRow[] {
  const rows: QuickDeliveryRow[] = [];
  for (const c of communities) {
    const specArr = parseJSON<SpecHomeEntry>(c.spec_homes);
    if (!specArr.length) continue;
    for (const spec of specArr) {
      const lotData = lotMap.get(`${c.id}|${spec.lot_block_number}`);
      rows.push({
        id: `${c.id}-${spec.home_id}`,
        community_id: c.id,
        community_name: c.name,
        city: c.city,
        state: c.state,
        division_id: c.division_id,
        plan_name: spec.name,
        home_id: spec.home_id,
        lot: spec.lot_block_number,
        spec_url: `https://www.schellbrothers.com${spec.url}`,
        construction_status: lotData?.construction_status ?? null,
        lot_premium: lotData?.lot_premium ?? null,
        address: lotData?.address ?? null,
        featured_image_url: c.featured_image_url,
        community_status: c.status,
        _division_name: "",
      });
    }
  }
  return rows;
}

function formatPremium(n: number | null): string {
  if (n == null || n === 0) return "—";
  return `+$${n.toLocaleString()}`;
}

function formatAvgPremium(rows: QuickDeliveryRow[]): string {
  const premiums = rows.map((r) => r.lot_premium).filter((p): p is number => p != null && p > 0);
  if (!premiums.length) return "—";
  const avg = premiums.reduce((a, b) => a + b, 0) / premiums.length;
  return `$${Math.round(avg / 1000)}k`;
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

function ConstructionBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#555", fontSize: 12 }}>—</span>;
  const isUnderConstruction = status === "Under Construction";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: isUnderConstruction ? "#161616" : "#1a1a1a",
        color: isUnderConstruction ? "#5b80a0" : "#555",
        border: `1px solid ${isUnderConstruction ? "#1e3048" : "#2a2a2a"}`,
      }}
    >
      {status}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function QuickDeliveryClient({ communities, divisions, lots }: Props) {
  const [view, setView] = useState<"table" | "card">("table");
  const [divFilter, setDivFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [commFilter, setCommFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedHome, setSelectedHome] = useState<QuickDeliveryRow | null>(null);

  // Hydrate view from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("quick-delivery-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "table" | "card") {
    setView(v);
    localStorage.setItem("quick-delivery-view", v);
  }

  function handleDivChange(val: string) {
    setDivFilter(val);
    setCommFilter("all");
  }

  // Build lot lookup map
  const lotMap = new Map(lots.map((l) => [`${l.community_id}|${l.lot_number}`, l]));

  // Division lookup map
  const divMap = new Map(divisions.map((d) => [d.id, d]));

  // All flattened rows (with division names filled in)
  const allRows: QuickDeliveryRow[] = flattenSpecHomes(communities, lotMap).map((r) => ({
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

  // Filtered rows
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
  const tableColumns: Column<QuickDeliveryRow>[] = [
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
      key: "construction_status",
      label: "Construction Status",
      render: (_val, row) => <ConstructionBadge status={row.construction_status} />,
    },
    {
      key: "lot_premium",
      label: "Premium",
      render: (_val, row) => {
        const p = row.lot_premium;
        if (!p || p === 0) return <span style={{ color: "#555", fontSize: 12 }}>—</span>;
        return <span style={{ color: "#f5a623", fontSize: 12, fontWeight: 500 }}>{formatPremium(p)}</span>;
      },
    },
    {
      key: "address",
      label: "Address",
      render: (_val, row) => (
        <span style={{ color: "#666", fontSize: 12 }}>{row.address ?? "—"}</span>
      ),
    },
    {
      key: "spec_url",
      label: "View",
      sortable: false,
      render: (_val, row) => (
        <a
          href={row.spec_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
          title="View Quick Delivery Home"
        >
          ↗
        </a>
      ),
    },
  ];

  // statConfig for DataTable (filter-reactive stats)
  const statConfig: StatConfigItem<QuickDeliveryRow>[] = [
    {
      label: "Total Quick Delivery",
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
    {
      label: "Avg Premium",
      color: "#f5a623",
      getValue: (r) => formatAvgPremium(r),
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
      <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>Quick Delivery</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          placeholder="Search quick delivery..."
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
  const avgPremium = formatAvgPremium(rows);

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
        { label: "Total Quick Delivery", value: totalHomes.toLocaleString(), color: "#666" },
        { label: "Communities", value: uniqueComms.toLocaleString(), color: "#a1a1a1" },
        { label: "States", value: uniqueStates.toLocaleString(), color: "#0070f3" },
        { label: "Avg Premium", value: avgPremium, color: "#f5a623" },
      ].map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
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
    <DataTable<QuickDeliveryRow>
      columns={tableColumns}
      rows={rows}
      statConfig={statConfig}
      defaultPageSize={100}
      onRowClick={(row) => setSelectedHome(row)}
      emptyMessage="No quick delivery homes"
      minWidth={1200}
    />
  );

  // ── Card view ─────────────────────────────────────────────────────────────────

  const cardView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
      {rows.map((qd) => (
        <div
          key={qd.id}
          onClick={() => setSelectedHome(qd)}
          style={{
            borderRadius: 8,
            border: "1px solid #1f1f1f",
            backgroundColor: "#111111",
            overflow: "hidden",
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
        >
          {/* Content left */}
          <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
            {/* Plan name */}
            <div style={{ fontSize: 13, fontWeight: 500, color: "#ededed", marginBottom: 2 }}>
              {qd.plan_name}
            </div>

            {/* Community */}
            <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>
              {qd.community_name}
            </div>

            {/* City + State */}
            <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
              {qd.city}, {qd.state}
            </div>

            {/* Lot */}
            {qd.lot && (
              <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
                Lot #{qd.lot}
              </div>
            )}

            {/* Construction status */}
            {qd.construction_status && (
              <div style={{ marginBottom: 6 }}>
                <ConstructionBadge status={qd.construction_status} />
              </div>
            )}

            {/* Premium */}
            {qd.lot_premium && qd.lot_premium > 0 && (
              <div style={{ fontSize: 11, color: "#f5a623", marginBottom: 4 }}>
                {formatPremium(qd.lot_premium)}
              </div>
            )}

            {/* Address */}
            {qd.address && (
              <div style={{ fontSize: 11, color: "#555", marginBottom: 6, wordBreak: "break-word" }}>
                {qd.address}
              </div>
            )}

            {/* Link */}
            <a
              href={qd.spec_url}
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
              View Home →
            </a>
          </div>

          {/* Image right */}
          {qd.featured_image_url ? (
            <img
              src={qd.featured_image_url}
              alt={qd.plan_name}
              style={{
                width: 110,
                height: "100%",
                minHeight: 110,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 110,
                minHeight: 110,
                backgroundColor: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 24, opacity: 0.3 }}>⚡</span>
            </div>
          )}
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
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Quick Delivery</div>
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
              <span style={{ fontSize: 32, opacity: 0.2 }}>⚡</span>
            </div>
          )}

          {/* Location */}
          <Section title="Location">
            <Row label="City" value={selectedHome.city} />
            <Row label="State" value={selectedHome.state} />
            <Row label="Community" value={selectedHome.community_name} />
            <Row label="Division" value={selectedHome._division_name} />
          </Section>

          {/* Home Details */}
          <Section title="Home Details">
            <Row label="Plan Name" value={selectedHome.plan_name} />
            <Row label="Lot #" value={selectedHome.lot || "—"} />
            <Row label="Home ID" value={String(selectedHome.home_id)} />
            <Row label="Community Status" value={selectedHome.community_status} />
          </Section>

          {/* Lot Info */}
          <Section title="Lot Info">
            <Row
              label="Construction Status"
              value={<ConstructionBadge status={selectedHome.construction_status} />}
            />
            <Row
              label="Premium"
              value={
                selectedHome.lot_premium && selectedHome.lot_premium > 0 ? (
                  <span style={{ color: "#f5a623" }}>{formatPremium(selectedHome.lot_premium)}</span>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Address" value={selectedHome.address ?? "—"} />
          </Section>

          {/* Actions */}
          <Section title="Actions">
            <a
              href={selectedHome.spec_url}
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
              ↗ View Quick Delivery Home
            </a>
          </Section>
        </div>
      </div>
    </>
  );

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/quick-delivery" />
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
