"use client";

import { useIsMobile } from "@/hooks/useIsMobile";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommHubProps {
  communityId?: string | null;  // for CSM scope
  divisionId?: string | null;   // for OSC scope
  teamFilter?: string;          // "all" or user ID
}

interface CommActivity {
  id: string;
  contact_id: string | null;
  channel: string | null;
  direction: string;
  subject: string | null;
  body: string | null;
  occurred_at: string;
  is_read: boolean | null;
  read_at: string | null;
  needs_response: boolean | null;
  responded_at: string | null;
  is_urgent: boolean | null;
  sentiment: string | null;
  contacts: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
}

type CommHubTab = "urgent" | "needs_response" | "call" | "text" | "email";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMM_HUB_TABS: { id: CommHubTab; icon: string; label: string }[] = [
  { id: "urgent", icon: "⚠", label: "Urgent" },
  { id: "needs_response", icon: "", label: "Needs Response" },
  { id: "call", icon: "📞", label: "Call" },
  { id: "text", icon: "💬", label: "Text" },
  { id: "email", icon: "📧", label: "Email" },
];

const CHANNEL_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  email: { icon: "📧", label: "Email", color: "#f97316", bg: "#431407" },
  phone: { icon: "📞", label: "Call", color: "#60a5fa", bg: "#172554" },
  call: { icon: "📞", label: "Call", color: "#60a5fa", bg: "#172554" },
  sms: { icon: "💬", label: "Text", color: "#a78bfa", bg: "#2e1065" },
  text: { icon: "💬", label: "Text", color: "#a78bfa", bg: "#2e1065" },
  voicemail: { icon: "🎙", label: "Voicemail", color: "#f472b6", bg: "#500724" },
  webform: { icon: "🌐", label: "Web Form", color: "#34d399", bg: "#064e3b" },
  chat: { icon: "💭", label: "Chat", color: "#818cf8", bg: "#312e81" },
  walk_in: { icon: "🚶", label: "Walk-in", color: "#fbbf24", bg: "#422006" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function getChannelMeta(ch: string | null) {
  return CHANNEL_META[ch ?? ""] ?? { icon: "📬", label: ch ?? "Unknown", color: "#a1a1aa", bg: "#27272a" };
}

function generateAiReply(activity: CommActivity): string {
  const name = activity.contacts?.first_name ?? "there";
  const channel = activity.channel ?? "email";
  const subject = activity.subject ?? "";

  if (channel === "webform" || channel === "chat" || channel === "walk_in") {
    return `Hi ${name},\n\nThank you for your interest! We'd love to help you explore your options. Would you have time for a quick call this week to discuss what you're looking for?\n\nLooking forward to connecting!`;
  }
  if (channel === "phone" || channel === "call" || channel === "voicemail") {
    return `Hi ${name},\n\nThank you for calling! I wanted to follow up on our conversation${subject ? ` about ${subject}` : ""}. Please don't hesitate to reach out if you have any questions.\n\nBest regards`;
  }
  if (subject) {
    return `Hi ${name},\n\nThank you for your message. In response to "${subject}", I wanted to let you know we're happy to help.\n\nPlease let me know if you have any additional questions!`;
  }
  return `Hi ${name},\n\nThank you for reaching out! I'd be happy to assist you. Could you let me know the best time to connect?\n\nBest regards`;
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  isExpanded,
  onExpand,
  onMarkRead,
  onSendReply,
}: {
  activity: CommActivity;
  isExpanded: boolean;
  onExpand: () => void;
  onMarkRead: () => void;
  onSendReply: (text: string, channel: string) => void;
}) {
  const meta = getChannelMeta(activity.channel);
  const contactName = activity.contacts
    ? `${activity.contacts.first_name} ${activity.contacts.last_name}`
    : "Unknown";
  const isRead = !!activity.is_read;
  const needsResponse = activity.needs_response && !activity.responded_at;
  const isInbound = activity.direction === "inbound";
  const dirArrow = isInbound ? "←" : "→";
  const dirLabel = isInbound ? "Received" : "Sent";
  const borderColor = needsResponse ? "#f97316" : isRead ? "#27272a" : "#3f3f46";

  const [replyChannel, setReplyChannel] = useState(activity.channel ?? "email");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Pre-fill AI reply when expanded
  useEffect(() => {
    if (isExpanded && needsResponse && !replyText) {
      setReplyText(generateAiReply(activity));
    }
  }, [isExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSend() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    onSendReply(replyText.trim(), replyChannel);
    setTimeout(() => setSending(false), 500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{
      border: "1px solid #27272a",
      borderRadius: 6,
      overflow: "hidden",
      transition: "all 0.15s",
    }}>
      {/* Card header (clickable) */}
      <div
        onClick={() => {
          onExpand();
          if (!isRead) onMarkRead();
        }}
        style={{
          padding: "12px 16px",
          backgroundColor: isRead && !needsResponse ? "transparent" : "#18181b",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          transition: "background-color 0.1s",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1c1c1f")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = isRead && !needsResponse ? "transparent" : "#18181b")}
      >
        {/* Top row: channel badge + priority badges + name + timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
          {/* Channel pill — ALWAYS visible */}
          <span style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 10,
            backgroundColor: meta.bg, color: meta.color, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 2, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {meta.icon} {dirArrow}
          </span>

          {/* Priority badges — ALWAYS visible when applicable */}
          {activity.is_urgent && (
            <span style={{
              fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600,
              backgroundColor: "#7f1d1d", color: "#fca5a5", flexShrink: 0,
            }}>⚠</span>
          )}
          {needsResponse && (
            <span style={{
              fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600,
              backgroundColor: "#422006", color: "#fbbf24", flexShrink: 0,
            }}>NR</span>
          )}

          {/* Contact name */}
          <span style={{ fontSize: 14, fontWeight: 500, color: "#fafafa", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {contactName}
          </span>

          {/* Timestamp */}
          <span style={{ fontSize: 10, color: "#52525b", flexShrink: 0 }}>
            {relativeTime(activity.occurred_at)}
          </span>
        </div>

        {/* Second row: direction badge + mark read */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ flex: 1 }} />
          {/* Direction badge */}
          <span style={{
            fontSize: 9, padding: "2px 7px", borderRadius: 3, fontWeight: 500,
            border: "1px solid #3f3f46", color: "#71717a",
          }}>{dirLabel}</span>
          {/* Mark read button */}
          {!isRead && (
            <button
              onClick={e => { e.stopPropagation(); onMarkRead(); }}
              title="Mark as read"
              style={{
                padding: "2px 6px", borderRadius: 3, border: "1px solid #27272a",
                backgroundColor: "transparent", color: "#52525b", fontSize: 10,
                cursor: "pointer", opacity: 0.6,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
            >✓</button>
          )}
        </div>

        {/* Message preview */}
        <div style={{
          fontSize: 13, color: "#a1a1aa", lineHeight: 1.5,
          padding: "6px 10px", backgroundColor: "#0f0f12", borderRadius: 4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}>
          {activity.subject && <span style={{ fontWeight: 500, color: "#d4d4d8", overflow: "hidden", textOverflow: "ellipsis" }}>{activity.subject} — </span>}
          {activity.body ?? "No content"}
        </div>

        {/* AI suggestion preview (only when not expanded and needs response) */}
        {!isExpanded && needsResponse && (
          <div style={{
            fontSize: 11, color: "#f59e0b", lineHeight: 1.4,
            padding: "6px 10px", backgroundColor: "#1c1409", borderRadius: 4,
            border: "1px solid #422006",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            🤖 AI: {generateAiReply(activity).split("\n")[2] || "Click to view suggested reply..."}
          </div>
        )}
      </div>

      {/* Expanded conversation + reply */}
      {isExpanded && (
        <div style={{
          borderTop: "1px solid #27272a",
          backgroundColor: "#0f0f12",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}>
          {/* Conversation header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>
              Conversation with {contactName}
            </span>
            <button onClick={onExpand} style={{
              padding: "4px 10px", borderRadius: 4, border: "1px solid #27272a",
              backgroundColor: "transparent", color: "#71717a", fontSize: 11, cursor: "pointer",
            }}>Close</button>
          </div>

          {/* Original message */}
          <div style={{
            padding: "12px 14px", backgroundColor: "#18181b", borderRadius: 6,
            border: "1px solid #27272a",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 10,
                backgroundColor: meta.bg, color: meta.color, fontWeight: 600,
              }}>
                {meta.icon} {meta.label}
              </span>
              <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 3, border: "1px solid #3f3f46", color: "#71717a" }}>
                Received
              </span>
              <span style={{ fontSize: 10, color: "#52525b", marginLeft: "auto" }}>
                {formatTimestamp(activity.occurred_at)}
              </span>
            </div>
            {activity.subject && (
              <div style={{ fontSize: 12, fontWeight: 500, color: "#d4d4d8", marginBottom: 6 }}>
                {activity.subject}
              </div>
            )}
            <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {activity.body ?? "No content"}
            </div>
          </div>

          {/* Reply area */}
          {needsResponse && (
            <div style={{
              padding: "12px 14px", backgroundColor: "#18181b", borderRadius: 6,
              border: "1px solid #27272a",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {/* To + channel selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#71717a" }}>To:</span>
                <span style={{ fontSize: 12, color: "#fafafa", fontWeight: 500 }}>{contactName}</span>
                <span style={{ flex: 1 }} />
                <select
                  value={replyChannel}
                  onChange={e => setReplyChannel(e.target.value)}
                  style={{
                    fontSize: 11, padding: "4px 8px", backgroundColor: "#09090b",
                    border: "1px solid #27272a", borderRadius: 4, color: "#a1a1aa", outline: "none",
                  }}
                >
                  <option value="email">📧 Email</option>
                  <option value="text">💬 Text</option>
                  <option value="phone">📞 Phone</option>
                </select>
                <select
                  style={{
                    fontSize: 11, padding: "4px 8px", backgroundColor: "#09090b",
                    border: "1px solid #27272a", borderRadius: 4, color: "#a1a1aa", outline: "none",
                  }}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Textarea */}
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={5}
                placeholder="Type your reply..."
                style={{
                  width: "100%", padding: "10px 12px", backgroundColor: "#09090b",
                  border: "1px solid #27272a", borderRadius: 6, color: "#d4d4d8",
                  fontSize: 12, lineHeight: 1.6, outline: "none", resize: "vertical",
                  fontFamily: "inherit",
                }}
              />

              {/* Send row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "#52525b" }}>Press Ctrl+Enter to send</span>
                <button
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: "none", cursor: replyText.trim() && !sending ? "pointer" : "default",
                    backgroundColor: replyText.trim() && !sending ? "#6366f1" : "#27272a",
                    color: replyText.trim() && !sending ? "#fff" : "#52525b",
                    fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >↑</button>
              </div>
            </div>
          )}

          {/* Already responded */}
          {!needsResponse && activity.responded_at && (
            <div style={{
              padding: "10px 14px", backgroundColor: "#052e16", borderRadius: 6,
              border: "1px solid #166534", fontSize: 12, color: "#86efac",
            }}>
              ✓ Responded {relativeTime(activity.responded_at)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CommHub Component ────────────────────────────────────────────────────────

export default function CommHub({ communityId, divisionId, teamFilter }: CommHubProps) {
  const isMobile = useIsMobile();
  const [activities, setActivities] = useState<CommActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CommHubTab>("needs_response");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Determine scope
  const scopeField = communityId ? "community_id" : "division_id";
  const scopeId = communityId ?? divisionId;

  // ── Fetch activities ──
  const fetchActivities = useCallback(async () => {
    if (!scopeId) return;
    setLoading(true);

    let query = supabase
      .from("activities")
      .select("id, contact_id, channel, direction, subject, body, occurred_at, is_read, read_at, needs_response, responded_at, is_urgent, sentiment, contacts(first_name, last_name, email, phone)")
      .eq("direction", "inbound")
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (communityId) {
      query = query.eq("community_id", communityId);
    } else if (divisionId) {
      query = query.eq("division_id", divisionId);
    }

    const { data } = await query;

    const flat = (data ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      contacts: Array.isArray(a.contacts)
        ? (a.contacts as Record<string, unknown>[])[0] ?? null
        : a.contacts,
    })) as CommActivity[];

    setActivities(flat);
    setLoading(false);
  }, [scopeId, communityId, divisionId]);

  useEffect(() => {
    if (!scopeId) {
      setActivities([]);
      return;
    }
    fetchActivities();

    // Realtime subscription
    const filterStr = communityId
      ? `community_id=eq.${communityId}`
      : `division_id=eq.${divisionId}`;

    const channel = supabase
      .channel(`commhub-${scopeId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "activities",
        filter: filterStr,
      }, () => { fetchActivities(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopeId, fetchActivities, communityId, divisionId]);

  // ── Computed ──
  const counts = useMemo(() => ({
    urgent: activities.filter(a => a.is_urgent).length,
    needs_response: activities.filter(a => a.needs_response && !a.responded_at).length,
    call: activities.filter(a => a.channel === "phone" || a.channel === "call").length,
    text: activities.filter(a => a.channel === "sms" || a.channel === "text").length,
    email: activities.filter(a => a.channel === "email").length,
  }), [activities]);

  const urgentCount = counts.urgent;

  const filteredActivities = useMemo(() => {
    let items = activities;

    // Tab filter
    if (activeTab === "urgent") items = items.filter(a => a.is_urgent);
    else if (activeTab === "needs_response") items = items.filter(a => a.needs_response && !a.responded_at);
    else if (activeTab === "call") items = items.filter(a => a.channel === "phone" || a.channel === "call");
    else if (activeTab === "text") items = items.filter(a => a.channel === "sms" || a.channel === "text");
    else if (activeTab === "email") items = items.filter(a => a.channel === "email");

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(a => {
        const name = a.contacts ? `${a.contacts.first_name} ${a.contacts.last_name}`.toLowerCase() : "";
        const sub = (a.subject ?? "").toLowerCase();
        const body = (a.body ?? "").toLowerCase();
        return name.includes(q) || sub.includes(q) || body.includes(q);
      });
    }

    return items;
  }, [activities, activeTab, searchQuery]);

  // ── Actions ──
  async function handleMarkRead(activityId: string) {
    await supabase.from("activities").update({
      is_read: true,
      read_at: new Date().toISOString(),
    }).eq("id", activityId);

    setActivities(prev =>
      prev.map(a => a.id === activityId ? { ...a, is_read: true, read_at: new Date().toISOString() } : a)
    );
  }

  async function handleSendReply(activity: CommActivity, replyText: string, replyChannel: string) {
    // Record outbound reply
    await supabase.from("activities").insert({
      org_id: "00000000-0000-0000-0000-000000000001",
      contact_id: activity.contact_id,
      channel: replyChannel,
      direction: "outbound",
      subject: activity.subject ? `RE: ${activity.subject}` : null,
      body: replyText,
      occurred_at: new Date().toISOString(),
      community_id: communityId ?? null,
      division_id: divisionId ?? null,
    });

    // Mark original as responded
    await supabase.from("activities").update({
      responded_at: new Date().toISOString(),
      needs_response: false,
    }).eq("id", activity.id);

    // Update local state
    setActivities(prev =>
      prev.map(a => a.id === activity.id
        ? { ...a, needs_response: false, responded_at: new Date().toISOString() }
        : a
      )
    );

    setExpandedId(null);
  }

  // ── No scope ──
  if (!scopeId) {
    return (
      <div style={{
        padding: 32, textAlign: "center", fontSize: 12, color: "#52525b",
        backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8,
      }}>
        Select a scope to view communications
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0, maxWidth: "100%" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Comm Hub</span>
        {urgentCount > 0 && (
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
            backgroundColor: "#7f1d1d", color: "#fca5a5",
          }}>⚠ {urgentCount} Urgent</span>
        )}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search..."
          style={{
            width: "100%", padding: isMobile ? "6px 10px" : "8px 12px", backgroundColor: "#18181b",
            border: "1px solid #27272a", borderRadius: 6, color: "#d4d4d8",
            fontSize: isMobile ? 11 : 12, outline: "none",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#3f3f46")}
          onBlur={e => (e.currentTarget.style.borderColor = "#27272a")}
        />
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", marginBottom: 12, overflowX: isMobile ? "auto" : undefined, flexWrap: isMobile ? "nowrap" : "wrap" }}>
        {COMM_HUB_TABS.map(t => {
          const isActive = activeTab === t.id;
          const count = counts[t.id];
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: isMobile ? "5px 6px" : "6px 10px", fontSize: isMobile ? 10 : 11, fontWeight: isActive ? 600 : 400,
              color: isActive ? "#fafafa" : "#52525b",
              borderBottom: isActive ? "2px solid #fafafa" : "2px solid transparent",
              background: "none", border: "none", borderBottomStyle: "solid",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              {t.icon && <span>{t.icon}</span>}
              {!isMobile && <span>{t.label}</span>}
              <span style={{
                fontSize: isMobile ? 9 : 10, padding: "0 4px", borderRadius: 3, fontWeight: 600,
                backgroundColor: t.id === "urgent" && count > 0 ? "#7f1d1d" : count > 0 ? "#172554" : "#27272a",
                color: t.id === "urgent" && count > 0 ? "#fca5a5" : count > 0 ? "#60a5fa" : "#71717a",
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Activity List ── */}
      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "#52525b" }}>Loading...</div>
        ) : filteredActivities.length === 0 ? (
          <div style={{
            padding: 32, textAlign: "center", backgroundColor: "#18181b", border: "1px solid #27272a",
            borderRadius: 6, color: "#52525b", fontSize: 12,
          }}>No activities in this view</div>
        ) : (
          filteredActivities.map(a => (
            <ActivityCard
              key={a.id}
              activity={a}
              isExpanded={expandedId === a.id}
              onExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onMarkRead={() => handleMarkRead(a.id)}
              onSendReply={(text, channel) => handleSendReply(a, text, channel)}
            />
          ))
        )}
      </div>
    </div>
  );
}
