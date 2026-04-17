"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface PipelineItem {
  id: string;
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  crm_stage: string;
  source: string | null;
  budget_min: number | null;
  budget_max: number | null;
  last_activity_at: string | null;
  engagement_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface PipelineDetailViewProps {
  items: PipelineItem[];
  communityId?: string | null;
  divisionId?: string | null;
  onBack: () => void;
  bucketLabel: string;
}

interface Activity {
  id: string;
  contact_id: string;
  channel: string | null;
  subject: string | null;
  occurred_at: string;
  contacts?: { first_name: string; last_name: string } | null;
}

interface StageTransition {
  id: string;
  contact_id: string;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
}

type ViewMode = "timeline" | "card" | "list";
type SidePanelTab = "profile" | "activity" | "communication";
type SortKey = "name" | "source" | "score" | "channel" | "engagement";
type SortDir = "asc" | "desc";

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const CHANNEL_ICONS: Record<string, string> = {
  email: "📧",
  phone: "📞",
  call: "📞",
  sms: "💬",
  text: "💬",
  video: "🎥",
  zoom: "🎥",
  meeting: "🎥",
  voice: "🎙",
  web: "🌐",
  chat: "💭",
  webbot: "💭",
  logrocket: "🖥",
  "walk-in": "🚶",
  walkin: "🚶",
  mail: "📬",
  rilla: "🎙",
};

function channelIcon(channel: string | null): string {
  if (!channel) return "📋";
  const key = channel.toLowerCase().trim();
  return CHANNEL_ICONS[key] ?? "📋";
}

function initials(first: string, last: string): string {
  return `${(first || "?")[0]}${(last || "?")[0]}`.toUpperCase();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "No activity";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function groupByDate(activities: Activity[]): { label: string; items: Activity[] }[] {
  const groups: Map<string, Activity[]> = new Map();
  for (const a of activities) {
    const label = formatDate(a.occurred_at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(a);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function generateAiSuggestion(item: PipelineItem): string {
  const name = item.first_name;
  if (!item.last_activity_at) return `Hi ${name}, just checking in to see if you have any questions about our communities!`;
  const daysSince = Math.floor((Date.now() - new Date(item.last_activity_at).getTime()) / 86400000);
  if (daysSince > 14) return `Hi ${name}, it's been a while since we connected. Would love to catch up and see where you are in your home search!`;
  if (daysSince > 7) return `Hi ${name}, following up on our recent conversation. Any new questions I can help with?`;
  return `Hi ${name}, thanks for your recent interest! I'd love to schedule a time to chat about what you're looking for.`;
}

const STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Lead": { bg: "#1a2e10", color: "#80B602", border: "#2a4a18" },
  "Prospect A": { bg: "#0a2540", color: "#59a6bd", border: "#1a4060" },
  "Prospect B": { bg: "#2e2a18", color: "#e07000", border: "#4a4018" },
  "Prospect C": { bg: "#3a1818", color: "#E32027", border: "#5a2020" },
};

function stageBadgeStyle(stage: string): React.CSSProperties {
  const s = STAGE_COLORS[stage] ?? { bg: "#2a2b2e", color: "#999", border: "#444" };
  return {
    display: "inline-flex", alignItems: "center",
    padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
  };
}

/* ─── Styles ────────────────────────────────────────────────────────────── */

const BG = "#09090b";
const CARD_BG = "#18181b";
const BORDER = "#27272a";
const TEXT_PRIMARY = "#fafafa";
const TEXT_SECONDARY = "#a1a1aa";
const TEXT_DIM = "#71717a";
const ACCENT = "#3b82f6";

const pillBtnBase: React.CSSProperties = {
  padding: "5px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
  border: `1px solid ${BORDER}`, cursor: "pointer", transition: "all 0.15s",
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function PipelineDetailView({
  items,
  onBack,
  bucketLabel,
}: PipelineDetailViewProps) {
  const [view, setView] = useState<ViewMode>("timeline");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Side panel
  const [panelItemId, setPanelItemId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<SidePanelTab>("profile");
  const [panelActivities, setPanelActivities] = useState<Activity[]>([]);
  const [panelTransitions, setPanelTransitions] = useState<StageTransition[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);

  // List sort
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Filter items by search ──
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        `${i.first_name} ${i.last_name}`.toLowerCase().includes(q) ||
        (i.email?.toLowerCase().includes(q)) ||
        (i.phone?.includes(q)) ||
        (i.source?.toLowerCase().includes(q))
    );
  }, [items, search]);

  // ── Fetch activities for all items ──
  useEffect(() => {
    const contactIds = items.map((i) => i.contact_id).filter(Boolean);
    if (contactIds.length === 0) { setActivities([]); return; }

    let cancelled = false;
    setLoadingActivities(true);

    supabase
      .from("activities")
      .select("id, contact_id, channel, subject, occurred_at, contacts(first_name, last_name)")
      .in("contact_id", contactIds)
      .order("occurred_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!cancelled) {
          setActivities((data as Activity[] | null) ?? []);
          setLoadingActivities(false);
        }
      });

    return () => { cancelled = true; };
  }, [items]);

  // ── Fetch side-panel data ──
  useEffect(() => {
    if (!panelItemId) return;
    const item = items.find((i) => i.id === panelItemId);
    if (!item) return;

    let cancelled = false;
    setLoadingPanel(true);

    Promise.all([
      supabase
        .from("activities")
        .select("id, contact_id, channel, subject, occurred_at, contacts(first_name, last_name)")
        .eq("contact_id", item.contact_id)
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase
        .from("stage_transitions")
        .select("*")
        .eq("contact_id", item.contact_id)
        .order("created_at", { ascending: false }),
    ]).then(([actRes, transRes]) => {
      if (!cancelled) {
        setPanelActivities((actRes.data as Activity[] | null) ?? []);
        setPanelTransitions((transRes.data as StageTransition[] | null) ?? []);
        setLoadingPanel(false);
      }
    });

    return () => { cancelled = true; };
  }, [panelItemId, items]);

  // ── Derived data ──
  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);
  const panelItem = useMemo(() => items.find((i) => i.id === panelItemId) ?? null, [items, panelItemId]);

  const timelineActivities = useMemo(() => {
    if (!selectedItem) return activities;
    return activities.filter((a) => a.contact_id === selectedItem.contact_id);
  }, [activities, selectedItem]);

  const groupedActivities = useMemo(() => groupByDate(timelineActivities), [timelineActivities]);

  // ── List sort ──
  const sortedItems = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          break;
        case "source":
          cmp = (a.source ?? "").localeCompare(b.source ?? "");
          break;
        case "score":
          cmp = (a.engagement_score ?? 0) - (b.engagement_score ?? 0);
          break;
        case "engagement":
          cmp = new Date(a.last_activity_at ?? 0).getTime() - new Date(b.last_activity_at ?? 0).getTime();
          break;
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // ── Handlers ──
  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const openPanel = useCallback((id: string) => {
    setPanelItemId(id);
    setPanelTab("profile");
  }, []);

  const closePanel = useCallback(() => {
    setPanelItemId(null);
    setPanelActivities([]);
    setPanelTransitions([]);
  }, []);

  const handleListSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return key; }
      setSortDir("asc");
      return key;
    });
  }, []);

  // Close panel on Escape
  useEffect(() => {
    if (!panelItemId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closePanel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [panelItemId, closePanel]);

  /* ─── Render Helpers ──────────────────────────────────────────────────── */

  function renderScoreBadge(score: number | null) {
    if (score == null) return null;
    const color = score >= 70 ? "#80B602" : score >= 40 ? "#e07000" : "#E32027";
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", padding: "2px 8px",
        borderRadius: 9999, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
        background: `${color}18`, color, border: `1px solid ${color}40`,
      }}>
        Score: {score}
      </span>
    );
  }

  function renderContactNameBadge(a: Activity) {
    const c = a.contacts;
    if (!c) return null;
    return (
      <span style={{
        fontSize: 10, color: TEXT_DIM, background: "#27272a", borderRadius: 4,
        padding: "1px 6px", whiteSpace: "nowrap",
      }}>
        {c.first_name} {c.last_name}
      </span>
    );
  }

  function renderActivityRow(a: Activity, showName: boolean) {
    return (
      <div key={a.id} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{channelIcon(a.channel)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: TEXT_PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.subject ?? "Activity"}
          </div>
        </div>
        {showName && renderContactNameBadge(a)}
        <span style={{ fontSize: 11, color: TEXT_DIM, flexShrink: 0 }}>{formatTime(a.occurred_at)}</span>
      </div>
    );
  }

  /* ─── Prospect List Item (Timeline left panel) ────────────────────────── */

  function renderProspectListItem(item: PipelineItem) {
    const isSelected = selectedId === item.id;
    const lastAct = activities.find((a) => a.contact_id === item.contact_id);
    return (
      <div
        key={item.id}
        onClick={() => handleSelect(item.id)}
        onDoubleClick={() => openPanel(item.id)}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
          borderBottom: `1px solid ${BORDER}`, cursor: "pointer",
          borderLeft: isSelected ? `3px solid ${ACCENT}` : "3px solid transparent",
          background: isSelected ? "#1e293b" : "transparent",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#1a1a2e"; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#27272a",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY, flexShrink: 0,
        }}>
          {initials(item.first_name, item.last_name)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>
              {item.first_name} {item.last_name}
            </span>
            {renderScoreBadge(item.engagement_score)}
            <span style={stageBadgeStyle(item.crm_stage)}>{item.crm_stage}</span>
          </div>
          <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
            {item.source && <span>{channelIcon(item.source)} {item.source}</span>}
            <span style={{ color: "#3f3f46" }}>·</span>
            <span>{lastAct ? (lastAct.subject ?? "Activity") : "No activity"}</span>
          </div>
        </div>

        <span style={{ fontSize: 10, color: TEXT_DIM, flexShrink: 0 }}>{timeAgo(item.last_activity_at)}</span>
      </div>
    );
  }

  /* ─── Views ───────────────────────────────────────────────────────────── */

  function renderTimeline() {
    return (
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left panel — prospect list */}
        <div style={{
          width: "40%", minWidth: 280, borderRight: `1px solid ${BORDER}`,
          overflowY: "auto", flexShrink: 0,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 12 }}>
              No prospects match your search
            </div>
          ) : (
            filtered.map(renderProspectListItem)
          )}
        </div>

        {/* Right panel — activity timeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 16, fontWeight: 500 }}>
            {selectedItem
              ? `Activity for ${selectedItem.first_name} ${selectedItem.last_name}`
              : `All activity across ${bucketLabel}`}
          </div>

          {loadingActivities ? (
            <div style={{ color: TEXT_DIM, fontSize: 12, padding: 20 }}>Loading activities…</div>
          ) : timelineActivities.length === 0 ? (
            <div style={{ color: TEXT_DIM, fontSize: 12, padding: 20 }}>No activities found</div>
          ) : (
            groupedActivities.map((g) => (
              <div key={g.label} style={{ marginBottom: 16 }}>
                <div style={{
                  position: "sticky", top: 0, zIndex: 1, padding: "6px 0",
                  fontSize: 11, fontWeight: 600, color: TEXT_DIM,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  background: BG, borderBottom: `1px solid ${BORDER}`,
                }}>
                  {g.label}
                </div>
                {g.items.map((a) => renderActivityRow(a, !selectedItem))}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderCards() {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
        gap: 16, padding: 20, overflowY: "auto", flex: 1,
      }}>
        {filtered.map((item) => {
          const suggestion = generateAiSuggestion(item);
          return (
            <div
              key={item.id}
              onClick={() => openPanel(item.id)}
              style={{
                background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
                padding: 18, cursor: "pointer", transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3f3f46"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: "#27272a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 600, color: TEXT_SECONDARY, flexShrink: 0,
                }}>
                  {initials(item.first_name, item.last_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>
                    {item.first_name} {item.last_name}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={stageBadgeStyle(item.crm_stage)}>{item.crm_stage}</span>
                    {renderScoreBadge(item.engagement_score)}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: TEXT_DIM }}>{timeAgo(item.last_activity_at)}</span>
              </div>

              {/* Last action */}
              <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 12 }}>
                {item.source && <span>{channelIcon(item.source)} {item.source}</span>}
              </div>

              {/* AI suggestion */}
              <div style={{
                background: "#052e16", border: "1px solid #14532d", borderRadius: 8,
                padding: 12, marginBottom: 14,
              }}>
                <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  AI Suggested Response
                </div>
                <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>{suggestion}</div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_SECONDARY,
                  cursor: "pointer",
                }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit Message
                </button>
                <button style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_DIM,
                  cursor: "pointer",
                }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Skip Today
                </button>
                <button style={{
                  flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  border: `1px solid ${ACCENT}`, background: ACCENT, color: "#fff",
                  cursor: "pointer",
                }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Send Now
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 12 }}>
            No prospects match your search
          </div>
        )}
      </div>
    );
  }

  function renderList() {
    const sortArrow = (key: SortKey) => {
      if (sortKey !== key) return "";
      return sortDir === "asc" ? " ↑" : " ↓";
    };

    const thStyle: React.CSSProperties = {
      padding: "8px 14px", fontSize: 11, fontWeight: 600, color: TEXT_DIM,
      textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}`,
      textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
      background: CARD_BG,
    };

    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th style={thStyle} onClick={() => handleListSort("name")}>Name{sortArrow("name")}</th>
              <th style={thStyle} onClick={() => handleListSort("source")}>Source{sortArrow("source")}</th>
              <th style={thStyle} onClick={() => handleListSort("score")}>Score{sortArrow("score")}</th>
              <th style={thStyle}>Contact Method</th>
              <th style={thStyle} onClick={() => handleListSort("engagement")}>Last Engagement{sortArrow("engagement")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 12 }}>
                  No prospects match your search
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const lastAct = activities.find((a) => a.contact_id === item.contact_id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => openPanel(item.id)}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#1a1a2e"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "10px 14px", color: TEXT_PRIMARY, fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", background: "#27272a",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 600, color: TEXT_SECONDARY, flexShrink: 0,
                        }}>
                          {initials(item.first_name, item.last_name)}
                        </div>
                        {item.first_name} {item.last_name}
                        <span style={stageBadgeStyle(item.crm_stage)}>{item.crm_stage}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: TEXT_SECONDARY }}>
                      {item.source ? `${channelIcon(item.source)} ${item.source}` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {renderScoreBadge(item.engagement_score) ?? <span style={{ color: TEXT_DIM }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: TEXT_SECONDARY }}>
                      {lastAct ? `${channelIcon(lastAct.channel)} ${lastAct.channel ?? "—"}` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: TEXT_SECONDARY }}>
                      {lastAct ? (lastAct.subject ?? "Activity") : "—"}
                      <span style={{ color: TEXT_DIM, marginLeft: 8, fontSize: 10 }}>
                        {timeAgo(item.last_activity_at)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  /* ─── Side Panel ──────────────────────────────────────────────────────── */

  function renderSidePanel() {
    if (!panelItem) return null;

    const tabStyle = (t: SidePanelTab): React.CSSProperties => ({
      padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
      borderBottom: panelTab === t ? `2px solid ${ACCENT}` : "2px solid transparent",
      color: panelTab === t ? TEXT_PRIMARY : TEXT_DIM,
      background: "transparent", border: "none",
      borderBottomWidth: 2, borderBottomStyle: "solid",
      borderBottomColor: panelTab === t ? ACCENT : "transparent",
    });

    const commChannels = ["email", "phone", "call", "sms", "text", "zoom"];
    const commActivities = panelActivities.filter(
      (a) => a.channel && commChannels.includes(a.channel.toLowerCase())
    );

    const panelGrouped = groupByDate(panelTab === "communication" ? commActivities : panelActivities);

    return (
      <>
        {/* Overlay */}
        <div
          onClick={closePanel}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 40, backdropFilter: "blur(2px)",
          }}
        />

        {/* Panel */}
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 520,
          background: "#111", borderLeft: `1px solid ${BORDER}`, zIndex: 50,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
                    {panelItem.first_name} {panelItem.last_name}
                  </h2>
                  {renderScoreBadge(panelItem.engagement_score)}
                  <span style={stageBadgeStyle(panelItem.crm_stage)}>{panelItem.crm_stage}</span>
                </div>
                {panelItem.email && (
                  <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>{panelItem.email}</div>
                )}
              </div>
              <button
                onClick={closePanel}
                style={{
                  background: "transparent", border: "none", color: TEXT_DIM,
                  fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginTop: 14, borderBottom: `1px solid ${BORDER}` }}>
              <button style={tabStyle("profile")} onClick={() => setPanelTab("profile")}>Profile</button>
              <button style={tabStyle("activity")} onClick={() => setPanelTab("activity")}>Activity Log</button>
              <button style={tabStyle("communication")} onClick={() => setPanelTab("communication")}>Communication</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {loadingPanel ? (
              <div style={{ color: TEXT_DIM, fontSize: 12 }}>Loading…</div>
            ) : panelTab === "profile" ? (
              renderProfileTab()
            ) : (
              /* Activity or Communication tab */
              panelGrouped.length === 0 ? (
                <div style={{ color: TEXT_DIM, fontSize: 12, padding: 20, textAlign: "center" }}>
                  No {panelTab === "communication" ? "communications" : "activities"} found
                </div>
              ) : (
                panelGrouped.map((g) => (
                  <div key={g.label} style={{ marginBottom: 16 }}>
                    <div style={{
                      position: "sticky", top: 0, zIndex: 1, padding: "6px 0",
                      fontSize: 11, fontWeight: 600, color: TEXT_DIM,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      background: "#111", borderBottom: `1px solid ${BORDER}`,
                    }}>
                      {g.label}
                    </div>
                    {g.items.map((a) => renderActivityRow(a, false))}
                  </div>
                ))
              )
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "12px 20px", borderTop: `1px solid ${BORDER}`, flexShrink: 0,
            display: "flex", gap: 10, justifyContent: "flex-end",
          }}>
            <button style={{
              padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_SECONDARY,
              cursor: "pointer",
            }}>
              Add Note
            </button>
            <button
              onClick={closePanel}
              style={{
                padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_DIM,
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <button style={{
              padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: `1px solid ${ACCENT}`, background: ACCENT, color: "#fff",
              cursor: "pointer",
            }}>
              Contact Now
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderProfileTab() {
    if (!panelItem) return null;

    const rowStyle: React.CSSProperties = {
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: 12, minHeight: 24, padding: "4px 0",
    };

    const labelStyle: React.CSSProperties = { fontSize: 12, color: TEXT_DIM, flexShrink: 0 };
    const valueStyle: React.CSSProperties = { fontSize: 12, color: TEXT_PRIMARY, textAlign: "right", wordBreak: "break-word" };

    const budgetStr =
      panelItem.budget_min != null || panelItem.budget_max != null
        ? `$${(panelItem.budget_min ?? 0).toLocaleString()} – $${(panelItem.budget_max ?? 0).toLocaleString()}`
        : null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Prospect Information */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#444", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6,
            borderBottom: "1px solid #1a1a1a",
          }}>
            Prospect Information
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Stage</span>
              <span style={stageBadgeStyle(panelItem.crm_stage)}>{panelItem.crm_stage}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Source</span>
              <span style={valueStyle}>{panelItem.source ?? "—"}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>AI Score</span>
              <span>{renderScoreBadge(panelItem.engagement_score) ?? <span style={valueStyle}>—</span>}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Email</span>
              <span style={valueStyle}>{panelItem.email ?? "—"}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Phone</span>
              <span style={valueStyle}>{panelItem.phone ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#444", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6,
            borderBottom: "1px solid #1a1a1a",
          }}>
            Notes
          </div>
          <div style={{
            fontSize: 12, color: panelItem.notes ? TEXT_SECONDARY : TEXT_DIM,
            lineHeight: 1.6, whiteSpace: "pre-wrap",
          }}>
            {panelItem.notes ?? "No notes yet"}
          </div>
        </div>

        {/* Budget & Preferences */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#444", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6,
            borderBottom: "1px solid #1a1a1a",
          }}>
            Budget & Preferences
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {budgetStr && (
              <div style={rowStyle}>
                <span style={labelStyle}>Budget Range</span>
                <span style={valueStyle}>{budgetStr}</span>
              </div>
            )}
            <div style={rowStyle}>
              <span style={labelStyle}>Created</span>
              <span style={valueStyle}>
                {new Date(panelItem.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Stage Transitions */}
        {panelTransitions.length > 0 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, color: "#444", textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6,
              borderBottom: "1px solid #1a1a1a",
            }}>
              Stage History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {panelTransitions.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ color: TEXT_DIM }}>
                    {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span style={{ color: TEXT_DIM }}>{t.from_stage ?? "—"}</span>
                  <span style={{ color: TEXT_DIM }}>→</span>
                  <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{t.to_stage ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Main Render ─────────────────────────────────────────────────────── */

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: BG, color: TEXT_PRIMARY, position: "relative",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        {/* Back + breadcrumb */}
        <button
          onClick={onBack}
          style={{
            background: "transparent", border: "none", color: TEXT_SECONDARY,
            fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            padding: 0,
          }}
        >
          <span style={{ fontSize: 16 }}>←</span> Back
        </button>
        <span style={{ color: "#3f3f46" }}>|</span>
        <span style={{ fontSize: 13, color: TEXT_DIM }}>
          CSM Queue <span style={{ color: "#3f3f46" }}>&gt;</span>{" "}
          <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
            {bucketLabel} ({items.length})
          </span>
        </span>

        {/* View toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {(["timeline", "card", "list"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                ...pillBtnBase,
                background: view === v ? CARD_BG : "transparent",
                borderColor: view === v ? "#3f3f46" : BORDER,
                color: view === v ? TEXT_PRIMARY : TEXT_DIM,
              }}
            >
              {v === "timeline" ? "Timeline" : v === "card" ? "Card" : "List"}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prospects…"
          style={{
            background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6,
            padding: "7px 14px", fontSize: 12, color: TEXT_PRIMARY, outline: "none",
            width: 200,
          }}
        />
      </div>

      {/* Content */}
      {view === "timeline" && renderTimeline()}
      {view === "card" && renderCards()}
      {view === "list" && renderList()}

      {/* Side Panel */}
      {panelItemId && renderSidePanel()}
    </div>
  );
}
