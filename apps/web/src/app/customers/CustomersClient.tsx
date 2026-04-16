"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  slug: string | null;
  division_slug: string;
  division_name: string;
}

interface Customer {
  id: string;
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  community_id: string | null;
  community_name: string | null;
  floor_plan_name: string | null;
  purchase_price: number | null;
  settlement_date: string | null;
  move_in_date: string | null;
  post_sale_stage: string;
  created_at: string;
}

interface Props {
  customers: Customer[];
  communities: Community[];
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: "sold_not_started",   label: "Sold — Not Started",   color: "#f5a623", bg: "#2a2a1a", border: "#3f3a1f" },
  { key: "under_construction", label: "Under Construction",   color: "#0070f3", bg: "#1a1f2e", border: "#1a2a3f" },
  { key: "settled",            label: "Settled",              color: "#00c853", bg: "#1a2a1a", border: "#1f3f1f" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toLocaleString()}`;
}

function stageConfig(key: string) {
  return STAGES.find(s => s.key === key) ?? STAGES[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const cfg = stageConfig(stage);
  return (
    <span style={{
      fontSize: 10, padding: "2px 6px", borderRadius: 4,
      backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em",
      fontWeight: 600, paddingBottom: 8, borderBottom: "1px solid #1a1a1a", marginBottom: 12,
    }}>{title}</div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#a1a1a1" }}>{children}</span>
    </div>
  );
}

// ─── Slide-over panel ─────────────────────────────────────────────────────────

function SlideOver({ customer, communities, onClose }: { customer: Customer; communities: Community[]; onClose: () => void }) {
  const community = communities.find(c => c.id === customer.community_id);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 40 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        backgroundColor: "#0d0d0d", borderLeft: "1px solid #1f1f1f", zIndex: 50,
        overflowY: "auto", display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid #1a1a1a",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
          position: "sticky", top: 0, backgroundColor: "#0d0d0d", zIndex: 1,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#ededed" }}>
              {customer.first_name} {customer.last_name}
            </span>
            <StageBadge stage={customer.post_sale_stage} />
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#555", fontSize: 18,
            cursor: "pointer", padding: "2px 6px", lineHeight: 1, flexShrink: 0,
          }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <SectionHeader title="Contact" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Email">{customer.email ? <a href={`mailto:${customer.email}`} style={{ color: "#0070f3", textDecoration: "none" }}>{customer.email}</a> : <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Phone">{customer.phone ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
            </div>
          </div>
          <div>
            <SectionHeader title="Home" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Community">{community?.name ?? customer.community_name ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Floor Plan">{customer.floor_plan_name ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Purchase Price">{formatPrice(customer.purchase_price)}</DetailRow>
            </div>
          </div>
          <div>
            <SectionHeader title="Timeline" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Settlement Date">{customer.settlement_date ? new Date(customer.settlement_date).toLocaleDateString() : <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Move-In Date">{customer.move_in_date ? new Date(customer.move_in_date).toLocaleDateString() : <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Created">{new Date(customer.created_at).toLocaleString()}</DetailRow>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Board view ───────────────────────────────────────────────────────────────

function BoardView({ customers, communities, stageFilter, onSelect }: {
  customers: Customer[]; communities: Community[]; stageFilter: string; onSelect: (c: Customer) => void;
}) {
  const visibleStages = stageFilter === "all" ? STAGES : STAGES.filter(s => s.key === stageFilter);
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
      {visibleStages.map(stage => {
        const items = customers.filter(c => c.post_sale_stage === stage.key);
        return (
          <div key={stage.key} style={{
            flexShrink: 0, width: 280, backgroundColor: "#0d0d0d", borderRadius: 8,
            border: "1px solid #1f1f1f", display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "10px 12px 8px", display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid #1a1a1a",
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: stage.color }}>{stage.label}</span>
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 10,
                backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555",
              }}>{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", padding: 4, gap: 4 }}>
              {items.length === 0 ? (
                <div style={{ fontSize: 11, color: "#333", padding: 16, textAlign: "center" }}>No customers</div>
              ) : items.map(c => (
                <div key={c.id} onClick={() => onSelect(c)} style={{
                  backgroundColor: "#111111", borderRadius: 6, border: "1px solid #1f1f1f",
                  padding: 12, margin: 4, cursor: "pointer", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#ededed", marginBottom: 3 }}>
                    {c.first_name} {c.last_name}
                  </div>
                  {c.community_name && <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{c.community_name}</div>}
                  {c.floor_plan_name && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 4,
                        backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#666",
                      }}>{c.floor_plan_name}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#a1a1a1", marginBottom: 4 }}>
                    {formatPrice(c.purchase_price)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span />
                    <span style={{ fontSize: 10, color: "#444" }}>
                      {c.settlement_date ? new Date(c.settlement_date).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({ customers, communities, sortCol, sortDir, onSort, onSelect }: {
  customers: Customer[]; communities: Community[]; sortCol: string; sortDir: "asc" | "desc";
  onSort: (col: string) => void; onSelect: (c: Customer) => void;
}) {
  const sorted = [...customers].sort((a, b) => {
    const aVal = (a as any)[sortCol] ?? "";
    const bVal = (b as any)[sortCol] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const thStyle: React.CSSProperties = {
    padding: "6px 12px", textAlign: "left", fontSize: 11, color: "#666", fontWeight: 500,
    textTransform: "uppercase", letterSpacing: "0.06em", backgroundColor: "#0a0a0a",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", borderBottom: "1px solid #1a1a1a",
  };
  const tdStyle: React.CSSProperties = {
    padding: "6px 12px", fontSize: 12, color: "#a1a1a1", borderBottom: "1px solid #111111", whiteSpace: "nowrap",
  };

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <span style={{ color: "#333", marginLeft: 4 }}>↕</span>;
    return <span style={{ color: "#555", marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 120px)", position: "relative" }}>
      <table style={{ minWidth: 1000, width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th onClick={() => onSort("first_name")} style={{ ...thStyle, position: "sticky", left: 0, zIndex: 2, minWidth: 180 }}>Name <SortIcon col="first_name" /></th>
          <th style={thStyle}>Stage</th>
          <th style={thStyle}>Community</th>
          <th style={thStyle}>Floor Plan</th>
          <th onClick={() => onSort("purchase_price")} style={thStyle}>Purchase Price <SortIcon col="purchase_price" /></th>
          <th onClick={() => onSort("settlement_date")} style={thStyle}>Settlement <SortIcon col="settlement_date" /></th>
          <th onClick={() => onSort("move_in_date")} style={thStyle}>Move-In <SortIcon col="move_in_date" /></th>
          <th onClick={() => onSort("created_at")} style={thStyle}>Created <SortIcon col="created_at" /></th>
        </tr></thead>
        <tbody>
          {sorted.map(c => (
            <tr key={c.id} onClick={() => onSelect(c)} style={{ cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <td style={{ ...tdStyle, position: "sticky", left: 0, backgroundColor: "inherit", color: "#ededed", fontWeight: 500, fontSize: 13, zIndex: 1 }}>
                {c.first_name} {c.last_name}
              </td>
              <td style={tdStyle}><StageBadge stage={c.post_sale_stage} /></td>
              <td style={tdStyle}>{c.community_name ?? "—"}</td>
              <td style={tdStyle}>{c.floor_plan_name ?? "—"}</td>
              <td style={tdStyle}>{formatPrice(c.purchase_price)}</td>
              <td style={tdStyle}>{c.settlement_date ? new Date(c.settlement_date).toLocaleDateString() : "—"}</td>
              <td style={tdStyle}>{c.move_in_date ? new Date(c.move_in_date).toLocaleDateString() : "—"}</td>
              <td style={tdStyle}>{new Date(c.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function CardView({ customers, communities, onSelect }: {
  customers: Customer[]; communities: Community[]; onSelect: (c: Customer) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {customers.map(c => (
        <div key={c.id} onClick={() => onSelect(c)} style={{
          backgroundColor: "#111111", borderRadius: 8, border: "1px solid #1f1f1f",
          padding: 12, cursor: "pointer", transition: "border-color 0.15s",
          display: "flex", flexDirection: "column", gap: 8,
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <StageBadge stage={c.post_sale_stage} />
            <span style={{ fontSize: 10, color: "#444" }}>
              {c.settlement_date ? new Date(c.settlement_date).toLocaleDateString() : "—"}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>{c.first_name} {c.last_name}</div>
          {c.community_name && <div style={{ fontSize: 11, color: "#555" }}>{c.community_name}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {c.floor_plan_name && (
              <span style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 4,
                backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#666",
              }}>{c.floor_plan_name}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#a1a1a1" }}>{formatPrice(c.purchase_price)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomersClient({ customers, communities }: Props) {
  const [view, setView] = useState<"board" | "table" | "card">("board");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const saved = localStorage.getItem("customers-view") as "board" | "table" | "card" | null;
    if (saved && ["board", "table", "card"].includes(saved)) setView(saved);
  }, []);
  useEffect(() => { localStorage.setItem("customers-view", view); }, [view]);

  const filtered = customers
    .filter(c => stageFilter === "all" || c.post_sale_stage === stageFilter)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q);
    });

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const selectStyle: React.CSSProperties = {
    backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 4,
    color: "#a1a1a1", fontSize: 12, padding: "4px 8px", outline: "none", cursor: "pointer",
  };
  const viewBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "#1a1a1a" : "none",
    border: active ? "1px solid #2a2a2a" : "1px solid transparent",
    borderRadius: 4, color: active ? "#ededed" : "#555", fontSize: 14,
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "#0a0a0a", color: "#ededed" }}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          padding: "10px 24px", borderBottom: "1px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>Customers</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555",
            }}>{filtered.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="text" placeholder="Search customers..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 4,
                fontSize: 12, padding: "4px 10px", color: "#a1a1a1", outline: "none", width: 180,
              }} />
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Stages</option>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <div style={{ display: "flex", gap: 2 }}>
              <button onClick={() => setView("board")} style={viewBtnStyle(view === "board")} title="Board">◫</button>
              <button onClick={() => setView("table")} style={viewBtnStyle(view === "table")} title="Table">≡</button>
              <button onClick={() => setView("card")} style={viewBtnStyle(view === "card")} title="Cards">⊞</button>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {view === "board" && <BoardView customers={filtered} communities={communities} stageFilter={stageFilter} onSelect={setSelected} />}
          {view === "table" && <TableView customers={filtered} communities={communities} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} />}
          {view === "card" && <CardView customers={filtered} communities={communities} onSelect={setSelected} />}
        </div>
      </main>
      {selected && <SlideOver customer={selected} communities={communities} onClose={() => setSelected(null)} />}
    </div>
  );
}
