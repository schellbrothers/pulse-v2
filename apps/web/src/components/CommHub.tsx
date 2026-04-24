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
  excludeChannel?: string;      // filter out activities with this channel
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
      borderLeft: `4px solid ${actStyle.borderColor}`,
      backgroundColor: actStyle.bgColor,
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
          backgroundColor: "transparent",
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
          {/* Pv1-style icon + label */}
          <span style={{
            fontSize: 12, fontWeight: 600, color: "#ededed",
            display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {actStyle.icon.startsWith("/") ? (
              <img src={actStyle.icon} alt="" width={14} height={14} />
            ) : (
              <span>{actStyle.icon}</span>
            )}
            {actStyle.label}
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

        {/* Message preview — channel-specific rendering */}
        <div style={{
          fontSize: 13, color: "#a1a1aa", lineHeight: 1.5,
          padding: "6px 10px", backgroundColor: "#0f0f12", borderRadius: 4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}>
          {(activity.channel === "phone" || activity.channel === "call") ? (
            <>
              <span style={{ fontWeight: 500, color: "#60a5fa" }}>
                {getCallPreview(activity)}
              </span>
              {(() => {
                const parties = parseCommPhoneParties(activity);
                return parties.externalParty ? (
                  <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
                    {parties.externalParty}
                    {parties.employee && <span style={{ color: "#52525b", fontSize: 10 }}> via {parties.employee}</span>}
                  </div>
                ) : activity.from_number && activity.to_number ? (
                  <span style={{ color: "#52525b", fontSize: 11, marginLeft: 8 }}>
                    {activity.from_number} → {activity.to_number}
                  </span>
                ) : null;
              })()}
            </>
          ) : activity.channel === "sms" || activity.channel === "text" ? (
            <>
              <span style={{ fontWeight: 500, color: "#a78bfa" }}><img src="/icons/activity/text.svg" alt="" width={12} height={12} style={{ verticalAlign: "middle", marginRight: 3 }} /></span>
              {activity.body ?? "No message content"}
            </>
          ) : activity.channel === "meeting" ? (
            <>
              <span style={{ fontWeight: 500, color: "#f472b6" }}>Video </span>
              {getMeetingPreview(activity)}
            </>
          ) : (
            <>
              {activity.subject && <span style={{ fontWeight: 500, color: "#d4d4d8" }}>{activity.subject} — </span>}
              {activity.body ?? "No content"}
            </>
          )}
        </div>

        {/* Action buttons for phone/call activities */}
        {(activity.channel === "phone" || activity.channel === "call") && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {(() => {
              const recUrl = (transcriptData?.recording_url) || null;
              return recUrl ? (
                <button
                  onClick={e => { e.stopPropagation(); window.open(recUrl, "_blank"); }}
                  style={{
                    padding: "2px 8px", fontSize: 10, fontWeight: 500, borderRadius: 3,
                    cursor: "pointer", border: "1px solid #27272a", background: "#18181b", color: "#a1a1aa",
                  }}
                >▶ Play</button>
              ) : null;
            })()}
            {activity.transcript_id && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowTranscript(!showTranscript);
                  if (!showTranscript) loadTranscript();
                }}
                style={{
                  padding: "2px 8px", fontSize: 10, fontWeight: 500, borderRadius: 3,
                  cursor: "pointer", border: "1px solid #27272a", background: "#18181b",
                  color: showTranscript ? "#34d399" : "#a1a1aa",
                }}
              >Transcript</button>
            )}
            {transcriptData?.raw_text && (
              <button
                onClick={e => { e.stopPropagation(); copyTranscript(); }}
                style={{
                  padding: "2px 8px", fontSize: 10, fontWeight: 500, borderRadius: 3,
                  cursor: "pointer", border: "1px solid #27272a", background: "#18181b",
                  color: copied ? "#4ade80" : "#a1a1aa",
                }}
              >{copied ? "✓ Copied!" : "Copy"}</button>
            )}
            {!activity.transcript_id && (
              <span style={{ fontSize: 10, color: "#3f3f46" }}>No transcript</span>
            )}
          </div>
        )}

        {/* Transcript badge for non-phone channels */}
        {activity.transcript_id && activity.channel !== "phone" && activity.channel !== "call" && (
          <div style={{
            fontSize: 10, color: "#34d399", padding: "2px 8px",
            backgroundColor: "#064e3b", borderRadius: 3,
            display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content",
          }}>
            Transcript available
          </div>
        )}

        {/* AI suggestion preview (only when not expanded and needs response) */}
        {!isExpanded && needsResponse && (
          <div style={{
            fontSize: 11, color: "#f59e0b", lineHeight: 1.4,
            padding: "6px 10px", backgroundColor: "#1c1409", borderRadius: 4,
            border: "1px solid #422006",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            AI: {generateAiReply(activity).split("\n")[2] || "Click to view suggested reply..."}
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

    let query = supabase
      .from("activities")
      .select("id, contact_id, opportunity_id, channel, direction, subject, body, occurred_at, is_read, read_at, needs_response, responded_at, is_urgent, sentiment, duration_seconds, transcript_id, recording_url, metadata, type, from_number, to_number, contacts(first_name, last_name, email, phone)")
      .order("occurred_at", { ascending: false })
      .limit(200);

    // Scope filtering by division/community when set
    if (communityId) {
      query = query.eq("community_id", communityId);
    } else if (divisionId) {
      query = query.eq("division_id", divisionId);
    }
    // When no scope (ALL), load all activities with a contact_id

    const { data } = await query;

    const flat = (data ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      contacts: Array.isArray(a.contacts)
        ? (a.contacts as Record<string, unknown>[])[0] ?? null
        : a.contacts,
    })) as CommActivity[];

    setActivities(flat);
    setLoading(false);
  }, [communityId, divisionId]);

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
  }, [scopeId, fetchActivities, communityId, divisionId]);

  // ── Computed ──
  // Apply excludeChannel filter globally
  const baseActivities = useMemo(() => {
    if (!excludeChannel) return activities;
    return activities.filter(a => a.channel !== excludeChannel);
  }, [activities, excludeChannel]);

  const counts = useMemo(() => ({
    urgent: baseActivities.filter(a => a.is_urgent).length,
    needs_response: baseActivities.filter(a => a.needs_response && !a.responded_at).length,
    call: baseActivities.filter(a => a.channel === "phone" || a.channel === "call").length,
    text: baseActivities.filter(a => a.channel === "sms" || a.channel === "text").length,
    email: baseActivities.filter(a => a.channel === "email").length,
    meeting: baseActivities.filter(a => a.channel === "meeting").length,
  }), [baseActivities]);

  const urgentCount = counts.urgent;

  const filteredActivities = useMemo(() => {
    let items = baseActivities;

    // Tab filter
    if (activeTab === "urgent") items = items.filter(a => a.is_urgent);
    else if (activeTab === "needs_response") items = items.filter(a => a.needs_response && !a.responded_at);
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
            />
          ))
        )}
      </div>
    </div>
  );
}
