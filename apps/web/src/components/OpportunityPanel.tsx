"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getActivityStyle } from "@/lib/activity-styles";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpportunityPanelData {
  id: string;
  contact_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string | null;
  community_name: string | null;
  division_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  floor_plan_name: string | null;
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
}

interface OpportunityPanelProps {
  open: boolean;
  onClose: () => void;
  opportunity: OpportunityPanelData | null;
  initialTab?: "contact" | "history" | "activity" | "notes";
}

interface StageTransition {
  id: string;
  from_stage: string | null;
  to_stage: string | null;
  triggered_by: string | null;
  reason: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  duration_sec: number | null;
  duration_seconds: number | null;
  sentiment: string | null;
  is_read: boolean | null;
  needs_response: boolean | null;
  transcript_id: string | null;
  recording_url: string | null;
}

interface TranscriptData {
  raw_text: string | null;
  ai_summary: string | null;
  speaker_segments: unknown[] | null;
  recording_url: string | null;
}

interface ContactSecondary {
  email_secondary: string | null;
  phone_secondary: string | null;
}

interface ContactMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

// ─── Stage Badge ──────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lead_div:       { label: "DIVISION LEAD",   color: "#166534", bg: "#bbf7d0" },
  lead_com:       { label: "COMMUNITY LEAD",  color: "#1e40af", bg: "#bfdbfe" },
  queue:          { label: "OSC QUEUE",        color: "#92400e", bg: "#fde68a" },
  csm_queue:      { label: "CSM QUEUE",        color: "#7c2d12", bg: "#ffedd5" },
  prospect_c:     { label: "PROSPECT C",       color: "#9a3412", bg: "#fed7aa" },
  prospect_b:     { label: "PROSPECT B",       color: "#1e40af", bg: "#bfdbfe" },
  prospect_a:     { label: "PROSPECT A",       color: "#166534", bg: "#bbf7d0" },
  homeowner:      { label: "HOMEOWNER",        color: "#065f46", bg: "#a7f3d0" },
  archived:       { label: "ARCHIVED",         color: "#e4e4e7", bg: "#3f3f46" },
  deleted:        { label: "DELETED",          color: "#fecaca", bg: "#7f1d1d" },
  sold_not_started:   { label: "SOLD",             color: "#92400e", bg: "#fde68a" },
  under_construction: { label: "UNDER CONSTRUCTION", color: "#1e40af", bg: "#bfdbfe" },
  settled:            { label: "SETTLED",           color: "#065f46", bg: "#a7f3d0" },
};

function getStageConfig(stage: string): { label: string; color: string; bg: string } {
  return STAGE_CONFIG[stage] ?? { label: stage.toUpperCase().replace(/_/g, " "), color: "#a1a1aa", bg: "#27272a" };
}

export function StageBadge({ stage, context }: { stage: string; context?: string }) {
  const cfg = getStageConfig(stage);
  const label = context && (stage === "lead_div" || stage === "lead_com") ? `LEAD: ${context}` : cfg.label;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        background: cfg.bg,
        color: cfg.color,
        lineHeight: "16px",
      }}
    >
      {label}
    </span>
  );
}

// ─── Section / Row ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#777",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null | React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        minHeight: 20,
      }}
    >
      <span style={{ fontSize: 12, color: "#888", flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: value == null || value === "" || value === "—" ? "#333" : "#ededed", textAlign: "right", wordBreak: "break-word" }}>
        {value == null || value === "" ? "—" : value}
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min != null) return `$${(min / 1000).toFixed(0)}k+`;
  return `up to $${(max! / 1000).toFixed(0)}k`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDatePv1(iso: string): string {
  const d = new Date(iso);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
}

function formatNoteTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Build a timestamped note line and prepend to existing notes */
function buildNoteEntry(text: string, existingNotes: string | null): string {
  const now = new Date();
  const ts = now.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2") + " " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const entry = `[${ts}] ${text.trim()}`;
  if (existingNotes && existingNotes.trim()) {
    return entry + "\n" + existingNotes;
  }
  return entry;
}

/** Parse notes string into individual timestamped entries */
function parseNoteEntries(notes: string | null): Array<{ timestamp: string; text: string }> {
  if (!notes || !notes.trim()) return [];
  const lines = notes.split("\n").filter(l => l.trim());
  const entries: Array<{ timestamp: string; text: string }> = [];
  for (const line of lines) {
    const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      entries.push({ timestamp: match[1], text: match[2] });
    } else {
      // Legacy note without timestamp
      entries.push({ timestamp: "", text: line });
    }
  }
  return entries;
}

const CHANNEL_ICONS: Record<string, string> = {
  email: "/icons/activity/email.svg", phone: "/icons/activity/phone.svg", sms: "/icons/activity/text.svg", video: "Video", voice: "Voice",
  web: "Web", chat: "Chat", app: "App", walk_in: "Walk-in", mail: "Mail",
  webform: "Form", form: "Form",
  schellie: "Schellie",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email", phone: "Phone", sms: "SMS", video: "Video", voice: "Voice",
  web: "Web", chat: "Chat", app: "App", walk_in: "Walk-in", mail: "Mail",
  webform: "Web Form", form: "Web Form",
  schellie: "Schellie Chat",
};

// ─── Phone Activity Helpers ───────────────────────────────────────────────────

function formatDurationCompact(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function parsePhoneDuration(activity: Activity): number | null {
  // Try duration_seconds first (canonical), then duration_sec
  if (activity.duration_seconds && activity.duration_seconds > 0) return activity.duration_seconds;
  if (activity.duration_sec && activity.duration_sec > 0) return activity.duration_sec;
  // Try metadata
  const meta = activity.metadata;
  if (meta && typeof meta.duration_seconds === "number" && meta.duration_seconds > 0) return meta.duration_seconds;
  // Try parsing from body: "Duration: 889s | ..."
  if (activity.body) {
    const match = activity.body.match(/Duration:\s*(\d+)s/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function parsePhoneParties(activity: Activity): { employee: string | null; externalParty: string | null } {
  const meta = activity.metadata;
  const isOutbound = activity.direction !== "inbound";
  if (meta) {
    const callerName = typeof meta.caller_name === "string" ? meta.caller_name : null;
    const calleeName = typeof meta.callee_name === "string" ? meta.callee_name : null;
    if (isOutbound) {
      return { employee: callerName, externalParty: calleeName };
    } else {
      return { employee: calleeName, externalParty: callerName };
    }
  }
  // Try parsing from body: "Grace Hoinowski → +16318071237"
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OpportunityPanel({ open, onClose, opportunity, initialTab }: OpportunityPanelProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"contact" | "history" | "activity" | "notes">("contact");
  const [history, setHistory] = useState<StageTransition[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  // Transcript state
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [transcriptCache, setTranscriptCache] = useState<Record<string, TranscriptData>>({});
  const [transcriptLoading, setTranscriptLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contact editing state — primary
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Contact editing state — secondary
  const [editFirstName2, setEditFirstName2] = useState("");
  const [editLastName2, setEditLastName2] = useState("");
  const [editEmail2, setEditEmail2] = useState("");
  const [editPhone2, setEditPhone2] = useState("");
  const [secondary, setSecondary] = useState<ContactSecondary>({ email_secondary: null, phone_secondary: null });
  const [secondaryMember, setSecondaryMember] = useState<ContactMember | null>(null);
  const [resolvedDivision, setResolvedDivision] = useState<string | null>(null);

  // Notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  // Scheduler state
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<"appointment" | "follow-up" | "traffic">("appointment");
  const [scheduleCreating, setScheduleCreating] = useState(false);
  
  // Appointment form state
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [appointmentPurpose, setAppointmentPurpose] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentCustom, setAppointmentCustom] = useState(false);
  const [appointmentSendEmail, setAppointmentSendEmail] = useState(false);
  
  // Follow-up form state
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  
  // Traffic form state
  const [trafficDate, setTrafficDate] = useState("");
  const [trafficNotes, setTrafficNotes] = useState("");

  // Reset schedule forms
  const resetScheduleForms = useCallback(() => {
    setAppointmentTitle("");
    setAppointmentType("");
    setAppointmentPurpose("");
    setAppointmentDate("");
    setAppointmentTime("");
    setAppointmentCustom(false);
    setAppointmentSendEmail(false);
    setFollowUpTitle("");
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpNotes("");
    setTrafficDate("");
    setTrafficNotes("");
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset state when opportunity changes
  useEffect(() => {
    setEditing(false);
    setEditingNotes(false);
    setNewNoteText("");
    setActiveTab(initialTab ?? "contact");
    setHistory([]);
    setActivities([]);
    setLocalNotes(opportunity?.notes ?? null);
    setExpandedActivityId(null);
    setTranscriptCache({});
    setScheduleExpanded(false);
    resetScheduleForms();
  }, [opportunity?.id, resetScheduleForms]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve division name from opportunity's division_id
  useEffect(() => {
    if (opportunity?.division_name) {
      setResolvedDivision(opportunity.division_name);
      return;
    }
    if (!opportunity?.id) { setResolvedDivision(null); return; }
    // Two-step: get division_id from opportunity, then name from divisions
    supabase
      .from("opportunities")
      .select("division_id")
      .eq("id", opportunity.id)
      .single()
      .then(({ data }) => {
        if (!data?.division_id) return;
        supabase
          .from("divisions")
          .select("name")
          .eq("id", data.division_id as string)
          .single()
          .then(({ data: divData }) => {
            setResolvedDivision(divData?.name ?? null);
          });
      });
  }, [opportunity?.id, opportunity?.division_name]);

  // Effective division name: resolved > prop
  const effectiveDivisionName = resolvedDivision ?? opportunity?.division_name ?? null;

  // Fetch secondary contact fields + secondary member
  useEffect(() => {
    if (!opportunity?.contact_id) {
      setSecondary({ email_secondary: null, phone_secondary: null });
      setSecondaryMember(null);
      return;
    }
    // Fetch secondary email/phone from contacts
    supabase
      .from("contacts")
      .select("email_secondary, phone_secondary")
      .eq("id", opportunity.contact_id)
      .single()
      .then(({ data }) => {
        if (data) setSecondary(data as ContactSecondary);
      });
    // Fetch secondary member name from contact_members
    supabase
      .from("contact_members")
      .select("id, first_name, last_name")
      .eq("contact_id", opportunity.contact_id)
      .eq("is_primary", false)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSecondaryMember(data[0] as ContactMember);
        } else {
          setSecondaryMember(null);
        }
      });
  }, [opportunity?.contact_id]);

  // Fetch history
  useEffect(() => {
    if (!opportunity) return;
    setHistoryLoading(true);
    supabase
      .from("stage_transitions")
      .select("id, from_stage, to_stage, triggered_by, reason, created_at")
      .eq("opportunity_id", opportunity.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setHistory(data ?? []);
        setHistoryLoading(false);
      });
  }, [opportunity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch activities (lazy — only when tab is active)
  useEffect(() => {
    if (activeTab !== "activity" || !opportunity) { setActivities([]); return; }
    setActivityLoading(true);

    const fetchActivities = async () => {
      // Try by contact_id first
      if (opportunity.contact_id) {
        const { data } = await supabase
          .from("activities")
          .select("id, channel, direction, subject, body, metadata, occurred_at, duration_sec, duration_seconds, sentiment, is_read, needs_response, transcript_id, recording_url")
          .eq("contact_id", opportunity.contact_id)
          .order("occurred_at", { ascending: false })
          .limit(50);
        if (data && data.length > 0) {
          setActivities(data as Activity[]);
          setActivityLoading(false);
          return;
        }
      }
      // Fallback: try by opportunity_id
      const { data: fallbackData } = await supabase
        .from("activities")
        .select("id, channel, direction, subject, body, metadata, occurred_at, duration_sec, duration_seconds, sentiment, is_read, needs_response, transcript_id, recording_url")
        .eq("opportunity_id", opportunity.id)
        .order("occurred_at", { ascending: false })
        .limit(50);
      setActivities((fallbackData as Activity[] | null) ?? []);
      setActivityLoading(false);
    };

    fetchActivities();
  }, [activeTab, opportunity?.contact_id, opportunity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start editing contacts
  const startEditing = useCallback(() => {
    if (!opportunity) return;
    setEditFirstName(opportunity.first_name ?? "");
    setEditLastName(opportunity.last_name ?? "");
    setEditEmail(opportunity.email ?? "");
    setEditPhone(opportunity.phone ?? "");
    setEditFirstName2(secondaryMember?.first_name ?? "");
    setEditLastName2(secondaryMember?.last_name ?? "");
    setEditEmail2(secondary.email_secondary ?? "");
    setEditPhone2(secondary.phone_secondary ?? "");
    setEditing(true);
  }, [opportunity, secondary, secondaryMember]);

  // Save contact edits
  const saveContact = useCallback(async () => {
    if (!opportunity?.contact_id) return;
    setSaving(true);

    // Update primary contact: name, email, phone + secondary email/phone
    await supabase.from("contacts").update({
      first_name: editFirstName || null,
      last_name: editLastName || null,
      email: editEmail || null,
      phone: editPhone || null,
      email_secondary: editEmail2 || null,
      phone_secondary: editPhone2 || null,
    }).eq("id", opportunity.contact_id);

    // Upsert secondary member name
    if (editFirstName2 || editLastName2) {
      if (secondaryMember?.id) {
        // Update existing
        await supabase.from("contact_members").update({
          first_name: editFirstName2 || null,
          last_name: editLastName2 || null,
        }).eq("id", secondaryMember.id);
      } else {
        // Insert new secondary member
        await supabase.from("contact_members").insert({
          contact_id: opportunity.contact_id,
          first_name: editFirstName2 || null,
          last_name: editLastName2 || null,
          is_primary: false,
        });
      }
      // Refresh secondary member
      const { data: newMember } = await supabase
        .from("contact_members")
        .select("id, first_name, last_name")
        .eq("contact_id", opportunity.contact_id)
        .eq("is_primary", false)
        .limit(1);
      if (newMember && newMember.length > 0) {
        setSecondaryMember(newMember[0] as ContactMember);
      }
    }

    // Update local secondary state
    setSecondary({ email_secondary: editEmail2 || null, phone_secondary: editPhone2 || null });
    // Update local display values to reflect the save
    if (opportunity) {
      (opportunity as unknown as Record<string, unknown>).first_name = editFirstName;
      (opportunity as unknown as Record<string, unknown>).last_name = editLastName;
      (opportunity as unknown as Record<string, unknown>).email = editEmail || null;
      (opportunity as unknown as Record<string, unknown>).phone = editPhone || null;
    }
    setSaving(false);
    setEditing(false);
  }, [opportunity?.contact_id, editFirstName, editLastName, editEmail, editPhone, editFirstName2, editLastName2, editEmail2, editPhone2, secondaryMember]);

  // Fetch transcript on demand
  const fetchTranscript = useCallback(async (transcriptId: string, activityId: string) => {
    if (transcriptCache[activityId]) return;
    setTranscriptLoading(activityId);
    try {
      const { data } = await supabase
        .from("transcripts")
        .select("raw_text, ai_summary, speaker_segments, recording_url")
        .eq("id", transcriptId)
        .single();
      if (data) {
        setTranscriptCache(prev => ({ ...prev, [activityId]: data as TranscriptData }));
      }
    } catch {
      setTranscriptCache(prev => ({ ...prev, [activityId]: { raw_text: "Failed to load transcript.", ai_summary: null, speaker_segments: null, recording_url: null } }));
    }
    setTranscriptLoading(null);
  }, [transcriptCache]);

  // Copy transcript to clipboard
  const copyTranscript = useCallback(async (activityId: string) => {
    const transcript = transcriptCache[activityId];
    if (!transcript?.raw_text) return;
    try {
      await navigator.clipboard.writeText(transcript.raw_text);
      setCopiedId(activityId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }, [transcriptCache]);

  // Save notes — APPEND new note with timestamp
  const saveNotes = useCallback(async () => {
    if (!opportunity || !newNoteText.trim()) return;
    setSavingNotes(true);
    const updatedNotes = buildNoteEntry(newNoteText, localNotes);
    await supabase.from("opportunities").update({ notes: updatedNotes }).eq("id", opportunity.id);
    setLocalNotes(updatedNotes);
    setNewNoteText("");
    setSavingNotes(false);
    setEditingNotes(false);
  }, [opportunity, newNoteText, localNotes]);

  // Create appointment
  const createAppointment = useCallback(async () => {
    if (!opportunity || !appointmentTitle.trim() || !appointmentType || !appointmentDate || !appointmentTime) return;
    setScheduleCreating(true);
    
    try {
      const dateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
      
      // Parse appointment type to get category and duration
      const [category, duration] = appointmentType.split('_');
      const durationMinutes = duration === '15m' ? 15 : duration === '30m' ? 30 : duration === '1h' ? 60 : duration === '2h' ? 120 : 60;
      
      // If virtual meeting, create Zoom meeting
      if (category === 'virtual' && opportunity.contact_id) {
        await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunity_id: opportunity.id,
            contact_id: opportunity.contact_id,
            topic: appointmentTitle,
            start_time: dateTime.toISOString(),
            duration_minutes: durationMinutes
          })
        });
      }
      
      // Insert activity record
      const channel = category === 'virtual' ? 'meeting' : category === 'in_person' ? 'appointment' : 'phone';
      await supabase.from('activities').insert({
        channel,
        type: appointmentType,
        subject: appointmentTitle,
        body: appointmentPurpose,
        occurred_at: dateTime.toISOString(),
        direction: 'outbound',
        contact_id: opportunity.contact_id,
        opportunity_id: opportunity.id,
        metadata: {
          appointment_type: appointmentType,
          purpose: appointmentPurpose,
          duration_minutes: durationMinutes,
          send_realtor_email: appointmentSendEmail,
          custom: appointmentCustom
        }
      });
      
      resetScheduleForms();
      setScheduleExpanded(false);
      // Refresh activities if we're on the activity tab
      if (activeTab === 'activity') {
        window.location.reload(); // Quick refresh for now
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
    } finally {
      setScheduleCreating(false);
    }
  }, [opportunity, appointmentTitle, appointmentType, appointmentPurpose, appointmentDate, appointmentTime, appointmentCustom, appointmentSendEmail, resetScheduleForms, activeTab]);

  // Create follow-up
  const createFollowUp = useCallback(async () => {
    if (!opportunity || !followUpTitle.trim() || !followUpDate || !followUpTime) return;
    setScheduleCreating(true);
    
    try {
      const dateTime = new Date(`${followUpDate}T${followUpTime}:00`);
      
      await supabase.from('activities').insert({
        channel: 'follow_up',
        type: 'scheduled_follow_up',
        subject: followUpTitle,
        body: followUpNotes,
        occurred_at: dateTime.toISOString(),
        direction: 'outbound',
        contact_id: opportunity.contact_id,
        opportunity_id: opportunity.id,
        metadata: {
          scheduled: true,
          notes: followUpNotes
        }
      });
      
      resetScheduleForms();
      setScheduleExpanded(false);
      if (activeTab === 'activity') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating follow-up:', error);
    } finally {
      setScheduleCreating(false);
    }
  }, [opportunity, followUpTitle, followUpDate, followUpTime, followUpNotes, resetScheduleForms, activeTab]);

  // Create traffic
  const createTraffic = useCallback(async () => {
    if (!opportunity || !trafficDate) return;
    setScheduleCreating(true);
    
    try {
      const dateTime = new Date(`${trafficDate}T12:00:00`);
      
      await supabase.from('activities').insert({
        channel: 'traffic',
        type: 'walk_in',
        subject: 'Walk-in Traffic',
        body: trafficNotes,
        occurred_at: dateTime.toISOString(),
        direction: 'inbound',
        contact_id: opportunity.contact_id,
        opportunity_id: opportunity.id,
        metadata: {
          traffic_type: 'walk_in',
          notes: trafficNotes
        }
      });
      
      resetScheduleForms();
      setScheduleExpanded(false);
      if (activeTab === 'activity') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating traffic entry:', error);
    } finally {
      setScheduleCreating(false);
    }
  }, [opportunity, trafficDate, trafficNotes, resetScheduleForms, activeTab]);

  if (!open || !opportunity) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    fontSize: 12,
    color: "#ededed",
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 4,
    outline: "none",
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 4,
    cursor: "pointer",
    border: "1px solid #27272a",
    background: "#18181b",
    color: "#a1a1aa",
  };

  const noteEntries = parseNoteEntries(localNotes);

  // Secondary display name
  const secondaryName = [secondaryMember?.first_name, secondaryMember?.last_name].filter(Boolean).join(" ");

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 40,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: isMobile ? 0 : undefined,
          width: isMobile ? "100%" : 580,
          background: "#111",
          borderLeft: isMobile ? "none" : "1px solid #1f1f1f",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch" as any,
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "16px 20px 14px", borderBottom: "none", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0, lineHeight: 1.3 }}>
                  {opportunity.first_name} {opportunity.last_name}
                </h2>
                <StageBadge stage={opportunity.stage} context={opportunity.stage === "lead_div" ? (effectiveDivisionName ?? undefined) : opportunity.stage === "lead_com" ? (opportunity.community_name ?? undefined) : undefined} />
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 20px 10px", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          <select
            value={opportunity.stage}
            onChange={async (e) => {
              const newStage = e.target.value;
              if (newStage === opportunity.stage) return;
              const { error } = await supabase.from("opportunities").update({ crm_stage: newStage }).eq("id", opportunity.id);
              if (error) { alert(`Error: ${error.message}`); return; }
              onClose();
            }}
            style={{
              padding: "5px 10px", fontSize: 11, borderRadius: 4,
              backgroundColor: "#18181b", border: "1px solid #27272a",
              color: "#a1a1aa", outline: "none", cursor: "pointer",
            }}
          >
            <option value="queue">OSC Queue</option>
            <option value="csm_queue">CSM Queue</option>
            <option value="lead_div">Lead: Division</option>
            <option value="lead_com">Lead: Community</option>
            <option value="prospect_c">Prospect C</option>
            <option value="prospect_b">Prospect B</option>
            <option value="prospect_a">Prospect A</option>
            <option value="archived">Archived</option>
            <option value="deleted">Deleted</option>
          </select>
          <button
            onClick={async () => {
              const when = prompt("Meeting date/time (leave blank for tomorrow):", "");
              const btn = document.activeElement as HTMLButtonElement;
              if (btn) { btn.textContent = "Creating..."; btn.disabled = true; }
              try {
                const res = await fetch("/api/meetings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    opportunity_id: opportunity.id,
                    contact_id: opportunity.contact_id,
                    topic: `Meeting with ${opportunity.first_name} ${opportunity.last_name}`,
                    start_time: when ? new Date(when).toISOString() : undefined,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  alert(`Meeting created! Join URL:\n${data.join_url}`);
                  if (btn) { btn.textContent = "Scheduled"; btn.style.backgroundColor = "#052e16"; btn.style.borderColor = "#166534"; btn.style.color = "#4ade80"; }
                } else {
                  alert(`Error: ${data.error}`);
                  if (btn) { btn.textContent = "Schedule Meeting"; btn.disabled = false; }
                }
              } catch (e) {
                alert(`Error creating meeting`);
                if (btn) { btn.textContent = "Schedule Meeting"; btn.disabled = false; }
              }
            }}
            style={{
              padding: "5px 10px", fontSize: 11, borderRadius: 4,
              backgroundColor: "#172554", border: "1px solid #1e40af",
              color: "#60a5fa", cursor: "pointer", fontWeight: 500,
            }}
          >
            Schedule Meeting
          </button>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #27272a", padding: "0 16px", background: "#09090b", flexShrink: 0 }}>
          {(["CONTACT", "ACTIVITY", "HISTORY", "NOTES"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase() as typeof activeTab)}
              style={{
                padding: "10px 16px",
                fontSize: 11,
                fontWeight: 600,
                color: activeTab === tab.toLowerCase() ? "#fafafa" : "#71717a",
                borderBottom: activeTab === tab.toLowerCase() ? "2px solid #fafafa" : "2px solid transparent",
                background: "transparent",
                border: "none",
                borderBlockEnd: activeTab === tab.toLowerCase() ? "2px solid #fafafa" : "2px solid transparent",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* ── Contact Tab ───────────────────────────────────────── */}
            {activeTab === "contact" && (
            <>
            <Section title="Contact">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Primary</span>
                {!editing && (
                  <button onClick={startEditing} style={{ ...smallBtnStyle, fontSize: 10, padding: "2px 8px" }}>
                    ✏ Edit
                  </button>
                )}
              </div>

              {editing ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>First Name</label>
                        <input style={inputStyle} value={editFirstName} onChange={e => setEditFirstName(e.target.value)} placeholder="First name" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>Last Name</label>
                        <input style={inputStyle} value={editLastName} onChange={e => setEditLastName(e.target.value)} placeholder="Last name" />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>Email</label>
                      <input style={inputStyle} value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email" />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>Phone</label>
                      <input style={inputStyle} value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Secondary</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>First Name</label>
                        <input style={inputStyle} value={editFirstName2} onChange={e => setEditFirstName2(e.target.value)} placeholder="First name" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>Last Name</label>
                        <input style={inputStyle} value={editLastName2} onChange={e => setEditLastName2(e.target.value)} placeholder="Last name" />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>Email Secondary</label>
                      <input style={inputStyle} value={editEmail2} onChange={e => setEditEmail2(e.target.value)} placeholder="Add secondary email" />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#888", marginBottom: 2, display: "block" }}>Phone Secondary</label>
                      <input style={inputStyle} value={editPhone2} onChange={e => setEditPhone2(e.target.value)} placeholder="Add secondary phone" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={saveContact}
                      disabled={saving}
                      style={{ ...smallBtnStyle, background: "#22c55e", color: "#000", border: "none", fontWeight: 600, opacity: saving ? 0.5 : 1 }}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditing(false)} style={smallBtnStyle}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <Row label="Name" value={`${opportunity.first_name} ${opportunity.last_name}`} />
                  <Row
                    label="Email"
                    value={
                      opportunity.email ? (
                        <a href={`mailto:${opportunity.email}`} style={{ color: "#7aafdf", textDecoration: "none" }}>
                          {opportunity.email}
                        </a>
                      ) : null
                    }
                  />
                  <Row label="Phone" value={opportunity.phone} />
                  <Row label="Source" value={opportunity.source} />

                  {/* Secondary — always show */}
                  <div style={{ marginTop: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Secondary</span>
                  </div>
                  <Row
                    label="Name"
                    value={
                      secondaryName ? (
                        <span>{secondaryName}</span>
                      ) : (
                        <span style={{ color: "#333", fontStyle: "italic" }}>Add secondary name</span>
                      )
                    }
                  />
                  <Row
                    label="Email"
                    value={
                      secondary.email_secondary ? (
                        <a href={`mailto:${secondary.email_secondary}`} style={{ color: "#7aafdf", textDecoration: "none" }}>
                          {secondary.email_secondary}
                        </a>
                      ) : (
                        <span style={{ color: "#333", fontStyle: "italic" }}>Add secondary email</span>
                      )
                    }
                  />
                  <Row
                    label="Phone"
                    value={
                      secondary.phone_secondary ? (
                        <span>{secondary.phone_secondary}</span>
                      ) : (
                        <span style={{ color: "#333", fontStyle: "italic" }}>Add secondary phone</span>
                      )
                    }
                  />
                </>
              )}
            </Section>

            {/* ── Interest Section ──────────────────────────────────────── */}
            <Section title="Interest">
              <Row label="Division" value={effectiveDivisionName} />
              <Row label="Community" value={opportunity.community_name ?? "—"} />
              <Row label="Budget" value={formatBudget(opportunity.budget_min, opportunity.budget_max)} />
              {opportunity.floor_plan_name && <Row label="Floor Plan" value={opportunity.floor_plan_name} />}
            </Section>
            </>
            )}

            {/* ── History Tab ──────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div>
                {historyLoading ? (
                  <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Loading…</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {history.length === 0 && (
                      <p style={{ fontSize: 12, color: "#888", margin: 0 }}>No stage transitions recorded</p>
                    )}
                    {history.map(t => (
                      <div key={t.id} style={{ lineHeight: 1.6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {t.from_stage ? <StageBadge stage={t.from_stage} context={t.from_stage === "lead_div" ? (effectiveDivisionName ?? undefined) : t.from_stage === "lead_com" ? (opportunity?.community_name ?? undefined) : undefined} /> : <span style={{ fontSize: 10, color: "#888" }}>—</span>}
                          <span style={{ color: "#888", fontSize: 12 }}>→</span>
                          {t.to_stage ? <StageBadge stage={t.to_stage} context={t.to_stage === "lead_div" ? (effectiveDivisionName ?? undefined) : t.to_stage === "lead_com" ? (opportunity?.community_name ?? undefined) : undefined} /> : <span style={{ fontSize: 10, color: "#888" }}>—</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#7aafdf", marginTop: 0, display: "inline" }}>
                          {formatDateTime(t.created_at)}
                          {t.triggered_by && <span> · by {t.triggered_by}</span>}
                          {t.reason && <span> ({t.reason})</span>}
                        </div>
                      </div>
                    ))}

                    {/* Synthetic "Created" entry — always show at bottom */}
                    <div style={{ lineHeight: 1.6, opacity: 0.75 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            whiteSpace: "nowrap",
                            background: "#27272a",
                            color: "#a1a1aa",
                            lineHeight: "16px",
                          }}
                        >
                          {opportunity.source === "schellie" ? "SCHELLIE" : "WEB"}
                        </span>
                        <span style={{ color: "#888", fontSize: 12 }}>→</span>
                        <StageBadge stage="queue" />
                      </div>
                      <div style={{ fontSize: 11, color: "#7aafdf", marginTop: 0, display: "inline" }}>
                        {formatDateTime(opportunity.created_at)} · {opportunity.source === "schellie" ? "Created via Schellie chat" : "Created via web form"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Activity Tab ─────────────────────────────────────────── */}
            {activeTab === "activity" && (
              <div style={{ margin: "0 -20px" }}>
                {/* Schedule Section */}
                <div style={{ padding: "0 20px", marginBottom: 16 }}>
                  {!scheduleExpanded ? (
                    <button
                      onClick={() => setScheduleExpanded(true)}
                      style={{
                        padding: "8px 12px",
                        fontSize: 11,
                        fontWeight: 500,
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "1px solid #27272a",
                        background: "#18181b",
                        color: "#a1a1aa",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      + Schedule
                    </button>
                  ) : (
                    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 6, padding: 12 }}>
                      {/* Schedule Sub-tabs */}
                      <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid #27272a" }}>
                        {(["appointment", "follow-up", "traffic"] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setScheduleTab(tab)}
                            style={{
                              padding: "6px 12px",
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: scheduleTab === tab ? "#fafafa" : "#71717a",
                              borderBottom: scheduleTab === tab ? "2px solid #fafafa" : "2px solid transparent",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Appointment Form */}
                      {scheduleTab === "appointment" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <input
                              style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                              placeholder="Title"
                              value={appointmentTitle}
                              onChange={e => setAppointmentTitle(e.target.value)}
                            />
                            <select
                              style={{ ...inputStyle, minWidth: 120 }}
                              value={appointmentType}
                              onChange={e => setAppointmentType(e.target.value)}
                            >
                              <option value="">Select Type</option>
                              <optgroup label="In-Person">
                                <option value="in_person_1h">1 hour</option>
                                <option value="in_person_2h">2 hours</option>
                              </optgroup>
                              <optgroup label="Virtual">
                                <option value="virtual_15m">15 minutes</option>
                                <option value="virtual_30m">30 minutes</option>
                                <option value="virtual_1h">1 hour</option>
                              </optgroup>
                              <optgroup label="Phone">
                                <option value="phone_15m">15 minutes</option>
                                <option value="phone_30m">30 minutes</option>
                                <option value="phone_1h">1 hour</option>
                              </optgroup>
                            </select>
                            <select
                              style={{ ...inputStyle, minWidth: 140 }}
                              value={appointmentPurpose}
                              onChange={e => setAppointmentPurpose(e.target.value)}
                            >
                              <option value="">Select Purpose</option>
                              <option value="Initial Visit">Initial Visit</option>
                              <option value="Pricing Appointment">Pricing Appointment</option>
                              <option value="Be Back">Be Back</option>
                              <option value="Contract Appointment">Contract Appointment</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                            <input
                              type="date"
                              style={{ ...inputStyle, minWidth: 140 }}
                              value={appointmentDate}
                              onChange={e => setAppointmentDate(e.target.value)}
                            />
                            <input
                              type="time"
                              style={{ ...inputStyle, minWidth: 100 }}
                              value={appointmentTime}
                              onChange={e => setAppointmentTime(e.target.value)}
                            />
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#a1a1aa", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={appointmentCustom}
                                onChange={e => setAppointmentCustom(e.target.checked)}
                                style={{ marginRight: 4 }}
                              />
                              Custom
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#a1a1aa", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={appointmentSendEmail}
                                onChange={e => setAppointmentSendEmail(e.target.checked)}
                                style={{ marginRight: 4 }}
                              />
                              Email Realtor
                            </label>
                            <button
                              onClick={createAppointment}
                              disabled={scheduleCreating || !appointmentTitle.trim() || !appointmentType || !appointmentDate || !appointmentTime}
                              style={{
                                ...smallBtnStyle,
                                background: "#22c55e",
                                color: "#000",
                                border: "none",
                                fontWeight: 600,
                                opacity: scheduleCreating || !appointmentTitle.trim() || !appointmentType || !appointmentDate || !appointmentTime ? 0.5 : 1
                              }}
                            >
                              {scheduleCreating ? "Creating..." : "Create"}
                            </button>
                            <button
                              onClick={() => setScheduleExpanded(false)}
                              style={smallBtnStyle}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Follow-up Form */}
                      {scheduleTab === "follow-up" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input
                            style={inputStyle}
                            placeholder="Title"
                            value={followUpTitle}
                            onChange={e => setFollowUpTitle(e.target.value)}
                          />
                          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                            <input
                              type="date"
                              style={{ ...inputStyle, minWidth: 140 }}
                              value={followUpDate}
                              onChange={e => setFollowUpDate(e.target.value)}
                            />
                            <input
                              type="time"
                              style={{ ...inputStyle, minWidth: 100 }}
                              value={followUpTime}
                              onChange={e => setFollowUpTime(e.target.value)}
                            />
                            <button
                              onClick={createFollowUp}
                              disabled={scheduleCreating || !followUpTitle.trim() || !followUpDate || !followUpTime}
                              style={{
                                ...smallBtnStyle,
                                background: "#22c55e",
                                color: "#000",
                                border: "none",
                                fontWeight: 600,
                                opacity: scheduleCreating || !followUpTitle.trim() || !followUpDate || !followUpTime ? 0.5 : 1
                              }}
                            >
                              {scheduleCreating ? "Creating..." : "Create"}
                            </button>
                            <button
                              onClick={() => setScheduleExpanded(false)}
                              style={smallBtnStyle}
                            >
                              Cancel
                            </button>
                          </div>
                          <textarea
                            style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
                            placeholder="Notes"
                            value={followUpNotes}
                            onChange={e => setFollowUpNotes(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Traffic Form */}
                      {scheduleTab === "traffic" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                            <input
                              type="date"
                              style={{ ...inputStyle, minWidth: 140 }}
                              value={trafficDate}
                              onChange={e => setTrafficDate(e.target.value)}
                            />
                            <button
                              onClick={createTraffic}
                              disabled={scheduleCreating || !trafficDate}
                              style={{
                                ...smallBtnStyle,
                                background: "#22c55e",
                                color: "#000",
                                border: "none",
                                fontWeight: 600,
                                opacity: scheduleCreating || !trafficDate ? 0.5 : 1
                              }}
                            >
                              {scheduleCreating ? "Creating..." : "Create"}
                            </button>
                            <button
                              onClick={() => setScheduleExpanded(false)}
                              style={smallBtnStyle}
                            >
                              Cancel
                            </button>
                          </div>
                          <textarea
                            style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
                            placeholder="Notes"
                            value={trafficNotes}
                            onChange={e => setTrafficNotes(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {activityLoading ? (
                  <p style={{ fontSize: 12, color: "#888", margin: 0, padding: "0 20px" }}>Loading…</p>
                ) : activities.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#888", margin: 0, padding: "0 20px" }}>No activities recorded</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {activities.map(a => {
                      const channelKey = a.channel ?? "";
                      const isPhone = channelKey === "phone" || channelKey === "call";
                      const isEmail = channelKey === "email";
                      const isWebForm = channelKey === "webform" || channelKey === "web_form";
                      const isSchellie = channelKey === "schellie";
                      const isSms = channelKey === "sms" || channelKey === "text";
                      const isMeeting = channelKey === "meeting";
                      const isExpanded = expandedActivityId === a.id;
                      const transcript = transcriptCache[a.id];
                      const isLoadingTranscript = transcriptLoading === a.id;

                      // Pv1-style activity styling
                      const style = getActivityStyle(a.channel, null, a.direction);

                      // Phone-specific parsing
                      const phoneDuration = isPhone ? parsePhoneDuration(a) : null;
                      const phoneParties = isPhone ? parsePhoneParties(a) : null;
                      const durationStr = phoneDuration ? formatDurationCompact(phoneDuration) : null;

                      // Build description in Pv1 format
                      let description: string;
                      if (isPhone) {
                        const parts: string[] = [];
                        if (phoneParties?.employee) parts.push(phoneParties.employee);
                        if (durationStr) parts.push(durationStr);
                        description = parts.length > 0 ? parts.join(" — ") : "A Zoom Phone call";
                      } else if (isEmail) {
                        description = a.subject || a.body?.slice(0, 80) || "(no subject)";
                      } else if (isSms) {
                        description = a.body?.slice(0, 80) || "(no message)";
                      } else if (isWebForm) {
                        // Parse form type and community/division from metadata or subject
                        let meta: Record<string, unknown> = {};
                        try { meta = typeof a.metadata === "string" ? JSON.parse(a.metadata) : (a.metadata ?? {}); } catch { /* */ }
                        const formCode = (meta.form_type_code as string) || (a.subject?.replace("Web form: ", "").split(" ")[0]) || "form";
                        const commName = (meta.community_name as string) || (meta.division_name as string) || "";
                        description = commName ? `${formCode}: ${commName}` : formCode;
                      } else if (isSchellie) {
                        let meta: Record<string, unknown> = {};
                        try { meta = typeof a.metadata === "string" ? JSON.parse(a.metadata) : (a.metadata ?? {}); } catch { /* */ }
                        const msgCount = (meta.message_count as number) || 0;
                        const commName = (meta.community_name as string) || (meta.division_name as string) || "";
                        description = `🐚 Schellie chat${commName ? `: ${commName}` : ""}${msgCount ? ` (${msgCount} msgs)` : ""}`;
                      } else if (isMeeting) {
                        const meetDur = phoneDuration ? ` — ${durationStr}` : "";
                        description = (a.subject || "Meeting") + meetDur;
                      } else {
                        description = a.subject || a.body?.slice(0, 80) || "Activity";
                      }

                      // Recording URL
                      const recordingUrl = a.recording_url || transcript?.recording_url || null;

                      // Duration formatted for drawer header
                      const drawerDuration = phoneDuration
                        ? `${Math.floor(phoneDuration / 60)} MIN(S) ${phoneDuration % 60} SEC(S)`
                        : null;

                      return (
                        <div key={a.id}>
                          {/* ── Collapsed Row ── */}
                          <div
                            onClick={() => {
                              const newId = isExpanded ? null : a.id;
                              setExpandedActivityId(newId);
                              if (newId && isPhone && a.transcript_id && !transcriptCache[a.id]) {
                                fetchTranscript(a.transcript_id, a.id);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "8px 12px",
                              borderLeft: `4px solid ${style.borderColor}`,
                              backgroundColor: style.bgColor,
                              cursor: "pointer",
                              marginBottom: 4,
                              borderRadius: 3,
                            }}
                          >
                            {style.icon.startsWith("/") ? (
                              <img src={style.icon} alt="" width={14} height={14} style={{ marginRight: 8, flexShrink: 0 }} />
                            ) : style.icon ? (
                              <span style={{ fontSize: 14, lineHeight: "14px", marginRight: 8, flexShrink: 0 }}>{style.icon}</span>
                            ) : null}
                            <span style={{ fontSize: 12, color: "#fafafa", fontWeight: 500, marginRight: 4, flexShrink: 0 }}>
                              {style.label}:
                            </span>
                            <span style={{
                              fontSize: 12, color: "#a1a1aa", flex: 1, overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                            }}>
                              {description}
                            </span>
                            {isPhone && recordingUrl && (
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", marginLeft: 6, flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: 11, color: "#71717a", marginLeft: 8, flexShrink: 0, whiteSpace: "nowrap" }}>
                              {formatDatePv1(a.occurred_at)}
                            </span>
                          </div>

                          {/* ── Expanded Drawer ── */}
                          {isExpanded && (
                            <div style={{
                              padding: "12px 16px",
                              backgroundColor: "#0a0a0a",
                              borderLeft: `4px solid ${style.borderColor}`,
                              borderBottom: "1px solid #1a1a1a",
                            }}>
                              {/* ── Phone Drawer ── */}
                              {isPhone && (
                                <>
                                  {phoneParties?.employee && (
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 6 }}>
                                      <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#71717a", fontSize: 10 }}>SENT BY: </span>
                                      {phoneParties.employee}
                                    </div>
                                  )}
                                  <div style={{ borderTop: "1px solid #27272a", marginBottom: 8 }} />
                                  <div style={{ fontSize: 12, color: "#d4d4d8", marginBottom: 2 }}>A Zoom Phone call</div>
                                  {drawerDuration && (
                                    <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>{drawerDuration}</div>
                                  )}
                                  {recordingUrl && (
                                    <div style={{ marginBottom: 8 }}>
                                      <audio
                                        controls
                                        preload="none"
                                        style={{
                                          width: "100%", height: 36, borderRadius: 6,
                                          filter: "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)",
                                        }}
                                        src={recordingUrl}
                                      />
                                    </div>
                                  )}
                                  {isLoadingTranscript && (
                                    <div style={{ fontSize: 11, color: "#888", padding: "4px 0" }}>Loading transcript…</div>
                                  )}
                                  {transcript && (
                                    <>
                                      {transcript.ai_summary && (
                                        <div style={{
                                          padding: "10px 12px", backgroundColor: "#172554", fontSize: 12,
                                          color: "#93c5fd", lineHeight: 1.6, borderRadius: 6, marginBottom: 8,
                                        }}>
                                          <div style={{ fontSize: 10, fontWeight: 600, color: "#60a5fa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Summary</div>
                                          {transcript.ai_summary}
                                        </div>
                                      )}
                                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                        {a.transcript_id && (
                                          <span style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", textTransform: "uppercase" }}>Transcript</span>
                                        )}
                                        {transcript.raw_text && (
                                          <button
                                            onClick={e => { e.stopPropagation(); copyTranscript(a.id); }}
                                            style={{
                                              padding: "2px 8px", fontSize: 10, fontWeight: 500, borderRadius: 3,
                                              cursor: "pointer", border: "1px solid #27272a", background: "#18181b",
                                              color: copiedId === a.id ? "#4ade80" : "#a1a1aa", marginLeft: "auto",
                                            }}
                                          >
                                            {copiedId === a.id ? "✓ Copied!" : "Copy"}
                                          </button>
                                        )}
                                      </div>
                                      <div style={{
                                        padding: "10px 12px", backgroundColor: "#09090b", borderRadius: 6,
                                        fontSize: 12, color: "#d4d4d8", lineHeight: 1.7,
                                        maxHeight: 400, overflowY: "auto",
                                      }}>
                                        {transcript.speaker_segments && Array.isArray(transcript.speaker_segments) && transcript.speaker_segments.length > 0 ? (
                                          (transcript.speaker_segments as Array<{speaker?: string; text?: string}>).map((seg, i) => {
                                            const speaker = (seg.speaker ?? "Speaker").toLowerCase();
                                            const isEmp = speaker.includes("grace") || speaker.includes("brooke") || speaker.includes("tess") || speaker.includes("melissa") || speaker.includes("tarah") || speaker.includes("lisa") || speaker.includes("system");
                                            const speakerColor = isEmp ? "#a1a1aa" : "#60a5fa";
                                            const textColor = isEmp ? "#a1a1aa" : "#e0edff";
                                            return (
                                              <div key={i} style={{ marginBottom: 8, paddingLeft: isEmp ? 0 : 12, borderLeft: isEmp ? "none" : "2px solid #60a5fa" }}>
                                                <span style={{ color: speakerColor, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                                                  {seg.speaker ?? "Speaker"}:
                                                </span>
                                                <span style={{ color: textColor, marginLeft: 6, fontSize: 12 }}>
                                                  {seg.text ?? ""}
                                                </span>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          (transcript.raw_text ?? "No transcript text available.").split("\n\n").map((para, i) => (
                                            <p key={i} style={{ margin: "0 0 10px", color: "#d4d4d8" }}>{para}</p>
                                          ))
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {!transcript && !isLoadingTranscript && !a.transcript_id && (
                                    <div style={{ fontSize: 11, color: "#555" }}>No transcript available for this call.</div>
                                  )}
                                </>
                              )}

                              {/* ── Email Drawer ── */}
                              {isEmail && (
                                <>
                                  {a.metadata && typeof a.metadata === "object" && (
                                    <>
                                      {(a.metadata as Record<string, unknown>).from && (
                                        <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 2 }}>
                                          <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#71717a", fontSize: 10 }}>FROM: </span>
                                          {String((a.metadata as Record<string, unknown>).from)}
                                        </div>
                                      )}
                                      {(a.metadata as Record<string, unknown>).to && (
                                        <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 2 }}>
                                          <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#71717a", fontSize: 10 }}>TO: </span>
                                          {String((a.metadata as Record<string, unknown>).to)}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {a.subject && (
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 6 }}>
                                      <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#71717a", fontSize: 10 }}>SUBJECT: </span>
                                      {a.subject}
                                    </div>
                                  )}
                                  <div style={{ borderTop: "1px solid #27272a", marginBottom: 8 }} />
                                  <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto" }}>
                                    {a.body || "(no body)"}
                                  </div>
                                </>
                              )}

                              {/* ── Web Form Drawer ── */}
                              {isWebForm && (() => {
                                let wfMeta: Record<string, unknown> = {};
                                try { wfMeta = typeof a.metadata === "string" ? JSON.parse(a.metadata) : (a.metadata ?? {}); } catch { /* */ }
                                const formType = (wfMeta.form_type_code as string) || a.subject?.replace("Web form: ", "").split(" ")[0] || "form";
                                const divName = (wfMeta.division_name as string) || "";
                                const commName = (wfMeta.community_name as string) || "";
                                const sourceUrl = (wfMeta.source_url as string) || "";
                                const interested = (wfMeta.interested_in as string) || a.body || "";
                                // Parse body if it's JSON (old format)
                                let bodyText = interested;
                                try {
                                  const parsed = JSON.parse(interested);
                                  bodyText = parsed.interested_in || "";
                                } catch { /* not JSON, use as-is */ }

                                // ── UTM + Ad Tracking ──
                                // Prefer structured metadata fields (new sync), fall back to URL parsing (legacy)
                                let pageUrl = (wfMeta.page_url as string) || sourceUrl;
                                let adPlatform = (wfMeta.ad_platform as string) || "";
                                let campaignName = (wfMeta.utm_campaign as string) || "";
                                let utmSource = (wfMeta.utm_source as string) || "";
                                let utmMedium = (wfMeta.utm_medium as string) || "";
                                let utmTerm = (wfMeta.utm_term as string) || "";
                                let utmContent = (wfMeta.utm_content as string) || "";
                                let clickId = (wfMeta.gclid as string) || (wfMeta.msclkid as string) || (wfMeta.fbclid as string) || "";
                                let clickIdType = wfMeta.gclid ? "gclid" : wfMeta.msclkid ? "msclkid" : wfMeta.fbclid ? "fbclid" : "";
                                let gadCampaignId = (wfMeta.gad_campaignid as string) || "";

                                // Fallback: parse from source_url if structured fields missing
                                if (!adPlatform && !campaignName && sourceUrl) {
                                  try {
                                    const u = new URL(sourceUrl);
                                    if (!wfMeta.page_url) pageUrl = `${u.origin}${u.pathname}`;
                                    const pGclid = u.searchParams.get("gclid");
                                    const pGadCampaign = u.searchParams.get("gad_campaignid");
                                    const pMsclkid = u.searchParams.get("msclkid");
                                    const pFbclid = u.searchParams.get("fbclid");
                                    utmSource = utmSource || u.searchParams.get("utm_source") || "";
                                    utmMedium = utmMedium || u.searchParams.get("utm_medium") || "";
                                    campaignName = campaignName || u.searchParams.get("utm_campaign") || "";
                                    utmTerm = utmTerm || u.searchParams.get("utm_term") || "";
                                    utmContent = utmContent || u.searchParams.get("utm_content") || "";
                                    gadCampaignId = gadCampaignId || pGadCampaign || "";
                                    if (pGclid || pGadCampaign) {
                                      adPlatform = "Google Ads";
                                      clickId = clickId || pGclid || "";
                                      clickIdType = clickIdType || "gclid";
                                    } else if (pMsclkid) {
                                      adPlatform = "Bing Ads";
                                      clickId = clickId || pMsclkid;
                                      clickIdType = clickIdType || "msclkid";
                                    } else if (pFbclid) {
                                      adPlatform = "Facebook Ads";
                                      clickId = clickId || pFbclid;
                                      clickIdType = clickIdType || "fbclid";
                                    } else if (utmSource) {
                                      const src = utmSource.toLowerCase();
                                      if (["bing", "google", "facebook", "meta", "instagram"].includes(src)) {
                                        adPlatform = `${utmSource} Ads`;
                                      }
                                    }
                                  } catch { /* invalid URL */ }
                                }

                                // For Google Ads: use gad_campaignid as campaign if no utm_campaign
                                const campaignDisplay = campaignName || (gadCampaignId ? `ID: ${gadCampaignId}` : "");
                                // For Google Ads without UTM: show "google / cpc" as source/medium
                                if (adPlatform === "Google Ads" && !utmSource) {
                                  utmSource = "google";
                                  utmMedium = "cpc";
                                }
                                // Source / Medium line (e.g. "bing / cpc")
                                const sourceMedium = [utmSource, utmMedium].filter(Boolean).join(" / ");

                                const labelStyle = { fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#71717a", fontSize: 10 };
                                const valDash = <span style={{ color: "#52525b" }}>—</span>;

                                return (
                                  <>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>FORM TYPE:  </span>{formType || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>DIVISION:  </span>{divName || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>COMMUNITY:  </span>{commName || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3, wordBreak: "break-all" }}>
                                      <span style={labelStyle}>PAGE URL:  </span>
                                      {pageUrl ? <a href={pageUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "none", fontSize: 11 }}>{pageUrl}</a> : valDash}
                                    </div>

                                    {/* ── Ad Attribution Section ── */}
                                    <div style={{ borderTop: "1px solid #27272a", marginBottom: 6, marginTop: 6 }} />
                                    <div style={{ fontSize: 10, color: "#525252", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>AD ATTRIBUTION</div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>CAMPAIGN:  </span>
                                      {campaignDisplay || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>AD PLATFORM:  </span>
                                      {adPlatform || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>SOURCE / MEDIUM:  </span>
                                      {sourceMedium || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>SEARCH TERM:  </span>
                                      {utmTerm || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3 }}>
                                      <span style={labelStyle}>AD CONTENT:  </span>
                                      {utmContent || "—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3, wordBreak: "break-all" }}>
                                      <span style={labelStyle}>CLICK ID:  </span>
                                      {clickId ? `${clickIdType}: ${clickId}` : "—"}
                                    </div>

                                    <div style={{ borderTop: "1px solid #27272a", marginBottom: 8, marginTop: 6 }} />
                                    <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>DETAILS:</div>
                                    <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                      {bodyText || "—"}
                                    </div>
                                  </>
                                );
                              })()}

                              {/* ── Schellie Conversation Drawer ── */}
                              {isSchellie && (() => {
                                let sMeta: Record<string, unknown> = {};
                                try { sMeta = typeof a.metadata === "string" ? JSON.parse(a.metadata) : (a.metadata ?? {}); } catch { /* */ }
                                const convo = (sMeta.conversation as Array<{ role: string; content: string }>) || [];
                                const msgCount = (sMeta.message_count as number) || convo.length;
                                const duration = (sMeta.duration_seconds as number) || 0;
                                const durationStr = duration > 60 ? `${Math.round(duration / 60)}m ${duration % 60}s` : `${duration}s`;
                                const commName = (sMeta.community_name as string) || "";
                                const divName = (sMeta.division_name as string) || "";
                                const motivation = (sMeta.motivation as string) || "";
                                const visitInterest = sMeta.visit_interest as boolean;
                                const labelStyle = { fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#71717a", fontSize: 10 };

                                // Build AI summary
                                const budget = (sMeta.budget as string) || "";
                                const summaryParts: string[] = [];
                                if (motivation) summaryParts.push(motivation);
                                if (commName) summaryParts.push(`Interested in ${commName}.`);
                                if (budget) summaryParts.push(`Budget: ${budget}.`);
                                if (visitInterest) summaryParts.push("Wants to schedule a visit.");
                                if (summaryParts.length === 0 && convo.length > 0) {
                                  const userMsgs = convo.filter(msg => msg.role === "user").slice(-3);
                                  summaryParts.push(userMsgs.map(msg => msg.content).join(" | "));
                                }
                                const aiSummary = summaryParts.join(" ");

                                return (
                                  <>
                                    {/* AI Summary - green box */}
                                    {aiSummary && (
                                      <div style={{
                                        padding: "8px 10px", backgroundColor: "#052e16", border: "1px solid #166534",
                                        borderRadius: 6, marginBottom: 8,
                                      }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                                          <img src="/icons/activity/ai.svg" alt="" width={12} height={12} style={{ opacity: 0.8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                          <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>AI Summary</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>{aiSummary}</div>
                                      </div>
                                    )}
                                    <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>CONVERSATION:</div>
                                    {convo.length > 0 ? (
                                      <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: 8, backgroundColor: "#0c1929", borderRadius: 6, border: "1px solid #1e293b" }}>
                                        {convo.map((msg, ci) => {
                                          if (msg.content === "__greeting__") return null;
                                          const isAst = msg.role === "assistant";
                                          return (
                                            <div key={ci} style={{ display: "flex", justifyContent: isAst ? "flex-start" : "flex-end" }}>
                                              {isAst && (
                                                <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#9f1239", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 5, flexShrink: 0, marginTop: 2, fontSize: 9, color: "#fff", fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif" }}>S</div>
                                              )}
                                              <div style={{ maxWidth: "78%", padding: "6px 10px", borderRadius: isAst ? "4px 12px 12px 12px" : "12px 12px 4px 12px", backgroundColor: isAst ? "transparent" : "#1e3a5f", border: isAst ? "1px solid #1e293b" : "none", fontSize: 11, lineHeight: 1.5, color: "#d4d4d8" }}>
                                                {msg.content}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: 11, color: "#52525b", fontStyle: "italic" }}>No conversation data</div>
                                    )}
                                  </>
                                );
                              })()}

                              {/* ── SMS Drawer ── */}
                              {isSms && (
                                <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                  {a.body || "(no message)"}
                                </div>
                              )}

                              {/* ── Meeting Drawer ── */}
                              {isMeeting && (
                                <>
                                  {a.subject && (
                                    <div style={{ fontSize: 12, color: "#d4d4d8", fontWeight: 500, marginBottom: 4 }}>{a.subject}</div>
                                  )}
                                  {drawerDuration && (
                                    <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6 }}>{drawerDuration}</div>
                                  )}
                                  {a.body && (
                                    <>
                                      <div style={{ borderTop: "1px solid #27272a", marginBottom: 8 }} />
                                      <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                        {a.body}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}

                              {/* ── Generic Fallback Drawer ── */}
                              {!isPhone && !isEmail && !isWebForm && !isSchellie && !isSms && !isMeeting && (
                                <>
                                  {a.subject && (
                                    <div style={{ fontSize: 12, color: "#d4d4d8", fontWeight: 500, marginBottom: 4 }}>{a.subject}</div>
                                  )}
                                  {a.body && (
                                    <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                      {a.body}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Sentiment tag in drawer */}
                              {a.sentiment && (
                                <div style={{ fontSize: 10, color: "#71717a", marginTop: 8 }}>Sentiment: {a.sentiment}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div>
                {noteEntries.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                    {noteEntries.map((entry, i) => (
                      <div key={i}>
                        {entry.timestamp && <span style={{ fontSize: 10, color: "#7aafdf", marginRight: 6 }}>{entry.timestamp}</span>}
                        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{entry.text}</div>
                      </div>
                    ))}
                  </div>
                )}
                {editingNotes ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <textarea value={newNoteText} onChange={e => setNewNoteText(e.target.value)} rows={3}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} placeholder="Type a new note\u2026" autoFocus />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveNotes} disabled={savingNotes || !newNoteText.trim()}
                        style={{ ...smallBtnStyle, background: "#22c55e", color: "#000", border: "none", fontWeight: 600, opacity: savingNotes || !newNoteText.trim() ? 0.5 : 1 }}>
                        {savingNotes ? "Saving\u2026" : "Save"}</button>
                      <button onClick={() => { setEditingNotes(false); setNewNoteText(""); }} style={smallBtnStyle}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditingNotes(true)}
                    style={{ ...smallBtnStyle, fontSize: 10, padding: "3px 10px" }}>
                    {noteEntries.length > 0 ? "+ Add Note" : "Click to add notes\u2026"}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
