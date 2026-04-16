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

interface Opportunity {
  id: string;
  contact_id: string;
  source: string | null;
  community_id: string | null;
  division_id: string | null;
  osc_id: string | null;
  osc_route_decision: string | null;
  opportunity_source: string | null;
  notes: string | null;
  is_active: boolean;
  last_activity_at: string | null;
  created_at: string;
  // joined contact fields (if available)
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
}

interface Props {
  opportunities: Opportunity[];
  communities: Community[];
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: "new",           label: "New",           color: "#f5a623", bg: "#2a2a1a", border: "#3f3a1f" },
  { key: "assigned",      label: "Assigned",      color: "#0070f3", bg: "#1a1f2e", border: "#1a2a3f" },
  { key: "contacted",     label: "Contacted",     color: "#a855f7", bg: "#1f1a2e", border: "#2a1f3f" },
  { key: "promoted",      label: "Promoted",      color: "#00c853", bg: "#1a2a1a", border: "#1f3f1f" },
  { key: "demoted",       label: "Demoted",       color: "#ff6b6b", bg: "#2a1a1a", border: "#3f1f1f" },
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

function deriveStage(opp: Opportunity): string {
  if (opp.osc_route_decision === "promoted_to_prospect") return "promoted";
  if (opp.osc_route_decision === "demoted_to_lead" || opp.osc_route_decision === "demoted_to_marketing") return "demoted";
  if (opp.osc_id) return "assigned";
  return "new";
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

function SlideOver({ opp, communities, onClose }: { opp: Opportunity; communities: Community[]; onClose: () => void }) {
  const community = communities.find(c => c.id === opp.community_id);
  const stage = deriveStage(opp);

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
              {opp.first_name ?? "—"} {opp.last_name ?? ""}
            </span>
            <StageBadge stage={stage} />
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
              <DetailRow label="Email">{opp.email ? <a href={`mailto:${opp.email}`} style={{ color: "#0070f3", textDecoration: "none" }}>{opp.email}</a> : <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Phone">{opp.phone ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Source">{opp.source ?? opp.opportunity_source ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
            </div>
          </div>
          <div>
            <SectionHeader title="Routing" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Community">{community?.name ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Division">{community?.division_name ?? <span style={{ color: "#333" }}>—</span>}</DetailRow>
              <DetailRow label="Route Decision">{opp.osc_route_decision ?? <span style={{ color: "#333" }}>Pending</span>}</DetailRow>
              <DetailRow label="Last Activity">{opp.last_activity_at ? new Date(opp.last_activity_at).toLocaleString() : "—"}</DetailRow>
              <DetailRow label="Created">{new Date(opp.created_at).toLocaleString()}</DetailRow>
            </div>
          </div>
          {opp.notes && (
            <div>
              <SectionHeader title="Notes" />
              <p style={{ fontSize: 12, color: "#a1a1a1", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{opp.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Board view ───────────────────────────────────────────────────────────────

function BoardView({ opportunities, communities, stageFilter, onSelect }: {
  opportunities: Opportunity[]; communities: Community[]; stageFilter: string; onSelect: (o: Opportunity) => void;
}) {
  const visibleStages = stageFilter === "all" ? STAGES : STAGES.filter(s => s.key === stageFilter);
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
      {visibleStages.map(stage => {
        const items = opportunities.filter(o => deriveStage(o) === stage.key);
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
                <div style={{ fontSize: 11, color: "#333", padding: 16, textAlign: "center" }}>No opportunities</div>
              ) : items.map(opp => {
                const community = communities.find(c => c.id === opp.community_id);
                return (
                  <div key={opp.id} onClick={() => onSelect(opp)} style={{
                    backgroundColor: "#111111", borderRadius: 6, border: "1px solid #1f1f1f",
                    padding: 12, margin: 4, cursor: "pointer", transition: "border-color 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#ededed", marginBottom: 3 }}>
                      {opp.first_name ?? "Unknown"} {opp.last_name ?? ""}
                    </div>
                    {community && <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{community.name}</div>}
                    {(opp.source || opp.opportunity_source) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 4,
                          backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#666",
                        }}>{opp.source ?? opp.opportunity_source}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span />
                      <span style={{ fontSize: 10, color: "#444" }}>{relativeTime(opp.last_activity_at ?? opp.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({ opportunities, communities, sortCol, sortDir, onSort, onSelect }: {
  opportunities: Opportunity[]; communities: Community[]; sortCol: string; sortDir: "asc" | "desc";
  onSort: (col: string) => void; onSelect: (o: Opportunity) => void;
}) {
  const sorted = [...opportunities].sort((a, b) => {
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
          <th onClick={() => onSort("source")} style={thStyle}>Source <SortIcon col="source" /></th>
          <th style={thStyle}>Route Decision</th>
          <th onClick={() => onSort("last_activity_at")} style={thStyle}>Last Activity <SortIcon col="last_activity_at" /></th>
          <th onClick={() => onSort("created_at")} style={thStyle}>Created <SortIcon col="created_at" /></th>
        </tr></thead>
        <tbody>
          {sorted.map(opp => {
            const community = communities.find(c => c.id === opp.community_id);
            return (
              <tr key={opp.id} onClick={() => onSelect(opp)} style={{ cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td style={{ ...tdStyle, position: "sticky", left: 0, backgroundColor: "inherit", color: "#ededed", fontWeight: 500, fontSize: 13, zIndex: 1 }}>
                  {opp.first_name ?? "Unknown"} {opp.last_name ?? ""}
                </td>
                <td style={tdStyle}><StageBadge stage={deriveStage(opp)} /></td>
                <td style={tdStyle}>{community?.name ?? "—"}</td>
                <td style={tdStyle}>{opp.source ?? opp.opportunity_source ?? "—"}</td>
                <td style={tdStyle}>{opp.osc_route_decision ?? "Pending"}</td>
                <td style={tdStyle}>{relativeTime(opp.last_activity_at)}</td>
                <td style={tdStyle}>{new Date(opp.created_at).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function CardView({ opportunities, communities, onSelect }: {
  opportunities: Opportunity[]; communities: Community[]; onSelect: (o: Opportunity) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {opportunities.map(opp => {
        const community = communities.find(c => c.id === opp.community_id);
        const stage = deriveStage(opp);
        return (
          <div key={opp.id} onClick={() => onSelect(opp)} style={{
            backgroundColor: "#111111", borderRadius: 8, border: "1px solid #1f1f1f",
            padding: 12, cursor: "pointer", transition: "border-color 0.15s",
            display: "flex", flexDirection: "column", gap: 8,
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <StageBadge stage={stage} />
              <span style={{ fontSize: 10, color: "#444" }}>{relativeTime(opp.last_activity_at ?? opp.created_at)}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>
              {opp.first_name ?? "Unknown"} {opp.last_name ?? ""}
            </div>
            {community && <div style={{ fontSize: 11, color: "#555" }}>{community.name}</div>}
            {(opp.source || opp.opportunity_source) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                <span style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 4,
                  backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#666",
                }}>{opp.source ?? opp.opportunity_source}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OpportunitiesClient({ opportunities, communities }: Props) {
  const [view, setView] = useState<"board" | "table" | "card">("board");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const saved = localStorage.getItem("opportunities-view") as "board" | "table" | "card" | null;
    if (saved && ["board", "table", "card"].includes(saved)) setView(saved);
  }, []);
  useEffect(() => { localStorage.setItem("opportunities-view", view); }, [view]);

  const filtered = opportunities
    .filter(o => stageFilter === "all" || deriveStage(o) === stageFilter)
    .filter(o => {
      if (!search) return true;
      const q = search.toLowerCase();
      return `${o.first_name ?? ""} ${o.last_name ?? ""}`.toLowerCase().includes(q) ||
        (o.email ?? "").toLowerCase().includes(q) || (o.phone ?? "").includes(q);
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
        {/* Top bar */}
        <div style={{
          padding: "10px 24px", borderBottom: "1px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>Opportunities</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555",
            }}>{filtered.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="text" placeholder="Search opportunities..." value={search}
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

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {view === "board" && <BoardView opportunities={filtered} communities={communities} stageFilter={stageFilter} onSelect={setSelected} />}
          {view === "table" && <TableView opportunities={filtered} communities={communities} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} />}
          {view === "card" && <CardView opportunities={filtered} communities={communities} onSelect={setSelected} />}
        </div>
      </main>

      {selected && <SlideOver opp={selected} communities={communities} onClose={() => setSelected(null)} />}
    </div>
  );
}
