"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  slug: string | null;
  division_slug: string;
  division_name: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  substage: string | null;
  source: string | null;
  community_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_move_date: string | null;
  bedrooms: number | null;
  agent_name: string | null;
  last_activity_at: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  leads: Lead[];
  communities: Community[];
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"            },
  { icon: "⊡", label: "Agents",        href: "#"            },
  { icon: "✓", label: "Tasks",         href: "#"            },
  { icon: "⊕", label: "Leads",         href: "/leads"       },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "◫", label: "Lots",          href: "/lots"        },
    { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"            },
  { icon: "◉", label: "Notifications", href: "#"            },
  { icon: "⚙", label: "Settings",      href: "#"            },
  { icon: "◈", label: "Status",        href: "/status"      },
];

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: "new",            label: "New",            color: "#555",    bg: "#1a1a1a", border: "#2a2a2a" },
  { key: "contacted",      label: "Contacted",      color: "#f5a623", bg: "#2a2a1a", border: "#3f3a1f" },
  { key: "touring",        label: "Touring",        color: "#0070f3", bg: "#1a1f2e", border: "#1a2a3f" },
  { key: "under-contract", label: "Under Contract", color: "#a855f7", bg: "#1f1a2e", border: "#2a1f3f" },
  { key: "closed-won",     label: "Closed Won",     color: "#00c853", bg: "#1a2a1a", border: "#1f3f1f" },
  { key: "closed-lost",    label: "Closed Lost",    color: "#ff6b6b", bg: "#2a1a1a", border: "#3f1f1f" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
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
  if (min != null && max != null)
    return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
}

function stageConfig(key: string) {
  return STAGES.find((s) => s.key === key) ?? STAGES[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const cfg = stageConfig(stage);
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 6px",
        borderRadius: 4,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        whiteSpace: "nowrap" as const,
      }}
    >
      {cfg.label}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: "#a1a1a1" }}>{children}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "#555",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 600,
        paddingBottom: 8,
        borderBottom: "1px solid #1a1a1a",
        marginBottom: 12,
      }}
    >
      {title}
    </div>
  );
}

// ─── Slide-over panel ─────────────────────────────────────────────────────────

function SlideOver({
  lead,
  communities,
  onClose,
}: {
  lead: Lead;
  communities: Community[];
  onClose: () => void;
}) {
  const community = communities.find((c) => c.id === lead.community_id);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          backgroundColor: "#0d0d0d",
          borderLeft: "1px solid #1f1f1f",
          zIndex: 50,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            position: "sticky",
            top: 0,
            backgroundColor: "#0d0d0d",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#ededed" }}>
              {lead.first_name} {lead.last_name}
            </span>
            <StageBadge stage={lead.stage} />
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              fontSize: 18,
              cursor: "pointer",
              padding: "2px 6px",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Contact */}
          <div>
            <SectionHeader title="Contact" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Email">
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    style={{ color: "#0070f3", textDecoration: "none" }}
                  >
                    {lead.email}
                  </a>
                ) : (
                  <span style={{ color: "#333" }}>—</span>
                )}
              </DetailRow>
              <DetailRow label="Phone">
                {lead.phone ?? <span style={{ color: "#333" }}>—</span>}
              </DetailRow>
              <DetailRow label="Source">
                {lead.source ?? <span style={{ color: "#333" }}>—</span>}
              </DetailRow>
            </div>
          </div>

          {/* Interest */}
          <div>
            <SectionHeader title="Interest" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Community">
                {community?.name ?? <span style={{ color: "#333" }}>—</span>}
              </DetailRow>
              <DetailRow label="Budget">
                {formatBudget(lead.budget_min, lead.budget_max)}
              </DetailRow>
              <DetailRow label="Bedrooms">
                {lead.bedrooms != null ? String(lead.bedrooms) : <span style={{ color: "#333" }}>—</span>}
              </DetailRow>
              <DetailRow label="Desired Move Date">
                {lead.desired_move_date
                  ? new Date(lead.desired_move_date).toLocaleDateString()
                  : <span style={{ color: "#333" }}>—</span>}
              </DetailRow>
            </div>
          </div>

          {/* Assignment */}
          <div>
            <SectionHeader title="Assignment" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow label="Agent">
                {lead.agent_name ?? <span style={{ color: "#333" }}>—</span>}
              </DetailRow>
              <DetailRow label="Substage">
                {lead.substage ?? <span style={{ color: "#333" }}>—</span>}
              </DetailRow>
              <DetailRow label="Last Activity">
                {new Date(lead.last_activity_at).toLocaleString()}
              </DetailRow>
              <DetailRow label="Created">
                {new Date(lead.created_at).toLocaleString()}
              </DetailRow>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div>
              <SectionHeader title="Notes" />
              <p
                style={{
                  fontSize: 12,
                  color: "#a1a1a1",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {lead.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Board view ───────────────────────────────────────────────────────────────

function BoardView({
  leads,
  communities,
  stageFilter,
  onSelect,
}: {
  leads: Lead[];
  communities: Community[];
  stageFilter: string;
  onSelect: (l: Lead) => void;
}) {
  const visibleStages = stageFilter === "all" ? STAGES : STAGES.filter((s) => s.key === stageFilter);

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
      {visibleStages.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.key);
        return (
          <div
            key={stage.key}
            style={{
              flexShrink: 0,
              width: 280,
              backgroundColor: "#0d0d0d",
              borderRadius: 8,
              border: "1px solid #1f1f1f",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Column header */}
            <div
              style={{
                padding: "10px 12px 8px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: "1px solid #1a1a1a",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: stage.color }}>
                {stage.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 10,
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  color: "#555",
                }}
              >
                {stageLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", padding: 4, gap: 4 }}>
              {stageLeads.length === 0 ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "#333",
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  No leads
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const community = communities.find((c) => c.id === lead.community_id);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelect(lead)}
                      style={{
                        backgroundColor: "#111111",
                        borderRadius: 6,
                        border: "1px solid #1f1f1f",
                        padding: 12,
                        margin: 4,
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLDivElement).style.borderColor = "#1f1f1f")
                      }
                    >
                      {/* Name */}
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#ededed",
                          marginBottom: 3,
                        }}
                      >
                        {lead.first_name} {lead.last_name}
                      </div>

                      {/* Community */}
                      {community && (
                        <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>
                          {community.name}
                        </div>
                      )}

                      {/* Source + substage badges */}
                      {(lead.source || lead.substage) && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 4,
                            marginBottom: 6,
                          }}
                        >
                          {lead.source && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: "#161616",
                                border: "1px solid #2a2a2a",
                                color: "#666",
                              }}
                            >
                              {lead.source}
                            </span>
                          )}
                          {lead.substage && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: "#161616",
                                border: "1px solid #2a2a2a",
                                color: "#666",
                              }}
                            >
                              {lead.substage}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Budget */}
                      <div style={{ fontSize: 11, color: "#a1a1a1", marginBottom: 4 }}>
                        {formatBudget(lead.budget_min, lead.budget_max)}
                      </div>

                      {/* Agent + last activity */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 4,
                        }}
                      >
                        {lead.agent_name ? (
                          <span style={{ fontSize: 11, color: "#555" }}>{lead.agent_name}</span>
                        ) : (
                          <span />
                        )}
                        <span style={{ fontSize: 10, color: "#444" }}>
                          {relativeTime(lead.last_activity_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({
  leads,
  communities,
  sortCol,
  sortDir,
  onSort,
  onSelect,
}: {
  leads: Lead[];
  communities: Community[];
  sortCol: string;
  sortDir: "asc" | "desc";
  onSort: (col: string) => void;
  onSelect: (l: Lead) => void;
}) {
  const sorted = [...leads].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortCol] ?? "";
    const bVal = (b as unknown as Record<string, unknown>)[sortCol] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const thStyle: React.CSSProperties = {
    padding: "6px 12px",
    textAlign: "left",
    fontSize: 11,
    color: "#666",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    backgroundColor: "#0a0a0a",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: "1px solid #1a1a1a",
  };

  const tdStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    color: "#a1a1a1",
    borderBottom: "1px solid #111111",
    whiteSpace: "nowrap",
  };

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <span style={{ color: "#333", marginLeft: 4 }}>↕</span>;
    return (
      <span style={{ color: "#555", marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
    );
  }

  return (
    <div
      style={{
        overflowX: "auto",
        overflowY: "auto",
        maxHeight: "calc(100vh - 120px)",
        position: "relative",
      }}
    >
      <table
        style={{
          minWidth: 1200,
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            {/* Sticky Name column */}
            <th
              onClick={() => onSort("first_name")}
              style={{
                ...thStyle,
                position: "sticky",
                left: 0,
                zIndex: 2,
                minWidth: 180,
              }}
            >
              Name <SortIcon col="first_name" />
            </th>
            <th onClick={() => onSort("stage")} style={thStyle}>
              Stage <SortIcon col="stage" />
            </th>
            <th style={thStyle}>Community</th>
            <th onClick={() => onSort("agent_name")} style={thStyle}>
              Agent <SortIcon col="agent_name" />
            </th>
            <th onClick={() => onSort("source")} style={thStyle}>
              Source <SortIcon col="source" />
            </th>
            <th onClick={() => onSort("budget_min")} style={thStyle}>
              Budget <SortIcon col="budget_min" />
            </th>
            <th onClick={() => onSort("bedrooms")} style={thStyle}>
              Beds <SortIcon col="bedrooms" />
            </th>
            <th onClick={() => onSort("last_activity_at")} style={thStyle}>
              Last Activity <SortIcon col="last_activity_at" />
            </th>
            <th onClick={() => onSort("created_at")} style={thStyle}>
              Created <SortIcon col="created_at" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => {
            const community = communities.find((c) => c.id === lead.community_id);
            return (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead)}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#111111")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent")
                }
              >
                {/* Sticky Name */}
                <td
                  style={{
                    ...tdStyle,
                    position: "sticky",
                    left: 0,
                    backgroundColor: "inherit",
                    color: "#ededed",
                    fontWeight: 500,
                    fontSize: 13,
                    zIndex: 1,
                  }}
                >
                  {lead.first_name} {lead.last_name}
                </td>
                <td style={tdStyle}>
                  <StageBadge stage={lead.stage} />
                </td>
                <td style={tdStyle}>{community?.name ?? "—"}</td>
                <td style={tdStyle}>{lead.agent_name ?? "—"}</td>
                <td style={tdStyle}>{lead.source ?? "—"}</td>
                <td style={tdStyle}>{formatBudget(lead.budget_min, lead.budget_max)}</td>
                <td style={tdStyle}>{lead.bedrooms ?? "—"}</td>
                <td style={tdStyle}>{relativeTime(lead.last_activity_at)}</td>
                <td style={tdStyle}>{new Date(lead.created_at).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function CardView({
  leads,
  communities,
  onSelect,
}: {
  leads: Lead[];
  communities: Community[];
  onSelect: (l: Lead) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
      }}
    >
      {leads.map((lead) => {
        const community = communities.find((c) => c.id === lead.community_id);
        return (
          <div
            key={lead.id}
            onClick={() => onSelect(lead)}
            style={{
              backgroundColor: "#111111",
              borderRadius: 8,
              border: "1px solid #1f1f1f",
              padding: 12,
              cursor: "pointer",
              transition: "border-color 0.15s",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor = "#1f1f1f")
            }
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <StageBadge stage={lead.stage} />
              <span style={{ fontSize: 10, color: "#444" }}>
                {relativeTime(lead.last_activity_at)}
              </span>
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>
              {lead.first_name} {lead.last_name}
            </div>

            {community && (
              <div style={{ fontSize: 11, color: "#555" }}>{community.name}</div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {lead.source && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: "#161616",
                    border: "1px solid #2a2a2a",
                    color: "#666",
                  }}
                >
                  {lead.source}
                </span>
              )}
            </div>

            <div style={{ fontSize: 11, color: "#a1a1a1" }}>
              {formatBudget(lead.budget_min, lead.budget_max)}
            </div>

            {lead.agent_name && (
              <div style={{ fontSize: 11, color: "#555" }}>{lead.agent_name}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeadsClient({ leads, communities }: Props) {
  const [view, setView] = useState<"board" | "table" | "card">("board");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("last_activity_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Persist view to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("leads-view") as "board" | "table" | "card" | null;
    if (saved && ["board", "table", "card"].includes(saved)) {
      setView(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("leads-view", view);
  }, [view]);

  // Unique agents
  const agents = Array.from(
    new Set(leads.map((l) => l.agent_name).filter((a): a is string => a != null))
  ).sort();

  // Filtered data
  const filtered = leads
    .filter((l) => stageFilter === "all" || l.stage === stageFilter)
    .filter((l) => agentFilter === "all" || l.agent_name === agentFilter)
    .filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").includes(q)
      );
    });

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const selectStyle: React.CSSProperties = {
    backgroundColor: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    color: "#a1a1a1",
    fontSize: 12,
    padding: "4px 8px",
    outline: "none",
    cursor: "pointer",
  };

  const viewBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "#1a1a1a" : "none",
    border: active ? "1px solid #2a2a2a" : "1px solid transparent",
    borderRadius: 4,
    color: active ? "#ededed" : "#555",
    fontSize: 14,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0a0a0a", color: "#ededed" }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          backgroundColor: "#0a0a0a",
          borderRight: "1px solid #1f1f1f",
          height: "100vh",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "20px 16px 16px",
            borderBottom: "1px solid #1a1a1a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🦞</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", lineHeight: 1.2 }}>
                Pulse v2
              </div>
              <div style={{ fontSize: 10, color: "#444" }}>HBx AI Factory</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {navItems.map((item) => {
            const isActive = item.href === "/leads";
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 16px",
                  fontSize: 12,
                  color: isActive ? "#ededed" : "#555",
                  backgroundColor: isActive ? "#111111" : "transparent",
                  textDecoration: "none",
                  transition: "color 0.15s, background-color 0.15s",
                  borderLeft: isActive ? "2px solid #ededed" : "2px solid transparent",
                }}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ position: "relative" }}>
            <span style={{ fontSize: 20 }}>🦞</span>
            <span
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 8,
                height: 8,
                backgroundColor: "#00c853",
                borderRadius: "50%",
                border: "1.5px solid #0a0a0a",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#ededed" }}>Schellie</div>
            <div style={{ fontSize: 10, color: "#444" }}>Orchestrator · Online</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div
          style={{
            padding: "10px 24px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Title + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>Leads</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#555",
              }}
            >
              {filtered.length}
            </span>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                backgroundColor: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 4,
                fontSize: 12,
                padding: "4px 10px",
                color: "#a1a1a1",
                outline: "none",
                width: 180,
              }}
            />

            {/* Stage filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Stages</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Agent filter */}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div style={{ display: "flex", gap: 2 }}>
              <button
                onClick={() => setView("board")}
                style={viewBtnStyle(view === "board")}
                title="Board"
              >
                ◫
              </button>
              <button
                onClick={() => setView("table")}
                style={viewBtnStyle(view === "table")}
                title="Table"
              >
                ≡
              </button>
              <button
                onClick={() => setView("card")}
                style={viewBtnStyle(view === "card")}
                title="Cards"
              >
                ⊞
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {view === "board" && (
            <BoardView
              leads={filtered}
              communities={communities}
              stageFilter={stageFilter}
              onSelect={setSelected}
            />
          )}
          {view === "table" && (
            <TableView
              leads={filtered}
              communities={communities}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              onSelect={setSelected}
            />
          )}
          {view === "card" && (
            <CardView
              leads={filtered}
              communities={communities}
              onSelect={setSelected}
            />
          )}
        </div>
      </main>

      {/* ── Slide-over ── */}
      {selected && (
        <SlideOver
          lead={selected}
          communities={communities}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
