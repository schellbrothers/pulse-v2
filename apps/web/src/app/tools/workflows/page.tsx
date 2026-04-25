"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WNode {
  id: string;
  label: string;
  type: "trigger" | "process" | "store" | "ai" | "output" | "cron" | "webhook" | "mcp";
  icon: string;
  desc: string;
  x: number;
  y: number;
  cron?: string;
  script?: string;
  table?: string;
  mcp?: string;
}

interface WEdge {
  from: string;
  to: string;
  label?: string;
}

interface Workflow {
  id: string;
  name: string;
  desc: string;
  nodes: WNode[];
  edges: WEdge[];
}

// ─── Node Styles ────────────────────────────────────────────────────────────

const STYLES: Record<string, { bg: string; border: string; text: string; icon_bg: string }> = {
  trigger:  { bg: "#0f1d3d", border: "#1e40af", text: "#60a5fa", icon_bg: "#1e3a5f" },
  process:  { bg: "#1a1a1e", border: "#3f3f46", text: "#d4d4d8", icon_bg: "#27272a" },
  store:    { bg: "#052e16", border: "#166534", text: "#4ade80", icon_bg: "#14532d" },
  ai:       { bg: "#1e0a3e", border: "#7c3aed", text: "#a78bfa", icon_bg: "#3b0764" },
  output:   { bg: "#271207", border: "#92400e", text: "#fbbf24", icon_bg: "#422006" },
  cron:     { bg: "#082f49", border: "#0369a1", text: "#38bdf8", icon_bg: "#0c4a6e" },
  webhook:  { bg: "#2d0a1a", border: "#9f1239", text: "#f9a8d4", icon_bg: "#500724" },
  mcp:      { bg: "#042f2e", border: "#0d9488", text: "#5eead4", icon_bg: "#134e4a" },
};

const NODE_W = 160;
const NODE_H = 56;
const PORT_R = 5;

// ─── Workflows ──────────────────────────────────────────────────────────────

const WORKFLOWS: Workflow[] = [
  {
    id: "zoom-meetings",
    name: "Zoom Meetings → Activity + Recording + Transcript",
    desc: "End-to-end pipeline from Zoom meeting completion to searchable transcripts",
    nodes: [
      { id: "cron", label: "Cron: 3× Daily", type: "cron", icon: "⏱", desc: "6:10 AM, 12:10 PM, 6:10 PM ET", x: 40, y: 30, cron: "10 6,12,18 * * *", script: "hbx-sync-zoom-meetings.py" },
      { id: "zoom", label: "Zoom Recordings API", type: "trigger", icon: "📹", desc: "GET /accounts/me/recordings", x: 40, y: 150 },
      { id: "parse", label: "Parse Files", type: "process", icon: "📂", desc: "Extract MP4, M4A, VTT from recording_files", x: 280, y: 150 },
      { id: "match", label: "Match Contacts", type: "process", icon: "👤", desc: "Participant email → contacts table → opportunity", x: 500, y: 80 },
      { id: "dl-tx", label: "Download Transcript", type: "process", icon: "📝", desc: "Download VTT transcript from Zoom", x: 500, y: 230 },
      { id: "acts", label: "activities", type: "store", icon: "💾", desc: "channel=meeting, recording_url, duration, transcript_id", x: 720, y: 80, table: "activities" },
      { id: "txs", label: "transcripts", type: "store", icon: "💾", desc: "raw_text, activity_id, source=zoom_meeting", x: 720, y: 230, table: "transcripts" },
      { id: "link", label: "Link transcript → activity", type: "process", icon: "🔗", desc: "UPDATE activities SET transcript_id", x: 940, y: 155 },
      { id: "cron2", label: "Cron: Every 30m", type: "cron", icon: "⏱", desc: "Whisper backfill for missing transcripts", x: 500, y: 370, cron: "*/30 7-20 * * *", script: "hbx-transcribe-calls.py" },
      { id: "whisper", label: "Whisper AI", type: "ai", icon: "🧠", desc: "OpenAI Whisper transcribes audio for calls without Zoom transcript", x: 720, y: 370 },
      { id: "spark", label: "DGX Spark Extract", type: "ai", icon: "✦", desc: "Extract preferences, objections, next steps from transcript", x: 1160, y: 80, mcp: "extract_intelligence" },
      { id: "panel", label: "Opportunity Panel", type: "output", icon: "📊", desc: "Play recording, view transcript, AI summary", x: 1160, y: 230 },
      { id: "hub", label: "Comm Hub", type: "output", icon: "💬", desc: "Meeting tab with compact row", x: 1160, y: 370 },
    ],
    edges: [
      { from: "cron", to: "zoom", label: "triggers" },
      { from: "zoom", to: "parse", label: "recordings" },
      { from: "parse", to: "match", label: "participants" },
      { from: "parse", to: "dl-tx", label: "VTT file" },
      { from: "match", to: "acts", label: "contact_id" },
      { from: "dl-tx", to: "txs", label: "raw_text" },
      { from: "acts", to: "link" },
      { from: "txs", to: "link" },
      { from: "cron2", to: "whisper", label: "no transcript?" },
      { from: "whisper", to: "txs", label: "raw_text" },
      { from: "link", to: "spark" },
      { from: "link", to: "panel" },
      { from: "link", to: "hub" },
    ],
  },
  {
    id: "outlook",
    name: "Outlook Emails → Activity + AI Reply",
    desc: "Email sync with contact matching, NR/Urgent classification, and AI-generated replies",
    nodes: [
      { id: "cron", label: "Cron: Every 15m", type: "cron", icon: "⏱", desc: "7am-8pm ET", x: 40, y: 30, cron: "*/15 7-20 * * *", script: "hbx-sync-outlook-emails.py" },
      { id: "graph", label: "Microsoft Graph API", type: "trigger", icon: "📧", desc: "GET /users/grace@.../messages (inbox + sent)", x: 40, y: 150 },
      { id: "preload", label: "Preload Contacts", type: "process", icon: "📋", desc: "395 email→contact mappings in memory", x: 280, y: 150 },
      { id: "match", label: "Match Email → Contact", type: "process", icon: "👤", desc: "Sender/recipient → contact_id + opportunity", x: 500, y: 80 },
      { id: "classify", label: "NR / Urgent", type: "ai", icon: "🏷", desc: "Pattern match: thanks=no-reply, call me=urgent", x: 500, y: 230 },
      { id: "acts", label: "activities", type: "store", icon: "💾", desc: "channel=email, needs_response, is_urgent, division_id", x: 720, y: 150, table: "activities" },
      { id: "mcp", label: "MCP Tools", type: "mcp", icon: "🔧", desc: "get_community_details, get_floor_plans, get_divisions", x: 720, y: 310, mcp: "get_community_details" },
      { id: "spark", label: "DGX Spark Reply", type: "ai", icon: "✦", desc: "Full context + MCP data → personalized reply", x: 940, y: 310 },
      { id: "store", label: "Store ai_reply", type: "process", icon: "💾", desc: "metadata.ai_reply + metadata.ai_reply_generated_at", x: 940, y: 150 },
      { id: "hub", label: "Comm Hub NR", type: "output", icon: "💬", desc: "NR tab with AI reply in green box", x: 1160, y: 80 },
      { id: "panel", label: "Opportunity Panel", type: "output", icon: "📊", desc: "Email in activity timeline", x: 1160, y: 230 },
    ],
    edges: [
      { from: "cron", to: "graph", label: "triggers" },
      { from: "graph", to: "preload", label: "843 emails" },
      { from: "preload", to: "match", label: "86 matched" },
      { from: "preload", to: "classify" },
      { from: "match", to: "acts", label: "contact + opp" },
      { from: "classify", to: "acts", label: "NR/Urgent" },
      { from: "acts", to: "spark", label: "NR inbound" },
      { from: "mcp", to: "spark", label: "real data" },
      { from: "spark", to: "store", label: "ai_reply" },
      { from: "store", to: "acts", label: "metadata update" },
      { from: "acts", to: "hub" },
      { from: "acts", to: "panel" },
    ],
  },
  {
    id: "webform",
    name: "Web Form → Queue → Pipeline",
    desc: "Webform submission to OSC Queue with AI recommendation",
    nodes: [
      { id: "cron", label: "Cron: Every 5m", type: "cron", icon: "⏱", desc: "Vercel API + Python backup", x: 40, y: 30, script: "/api/sync/webforms" },
      { id: "hb", label: "Heartbeat API", type: "trigger", icon: "🌐", desc: "pulse2-lead-forms endpoint", x: 40, y: 150 },
      { id: "utm", label: "Parse UTM + Ads", type: "process", icon: "📊", desc: "gclid, utm_source, utm_campaign from URL", x: 280, y: 80 },
      { id: "contact", label: "Find/Create Contact", type: "process", icon: "👤", desc: "Match email/phone or create new", x: 280, y: 230 },
      { id: "contacts", label: "contacts", type: "store", icon: "💾", desc: "first_name, last_name, email, phone, source", x: 500, y: 230, table: "contacts" },
      { id: "opps", label: "opportunities (queue)", type: "store", icon: "💾", desc: "crm_stage=queue, division_id, community_id", x: 500, y: 80, table: "opportunities" },
      { id: "acts", label: "activities (webform)", type: "store", icon: "💾", desc: "channel=webform, UTM metadata", x: 500, y: 370, table: "activities" },
      { id: "rec", label: "AI Recommendation", type: "ai", icon: "✦", desc: "Form type + ad data → Lead:Div, Lead:Com, CSM Queue", x: 720, y: 80 },
      { id: "sg", label: "SendGrid Email", type: "output", icon: "📧", desc: "Branded auto-confirmation on approval", x: 720, y: 370 },
      { id: "queue", label: "OSC Queue", type: "output", icon: "📋", desc: "Card with details, attribution, approve/override", x: 940, y: 150 },
    ],
    edges: [
      { from: "cron", to: "hb", label: "triggers" },
      { from: "hb", to: "utm" },
      { from: "hb", to: "contact" },
      { from: "contact", to: "contacts" },
      { from: "contacts", to: "opps", label: "contact_id" },
      { from: "utm", to: "acts", label: "UTM data" },
      { from: "opps", to: "rec" },
      { from: "acts", to: "sg", label: "on approval" },
      { from: "rec", to: "queue" },
      { from: "opps", to: "queue" },
    ],
  },
  {
    id: "sms",
    name: "SMS Webhook → Activity + NR/Urgent",
    desc: "Real-time Zoom SMS events with contact matching and AI classification",
    nodes: [
      { id: "hook", label: "Zoom Webhook", type: "webhook", icon: "⚡", desc: "phone.sms_received / phone.sms_sent events", x: 40, y: 150 },
      { id: "phone", label: "Extract Phone #", type: "process", icon: "📱", desc: "Try from.phone_number, from_number, sender.phone_number", x: 280, y: 150 },
      { id: "match", label: "Match → Contact", type: "process", icon: "👤", desc: "contacts.phone, phone_secondary, contact_members.phone", x: 500, y: 80 },
      { id: "class", label: "NR / Urgent", type: "ai", icon: "🏷", desc: "thanks=no-reply, call me=urgent", x: 500, y: 230 },
      { id: "acts", label: "activities", type: "store", icon: "💾", desc: "channel=sms, from/to, contact_id, division_id, NR, urgent", x: 720, y: 150, table: "activities" },
      { id: "hub", label: "Comm Hub Text", type: "output", icon: "💬", desc: "Text tab + NR tab if needs response", x: 940, y: 150 },
    ],
    edges: [
      { from: "hook", to: "phone", label: "payload" },
      { from: "phone", to: "match", label: "ext number" },
      { from: "phone", to: "class", label: "body" },
      { from: "match", to: "acts", label: "contact_id" },
      { from: "class", to: "acts", label: "NR/Urgent" },
      { from: "acts", to: "hub" },
    ],
  },
  {
    id: "staff",
    name: "Staff Assignments Sync",
    desc: "Daily CSM + OSC assignments from Heartbeat → user table",
    nodes: [
      { id: "cron", label: "Cron: Daily 5 AM", type: "cron", icon: "⏱", desc: "Full refresh", x: 40, y: 120, cron: "0 5 * * *", script: "hbx-sync-staff-assignments.py" },
      { id: "csms", label: "HB source=csms", type: "trigger", icon: "🏠", desc: "Per community: CSMs with phone + employee_id", x: 280, y: 60 },
      { id: "osc", label: "HB source=osc", type: "trigger", icon: "🏠", desc: "Per division: OSC with phone", x: 280, y: 200 },
      { id: "match", label: "Match by Phone", type: "process", icon: "📱", desc: "HB virtual_phone → users.zoom_phone_number", x: 540, y: 120 },
      { id: "users", label: "users", type: "store", icon: "💾", desc: "52 users: zoom_id, phone, email, role, division", x: 760, y: 60, table: "users" },
      { id: "assign", label: "assignments", type: "store", icon: "💾", desc: "73 CSM↔community mappings", x: 760, y: 200, table: "user_community_assignments" },
    ],
    edges: [
      { from: "cron", to: "csms", label: "per community" },
      { from: "cron", to: "osc", label: "per division" },
      { from: "csms", to: "match", label: "phone" },
      { from: "osc", to: "match", label: "phone" },
      { from: "match", to: "users", label: "role update" },
      { from: "match", to: "assign", label: "CSM links" },
    ],
  },
];

// ─── Bezier path between two nodes ──────────────────────────────────────────

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [selWf, setSelWf] = useState(WORKFLOWS[0].id);
  const [selNode, setSelNode] = useState<WNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const wf = WORKFLOWS.find(w => w.id === selWf) || WORKFLOWS[0];
  const maxX = Math.max(...wf.nodes.map(n => n.x)) + NODE_W + 60;
  const maxY = Math.max(...wf.nodes.map(n => n.y)) + NODE_H + 60;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0a0a0f", color: "#fafafa" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #1a1a22", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Workflows</span>
        <div style={{ display: "flex", gap: 2, backgroundColor: "#111116", borderRadius: 8, padding: 2 }}>
          {WORKFLOWS.map(w => (
            <button
              key={w.id}
              onClick={() => { setSelWf(w.id); setSelNode(null); }}
              style={{
                padding: "6px 14px", fontSize: 11, borderRadius: 6, cursor: "pointer",
                border: "none",
                backgroundColor: selWf === w.id ? "#1e1e28" : "transparent",
                color: selWf === w.id ? "#fafafa" : "#52525b",
                fontWeight: selWf === w.id ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {w.name.split("→")[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Title bar */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid #111116" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{wf.name}</div>
        <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{wf.desc}</div>
      </div>

      {/* Canvas + Panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* SVG Canvas */}
        <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
          {/* Grid background */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.03,
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
          <svg ref={svgRef} viewBox={`-20 -20 ${maxX + 40} ${maxY + 40}`} style={{ width: "100%", height: "100%", minHeight: 500 }}>
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="10" markerHeight="7" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3f3f46" />
              </marker>
            </defs>

            {/* Edges — smooth bezier curves */}
            {wf.edges.map((e, i) => {
              const fn = wf.nodes.find(n => n.id === e.from);
              const tn = wf.nodes.find(n => n.id === e.to);
              if (!fn || !tn) return null;

              // Output port (right center of from node)
              const x1 = fn.x + NODE_W;
              const y1 = fn.y + NODE_H / 2;
              // Input port (left center of to node)
              const x2 = tn.x;
              const y2 = tn.y + NODE_H / 2;

              const path = bezierPath(x1, y1, x2, y2);
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={i}>
                  <path d={path} fill="none" stroke="#2a2a35" strokeWidth={2} markerEnd="url(#arrowhead)" />
                  {/* Output port dot */}
                  <circle cx={x1} cy={y1} r={PORT_R} fill="#2a2a35" stroke="#3f3f46" strokeWidth={1} />
                  {/* Input port dot */}
                  <circle cx={x2} cy={y2} r={PORT_R} fill="#2a2a35" stroke="#3f3f46" strokeWidth={1} />
                  {/* Edge label */}
                  {e.label && (
                    <g>
                      <rect x={midX - e.label.length * 3.2} y={midY - 9} width={e.label.length * 6.4} height={14} rx={4} fill="#111116" stroke="#1e1e28" strokeWidth={0.5} />
                      <text x={midX} y={midY + 1} textAnchor="middle" fontSize={8} fill="#52525b" fontFamily="system-ui">{e.label}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {wf.nodes.map(node => {
              const s = STYLES[node.type] || STYLES.process;
              const isSel = selNode?.id === node.id;
              return (
                <g key={node.id} onClick={() => setSelNode(node)} style={{ cursor: "pointer" }}>
                  {/* Node body */}
                  <rect
                    x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={12}
                    fill={s.bg}
                    stroke={isSel ? "#fafafa" : s.border}
                    strokeWidth={isSel ? 2 : 1}
                    filter={isSel ? "" : ""}
                  />
                  {/* Icon circle */}
                  <circle cx={node.x + 24} cy={node.y + NODE_H / 2} r={14} fill={s.icon_bg} stroke={s.border} strokeWidth={0.5} />
                  <text x={node.x + 24} y={node.y + NODE_H / 2 + 4} textAnchor="middle" fontSize={12}>{node.icon}</text>
                  {/* Label */}
                  <text x={node.x + 50} y={node.y + NODE_H / 2 + 4} fontSize={10} fontWeight={600} fill={s.text} fontFamily="system-ui">
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        <div style={{ width: 280, borderLeft: "1px solid #1a1a22", padding: 16, overflow: "auto", backgroundColor: "#0d0d12" }}>
          {selNode ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{selNode.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selNode.label}</div>
                  <span style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 4,
                    backgroundColor: STYLES[selNode.type]?.bg, color: STYLES[selNode.type]?.text,
                    border: `1px solid ${STYLES[selNode.type]?.border}`,
                    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{selNode.type}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 16 }}>{selNode.desc}</div>

              {selNode.cron && (
                <div style={{ padding: "8px 12px", backgroundColor: "#111116", borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", marginBottom: 2 }}>Cron Schedule</div>
                  <div style={{ fontSize: 12, color: "#38bdf8", fontFamily: "monospace" }}>{selNode.cron}</div>
                </div>
              )}
              {selNode.script && (
                <div style={{ padding: "8px 12px", backgroundColor: "#111116", borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", marginBottom: 2 }}>Script</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>{selNode.script}</div>
                </div>
              )}
              {selNode.table && (
                <div style={{ padding: "8px 12px", backgroundColor: "#111116", borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", marginBottom: 2 }}>Supabase Table</div>
                  <div style={{ fontSize: 12, color: "#4ade80", fontFamily: "monospace" }}>{selNode.table}</div>
                </div>
              )}
              {selNode.mcp && (
                <div style={{ padding: "8px 12px", backgroundColor: "#111116", borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", marginBottom: 2 }}>MCP Tool</div>
                  <div style={{ fontSize: 11, color: "#5eead4", fontFamily: "monospace" }}>{selNode.mcp}</div>
                </div>
              )}

              {/* Legend */}
              <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #1a1a22" }}>
                <div style={{ fontSize: 9, color: "#3f3f46", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Node Types</div>
                {Object.entries(STYLES).map(([type, s]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: s.bg, border: `1px solid ${s.border}` }} />
                    <span style={{ fontSize: 10, color: s.text, textTransform: "uppercase", fontWeight: 500 }}>{type}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: "#3f3f46", fontSize: 12, textAlign: "center", paddingTop: 40 }}>
              Click a node to inspect
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
