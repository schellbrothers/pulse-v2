"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  form_type_code: string;
  channel: string;
  subject: string | null;
  body: string;
  is_default: boolean;
  division_id: string | null;
  community_id: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

type Channel = "email_auto" | "email_personal" | "sms";

interface Division {
  id: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
  division_id: string;
}

interface ScopeState {
  divisionId: string | null;
  communityId: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORM_TYPES = [
  { code: "schedule_visit", label: "Schedule Visit" },
  { code: "subscribe_region", label: "Subscribe Region" },
  { code: "subscribe_community", label: "Subscribe Community" },
  { code: "prelaunch_community", label: "Prelaunch Community" },
  { code: "rsvp", label: "RSVP" },
  { code: "default", label: "Default" },
] as const;

const CHANNELS: { key: Channel; label: string; description: string }[] = [
  { key: "email_auto", label: "Auto-Confirmation", description: "SendGrid noreply@ — sent instantly" },
  { key: "email_personal", label: "Personal Follow-up", description: "OSC email via Outlook — 30-60 min later" },
  { key: "sms", label: "SMS", description: "Text message follow-up" },
];

const MERGE_VARS = [
  // Contact
  "{{first_name}}", "{{last_name}}", "{{email}}", "{{phone}}",
  // Community
  "{{community_name}}", "{{community_city}}", "{{community_state}}",
  "{{community_description}}", "{{community_url}}", "{{community_amenities}}",
  // Division
  "{{division_name}}",
  // Pricing
  "{{price_from}}", "{{price_to}}", "{{price_range}}",
  // HOA
  "{{hoa_fee}}", "{{hoa_display}}",
  // Lots
  "{{available_lots}}", "{{sold_lots}}", "{{total_lots}}",
  // Plans
  "{{plan_count}}", "{{plan_price_min}}", "{{plan_price_max}}",
  // Schools
  "{{school_district}}",
  // Type
  "{{is_55_plus}}",
  // Sales
  "{{sales_phone}}",
  // Team
  "{{osc_name}}", "{{osc_phone}}", "{{osc_email}}", "{{csm_name}}",
];

const SAMPLE_DATA: Record<string, string> = {
  "{{first_name}}": "Sarah",
  "{{community_name}}": "Cardinal Grove",
  "{{division_name}}": "Coastal",
  "{{osc_name}}": "Grace",
  "{{osc_phone}}": "(302) 555-0142",
  "{{osc_email}}": "grace@schellbrothers.com",
  "{{plans_from_price}}": "$425,000",
  "{{available_lots}}": "12",
};

// ─── Supabase client (browser) ───────────────────────────────────────────────

function getBrowserSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPreview(text: string): string {
  let out = text;
  for (const [k, v] of Object.entries(SAMPLE_DATA)) {
    out = out.replaceAll(k, v);
  }
  return out;
}

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  background: "#09090b",
  border: "1px solid #27272a",
  borderRadius: 4,
  color: "#fafafa",
  fontSize: 12,
  outline: "none",
  cursor: "pointer",
  minWidth: 160,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplatesClient({ templates: initial }: { templates: Template[] }) {
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<Template[]>(initial);
  const [selectedFormType, setSelectedFormType] = useState<string>(FORM_TYPES[0].code);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});

  // ── Scope state per channel card ──
  const [scopes, setScopes] = useState<Record<Channel, ScopeState>>({
    email_auto: { divisionId: null, communityId: null },
    email_personal: { divisionId: null, communityId: null },
    sms: { divisionId: null, communityId: null },
  });

  // ── Divisions & Communities ──
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    const sb = getBrowserSupabase();
    (async () => {
      const [divRes, comRes] = await Promise.all([
        sb.from("divisions").select("id, name").order("name"),
        sb.from("communities").select("id, name, division_id").order("name"),
      ]);
      if (divRes.data) setDivisions(divRes.data as Division[]);
      if (comRes.data) setCommunities(comRes.data as Community[]);
    })();
  }, []);

  // ── Resolve template for a channel given its current scope ──

  const resolveTemplate = useCallback(
    (channel: Channel): Template | undefined => {
      const scope = scopes[channel];
      const candidates = templates.filter(
        (t) => t.form_type_code === selectedFormType && t.channel === channel
      );

      // Community-scoped
      if (scope.communityId) {
        const match = candidates.find((t) => t.community_id === scope.communityId);
        if (match) return match;
        // Fall through to default (show default as starting point for new community override)
      }

      // Division-scoped
      if (scope.divisionId && !scope.communityId) {
        const match = candidates.find((t) => t.division_id === scope.divisionId && !t.community_id);
        if (match) return match;
        // Fall through to default
      }

      // Default (system-wide)
      return candidates.find((t) => t.is_default && !t.division_id && !t.community_id)
        ?? candidates.find((t) => t.is_default);
    },
    [templates, selectedFormType, scopes]
  );

  // ── Scope handlers ──

  const handleDivisionChange = useCallback(
    (channel: Channel, divisionId: string | null) => {
      setScopes((prev) => ({
        ...prev,
        [channel]: { divisionId, communityId: null },
      }));
      // Clear edits for the old template of this channel — user is switching scope
    },
    []
  );

  const handleCommunityChange = useCallback(
    (channel: Channel, communityId: string | null) => {
      setScopes((prev) => ({
        ...prev,
        [channel]: { ...prev[channel], communityId },
      }));
    },
    []
  );

  // ── Derived: communities for a selected division ──

  const communitiesForDivision = useCallback(
    (divisionId: string | null): Community[] => {
      if (!divisionId) return [];
      return communities.filter((c) => c.division_id === divisionId);
    },
    [communities]
  );

  // ── Handlers ──

  const getEdited = useCallback(
    (tpl: Template) => {
      const e = edits[tpl.id];
      return {
        subject: e?.subject ?? tpl.subject ?? "",
        body: e?.body ?? tpl.body ?? "",
      };
    },
    [edits]
  );

  const setField = useCallback(
    (id: string, field: "subject" | "body", value: string, tpl: Template) => {
      setEdits((prev) => ({
        ...prev,
        [id]: {
          subject: prev[id]?.subject ?? tpl.subject ?? "",
          body: prev[id]?.body ?? tpl.body ?? "",
          [field]: value,
        },
      }));
    },
    []
  );

  const handleSave = useCallback(
    async (tpl: Template, channel: Channel) => {
      const edited = edits[tpl.id];
      if (!edited) return;

      const scope = scopes[channel];
      const isScopedSave = !!(scope.divisionId || scope.communityId);

      // Determine if we're updating the existing template or upserting a scoped one
      const isExactMatch =
        (!scope.divisionId && !scope.communityId && tpl.is_default && !tpl.division_id && !tpl.community_id) ||
        (scope.divisionId && !scope.communityId && tpl.division_id === scope.divisionId && !tpl.community_id) ||
        (scope.communityId && tpl.community_id === scope.communityId);

      setSaving((p) => ({ ...p, [tpl.id]: true }));
      try {
        const sb = getBrowserSupabase();

        if (isExactMatch) {
          // Update existing template in place
          const updatePayload: Record<string, unknown> = {
            body: edited.body,
            updated_at: new Date().toISOString(),
          };
          if (tpl.channel !== "sms") {
            updatePayload.subject = edited.subject;
          }

          const { error } = await sb
            .from("response_templates")
            .update(updatePayload)
            .eq("id", tpl.id);

          if (error) throw error;

          setTemplates((prev) =>
            prev.map((t) => (t.id === tpl.id ? { ...t, ...updatePayload } : t))
          );
        } else if (isScopedSave) {
          // Create a new scoped template (upsert)
          const insertPayload: Record<string, unknown> = {
            org_id: "00000000-0000-0000-0000-000000000001",
            form_type_code: tpl.form_type_code,
            channel: tpl.channel,
            body: edited.body,
            is_default: false,
            is_active: true,
            division_id: scope.communityId
              ? (communities.find((c) => c.id === scope.communityId)?.division_id ?? scope.divisionId)
              : scope.divisionId,
            community_id: scope.communityId ?? null,
          };
          if (tpl.channel !== "sms") {
            insertPayload.subject = edited.subject;
          }

          const { data, error } = await sb
            .from("response_templates")
            .upsert(insertPayload, { onConflict: "form_type_code,channel,division_id,community_id" })
            .select()
            .single();

          if (error) {
            // Fallback: if upsert fails (no unique constraint), try insert
            const { data: insertData, error: insertError } = await sb
              .from("response_templates")
              .insert(insertPayload)
              .select()
              .single();
            if (insertError) throw insertError;
            if (insertData) {
              setTemplates((prev) => [...prev, insertData as Template]);
            }
          } else if (data) {
            setTemplates((prev) => {
              const exists = prev.some((t) => t.id === (data as Template).id);
              if (exists) return prev.map((t) => t.id === (data as Template).id ? data as Template : t);
              return [...prev, data as Template];
            });
          }
        }

        // Clear edits
        setEdits((prev) => {
          const next = { ...prev };
          delete next[tpl.id];
          return next;
        });

        showToast("Template saved", "success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Save failed";
        showToast(msg, "error");
      } finally {
        setSaving((p) => ({ ...p, [tpl.id]: false }));
      }
    },
    [edits, scopes, communities, showToast]
  );

  const handleReset = useCallback(
    (tpl: Template) => {
      setEdits((prev) => {
        const next = { ...prev };
        delete next[tpl.id];
        return next;
      });
    },
    []
  );

  const togglePreview = useCallback((id: string) => {
    setPreviewing((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  // ── Render ──

  const isDirty = (tpl: Template) => !!edits[tpl.id];

  // Check if the resolved template is an exact scope match or a fallback
  const isFallback = useCallback(
    (tpl: Template, channel: Channel): boolean => {
      const scope = scopes[channel];
      if (!scope.divisionId && !scope.communityId) return false; // default scope, no fallback
      if (scope.communityId) return tpl.community_id !== scope.communityId;
      if (scope.divisionId) return tpl.division_id !== scope.divisionId || !!tpl.community_id;
      return false;
    },
    [scopes]
  );

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fafafa", margin: 0 }}>
          Response Templates
        </h1>
        <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>
          Customize your auto-confirmations and personal follow-up messages per web form type.
        </p>
      </div>

      {/* Form Type Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: "1px solid #27272a",
          paddingBottom: 0,
          overflowX: "auto",
        }}
      >
        {FORM_TYPES.map((ft) => {
          const active = ft.code === selectedFormType;
          return (
            <button
              key={ft.code}
              onClick={() => { setSelectedFormType(ft.code); setScopes({ email_auto: { divisionId: null, communityId: null }, email_personal: { divisionId: null, communityId: null }, sms: { divisionId: null, communityId: null } }); setEdits({}); }}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "#fafafa" : "#a1a1aa",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid #59a6bd" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {ft.label}
            </button>
          );
        })}
      </div>

      {/* Template Cards — 3 columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {CHANNELS.map((ch) => {
          const tpl = resolveTemplate(ch.key);
          const scope = scopes[ch.key];
          const divCommunities = communitiesForDivision(scope.divisionId);

          if (!tpl) {
            return (
              <div
                key={ch.key}
                style={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fafafa" }}>{ch.label}</div>
                <p style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>{ch.description}</p>

                {/* Scope selector even when no template */}
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a" }}>Scope:</label>
                  <select
                    value={scope.divisionId ?? ""}
                    onChange={(e) => handleDivisionChange(ch.key, e.target.value || null)}
                    style={selectStyle}
                  >
                    <option value="">All Divisions (Default)</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {scope.divisionId && divCommunities.length > 0 && (
                    <>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a" }}>Community:</label>
                      <select
                        value={scope.communityId ?? ""}
                        onChange={(e) => handleCommunityChange(ch.key, e.target.value || null)}
                        style={selectStyle}
                      >
                        <option value="">All Communities</option>
                        {divCommunities.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: "#09090b",
                    borderRadius: 6,
                    textAlign: "center",
                    color: "#52525b",
                    fontSize: 13,
                  }}
                >
                  No template configured for this form type.
                </div>
              </div>
            );
          }

          const edited = getEdited(tpl);
          const dirty = isDirty(tpl);
          const isSaving = saving[tpl.id] ?? false;
          const isPreview = previewing[tpl.id] ?? false;
          const isSms = ch.key === "sms";
          const showFallback = isFallback(tpl, ch.key);

          return (
            <div
              key={ch.key}
              style={{
                background: "#18181b",
                border: dirty ? "1px solid #59a6bd" : (!showFallback && !!(tpl.division_id || tpl.community_id)) ? "1px solid #c2410c" : showFallback ? "1px solid #59a6bd" : "1px solid #27272a",
                borderRadius: 8,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.15s",
              }}
            >
              {/* Card Header */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fafafa" }}>
                    {ch.label}
                  </div>
                  {dirty && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#59a6bd",
                        background: "rgba(89,166,189,0.15)",
                        padding: "2px 6px",
                        borderRadius: 3,
                      }}
                    >
                      Modified
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>{ch.description}</p>
              </div>

              {/* Scope Selector */}
              <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a" }}>Scope:</label>
                <select
                  value={scope.divisionId ?? ""}
                  onChange={(e) => handleDivisionChange(ch.key, e.target.value || null)}
                  style={selectStyle}
                >
                  <option value="">All Divisions (Default)</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {scope.divisionId && divCommunities.length > 0 && (
                  <>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a" }}>Community:</label>
                    <select
                      value={scope.communityId ?? ""}
                      onChange={(e) => handleCommunityChange(ch.key, e.target.value || null)}
                      style={selectStyle}
                    >
                      <option value="">All Communities</option>
                      {divCommunities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Fallback notice */}
              {showFallback && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "6px 10px",
                    background: "rgba(89,166,189,0.08)",
                    border: "1px solid rgba(89,166,189,0.2)",
                    borderRadius: 4,
                    fontSize: 11,
                    color: "#59a6bd",
                  }}
                >
                  No override for this scope — showing default. Edit and save to create an override.
                </div>
              )}
              {/* Override active banner — show when template itself has a division/community scope */}
              {!showFallback && !!(tpl.division_id || tpl.community_id) && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "8px 12px",
                    background: "rgba(194,65,12,0.15)",
                    border: "1px solid #c2410c",
                    borderRadius: 4,
                    fontSize: 11,
                    color: "#fb923c",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🟠 Override active — edits here only apply to this {tpl.community_id ? "Community" : "Division"}.
                </div>
              )}

              {/* Subject (email only) */}
              {!isSms && (
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", display: "block", marginBottom: 4 }}
                  >
                    Subject
                  </label>
                  {isPreview ? (
                    <div
                      style={{
                        padding: "8px 10px",
                        background: "#09090b",
                        borderRadius: 4,
                        fontSize: 13,
                        color: "#fafafa",
                        border: "1px solid #27272a",
                        minHeight: 36,
                      }}
                    >
                      {renderPreview(edited.subject)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={edited.subject}
                      onChange={(e) => setField(tpl.id, "subject", e.target.value, tpl)}
                      placeholder="Email subject line..."
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "#09090b",
                        border: "1px solid #27272a",
                        borderRadius: 4,
                        color: "#fafafa",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              )}

              {/* Body */}
              <div style={{ marginBottom: 12, flex: 1 }}>
                <label
                  style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", display: "block", marginBottom: 4 }}
                >
                  Body
                </label>
                {isPreview ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "#09090b",
                      borderRadius: 4,
                      fontSize: 13,
                      color: "#fafafa",
                      border: "1px solid #27272a",
                      minHeight: 140,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {renderPreview(edited.body)}
                  </div>
                ) : (
                  <textarea
                    value={edited.body}
                    onChange={(e) => setField(tpl.id, "body", e.target.value, tpl)}
                    placeholder="Template body..."
                    rows={8}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      color: "#fafafa",
                      fontSize: 13,
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                      boxSizing: "border-box",
                    }}
                  />
                )}
              </div>

              {/* Merge Variables */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#52525b", marginBottom: 6 }}>
                  Merge Variables
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {MERGE_VARS.map((v) => (
                    <span
                      key={v}
                      style={{
                        fontSize: 11,
                        color: "#71717a",
                        background: "#09090b",
                        padding: "2px 6px",
                        borderRadius: 3,
                        border: "1px solid #27272a",
                        cursor: "default",
                        fontFamily: "monospace",
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => handleSave(tpl, ch.key)}
                  disabled={!dirty || isSaving}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "none",
                    cursor: dirty && !isSaving ? "pointer" : "default",
                    background: dirty ? "#59a6bd" : "#27272a",
                    color: dirty ? "#09090b" : "#52525b",
                    transition: "background 0.15s",
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving ? "Saving…" : showFallback ? "Save Override" : "Save"}
                </button>
                <button
                  onClick={() => handleReset(tpl)}
                  disabled={!dirty}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 4,
                    border: "1px solid #27272a",
                    cursor: dirty ? "pointer" : "default",
                    background: "transparent",
                    color: dirty ? "#a1a1aa" : "#3f3f46",
                    transition: "color 0.15s",
                  }}
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => togglePreview(tpl.id)}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 4,
                    border: isPreview ? "1px solid #59a6bd" : "1px solid #27272a",
                    cursor: "pointer",
                    background: isPreview ? "rgba(89,166,189,0.1)" : "transparent",
                    color: isPreview ? "#59a6bd" : "#a1a1aa",
                    transition: "all 0.15s",
                    marginLeft: "auto",
                  }}
                >
                  {isPreview ? "✎ Edit" : "👁 Preview"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
