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

interface Prospect {
  id: string;
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  crm_stage: string;
  community_id: string | null;
  community_name: string | null;
  floor_plan_name: string | null;
  csm_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  contract_date: string | null;
  estimated_move_in: string | null;
  last_activity_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  prospects: Prospect[];
  communities: Community[];
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: "prospect_c", label: "Prospect C",  color: "#f5a623", bg: "#2a2a1a", border: "#3f3a1f" },
  { key: "prospect_b", label: "Prospect B",  color: "#0070f3", bg: "#1a1f2e", border: "#1a2a3f" },
  { key: "prospect_a", label: "Prospect A",  color: "#00c853", bg: "#1a2a1a", border: "#1f3f1f" },
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

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
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

function SlideOver({ prospect, communities, onClose }: { prospect: Prospect; communities: Community[]; onClose: () => void }) {
  const community = communities.find(c => c.id === prospect.community_id);

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
              {prospect.first_name} {prospect.last_name}
            </span>
            <StageBadge stage={prospect.crm_stage} />
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
              <DetailRow label="Email">{prospect.email ? <a href={`mailto:${prospect.email}`} style={{ color: "#0070f3", textDecoration: "none" }}>{prospect.email}</a> : <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Phone">{prospect.phone ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
            </div>
          </div>
          <div>
            <SectionHeader title="Interest" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Community">{community?.name ?? prospect.community_name ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Floor Plan">{prospect.floor_plan_name ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Budget">{formatBudget(prospect.budget_min, prospect.budget_max)}</DetailRow>
              <DetailRow label="Contract Date">{prospect.contract_date ? new Date(prospect.contract_date).toLocaleDateString() : <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Est. Move-In">{prospect.estimated_move_in ? new Date(prospect.estimated_move_in).toLocaleDateString() : <span style={{ color: "#333" }}>—</span>}</DetailRow>
            </div>
          </div>
          <div>
            <SectionHeader title="Activity" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Last Activity">{prospect.last_activity_at ? new Date(prospect.last_activity_at).toLocaleString() : "—"}</DetailRow>
              <DetailRow label="Created">{new Date(prospect.created_at).toLocaleString()}</DetailRow>
            </div>
          </div>
          {prospect.notes && (
            <div>
              <SectionHeader title="Notes" />
              <p style={{ fontSize: 12, color: "#a1a1a1", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{prospect.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Board view ───────────────────────────────────────────────────────────────

function BoardView({ prospects, communities, stageFilter, onSelect }: {
  prospects: Prospect[]; communities: Community[]; stageFilter: string; onSelect: (p: Prospect) => void;
}) {
  const visibleStages = stageFilter === "all" ? STAGES : STAGES.filter(s => s.key === stageFilter);
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
      {visibleStages.map(stage => {
        const items = prospects.filter(p => p.crm_stage === stage.key);
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
                <div style={{ fontSize: 11, color: "#333", padding: 16, textAlign: "center" }}>No prospects</div>
              ) : items.map(p => (
                <div key={p.id} onClick={() => onSelect(p)} style={{
                  backgroundColor: "#111111", borderRadius: 6, border: "1px solid #1f1f1f",
                  padding: 12, margin: 4, cursor: "pointer", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#ededed", marginBottom: 3 }}>
                    {p.first_name} {p.last_name}
                  </div>
                  {p.community_name && <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{p.community_name}</div>}
                  {p.floor_plan_name && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 4,
                        backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#666",
                      }}>{p.floor_plan_name}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#a1a1a1", marginBottom: 4 }}>
                    {formatBudget(p.budget_min, p.budget_max)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span />
                    <span style={{ fontSize: 10, color: "#444" }}>{relativeTime(p.last_activity_at)}</span>
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

function TableView({ prospects, communities, sortCol, sortDir, onSort, onSelect }: {
  prospects: Prospect[]; communities: Community[]; sortCol: string; sortDir: "asc" | "desc";
  onSort: (col: string) => void; onSelect: (p: Prospect) => void;
}) {
  const sorted = [...prospects].sort((a, b) => {
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
      <table style={{ minWidth: 1100, width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th onClick={() => onSort("first_name")} style={{ ...thStyle, position: "sticky", left: 0, zIndex: 2, minWidth: 180 }}>Name <SortIcon col="first_name" /></th>
          <th style={thStyle}>Stage</th>
          <th style={thStyle}>Community</th>
          <th style={thStyle}>Floor Plan</th>
          <th onClick={() => onSort("budget_min")} style={thStyle}>Budget <SortIcon col="budget_min" /></th>
          <th onClick={() => onSort("contract_date")} style={thStyle}>Contract Date <SortIcon col="contract_date" /></th>
          <th onClick={() => onSort("last_activity_at")} style={thStyle}>Last Activity <SortIcon col="last_activity_at" /></th>
          <th onClick={() => onSort("created_at")} style={thStyle}>Created <SortIcon col="created_at" /></th>
        </tr></thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} onClick={() => onSelect(p)} style={{ cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <td style={{ ...tdStyle, position: "sticky", left: 0, backgroundColor: "inherit", color: "#ededed", fontWeight: 500, fontSize: 13, zIndex: 1 }}>
                {p.first_name} {p.last_name}
              </td>
              <td style={tdStyle}><StageBadge stage={p.crm_stage} /></td>
              <td style={tdStyle}>{p.community_name ?? "—"}</td>
              <td style={tdStyle}>{p.floor_plan_name ?? "—"}</td>
              <td style={tdStyle}>{formatBudget(p.budget_min, p.budget_max)}</td>
              <td style={tdStyle}>{p.contract_date ? new Date(p.contract_date).toLocaleDateString() : "—"}</td>
              <td style={tdStyle}>{relativeTime(p.last_activity_at)}</td>
              <td style={tdStyle}>{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function CardView({ prospects, communities, onSelect }: {
  prospects: Prospect[]; communities: Community[]; onSelect: (p: Prospect) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {prospects.map(p => (
        <div key={p.id} onClick={() => onSelect(p)} style={{
          backgroundColor: "#111111", borderRadius: 8, border: "1px solid #1f1f1f",
          padding: 12, cursor: "pointer", transition: "border-color 0.15s",
          display: "flex", flexDirection: "column", gap: 8,
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <StageBadge stage={p.crm_stage} />
            <span style={{ fontSize: 10, color: "#444" }}>{relativeTime(p.last_activity_at)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>{p.first_name} {p.last_name}</div>
          {p.community_name && <div style={{ fontSize: 11, color: "#555" }}>{p.community_name}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {p.floor_plan_name && (
              <span style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 4,
                backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#666",
              }}>{p.floor_plan_name}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#a1a1a1" }}>{formatBudget(p.budget_min, p.budget_max)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProspectsClient({ prospects, communities }: Props) {
  const [view, setView] = useState<"board" | "table" | "card">("board");
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("last_activity_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const saved = localStorage.getItem("prospects-view") as "board" | "table" | "card" | null;
    if (saved && ["board", "table", "card"].includes(saved)) setView(saved);
  }, []);
  useEffect(() => { localStorage.setItem("prospects-view", view); }, [view]);

  const filtered = prospects
    .filter(p => stageFilter === "all" || p.crm_stage === stageFilter)
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) || (p.phone ?? "").includes(q);
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
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>Prospects</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555",
            }}>{filtered.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="text" placeholder="Search prospects..." value={search}
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
          {view === "board" && <BoardView prospects={filtered} communities={communities} stageFilter={stageFilter} onSelect={setSelected} />}
          {view === "table" && <TableView prospects={filtered} communities={communities} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} />}
          {view === "card" && <CardView prospects={filtered} communities={communities} onSelect={setSelected} />}
        </div>
      </main>
      {selected && <SlideOver prospect={selected} communities={communities} onClose={() => setSelected(null)} />}
    </div>
  );
}
