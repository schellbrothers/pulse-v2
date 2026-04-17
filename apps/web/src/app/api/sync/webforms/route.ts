//
// Web Form Sync Cron — /api/sync/webforms
//
// Polls Heartbeat (HBv1) every 5 minutes for new web form submissions
// and ingests them into the Pv2 CRM pipeline.
//
// Vercel Cron schedule: every 5 minutes
//

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase (service role — bypasses RLS) ─────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── Constants ──────────────────────────────────────────────────────────────

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const HB_TOKEN = "b55895137b442f35a82f64c7bd254dcc5d2195218d6269e741309dbdc0463dad";
const HB_BASE = "https://heartbeat.schellbrothers.com";

/** Default start date — only pull forms from April 17 2026 onward */
const DEFAULT_SINCE = "2026-04-17T00:00:00-04:00";

// HBv1 division_id → Pv1 code for lookup
const HB_DIVISION_MAP: Record<number, string> = {
  1: "DE", // Delaware Beaches
  2: "VA", // Richmond
  4: "TN", // Nashville
};

// Form type → initial CRM stage
function stageForFormType(formTypeCode: string): string {
  switch (formTypeCode) {
    case "subscribe_region":
      return "lead_div"; // division-level interest, no community
    case "prelaunch_community":
      return "lead_com"; // interested in specific community
    case "schedule_visit":
    case "contact_us":
    case "branchout":
      return "queue"; // high intent — OSC should act
    default:
      return "queue"; // default to queue so OSC sees it
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return { first_name: "Unknown", last_name: "" };
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { first_name: trimmed, last_name: "" };
  return {
    first_name: trimmed.substring(0, spaceIdx),
    last_name: trimmed.substring(spaceIdx + 1).trim(),
  };
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 10 ? `+${digits}` : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

// ─── Division / Community Lookup ────────────────────────────────────────────

async function resolveDivision(
  hbDivId: number | null | undefined
): Promise<string | null> {
  if (!hbDivId) return null;
  const code = HB_DIVISION_MAP[hbDivId];
  if (!code) return null;
  const { data } = await supabase
    .from("divisions")
    .select("id")
    .eq("org_id", ORG_ID)
    .eq("code", code)
    .limit(1)
    .single();
  return data?.id ?? null;
}

async function resolveCommunity(
  hbCommId: number | boolean | null | undefined
): Promise<string | null> {
  // HBv1 sends false/0/null when there's no community
  if (!hbCommId || hbCommId === true) return null;
  const numId = typeof hbCommId === "number" ? hbCommId : Number(hbCommId);
  if (isNaN(numId) || numId === 0) return null;
  const { data } = await supabase
    .from("communities")
    .select("id")
    .eq("org_id", ORG_ID)
    .eq("pv1_community_id", numId)
    .limit(1)
    .single();
  return data?.id ?? null;
}

// ─── Contact Matching ───────────────────────────────────────────────────────

interface MatchedContact {
  id: string;
  matched_on: "email" | "phone" | "name" | "new";
}

async function findOrCreateContact(
  email: string | null,
  phone: string | null,
  firstName: string,
  lastName: string
): Promise<MatchedContact> {
  // 1. Match by email
  if (email) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("org_id", ORG_ID)
      .or(`email.eq.${email},email_secondary.eq.${email}`)
      .limit(1);
    if (data && data.length > 0) {
      // Backfill phone if missing
      if (phone) {
        await supabase
          .from("contacts")
          .update({ phone: phone })
          .eq("id", data[0].id)
          .is("phone", null);
      }
      return { id: data[0].id, matched_on: "email" };
    }
  }

  // 2. Match by phone
  if (phone) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("org_id", ORG_ID)
      .or(`phone.eq.${phone},phone_secondary.eq.${phone}`)
      .limit(1);
    if (data && data.length > 0) {
      // Backfill email if missing
      if (email) {
        await supabase
          .from("contacts")
          .update({ email: email })
          .eq("id", data[0].id)
          .is("email", null);
      }
      return { id: data[0].id, matched_on: "phone" };
    }
  }

  // 3. Match by name
  if (firstName) {
    let q = supabase
      .from("contacts")
      .select("id")
      .eq("org_id", ORG_ID)
      .ilike("first_name", firstName);
    if (lastName) q = q.ilike("last_name", lastName);
    const { data } = await q.limit(1);
    if (data && data.length > 0) {
      return { id: data[0].id, matched_on: "name" };
    }
  }

  // 4. Create new contact
  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      org_id: ORG_ID,
      first_name: firstName,
      last_name: lastName || "",
      email,
      phone,
      source: "webform",
      lifecycle: "lead",
    })
    .select("id")
    .single();

  if (error || !newContact) {
    throw new Error(`Failed to create contact: ${error?.message}`);
  }

  // Create primary member
  await supabase.from("contact_members").insert({
    contact_id: newContact.id,
    role: "primary",
    first_name: firstName,
    last_name: lastName || "",
    email,
    phone,
    is_primary: true,
  });

  return { id: newContact.id, matched_on: "new" };
}

// ─── Single Form Processing ─────────────────────────────────────────────────

interface HBForm {
  record_id: number | string;
  name: string;
  email: string;
  phone: string;
  division_id: number;
  community_id: number | boolean | null;
  form_type_code: string;
  form_type: string;
  interested_in: string;
  created_at: string;
  [key: string]: unknown;
}

interface ProcessResult {
  record_id: number | string;
  status: "created" | "existing" | "skipped" | "error";
  contact_id?: string;
  error?: string;
}

async function processForm(form: HBForm): Promise<ProcessResult> {
  const recordId = String(form.record_id);

  // ── Dedup: check if we already processed this record_id
  const { data: existingActivity } = await supabase
    .from("activities")
    .select("id")
    .eq("external_message_id", recordId)
    .eq("channel", "webform")
    .limit(1);

  if (existingActivity && existingActivity.length > 0) {
    return { record_id: form.record_id, status: "skipped" };
  }

  // ── Parse fields
  const { first_name, last_name } = parseName(form.name);
  const email = normalizeEmail(form.email);
  const phone = normalizePhone(form.phone);
  const divisionId = await resolveDivision(form.division_id);
  const communityId = await resolveCommunity(form.community_id);
  const initialStage = stageForFormType(form.form_type_code);

  // ── Find or create contact
  const contact = await findOrCreateContact(email, phone, first_name, last_name);
  const isNew = contact.matched_on === "new";

  // ── Opportunity handling
  let opportunityId: string | null = null;

  if (communityId) {
    // Check for existing opportunity at this community
    const { data: existingOpp } = await supabase
      .from("opportunities")
      .select("id, crm_stage")
      .eq("contact_id", contact.id)
      .eq("community_id", communityId)
      .eq("is_active", true)
      .limit(1);

    if (existingOpp && existingOpp.length > 0) {
      opportunityId = existingOpp[0].id;
      const stage = existingOpp[0].crm_stage as string;

      if (stage === "lead_div" || stage === "lead_com") {
        // Re-engaged → promote to queue
        await supabase
          .from("opportunities")
          .update({
            crm_stage: "queue",
            queue_source: "webform_reengaged",
            queued_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", opportunityId);
      } else {
        // Already in queue/prospect+ → just update timestamp
        await supabase
          .from("opportunities")
          .update({ last_activity_at: new Date().toISOString() })
          .eq("id", opportunityId);
      }
    } else {
      // No opportunity at this community → create new
      const { data: newOpp } = await supabase
        .from("opportunities")
        .insert({
          org_id: ORG_ID,
          contact_id: contact.id,
          crm_stage: initialStage === "lead_div" ? "lead_div" : initialStage,
          division_id: divisionId,
          community_id: communityId,
          source: "webform",
          opportunity_source: form.form_type_code,
          queue_source: initialStage === "queue" ? "webform_new" : undefined,
          queued_at:
            initialStage === "queue" ? new Date().toISOString() : undefined,
          last_activity_at: new Date().toISOString(),
          is_active: true,
        })
        .select("id")
        .single();
      opportunityId = newOpp?.id ?? null;
    }
  } else if (divisionId) {
    // Division-level lead (no community) — stage = lead_div
    const { data: existingOpp } = await supabase
      .from("opportunities")
      .select("id, crm_stage")
      .eq("contact_id", contact.id)
      .eq("division_id", divisionId)
      .is("community_id", null)
      .eq("is_active", true)
      .limit(1);

    if (existingOpp && existingOpp.length > 0) {
      opportunityId = existingOpp[0].id;
      // If in marketing, promote to queue on re-engagement
      if (existingOpp[0].crm_stage === "lead_div") {
        await supabase
          .from("opportunities")
          .update({
            crm_stage: "queue",
            queue_source: "webform_reengaged",
            queued_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", opportunityId);
      } else {
        await supabase
          .from("opportunities")
          .update({ last_activity_at: new Date().toISOString() })
          .eq("id", opportunityId);
      }
    } else {
      const stage = initialStage === "lead_com" ? "lead_div" : initialStage;
      // For lead_div stage, community_id is null which is valid per constraint
      // For queue stage with no community, we need to set community_id to satisfy constraint
      // Actually constraint says: crm_stage = 'lead_div' OR community_id IS NOT NULL
      // So only marketing can have null community. If stage is queue but no community,
      // use marketing instead (division-level interest with no specific community).
      const finalStage =
        stage !== "lead_div" && !communityId ? "lead_div" : stage;
      const { data: newOpp } = await supabase
        .from("opportunities")
        .insert({
          org_id: ORG_ID,
          contact_id: contact.id,
          crm_stage: finalStage,
          division_id: divisionId,
          community_id: null,
          source: "webform",
          opportunity_source: form.form_type_code,
          last_activity_at: new Date().toISOString(),
          is_active: true,
        })
        .select("id")
        .single();
      opportunityId = newOpp?.id ?? null;
    }
  }

  // ── Record activity
  const subject = [
    `Web form: ${form.form_type || form.form_type_code}`,
    form.interested_in ? `— ${form.interested_in}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  await supabase.from("activities").insert({
    org_id: ORG_ID,
    contact_id: contact.id,
    opportunity_id: opportunityId,
    channel: "webform",
    direction: "inbound",
    type: "webform",
    subject,
    body: JSON.stringify({
      form_type_code: form.form_type_code,
      form_type: form.form_type,
      interested_in: form.interested_in,
      raw_name: form.name,
      raw_email: form.email,
      raw_phone: form.phone,
      hb_division_id: form.division_id,
      hb_community_id: form.community_id,
    }),
    external_message_id: recordId,
    community_id: communityId,
    division_id: divisionId,
    occurred_at: form.created_at || new Date().toISOString(),
  });

  // ── Create task for OSC
  await supabase.from("tasks").insert({
    org_id: ORG_ID,
    contact_id: contact.id,
    opportunity_id: opportunityId,
    community_id: communityId,
    division_id: divisionId,
    title: `New web form — ${first_name} ${last_name} — ${form.form_type || form.form_type_code}`.trim(),
    description: form.interested_in || undefined,
    task_type: "action",
    channel: "webform",
    queue_bucket: "new_inbound",
    priority: "normal",
    status: "open",
    source: "sync_webforms",
  });

  return {
    record_id: form.record_id,
    status: isNew ? "created" : "existing",
    contact_id: contact.id,
  };
}

// ─── Main GET handler (Vercel Cron entry point) ─────────────────────────────

export async function GET(request: Request) {
  const startTime = Date.now();

  // ── Verify cron secret (Vercel sets CRON_SECRET header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow in dev / when no CRON_SECRET is set
    if (process.env.NODE_ENV === "production" && cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // ── Step 1: Get last sync timestamp
    const { data: lastSync } = await supabase
      .from("sync_log")
      .select("synced_at")
      .eq("source", "webforms")
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    const since = lastSync?.synced_at || DEFAULT_SINCE;

    // ── Step 2: Fetch from Heartbeat API
    const url = new URL(HB_BASE);
    url.searchParams.set("engine", "data-warehouse");
    url.searchParams.set("opt", "pulse2-lead-forms");
    url.searchParams.set("token", HB_TOKEN);
    url.searchParams.set("since", since);
    url.searchParams.set("maxrows", "100");

    const hbRes = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!hbRes.ok) {
      const body = await hbRes.text();
      console.error(
        `[webform-sync] Heartbeat API error: ${hbRes.status} ${body.substring(0, 200)}`
      );
      return NextResponse.json(
        { ok: false, error: `Heartbeat API returned ${hbRes.status}` },
        { status: 502 }
      );
    }

    const payload = await hbRes.json();
    const forms: HBForm[] = Array.isArray(payload)
      ? payload
      : payload?.data ?? payload?.results ?? [];

    // ── Step 3: Process each form
    let newContacts = 0;
    let existingMatched = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const form of forms) {
      try {
        const result = await processForm(form);
        switch (result.status) {
          case "created":
            newContacts++;
            break;
          case "existing":
            existingMatched++;
            break;
          case "skipped":
            skipped++;
            break;
        }
      } catch (err) {
        errors++;
        const msg =
          err instanceof Error ? err.message : String(err);
        errorDetails.push(
          `record_id=${form.record_id}: ${msg}`
        );
        console.error(
          `[webform-sync] Error processing record_id=${form.record_id}:`,
          msg
        );
      }
    }

    // ── Step 4: Update sync_log
    const processed = newContacts + existingMatched;
    await supabase.from("sync_log").insert({
      source: "webforms",
      synced_at: new Date().toISOString(),
      rows_synced: processed,
      metadata: {
        fetched: forms.length,
        new_contacts: newContacts,
        existing_matched: existingMatched,
        skipped,
        errors,
        error_details: errorDetails.length > 0 ? errorDetails : undefined,
        since,
        duration_ms: Date.now() - startTime,
      },
    });

    const summary = {
      ok: true,
      synced: processed,
      new_contacts: newContacts,
      existing: existingMatched,
      skipped,
      errors,
      fetched: forms.length,
      since,
      duration_ms: Date.now() - startTime,
    };

    console.log(`[webform-sync] ${JSON.stringify(summary)}`);

    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[webform-sync] Fatal error: ${msg}`);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
