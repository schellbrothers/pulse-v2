"use client";

import { useState } from "react";

// ─── Workflow Definitions ──────────────────────────────────────────────────────

interface WorkflowNode {
  id: string;
  label: string;
  type: "trigger" | "process" | "store" | "ai" | "output" | "cron" | "webhook" | "mcp";
  description: string;
  x: number;
  y: number;
  status?: "active" | "error" | "pending";
  cron?: string;
  script?: string;
  table?: string;
  mcp_tool?: string;
}

interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const WORKFLOWS: Workflow[] = [
  {
    id: "zoom-meetings",
    name: "Zoom Meetings → Activity + Recording + Transcript",
    description: "End-to-end pipeline from Zoom meeting completion to searchable transcripts in Pv2",
    nodes: [
      { id: "zoom-api", label: "Zoom Cloud\nRecordings API", type: "trigger", description: "GET /accounts/me/recordings — fetches all cloud recordings since last sync", x: 80, y: 160, status: "active" },
      { id: "cron-meetings", label: "Cron: 3× Daily", type: "cron", description: "Runs at 6:10 AM, 12:10 PM, 6:10 PM ET", x: 80, y: 60, cron: "10 6,12,18 * * *", script: "hbx-sync-zoom-meetings.py", status: "active" },
      { id: "parse-files", label: "Parse Recording\nFiles", type: "process", description: "Extract MP4 (video), M4A (audio), VTT (transcript) from recording_files array", x: 280, y: 160 },
      { id: "match-contact", label: "Match Participants\n→ Contacts", type: "process", description: "Match participant emails to contacts table. Links to opportunity.", x: 480, y: 100 },
      { id: "download-transcript", label: "Download Zoom\nTranscript", type: "process", description: "If Zoom provides VTT transcript, download and parse to text", x: 480, y: 220 },
      { id: "activities-table", label: "activities", type: "store", description: "channel=meeting, recording_url, duration, subject, contact_id, opportunity_id", x: 700, y: 100, table: "activities" },
      { id: "transcripts-table", label: "transcripts", type: "store", description: "raw_text, activity_id, source=zoom_meeting, duration_seconds", x: 700, y: 220, table: "transcripts" },
      { id: "cron-transcribe", label: "Cron: Every 30m", type: "cron", description: "Runs every 30 min 7am-8pm. Backfills missing transcripts.", x: 700, y: 340, cron: "*/30 7-20 * * *", script: "hbx-transcribe-calls.py", status: "active" },
      { id: "whisper", label: "OpenAI Whisper\nBackfill", type: "ai", description: "For recordings WITHOUT Zoom transcript: download audio → Whisper API → transcript", x: 900, y: 340 },
      { id: "link-transcript", label: "Link transcript_id\nto activity", type: "process", description: "UPDATE activities SET transcript_id = X WHERE id = Y", x: 900, y: 220 },
      { id: "opp-panel", label: "OpportunityPanel\nActivity Tab", type: "output", description: "Shows meeting with Play button, transcript viewer, copy button", x: 1100, y: 100 },
      { id: "comm-hub", label: "Comm Hub\nMeeting Tab", type: "output", description: "Compact row in meeting tab with duration and timestamp", x: 1100, y: 220 },
      { id: "ai-extract", label: "DGX Spark\nIntelligence Extract", type: "ai", description: "Extract buyer preferences, objections, next steps from transcript", x: 900, y: 100, mcp_tool: "extract_intelligence" },
    ],
    edges: [
      { from: "cron-meetings", to: "zoom-api", label: "triggers" },
      { from: "zoom-api", to: "parse-files", label: "recordings[]" },
      { from: "parse-files", to: "match-contact", label: "participants" },
      { from: "parse-files", to: "download-transcript", label: "VTT file" },
      { from: "match-contact", to: "activities-table", label: "contact_id" },
      { from: "download-transcript", to: "transcripts-table", label: "raw_text" },
      { from: "activities-table", to: "link-transcript" },
      { from: "transcripts-table", to: "link-transcript" },
      { from: "cron-transcribe", to: "whisper", label: "no transcript?" },
      { from: "whisper", to: "transcripts-table", label: "raw_text" },
      { from: "whisper", to: "link-transcript" },
      { from: "activities-table", to: "opp-panel" },
      { from: "transcripts-table", to: "opp-panel" },
      { from: "activities-table", to: "comm-hub" },
      { from: "transcripts-table", to: "ai-extract", label: "raw_text" },
      { from: "ai-extract", to: "activities-table", label: "metadata" },
    ],
  },
  {
    id: "outlook-emails",
    name: "Outlook Emails → Activity + AI Reply",
    description: "Grace's email sync with contact matching, NR/Urgent classification, and AI-generated replies",
    nodes: [
      { id: "graph-api", label: "Microsoft Graph\nAPI", type: "trigger", description: "GET /users/grace@.../mailFolders/inbox/messages + sentitems", x: 80, y: 160, status: "active" },
      { id: "cron-email", label: "Cron: Every 15m", type: "cron", description: "Runs every 15 min 7am-8pm ET", x: 80, y: 60, cron: "*/15 7-20 * * *", script: "hbx-sync-outlook-emails.py", status: "active" },
      { id: "match-email", label: "Match Sender/To\n→ Contacts", type: "process", description: "Pre-loaded email→contact map. Links to opportunity + division.", x: 300, y: 160 },
      { id: "classify", label: "NR / Urgent\nClassification", type: "ai", description: "Pattern matching: thanks=no-reply, call me back=urgent", x: 500, y: 100 },
      { id: "activities", label: "activities", type: "store", description: "channel=email, direction, subject, body, needs_response, is_urgent", x: 700, y: 160, table: "activities" },
      { id: "spark-reply", label: "DGX Spark\nAI Reply", type: "ai", description: "Generates personalized reply using full conversation + MCP data", x: 700, y: 280 },
      { id: "mcp-data", label: "MCP Tools", type: "mcp", description: "get_community_details, get_floor_plans, get_divisions — same as Schellie", x: 500, y: 280, mcp_tool: "get_community_details" },
      { id: "store-reply", label: "Store ai_reply\nin metadata", type: "process", description: "metadata.ai_reply = generated response, metadata.ai_reply_generated_at", x: 900, y: 280 },
      { id: "comm-hub-nr", label: "Comm Hub\nNeeds Response", type: "output", description: "Shows in NR tab with wait time countdown and AI suggested reply", x: 900, y: 100 },
      { id: "opp-panel-2", label: "OpportunityPanel\nActivity Tab", type: "output", description: "Email in activity timeline with full body", x: 900, y: 160 },
    ],
    edges: [
      { from: "cron-email", to: "graph-api", label: "triggers" },
      { from: "graph-api", to: "match-email", label: "messages[]" },
      { from: "match-email", to: "classify", label: "inbound" },
      { from: "match-email", to: "activities", label: "all" },
      { from: "classify", to: "activities", label: "NR/Urgent flags" },
      { from: "activities", to: "spark-reply", label: "NR inbound" },
      { from: "mcp-data", to: "spark-reply", label: "real data" },
      { from: "spark-reply", to: "store-reply" },
      { from: "store-reply", to: "activities", label: "metadata update" },
      { from: "activities", to: "comm-hub-nr" },
      { from: "activities", to: "opp-panel-2" },
    ],
  },
  {
    id: "webform-pipeline",
    name: "Web Form → Queue → Pipeline",
    description: "Webform submission to OSC Queue with AI recommendation and auto-confirmation emails",
    nodes: [
      { id: "hb-api", label: "Heartbeat API\npulse2-lead-forms", type: "trigger", description: "Fetches new web form submissions from SchellBrothers.com", x: 80, y: 160, status: "active" },
      { id: "cron-wf", label: "Cron: Every 5m", type: "cron", description: "Vercel API route + Python backup sync", x: 80, y: 60, script: "/api/sync/webforms", status: "active" },
      { id: "parse-utm", label: "Parse UTM +\nAd Attribution", type: "process", description: "Extract gclid, utm_source, utm_campaign from landing page URL", x: 280, y: 100 },
      { id: "match-create", label: "Find/Create\nContact", type: "process", description: "Match by email/phone. Create new contact if not found.", x: 280, y: 220 },
      { id: "contacts", label: "contacts", type: "store", description: "first_name, last_name, email, phone, source", x: 480, y: 220, table: "contacts" },
      { id: "opportunities", label: "opportunities\n(queue)", type: "store", description: "crm_stage=queue, opportunity_source, division_id, community_id", x: 480, y: 100, table: "opportunities" },
      { id: "activities-wf", label: "activities\n(webform)", type: "store", description: "channel=webform, UTM metadata, form_type_code", x: 480, y: 340, table: "activities" },
      { id: "ai-rec", label: "AI Pipeline\nRecommendation", type: "ai", description: "Analyze form type + ad data → recommend Lead:Div, Lead:Com, or CSM Queue", x: 700, y: 100 },
      { id: "sendgrid", label: "SendGrid\nAuto-Confirm", type: "output", description: "Branded confirmation email via noreply@schellbrothers.com", x: 700, y: 340 },
      { id: "osc-queue", label: "OSC Queue\nCommand Center", type: "output", description: "Card with form details, ad attribution, AI recommendation, approve/override", x: 900, y: 160 },
    ],
    edges: [
      { from: "cron-wf", to: "hb-api", label: "triggers" },
      { from: "hb-api", to: "parse-utm", label: "form data" },
      { from: "hb-api", to: "match-create", label: "name/email/phone" },
      { from: "parse-utm", to: "activities-wf", label: "UTM metadata" },
      { from: "match-create", to: "contacts" },
      { from: "contacts", to: "opportunities", label: "contact_id" },
      { from: "opportunities", to: "ai-rec" },
      { from: "activities-wf", to: "sendgrid", label: "on approval" },
      { from: "ai-rec", to: "osc-queue" },
      { from: "opportunities", to: "osc-queue" },
    ],
  },
  {
    id: "sms-webhook",
    name: "SMS Webhook → Activity + NR/Urgent",
    description: "Real-time Zoom SMS events via webhook with contact matching and AI classification",
    nodes: [
      { id: "zoom-event", label: "Zoom Webhook\nphone.sms_received", type: "webhook", description: "Real-time event from Zoom when SMS sent/received", x: 80, y: 160, status: "active" },
      { id: "extract-phone", label: "Extract Phone\nNumbers", type: "process", description: "Try from.phone_number, from_number, caller_number, sender.phone_number", x: 300, y: 160 },
      { id: "match-phone", label: "Match Phone\n→ Contact", type: "process", description: "Lookup in contacts.phone, contacts.phone_secondary, contact_members.phone", x: 500, y: 100 },
      { id: "classify-sms", label: "NR / Urgent\nClassification", type: "ai", description: "thanks=no-reply, call me back=urgent, question=needs response", x: 500, y: 220 },
      { id: "activities-sms", label: "activities", type: "store", description: "channel=sms, from_number, to_number, contact_id, division_id, needs_response, is_urgent", x: 700, y: 160, table: "activities" },
      { id: "comm-hub-sms", label: "Comm Hub\nText Tab", type: "output", description: "Shows in text tab and NR tab if needs response", x: 900, y: 160 },
    ],
    edges: [
      { from: "zoom-event", to: "extract-phone", label: "payload" },
      { from: "extract-phone", to: "match-phone", label: "external number" },
      { from: "extract-phone", to: "classify-sms", label: "message body" },
      { from: "match-phone", to: "activities-sms", label: "contact_id" },
      { from: "classify-sms", to: "activities-sms", label: "NR/Urgent" },
      { from: "activities-sms", to: "comm-hub-sms" },
    ],
  },
  {
    id: "staff-sync",
    name: "Staff Assignments Sync",
    description: "Daily sync of CSM and OSC assignments from Heartbeat to Pv2 user table",
    nodes: [
      { id: "cron-staff", label: "Cron: Daily 5 AM", type: "cron", description: "Full refresh of CSM + OSC assignments", x: 80, y: 120, cron: "0 5 * * *", script: "hbx-sync-staff-assignments.py", status: "active" },
      { id: "hb-csms", label: "Heartbeat API\nsource=csms", type: "trigger", description: "Per community: GET CSMs with phone + employee_id", x: 300, y: 80 },
      { id: "hb-osc", label: "Heartbeat API\nsource=osc", type: "trigger", description: "Per division: GET OSC with phone", x: 300, y: 180 },
      { id: "match-phone-staff", label: "Match by Phone\n→ Zoom Users", type: "process", description: "HB virtual_phone → users.zoom_phone_number (10-digit match)", x: 540, y: 120 },
      { id: "users-table", label: "users", type: "store", description: "52 sales users: zoom_user_id, phone, email, role, division_id", x: 740, y: 80, table: "users" },
      { id: "assignments-table", label: "user_community\nassignments", type: "store", description: "73 CSM↔community mappings (many-to-many)", x: 740, y: 180, table: "user_community_assignments" },
    ],
    edges: [
      { from: "cron-staff", to: "hb-csms", label: "per community" },
      { from: "cron-staff", to: "hb-osc", label: "per division" },
      { from: "hb-csms", to: "match-phone-staff", label: "virtual_phone" },
      { from: "hb-osc", to: "match-phone-staff", label: "virtual_phone" },
      { from: "match-phone-staff", to: "users-table", label: "role update" },
      { from: "match-phone-staff", to: "assignments-table", label: "CSM assignments" },
    ],
  },
];

// ─── Node Colors ──────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: "#172554", border: "#1e40af", text: "#60a5fa" },
  process: { bg: "#18181b", border: "#3f3f46", text: "#a1a1aa" },
  store: { bg: "#052e16", border: "#166534", text: "#4ade80" },
  ai: { bg: "#2e1065", border: "#7c3aed", text: "#a78bfa" },
  output: { bg: "#422006", border: "#92400e", text: "#fbbf24" },
  cron: { bg: "#0c4a6e", border: "#0369a1", text: "#38bdf8" },
  webhook: { bg: "#500724", border: "#9f1239", text: "#f9a8d4" },
  mcp: { bg: "#134e4a", border: "#0d9488", text: "#5eead4" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(WORKFLOWS[0].id);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  
  const workflow = WORKFLOWS.find(w => w.id === selectedWorkflow) || WORKFLOWS[0];
  
  // Calculate SVG viewBox
  const maxX = Math.max(...workflow.nodes.map(n => n.x)) + 200;
  const maxY = Math.max(...workflow.nodes.map(n => n.y)) + 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#09090b", color: "#fafafa" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Workflows</span>
        <div style={{ display: "flex", gap: 4 }}>
          {WORKFLOWS.map(w => (
            <button
              key={w.id}
              onClick={() => { setSelectedWorkflow(w.id); setSelectedNode(null); }}
              style={{
                padding: "6px 12px", fontSize: 11, borderRadius: 6, cursor: "pointer",
                border: selectedWorkflow === w.id ? "1px solid #3f3f46" : "1px solid transparent",
                backgroundColor: selectedWorkflow === w.id ? "#18181b" : "transparent",
                color: selectedWorkflow === w.id ? "#fafafa" : "#71717a",
                fontWeight: selectedWorkflow === w.id ? 600 : 400,
              }}
            >
              {w.name.split("→")[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Title */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fafafa" }}>{workflow.name}</div>
        <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>{workflow.description}</div>
      </div>

      {/* Canvas + Detail */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* SVG Canvas */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <svg viewBox={`0 0 ${maxX} ${maxY}`} style={{ width: "100%", height: "100%", minHeight: 400 }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3f3f46" />
              </marker>
            </defs>

            {/* Edges */}
            {workflow.edges.map((e, i) => {
              const fromNode = workflow.nodes.find(n => n.id === e.from);
              const toNode = workflow.nodes.find(n => n.id === e.to);
              if (!fromNode || !toNode) return null;
              const x1 = fromNode.x + 70;
              const y1 = fromNode.y + 20;
              const x2 = toNode.x + 70;
              const y2 = toNode.y + 20;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3f3f46" strokeWidth={1.5} markerEnd="url(#arrow)" />
                  {e.label && (
                    <text x={midX} y={midY - 6} textAnchor="middle" fontSize={8} fill="#52525b">{e.label}</text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {workflow.nodes.map(node => {
              const colors = NODE_COLORS[node.type] || NODE_COLORS.process;
              const isSelected = selectedNode?.id === node.id;
              return (
                <g key={node.id} onClick={() => setSelectedNode(node)} style={{ cursor: "pointer" }}>
                  <rect
                    x={node.x} y={node.y} width={140} height={44} rx={8}
                    fill={colors.bg} stroke={isSelected ? "#fafafa" : colors.border} strokeWidth={isSelected ? 2 : 1}
                  />
                  {node.label.split("\n").map((line, li) => (
                    <text key={li} x={node.x + 70} y={node.y + 18 + li * 14} textAnchor="middle" fontSize={10} fontWeight={600} fill={colors.text}>
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        <div style={{ width: 300, borderLeft: "1px solid #27272a", padding: 16, overflow: "auto" }}>
          {selectedNode ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>{selectedNode.label.replace("\n", " ")}</div>
              <div style={{
                fontSize: 9, padding: "2px 8px", borderRadius: 4, display: "inline-block", marginBottom: 12,
                backgroundColor: NODE_COLORS[selectedNode.type]?.bg || "#18181b",
                color: NODE_COLORS[selectedNode.type]?.text || "#a1a1aa",
                border: `1px solid ${NODE_COLORS[selectedNode.type]?.border || "#3f3f46"}`,
                fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {selectedNode.type}
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 16 }}>{selectedNode.description}</div>
              {selectedNode.cron && (
                <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>
                  <span style={{ color: "#71717a", fontWeight: 600 }}>Cron:</span> {selectedNode.cron}
                </div>
              )}
              {selectedNode.script && (
                <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>
                  <span style={{ color: "#71717a", fontWeight: 600 }}>Script:</span> {selectedNode.script}
                </div>
              )}
              {selectedNode.table && (
                <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>
                  <span style={{ color: "#71717a", fontWeight: 600 }}>Table:</span> {selectedNode.table}
                </div>
              )}
              {selectedNode.mcp_tool && (
                <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>
                  <span style={{ color: "#71717a", fontWeight: 600 }}>MCP Tool:</span> {selectedNode.mcp_tool}
                </div>
              )}

              {/* Legend */}
              <div style={{ marginTop: 24, borderTop: "1px solid #27272a", paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: "#52525b", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Node Types</div>
                {Object.entries(NODE_COLORS).map(([type, colors]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.bg, border: `1px solid ${colors.border}` }} />
                    <span style={{ fontSize: 10, color: colors.text, textTransform: "uppercase" }}>{type}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#52525b" }}>Click a node to see details</div>
          )}
        </div>
      </div>
    </div>
  );
}
