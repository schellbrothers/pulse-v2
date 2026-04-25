"use client";

import { sendEmail, sendSms, markRead } from "@/lib/crm-api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getActivityStyle } from "@/lib/activity-styles";

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
  excludeChannel?: string | string[];  // filter out activities with these channels
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
  duration_seconds: number | null;
  transcript_id: string | null;
  type: string | null;
  from_number: string | null;
  to_number: string | null;
  recording_url: string | null;
  metadata: unknown;
  opportunity_id: string | null;
  contacts: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
}

type CommHubTab = "urgent" | "needs_response" | "call" | "text" | "email" | "meeting";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMM_HUB_TABS: { id: CommHubTab; icon: string; label: string; iconOnly?: boolean }[] = [
  { id: "urgent", icon: "/icons/activity/urgent.svg", label: "Urgent", iconOnly: true },
  { id: "needs_response", icon: "", label: "Needs Response" },
  { id: "call", icon: "/icons/activity/phone.svg", label: "Call", iconOnly: true },
  { id: "text", icon: "/icons/activity/text.svg", label: "Text", iconOnly: true },
  { id: "email", icon: "/icons/activity/email.svg", label: "Email", iconOnly: true },
  { id: "meeting", icon: "/icons/activity/calendar.svg", label: "Meeting", iconOnly: true },
];

const CHANNEL_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  email: { icon: "/icons/activity/email.svg", label: "Email", color: "#f97316", bg: "#431407" },
  phone: { icon: "/icons/activity/phone.svg", label: "Call", color: "#60a5fa", bg: "#172554" },
  call: { icon: "/icons/activity/phone.svg", label: "Call", color: "#60a5fa", bg: "#172554" },
  sms: { icon: "/icons/activity/text.svg", label: "Text", color: "#a78bfa", bg: "#2e1065" },
  text: { icon: "/icons/activity/text.svg", label: "Text", color: "#a78bfa", bg: "#2e1065" },
  voicemail: { icon: "Voice", label: "Voicemail", color: "#f472b6", bg: "#500724" },
  webform: { icon: "Web", label: "Web Form", color: "#34d399", bg: "#064e3b" },
  chat: { icon: "Chat", label: "Chat", color: "#818cf8", bg: "#312e81" },
  walk_in: { icon: "Walk-in", label: "Walk-in", color: "#fbbf24", bg: "#422006" },
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
  return CHANNEL_META[ch ?? ""] ?? { icon: "", label: ch ?? "Unknown", color: "#a1a1aa", bg: "#27272a" };
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function parseCommPhoneParties(activity: CommActivity): { employee: string | null; externalParty: string | null } {
  const isOutbound = activity.direction !== "inbound";
  // Try body: "Duration: 889s | Grace Hoinowski → +16318071237"
  if (activity.body) {
    const arrowMatch = activity.body.match(/([^|]+?)\s*→\s*(.+)/);
    if (arrowMatch) {
      const left = arrowMatch[1].replace(/^.*\|\s*/, "").trim();
      const right = arrowMatch[2].trim();
      if (isOutbound) {
        return { employee: left, externalParty: right };
      } else {
        return { employee: right, externalParty: left };
      }
    }
  }
  return { employee: null, externalParty: null };
}

function getCallPreview(activity: CommActivity): string {
  const dur = formatDuration(activity.duration_seconds);
  const dir = activity.direction === "inbound" ? "Inbound" : "Outbound";
  const parties = parseCommPhoneParties(activity);
  const parts = [`${dir} Call`];
  if (parties.employee) parts.push(parties.employee);
  if (dur !== "0s") parts.push(dur);
  return parts.length > 1 ? `${parts[0]} — ${parts.slice(1).join(" · ")}` : parts[0];
}

function getMeetingPreview(activity: CommActivity): string {
  const dur = formatDuration(activity.duration_seconds);
  const topic = activity.subject ?? "Meeting";
  return `${topic} — ${dur}`;
}

function generateAiReply(activity: CommActivity): string {
  const name = activity.contacts?.first_name ?? "there";
  const channel = activity.channel ?? "email";
  const subject = activity.subject ?? "";
  const body = (activity.body ?? "").slice(0, 500).toLowerCase();
  const isSms = channel === "sms" || channel === "text";

  // Parse body for context clues
  const mentionsSchedule = /schedul|visit|tour|appoint|meet|come (by|in|out)/i.test(body);
  const mentionsCommunity = /community|neighborhood|development/i.test(body);
  const mentionsPricing = /price|cost|afford|budget|how much|payment/i.test(body);
  const mentionsTimeline = /when|timeline|move|moving|retire|month|year/i.test(body);
  const mentionsSpecific = /brentwood|riverwood|monarch|peninsula|cardinal|walden|miralon|independence|black oak|whisper/i.test(body);
  const communityMatch = body.match(/(?:brentwood|riverwood|monarch|peninsula lakes?|cardinal grove|walden|miralon|independence|black oak|whisper run)/i);
  const communityName = communityMatch ? communityMatch[0].replace(/\b\w/g, c => c.toUpperCase()) : "";

  if (isSms) {
    if (mentionsSchedule) return `Hi ${name}! Absolutely — I'd love to set up a visit. What day works best for you this week?`;
    if (mentionsPricing) return `Hi ${name}! Great question — I can send over some pricing details. Would you prefer email or a quick call to go over options?`;
    return `Hi ${name}! Thanks for reaching out. Would you have a few minutes for a quick call to chat about what you're looking for?`;
  }

  // Email replies
  if (mentionsSchedule) {
    return `Hi ${name},\n\nAbsolutely! I'd love to set up a time for you to visit${communityName ? ` ${communityName}` : ""}. We're available most days — what works best for your schedule?\n\nI'll make sure everything is ready for when you arrive. Looking forward to meeting you!\n\nWarm regards,\nGrace`;
  }

  if (mentionsPricing && communityName) {
    return `Hi ${name},\n\nGreat question! ${communityName} has some wonderful options. I'd love to walk you through the current pricing and any incentives we have available.\n\nWould you prefer I send over a detailed breakdown, or would a quick call work better?\n\nBest,\nGrace`;
  }

  if (mentionsSpecific && communityName) {
    return `Hi ${name},\n\nI'm so glad you're interested in ${communityName}! It's a wonderful community — I think you'd really love it.\n\nI'd be happy to share more details or set up a visit. What would be most helpful for you right now?\n\nWarm regards,\nGrace`;
  }

  if (mentionsTimeline) {
    return `Hi ${name},\n\nThanks for sharing that! It's great to start planning ahead. I'd love to help you find the perfect fit for your timeline.\n\nWould you have time for a quick call this week to go over some options?\n\nBest,\nGrace`;
  }

  if (subject.toLowerCase().includes("re:")) {
    return `Hi ${name},\n\nThank you for getting back to me! I appreciate you sharing that.\n\nPlease don't hesitate to reach out anytime — I'm here to help however I can. Would you like to schedule a visit or would a call work better for next steps?\n\nWarm regards,\nGrace`;
  }

  return `Hi ${name},\n\nThank you for reaching out! I'd love to learn more about what you're looking for so I can point you in the right direction.\n\nWould you have a few minutes for a quick call this week?\n\nLooking forward to connecting!\nGrace`;
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function formatWaitTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function ActivityCard({
  activity,
  isExpanded,
  onExpand,
  onMarkRead,
  onSendReply,
  waitTimeMs,
}: {
  activity: CommActivity;
  isExpanded: boolean;
  onExpand: () => void;
  waitTimeMs?: number;
  onMarkRead: () => void;
  onSendReply: (text: string, channel: string) => void;
}) {
  const meta = getChannelMeta(activity.channel);
  const actStyle = getActivityStyle(activity.channel, activity.type, activity.direction);
  const contactName = activity.contacts
    ? `${activity.contacts.first_name} ${activity.contacts.last_name}`
    : (activity.from_number || activity.to_number || "Unknown");
  const isRead = !!activity.is_read;
  const needsResponse = activity.needs_response && !activity.responded_at;
  const isInbound = activity.direction === "inbound";
  const dirArrow = isInbound ? "←" : "→";
  const dirLabel = isInbound ? "Received" : "Sent";

  const [replyChannel, setReplyChannel] = useState(activity.channel ?? "email");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptData, setTranscriptData] = useState<{ raw_text: string | null; ai_summary: string | null; recording_url: string | null } | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadTranscript() {
    if (transcriptData || transcriptLoading || !activity.transcript_id) return;
    setTranscriptLoading(true);
    try {
      const { data } = await supabase
        .from("transcripts")
        .select("raw_text, ai_summary, recording_url")
        .eq("id", activity.transcript_id)
        .single();
      setTranscriptData(data ? { raw_text: data.raw_text ?? "No transcript text available.", ai_summary: data.ai_summary ?? null, recording_url: data.recording_url ?? null } : { raw_text: "No transcript text available.", ai_summary: null, recording_url: null });
    } catch {
      setTranscriptData({ raw_text: "Failed to load transcript.", ai_summary: null, recording_url: null });
    }
    setTranscriptLoading(false);
  }

  async function copyTranscript() {
    if (!transcriptData?.raw_text) return;
    try {
      await navigator.clipboard.writeText(transcriptData.raw_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  // Pre-fill AI reply when expanded — use pre-generated from metadata, fall back to templates
  const [aiLoading, setAiLoading] = useState(false);
  useEffect(() => {
    if (isExpanded && needsResponse && !replyText) {
      // Check if metadata has a pre-generated AI reply from Spark
      let preGenerated: string | null = null;
      try {
        const m = typeof activity.metadata === "string" ? JSON.parse(activity.metadata) : activity.metadata;
        preGenerated = (m as Record<string, unknown>)?.ai_reply as string || null;
      } catch { /* */ }

      if (preGenerated) {
        setReplyText(preGenerated);
      } else {
        setReplyText(generateAiReply(activity)); // Template fallback
      }
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

  // Determine from/to labels
  const employeeName = (() => {
    try {
      const m = typeof activity.metadata === "string" ? JSON.parse(activity.metadata) : activity.metadata;
      return (m as Record<string, unknown>)?.employee_name as string || "OSC";
    } catch { return "OSC"; }
  })();
  const fromTo = isInbound ? `${contactName} \u2192 ${employeeName}` : `${employeeName} \u2192 ${contactName}`;

  return (
    <div style={{
      borderLeft: `3px solid ${actStyle.borderColor}`,
      backgroundColor: actStyle.bgColor,
      borderRadius: 4,
      overflow: "hidden",
    }}>
      {/* Compact row */}
      <div
        onClick={() => { onExpand(); if (!isRead) onMarkRead(); }}
        style={{
          padding: "7px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#1c1c1f")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {/* Icon */}
        <span style={{ flexShrink: 0, display: "inline-flex" }}>
          {actStyle.icon.startsWith("/") ? <img src={actStyle.icon} alt="" width={14} height={14} /> : <span style={{ fontSize: 14 }}>{actStyle.icon}</span>}
        </span>

        {/* Channel + Subject + From/To */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#ededed", fontWeight: 500, flexShrink: 0 }}>
              {actStyle.label}{activity.subject ? ":" : ""}
            </span>
            <span style={{ fontSize: 11, color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activity.subject || (activity.body ?? "").slice(0, 60)}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#52525b", marginTop: 1 }}>
            {fromTo}
          </div>
        </div>

        {/* NR badge */}
        {needsResponse && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, fontWeight: 600, backgroundColor: "#422006", color: "#fbbf24", flexShrink: 0 }}>NR</span>}
        {waitTimeMs != null && waitTimeMs > 0 && (
          <span style={{ fontSize: 9, color: waitTimeMs > 3600000 ? "#f87171" : waitTimeMs > 1800000 ? "#fbbf24" : "#4ade80", flexShrink: 0, fontWeight: 600 }}>
            {formatWaitTime(waitTimeMs)}
          </span>
        )}

        {/* Timestamp */}
        <span style={{ fontSize: 10, color: "#52525b", flexShrink: 0, whiteSpace: "nowrap" }}>
          {new Date(activity.occurred_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} {new Date(activity.occurred_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

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
                  <option value="email">Email</option>
                  <option value="text">Text</option>
                  <option value="phone">Phone</option>
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

              {/* AI Suggested Reply — full green block */}
              <div style={{
                padding: "10px 12px", backgroundColor: "#052e16", border: "1px solid #166534",
                borderRadius: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <img src="/icons/activity/ai.svg" alt="" width={12} height={12} style={{ opacity: 0.8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>AI Suggested Reply</span>
                  <span style={{ fontSize: 10, color: "#86efac", marginLeft: "auto" }}>{aiLoading ? "Generating personalized reply..." : "Edit below or send as-is"}</span>
                </div>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={6}
                  placeholder="Type your reply..."
                  style={{
                    width: "100%", padding: "10px 12px", backgroundColor: "#0a1f0a",
                    border: "1px solid #166534", borderRadius: 6, color: "#86efac",
                    fontSize: 12, lineHeight: 1.6, outline: "none", resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

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
                {meta.icon.startsWith("/") ? <><img src={meta.icon} alt="" width={12} height={12} style={{ verticalAlign: "middle", marginRight: 3 }} />{meta.label}</> : <>{meta.icon} {meta.label}</>}
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

          {/* Transcript viewer */}
          {activity.transcript_id && (
            <div style={{
              padding: "10px 14px", backgroundColor: "#18181b", borderRadius: 6,
              border: "1px solid #27272a",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: showTranscript ? 10 : 0 }}>
                <button
                  onClick={() => {
                    setShowTranscript(!showTranscript);
                    if (!showTranscript) loadTranscript();
                  }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#34d399", fontSize: 12, fontWeight: 500,
                    display: "flex", alignItems: "center", gap: 6, padding: 0,
                  }}
                >
                  📝 {showTranscript ? "Hide Transcript" : "View Transcript"}
                  <span style={{ fontSize: 10, color: "#52525b" }}>
                    {showTranscript ? "▲" : "▼"}
                  </span>
                </button>
                {showTranscript && transcriptData?.raw_text && (
                  <button
                    onClick={copyTranscript}
                    style={{
                      padding: "2px 8px", fontSize: 10, fontWeight: 500, borderRadius: 3,
                      cursor: "pointer", border: "1px solid #27272a", background: "#09090b",
                      color: copied ? "#4ade80" : "#a1a1aa",
                    }}
                  >{copied ? "✓ Copied!" : "Copy"}</button>
                )}
                {showTranscript && transcriptData?.recording_url && (
                  <button
                    onClick={() => window.open(transcriptData.recording_url!, "_blank")}
                    style={{
                      padding: "2px 8px", fontSize: 10, fontWeight: 500, borderRadius: 3,
                      cursor: "pointer", border: "1px solid #27272a", background: "#09090b", color: "#a1a1aa",
                    }}
                  >▶ Play</button>
                )}
              </div>
              {showTranscript && (
                <div style={{ borderRadius: 4, overflow: "hidden" }}>
                  {/* AI Summary */}
                  {transcriptData?.ai_summary && (
                    <div style={{
                      padding: "10px 12px", backgroundColor: "#172554", fontSize: 12,
                      color: "#93c5fd", lineHeight: 1.6, borderBottom: "1px solid #1e3a5f",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#60a5fa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Summary</div>
                      {transcriptData.ai_summary}
                    </div>
                  )}
                  {/* Full transcript */}
                  <div style={{
                    padding: "10px 12px",
                    backgroundColor: "#09090b", borderRadius: transcriptData?.ai_summary ? 0 : 4,
                    fontSize: 12, color: "#a1a1aa", lineHeight: 1.7,
                    whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto",
                    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                  }}>
                    {transcriptLoading ? "Loading transcript..." : transcriptData?.raw_text ?? ""}
                  </div>
                </div>
              )}
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

export default function CommHub({ communityId, divisionId, teamFilter, excludeChannel }: CommHubProps) {
  const isMobile = useIsMobile();
  const [activities, setActivities] = useState<CommActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CommHubTab>("needs_response");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Determine scope — null means ALL
  const scopeField = communityId ? "community_id" : divisionId ? "division_id" : null;
  const scopeId = communityId ?? divisionId ?? "all";

  // ── Fetch activities ──
  const fetchActivities = useCallback(async () => {
    setLoading(true);

    // 7-day window for Comm Hub — it's a working dashboard, not full history
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("activities")
      .select("id, contact_id, opportunity_id, channel, direction, subject, body, occurred_at, is_read, read_at, needs_response, responded_at, is_urgent, sentiment, duration_seconds, transcript_id, recording_url, metadata, type, from_number, to_number, contacts(first_name, last_name, email, phone)")
      .gte("occurred_at", sevenDaysAgo)
      .order("occurred_at", { ascending: false })
      .limit(2000);

    // Scope filtering by division/community when set
    if (communityId) {
      query = query.eq("community_id", communityId);
    } else if (divisionId) {
      query = query.eq("division_id", divisionId);
    }

    // User (OSC) filter: only show activities on this user's opportunities
    if (teamFilter && teamFilter !== "all") {
      const { data: userOpps } = await supabase
        .from("opportunities")
        .select("id")
        .eq("osc_id", teamFilter)
        .eq("is_active", true);
      const oppIds = (userOpps ?? []).map((o: Record<string, unknown>) => o.id as string);
      if (oppIds.length > 0) {
        query = query.in("opportunity_id", oppIds);
      } else {
        // No opportunities for this user — return empty
        setActivities([]);
        setLoading(false);
        return;
      }
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
  }, [communityId, divisionId, teamFilter]);

  useEffect(() => {
    fetchActivities();

    // Realtime subscription
    const filterStr = communityId
      ? `community_id=eq.${communityId}`
      : divisionId ? `division_id=eq.${divisionId}` : undefined;

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
  }, [scopeId, fetchActivities, communityId, divisionId, teamFilter]);

  // ── Computed ──
  // Apply excludeChannel filter globally
  const baseActivities = useMemo(() => {
    if (!excludeChannel) return activities;
    const excluded = Array.isArray(excludeChannel) ? excludeChannel : [excludeChannel];
    return activities.filter(a => !excluded.includes(a.channel ?? ""));
  }, [activities, excludeChannel]);

  // Smart NR: an inbound is NOT "needs response" if there's an outbound
  // to the same contact_id with a later timestamp
  // Smart NR: determine which inbound items truly need a response
  // 1. Already responded (outbound to same contact after this inbound)
  // 2. AI inference: message doesn't warrant a reply ("thanks", "got it", closers)
  // Patterns that indicate NO reply is needed
  const NO_REPLY_PATTERNS = [
    /^thanks?[!.\s]*$/i, /^thank you[!.\s]*$/i, /^ty[!.\s]*$/i,
    /^ok[!.\s]*$/i, /^okay[!.\s]*$/i, /^got it[!.\s]*$/i,
    /^sounds good[!.\s]*$/i, /^perfect[!.\s]*$/i, /^great[!.\s]*$/i,
    /^awesome[!.\s]*$/i, /^will do[!.\s]*$/i, /^np[!.\s]*$/i,
    /have a (good|great|nice|wonderful) (weekend|evening|night|day|one)/i,
    /^(happy|merry) (holidays|christmas|thanksgiving|new year)/i,
    /^(no worries|no problem|all good|all set)/i,
    /^(see you|talk (to you )?soon|take care|ttyl)/i,
    /^(unsubscribe|remove me|stop)/i,
  ];

  // Broader patterns — check first 200 chars of email body
  const NO_REPLY_BODY_PATTERNS = [
    /^thank(s| you)[^?]*$/im, // "Thanks" or "Thank you" without a question
    /we have already purchased/i,
    /looking for a rental/i,
    /not interested/i,
    /please remove/i,
    /wrong (number|person|email)/i,
    /^(I'll look into|will check|let me look)/i,
    /thanks for the info/i,
  ];

  function isNoReplyMessage(body: string | null): boolean {
    if (!body) return false;
    const trimmed = body.trim();
    // Short messages — check strict patterns
    if (trimmed.length <= 100) {
      if (NO_REPLY_PATTERNS.some(p => p.test(trimmed))) return true;
    }
    // First 200 chars — check broader patterns (email body starts)
    const head = trimmed.slice(0, 200);
    // If it's just a short thanks with no question marks, no reply needed
    if (head.length < 80 && /^thank/i.test(head) && !head.includes("?")) return true;
    if (NO_REPLY_BODY_PATTERNS.some(p => p.test(head))) return true;
    // "Have a great weekend" anywhere in short message
    if (trimmed.length < 150 && /have a (good|great|nice|wonderful) (weekend|evening|night|day)/i.test(trimmed) && !trimmed.includes("?")) return true;
    return false;
  }

  const { smartNR, replyTimes } = useMemo(() => {
    const responded = new Set<string>();
    const noReply = new Set<string>();
    const times: Record<string, number> = {}; // activity.id -> ms since received

    // Build maps: contact_id+channel -> latest outbound timestamp
    const latestOutbound: Record<string, string> = {};
    for (const a of baseActivities) {
      if (a.direction === "outbound" && a.contact_id) {
        const key = `${a.contact_id}:${a.channel}`;
        const existing = latestOutbound[key];
        if (!existing || a.occurred_at > existing) {
          latestOutbound[key] = a.occurred_at;
        }
        // Also track by contact_id only (cross-channel response)
        const keyAll = a.contact_id;
        if (!latestOutbound[keyAll] || a.occurred_at > latestOutbound[keyAll]) {
          latestOutbound[keyAll] = a.occurred_at;
        }
      }
    }

    for (const a of baseActivities) {
      if (!a.needs_response || a.responded_at || a.direction !== "inbound" || !a.contact_id) continue;

      // Check 1: outbound exists after this inbound (same channel or any channel)
      const keyChannel = `${a.contact_id}:${a.channel}`;
      const lastOutChannel = latestOutbound[keyChannel];
      const lastOutAny = latestOutbound[a.contact_id];
      if ((lastOutChannel && lastOutChannel > a.occurred_at) || (lastOutAny && lastOutAny > a.occurred_at)) {
        responded.add(a.id);
        continue;
      }

      // Check 2: AI inference — message doesn't need a reply
      if (isNoReplyMessage(a.body)) {
        noReply.add(a.id);
        continue;
      }

      // Track reply time (ms since received)
      times[a.id] = Date.now() - new Date(a.occurred_at).getTime();
    }

    const allExcluded = new Set([...responded, ...noReply]);
    return { smartNR: allExcluded, replyTimes: times };
  }, [baseActivities]);

  const isSmartNR = (a: CommActivity) => a.needs_response && !a.responded_at && a.direction === "inbound" && !smartNR.has(a.id);

  // Client-side urgent detection (supplements DB is_urgent field)
  const URGENT_PATTERNS = [
    /call me|call me back|please call|can you call/i,
    /right now|asap|urgent|emergency|immediately/i,
    /appointment today|visit today|come by today/i,
    /need help now|need to talk|need a response/i,
    /contract.*deadline|offer.*expir|expires today/i,
  ];
  const isUrgent = (a: CommActivity) => {
    if (a.is_urgent) return true;
    if (a.direction !== "inbound") return false;
    const text = ((a.subject ?? "") + " " + (a.body ?? "")).slice(0, 300);
    return URGENT_PATTERNS.some(p => p.test(text));
  };

  // Counts: red badges show NR count per channel, not total count
  const counts = useMemo(() => {
    const nrItems = baseActivities.filter(a => isSmartNR(a));
    return {
      urgent: baseActivities.filter(a => isUrgent(a)).length,
      needs_response: nrItems.length,
      call: nrItems.filter(a => a.channel === "phone" || a.channel === "call").length,
      text: nrItems.filter(a => a.channel === "sms" || a.channel === "text").length,
      email: nrItems.filter(a => a.channel === "email").length,
      meeting: 0, // meetings don't need replies
    };
  }, [baseActivities]);

  const urgentCount = counts.urgent;

  const filteredActivities = useMemo(() => {
    let items = baseActivities;

    // Tab filter
    if (activeTab === "urgent") items = items.filter(a => isUrgent(a));
    else if (activeTab === "needs_response") items = items.filter(a => isSmartNR(a));
    else if (activeTab === "call") items = items.filter(a => a.channel === "phone" || a.channel === "call");
    else if (activeTab === "text") items = items.filter(a => a.channel === "sms" || a.channel === "text");
    else if (activeTab === "email") items = items.filter(a => a.channel === "email");
    else if (activeTab === "meeting") items = items.filter(a => a.channel === "meeting");

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
  }, [baseActivities, activeTab, searchQuery]);

  // ── Actions ──
  async function handleMarkRead(activityId: string) {
    await markRead(activityId, { triggered_by: "human" });

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
    // Mark original as responded via direct update (response tracking)
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

  // No empty state — always show (ALL when no scope)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0, maxWidth: "100%" }}>
      {/* ── Header + Search (unified with Queue) ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>Comm Hub</span>
            {urgentCount > 0 && (
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                backgroundColor: "#7f1d1d", color: "#fca5a5",
              }}>{urgentCount} urgent</span>
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search comms..."
            style={{
              backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: 6,
              padding: "5px 10px", fontSize: 11, color: "#a1a1aa", outline: "none",
              width: 180,
            }}
          />
        </div>
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
              {t.icon && t.icon.startsWith("/") && <img src={t.icon} alt={t.label} title={t.label} width={14} height={14} style={{ verticalAlign: "middle" }} />}
              {/* Show label only for non-icon tabs (Needs Response) */}
              {!t.iconOnly && !isMobile && <span>{t.label}</span>}
              <span style={{
                fontSize: isMobile ? 9 : 10, padding: "0 5px", borderRadius: 3, fontWeight: 600,
                backgroundColor: count > 0 ? "#7f1d1d" : "#27272a",
                color: count > 0 ? "#fca5a5" : "#71717a",
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
              waitTimeMs={replyTimes[a.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
