"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DataTable, { type Column, type StatConfigItem } from "@/components/DataTable";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  division_id: string;
  featured_image_url: string | null;
}

interface QDLot {
  id: string;
  community_id: string | null;
  community_name_raw: string;
  division_raw: string;
  lot_number: string;
  block: string | null;
  lot_status: string;
  construction_status: string | null;
  lot_premium: number | null;
  address: string | null;
  is_available: boolean;
}

type QDRow = QDLot & Record<string, unknown> & {
  _community_name: string;
  _city: string;
  _state: string;
  _division_name: string;
  _premium_display: string;
};

interface Props {
  qdLots: QDLot[];
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPremium(n: number | null): string {
  if (n == null || n === 0) return "—";
  return `+$${n.toLocaleString()}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: "#555", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px 0" }}>
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
      <span style={{ color: "#a1a1a1", fontSize: 12, textAlign: "right", maxWidth: "60%" }}>{value ?? "—"}</span>
    </div>
  );
}

function ConstructionBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "#444" }}>—</span>;
  const isUC = status === "Under Construction";
  return (
    <span style={{
      fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 500, whiteSpace: "nowrap",
      backgroundColor: isUC ? "#161820" : "#161616",
      color: isUC ? "#5b80a0" : "#555",
      border: `1px solid ${isUC ? "#1a2a3f" : "#222"}`,
    }}>
      {status}
    </span>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function QuickDeliveryClient({ qdLots, communities, divisions }: Props) {
  const [view, setView] = useState<"table" | "card">("table");
  const [divFilter, setDivFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [commFilter, setCommFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLot, setSelectedLot] = useState<QDRow | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("quick-delivery-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "table" | "card") {
    setView(v);
    localStorage.setItem("quick-delivery-view", v);
  }

  const commMap = new Map(communities.map(c => [c.id, c]));
  const divMap = new Map(divisions.map(d => [d.id, d]));

  // Build display rows — join community data where community_id exists
  const allRows: QDRow[] = qdLots.map(lot => {
    const comm = lot.community_id ? commMap.get(lot.community_id) : null;
    const div = comm ? divMap.get(comm.division_id) : null;
    return {
      ...lot,
      _community_name: comm?.name ?? lot.community_name_raw,
      _city: comm?.city ?? "—",
      _state: comm?.state ?? "—",
      _division_name: div?.name ?? lot.division_raw,
      _premium_display: formatPremium(lot.lot_premium),
    };
  });

  // Filter options
  const allStates = Array.from(new Set(allRows.map(r => r._state).filter(s => s !== "—"))).sort();
  const allDivisions = divisions;

  const filteredComms = Array.from(
    new Map(
      allRows
        .filter(r => divFilter === "all" || r._division_name === divisions.find(d => d.id === divFilter)?.name)
        .filter(r => stateFilter === "all" || r._state === stateFilter)
        .map(r => [r._community_name, r])
    ).entries()
  ).map(([name]) => name).sort();

  const rows = allRows
    .filter(r => divFilter === "all" || r._division_name === divisions.find(d => d.id === divFilter)?.name)
    .filter(r => stateFilter === "all" || r._state === stateFilter)
    .filter(r => commFilter === "all" || r._community_name === commFilter)
    .filter(r => !search || r._community_name.toLowerCase().includes(search.toLowerCase()) || r.lot_number.includes(search));

  // Stats
  const withPremium = rows.filter(r => r.lot_premium && r.lot_premium > 0);
  const avgPremium = withPremium.length
    ? Math.round(withPremium.reduce((s, r) => s + (r.lot_premium ?? 0), 0) / withPremium.length)
    : null;

  const cardStats = {
    total: rows.length,
    communities: new Set(rows.map(r => r._community_name)).size,
    states: new Set(rows.map(r => r._state)).size,
    avgPremium,
  };

  const statConfig: StatConfigItem<QDRow>[] = [
    { label: "Total", color: "#666", getValue: (r: QDRow[]) => r.length },
    { label: "Communities", color: "#666", getValue: (r: QDRow[]) => new Set(r.map((x: QDRow) => x._community_name)).size },
    { label: "States", color: "#666", getValue: (r: QDRow[]) => new Set(r.map((x: QDRow) => x._state)).size },
    {
      label: "Avg Premium", color: "#8a7a5a", isString: true,
      getValue: (r: QDRow[]) => {
        const wp = r.filter((x: QDRow) => x.lot_premium && x.lot_premium > 0);
        if (!wp.length) return "—";
        const avg = wp.reduce((s: number, x: QDRow) => s + (x.lot_premium ?? 0), 0) / wp.length;
        return `$${Math.round(avg / 1000)}k`;
      }
    },
  ];

  // Table columns
  const columns: Column<QDRow>[] = [
    {
      key: "_community_name", label: "Community", sticky: true,
      render: (_v, row) => <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>{row._community_name}</span>,
    },
    { key: "_city", label: "City", filterable: true },
    { key: "_state", label: "State", filterable: true },
    { key: "_division_name", label: "Division", filterable: true },
    {
      key: "lot_number", label: "Lot #",
      render: (_v, row) => <span style={{ color: "#a1a1a1" }}>{row.lot_number}{row.block ? ` / ${row.block}` : ""}</span>,
    },
    {
      key: "construction_status", label: "Construction",
      render: (_v, row) => <ConstructionBadge status={row.construction_status} />,
    },
    {
      key: "lot_premium", label: "Premium",
      render: (_v, row) => row.lot_premium && row.lot_premium > 0
        ? <span style={{ color: "#8a7a5a", fontWeight: 600 }}>{formatPremium(row.lot_premium)}</span>
        : <span style={{ color: "#444" }}>—</span>,
    },
    {
      key: "address", label: "Address",
      render: (_v, row) => <span style={{ color: "#666", fontSize: 12 }}>{row.address ?? "—"}</span>,
    },
    {
      key: "id", label: "View", sortable: false,
      render: (_v, row) => {
        const comm = row.community_id ? commMap.get(row.community_id) : null;
        const pageUrl = comm ? `https://www.schellbrothers.com${comm.featured_image_url ? "" : ""}` : null;
        return (
          <a href={`https://www.schellbrothers.com`} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: "#777", fontSize: 13, textDecoration: "none" }}>↗</a>
        );
      },
    },
  ];

  // ── Top bar ─────────────────────────────────────────────────────────────────
  const topBar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 44, borderBottom: "1px solid #1f1f1f", background: "#0d0d0d", flexShrink: 0 }}>
      <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>Quick Delivery</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#1a1a1a", borderRadius: 8, padding: 3, border: "1px solid #2a2a2a" }}>
          {(["card", "table"] as const).map((v, i) => (
            <button key={v} onClick={() => handleViewChange(v)} style={{ background: view === v ? "#2a2a2a" : "transparent", border: "none", color: view === v ? "#ededed" : "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, transition: "background 0.15s, color 0.15s" }}>
              {i === 0 ? "⊞" : "≡"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Filter bar ───────────────────────────────────────────────────────────────
  const selectStyle: React.CSSProperties = { background: "#111", border: "1px solid #2a2a2a", color: "#a1a1a1", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", outline: "none" };

  const filtersBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 24px", borderBottom: "1px solid #1a1a1a", background: "#0a0a0a", flexShrink: 0, flexWrap: "wrap" }}>
      <select value={divFilter} onChange={e => { setDivFilter(e.target.value); setCommFilter("all"); }} style={selectStyle}>
        <option value="all">All Divisions</option>
        {allDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setCommFilter("all"); }} style={selectStyle}>
        <option value="all">All States</option>
        {allStates.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={commFilter} onChange={e => setCommFilter(e.target.value)} style={selectStyle}>
        <option value="all">All Communities</option>
        {filteredComms.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ ...selectStyle, minWidth: 160, color: "#ededed" }} />
    </div>
  );

  // ── Stats bar (card view) ────────────────────────────────────────────────────
  const statsBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "6px 24px", backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
      {[
        { label: "Total", value: cardStats.total, color: "#666" },
        { label: "Communities", value: cardStats.communities, color: "#666" },
        { label: "States", value: cardStats.states, color: "#666" },
        { label: "Avg Premium", value: cardStats.avgPremium != null ? `$${Math.round(cardStats.avgPremium / 1000)}k` : "—", color: "#8a7a5a", isStr: true },
      ].map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#555" }}>{s.label}:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.isStr ? s.value : (s.value as number).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );

  // ── Card view ────────────────────────────────────────────────────────────────
  const cardView = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "16px" }}>
      {rows.map(lot => {
        const comm = lot.community_id ? commMap.get(lot.community_id) : null;
        const imgUrl = comm?.featured_image_url ?? null;
        return (
          <div key={lot.id} onClick={() => setSelectedLot(lot)}
            style={{ borderRadius: 10, border: "1px solid #1a1a1a", backgroundColor: "#111", padding: 16, cursor: "pointer", display: "flex", gap: 16, alignItems: "flex-start", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#1a1a1a")}
          >
            {/* Left: content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#ededed", marginBottom: 2 }}>{lot._community_name}</div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>{lot._city}, {lot._state}</div>
              <div style={{ marginBottom: 8 }}><ConstructionBadge status={lot.construction_status} /></div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Lot {lot.lot_number}{lot.block ? ` / Block ${lot.block}` : ""}</div>
              {lot.address && <div style={{ fontSize: 11, color: "#555", marginBottom: 10 }}>{lot.address}</div>}
              {lot.lot_premium != null && lot.lot_premium > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, backgroundColor: "#1e1e1a", color: "#8a7a5a", border: "1px solid #2a2a1a", fontWeight: 500 }}>
                    {formatPremium(lot.lot_premium)}
                  </span>
                </div>
              )}
            </div>
            {/* Right: image */}
            {imgUrl ? (
              <div style={{ flexShrink: 0, width: 140, height: 100, borderRadius: 8, overflow: "hidden" }}>
                <img src={imgUrl} alt={lot._community_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ) : (
              <div style={{ flexShrink: 0, width: 140, height: 100, borderRadius: 8, background: "#1a1a1a" }} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Slide-over ───────────────────────────────────────────────────────────────
  const slideOver = selectedLot && (
    <>
      <div onClick={() => setSelectedLot(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, width: 480, height: "100vh", background: "#111", borderLeft: "1px solid #1f1f1f", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ marginBottom: 8 }}><ConstructionBadge status={selectedLot.construction_status} /></div>
            <h2 style={{ color: "#ededed", fontSize: 16, fontWeight: 600, margin: 0 }}>{selectedLot._community_name}</h2>
          </div>
          <button onClick={() => setSelectedLot(null)} style={{ background: "transparent", border: "none", color: "#555", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, marginTop: 2 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <Section title="Location">
            <Row label="City" value={selectedLot._city} />
            <Row label="State" value={selectedLot._state} />
            <Row label="Division" value={selectedLot._division_name} />
            <Row label="Address" value={selectedLot.address} />
          </Section>
          <Section title="Lot Details">
            <Row label="Lot #" value={selectedLot.lot_number} />
            <Row label="Block" value={selectedLot.block || "—"} />
            <Row label="Construction" value={<ConstructionBadge status={selectedLot.construction_status} />} />
            <Row label="Premium" value={selectedLot.lot_premium && selectedLot.lot_premium > 0
              ? <span style={{ color: "#8a7a5a", fontWeight: 600 }}>{formatPremium(selectedLot.lot_premium)}</span>
              : "—"} />
          </Section>
          <Section title="Actions">
            <a href="https://www.schellbrothers.com" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #1a2a3f", backgroundColor: "#1a1f2e", color: "#5b80a0", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
              ↗ View Quick Delivery Home
            </a>
          </Section>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/quick-delivery" />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {topBar}
        {filtersBar}
        {view === "card" && statsBar}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "table"
            ? <DataTable<QDRow> columns={columns} rows={rows} statConfig={statConfig} defaultPageSize={100} onRowClick={setSelectedLot} emptyMessage="No quick delivery homes" minWidth={1000} />
            : cardView}
        </div>
      </main>
      {slideOver}
    </div>
  );
}
