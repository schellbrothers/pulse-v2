/**
 * CRM API — Agent-First Execution Layer
 * 
 * This is the ONLY way actions get executed.
 * UI calls this API. Agents call this API. Same pathway.
 * 
 * POST /api/crm
 * Body: { action: "assign_opportunity", params: {...}, context: {...} }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Lazy Supabase client
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

const ORG_ID = "00000000-0000-0000-0000-000000000001";

// ─── Action Context ───────────────────────────────────────────────────────────

interface ActionContext {
  triggered_by: "human" | "agent";
  agent_name?: string;
  confidence_score?: number;
  reasoning?: string;
  user_id?: string;
}

// ─── Action Logger ────────────────────────────────────────────────────────────

async function logAction(
  action_type: string,
  entity_type: string,
  entity_id: string,
  ctx: ActionContext,
  details?: Record<string, unknown>
) {
  const supabase = getSupabase();
  await supabase.from("action_log").insert({
    org_id: ORG_ID,
    action_type,
    entity_type,
    entity_id,
    triggered_by: ctx.triggered_by,
    agent_name: ctx.agent_name ?? null,
    user_id: ctx.user_id ?? null,
    confidence_score: ctx.confidence_score ?? null,
    reasoning: ctx.reasoning ?? null,
    details: details ?? null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function evaluateQueueItem(opportunity_id: string, ctx: ActionContext) {
  const supabase = getSupabase();
  
  const { data: opp } = await supabase
    .from("opportunities")
    .select("*, contacts(first_name, last_name, email, phone), communities(name, price_from)")
    .eq("id", opportunity_id)
    .single();

  if (!opp) return { success: false, error: "Opportunity not found" };

  // Check prior state
  const { data: priorOpps } = await supabase
    .from("opportunities")
    .select("crm_stage, community_id, communities(name)")
    .eq("contact_id", opp.contact_id)
    .neq("id", opportunity_id)
    .neq("crm_stage", "queue")
    .eq("is_active", true);

  const prior = priorOpps?.[0] as Record<string, unknown> | undefined;
  const priorStage = prior?.crm_stage as string | null ?? null;
  const priorCommunity = (prior?.communities as Record<string, unknown>)?.name as string | null ?? null;
  const isNew = !priorOpps || priorOpps.length === 0;

  const formType = opp.opportunity_source ?? "unknown";
  const communityName = (opp as Record<string, unknown>).communities 
    ? ((opp as Record<string, unknown>).communities as Record<string, unknown>)?.name as string 
    : null;
  let stage = "lead_div";
  let commId = opp.community_id;
  let confidence = 70;
  let reasoning = "";

  if (formType === "schedule_visit" || formType === "schedule_appt" || formType === "in_person_traffic") {
    stage = "prospect_c"; confidence = 88;
    reasoning = `Requested visit${communityName ? ` at ${communityName}` : ""}. High intent.`;
  } else if (formType === "prelaunch_community" || formType === "subscribe_community") {
    stage = "lead_com"; confidence = 82;
    reasoning = `Community interest${communityName ? ` in ${communityName}` : ""}.`;
  } else if (formType === "subscribe_region") {
    stage = "lead_div"; commId = null; confidence = 90;
    reasoning = "Division subscription. No community preference.";
  } else if (formType === "rsvp") {
    stage = "lead_com"; confidence = 75;
    reasoning = `RSVP for event${communityName ? ` at ${communityName}` : ""}.`;
  } else {
    stage = opp.community_id ? "lead_com" : "lead_div";
    confidence = 65;
    reasoning = `Form: ${formType}. Default to lead.`;
  }

  if (!isNew && priorStage) {
    reasoning += ` Existing: was ${priorStage}${priorCommunity ? ` at ${priorCommunity}` : ""}.`;
  }

  const result = {
    opportunity_id,
    contact_name: `${(opp as Record<string, unknown>).contacts ? ((opp as Record<string, unknown>).contacts as Record<string, unknown>).first_name : ""}`.trim(),
    form_type: formType,
    community_name: communityName,
    is_new_contact: isNew,
    prior_stage: priorStage,
    prior_community: priorCommunity,
    recommendation: { stage, community_id: commId, confidence, reasoning },
  };

  await logAction("evaluate_queue_item", "opportunity", opportunity_id, { ...ctx, confidence_score: confidence / 100, reasoning }, result);
  return { success: true, data: result };
}

async function assignOpportunity(
  opportunity_id: string, new_stage: string, community_id: string | null, reason: string, ctx: ActionContext
) {
  const supabase = getSupabase();
  
  const { data: opp } = await supabase
    .from("opportunities")
    .select("crm_stage, contact_id, division_id")
    .eq("id", opportunity_id)
    .single();

  if (!opp) return { success: false, error: "Not found" };

  const update: Record<string, unknown> = {
    crm_stage: new_stage,
    last_activity_at: new Date().toISOString(),
  };
  if (community_id !== undefined) update.community_id = community_id;
  if (new_stage === "lead_div") update.community_id = null;

  const { error } = await supabase.from("opportunities").update(update).eq("id", opportunity_id);
  if (error) return { success: false, error: error.message };

  const { data: transition } = await supabase.from("stage_transitions").insert({
    org_id: ORG_ID,
    opportunity_id,
    contact_id: opp.contact_id,
    from_stage: opp.crm_stage,
    to_stage: new_stage,
    triggered_by: ctx.triggered_by,
    triggered_by_user_id: ctx.user_id ?? null,
    reason: reason || ctx.reasoning || null,
    score_at_transition: ctx.confidence_score ?? null,
    agent_name: ctx.agent_name ?? null,
  }).select("id").single();

  await logAction("assign_opportunity", "opportunity", opportunity_id, ctx, {
    from_stage: opp.crm_stage, to_stage: new_stage, community_id, reason,
  });

  return { success: true, data: { from_stage: opp.crm_stage, to_stage: new_stage, transition_id: transition?.id } };
}

async function sendEmail(
  contact_id: string, opportunity_id: string | null, subject: string, body: string, ctx: ActionContext
) {
  const supabase = getSupabase();
  
  // Validate email before sending
  const { data: contact } = await supabase.from("contacts").select("email").eq("id", contact_id).single();
  const email = (contact?.email ?? "").trim().toLowerCase();
  if (email) {
    const domain = email.split("@")[1] ?? "";
    const disposable = new Set(["mailinator.com","guerrillamail.com","tempmail.com","yopmail.com","sharklasers.com"]);
    if (disposable.has(domain)) {
      // Auto-delete junk contact
      await supabase.from("opportunities").update({ crm_stage: "deleted", is_active: false }).eq("contact_id", contact_id);
      await logAction("auto_delete_junk", "contact", contact_id, { ...ctx, agent_name: "email_validator" }, { reason: `Disposable domain: ${domain}` });
      return { success: false, error: `Junk email detected (${domain}). Contact auto-deleted.` };
    }
  }
  
  const { data, error } = await supabase.from("activities").insert({
    org_id: ORG_ID, contact_id, opportunity_id,
    channel: "email", direction: "outbound", type: "email",
    subject, body, occurred_at: new Date().toISOString(),
    is_read: true, needs_response: false,
    triggered_by: ctx.triggered_by, agent_name: ctx.agent_name,
  }).select("id").single();

  if (error) return { success: false, error: error.message };
  await logAction("send_email", "activity", data?.id ?? "", ctx, { contact_id, subject });
  return { success: true, data: { activity_id: data?.id } };
}

async function sendSms(
  contact_id: string, opportunity_id: string | null, body: string, ctx: ActionContext
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("activities").insert({
    org_id: ORG_ID, contact_id, opportunity_id,
    channel: "text", direction: "outbound", type: "text",
    subject: `SMS: ${body.substring(0, 80)}`, body,
    occurred_at: new Date().toISOString(),
    is_read: true, needs_response: false,
    triggered_by: ctx.triggered_by, agent_name: ctx.agent_name,
  }).select("id").single();

  if (error) return { success: false, error: error.message };
  await logAction("send_sms", "activity", data?.id ?? "", ctx, { contact_id });
  return { success: true, data: { activity_id: data?.id } };
}

async function generateResponse(opportunity_id: string, ctx: ActionContext) {
  const supabase = getSupabase();
  const { data: opp } = await supabase
    .from("opportunities")
    .select("*, contacts(first_name, last_name, email, phone), communities(name, price_from)")
    .eq("id", opportunity_id)
    .single();

  if (!opp) return { success: false, error: "Not found" };

  const firstName = (opp as any).contacts?.first_name ?? "there";
  const communityName = (opp as any).communities?.name ?? "our communities";
  const formType = opp.opportunity_source ?? "unknown";
  const priceFrom = (opp as any).communities?.price_from;

  // TODO: Look up response_templates table for user-customized templates
  let emailSubject = "", emailBody = "", smsBody = "";

  if (formType === "schedule_visit" || formType === "schedule_appt") {
    emailSubject = `Your Visit to ${communityName}`;
    emailBody = `Hi ${firstName}!\n\nThank you for wanting to visit ${communityName}!${priceFrom ? ` Plans start from $${(priceFrom/1000).toFixed(0)}K.` : ""}\n\nWhat day and time works best? We're available weekdays and weekends 10am-5pm.\n\nLooking forward to meeting you!`;
    smsBody = `Hi ${firstName}! Thanks for wanting to visit ${communityName}! 🏡 When would you like to come by?`;
  } else if (formType === "subscribe_region") {
    emailSubject = "Welcome — Schell Brothers";
    emailBody = `Hi ${firstName}!\n\nThank you for your interest in Schell Brothers. We have incredible communities and I'd love to help you explore what's available.\n\nWould you like to schedule a call or visit?`;
    smsBody = `Hi ${firstName}! Thanks for your interest in Schell Brothers! Would you like to chat about what we have available? 😊`;
  } else if (formType === "prelaunch_community" || formType === "subscribe_community") {
    emailSubject = `${communityName} — We'll Keep You Updated!`;
    emailBody = `Hi ${firstName}!\n\nThank you for your interest in ${communityName}!${priceFrom ? ` Plans start from $${(priceFrom/1000).toFixed(0)}K.` : ""}\n\nI'll make sure you're first to know about new releases and incentives.\n\nWant to schedule a visit?`;
    smsBody = `Hi ${firstName}! Thanks for your interest in ${communityName}! 🏡 Want to schedule a visit?`;
  } else {
    emailSubject = "Thanks for Reaching Out — Schell Brothers";
    emailBody = `Hi ${firstName}!\n\nThank you for reaching out. I'd love to help with your home search.\n\nWould you like to schedule a call?`;
    smsBody = `Hi ${firstName}! Thanks for reaching out to Schell Brothers! When's a good time to chat? 😊`;
  }

  return { success: true, data: { email: { subject: emailSubject, body: emailBody }, sms: { body: smsBody }, form_type: formType } };
}

async function updateContact(contact_id: string, updates: Record<string, unknown>, ctx: ActionContext) {
  const supabase = getSupabase();
  const { error } = await supabase.from("contacts").update(updates).eq("id", contact_id);
  if (error) return { success: false, error: error.message };
  await logAction("update_contact", "contact", contact_id, ctx, updates);
  return { success: true, data: { contact_id, updated: Object.keys(updates) } };
}

async function markRead(activity_id: string, ctx: ActionContext) {
  const supabase = getSupabase();
  const { error } = await supabase.from("activities").update({
    is_read: true, read_at: new Date().toISOString(), read_by_user_id: ctx.user_id ?? null,
  }).eq("id", activity_id);
  if (error) return { success: false, error: error.message };
  await logAction("mark_read", "activity", activity_id, ctx);
  return { success: true, data: { activity_id } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════


async function cleanseJunk(ctx: ActionContext) {
  const supabase = getSupabase();
  
  // Get all contacts with their emails
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name");
  
  if (!contacts) return { success: false, error: "Failed to fetch contacts" };

  // Import validation
  const disposable = new Set(["mailinator.com","guerrillamail.com","tempmail.com","yopmail.com","sharklasers.com","10minutemail.com","trashmail.com","fakeinbox.com","maildrop.cc"]);
  const fakePatterns = [/^test@/i, /^fake@/i, /^asdf/i, /^aaa+@/i, /^xxx+@/i, /^noreply@/i];
  
  const junk: { id: string; email: string | null; name: string; reason: string }[] = [];
  
  for (const c of contacts) {
    const email = (c.email ?? "").trim().toLowerCase();
    const name = `${c.first_name} ${c.last_name}`.trim().toLowerCase();
    
    // Check email
    if (email) {
      const domain = email.split("@")[1] ?? "";
      if (disposable.has(domain)) {
        junk.push({ id: c.id, email: c.email, name: `${c.first_name} ${c.last_name}`, reason: `Disposable domain: ${domain}` });
        continue;
      }
      for (const p of fakePatterns) {
        if (p.test(email)) {
          junk.push({ id: c.id, email: c.email, name: `${c.first_name} ${c.last_name}`, reason: "Fake email pattern" });
          break;
        }
      }
    }
    
    // Check name
    if (name.length <= 1 || name === "test" || name === "asdf") {
      junk.push({ id: c.id, email: c.email, name: `${c.first_name} ${c.last_name}`, reason: "Junk name" });
    }
  }
  
  // Dedupe
  const seen = new Set<string>();
  const unique = junk.filter(j => { if (seen.has(j.id)) return false; seen.add(j.id); return true; });
  
  // Auto-delete: move their opportunities to "deleted" stage
  let deleted = 0;
  for (const j of unique) {
    const { data: opps } = await supabase
      .from("opportunities")
      .select("id, crm_stage")
      .eq("contact_id", j.id)
      .neq("crm_stage", "deleted");
    
    if (opps && opps.length > 0) {
      for (const opp of opps) {
        await supabase.from("opportunities").update({ crm_stage: "deleted", is_active: false }).eq("id", opp.id);
        await supabase.from("stage_transitions").insert({
          org_id: ORG_ID, opportunity_id: opp.id, contact_id: j.id,
          from_stage: opp.crm_stage, to_stage: "deleted",
          triggered_by: ctx.triggered_by, agent_name: ctx.agent_name ?? "cleanse_agent",
          reason: j.reason,
        });
        deleted++;
      }
    }
  }
  
  await logAction("cleanse_junk", "system", "batch", ctx, { found: unique.length, deleted, junk: unique });
  
  return { success: true, data: { found: unique.length, deleted, junk: unique } };
}

const TOOLS: Record<string, (params: Record<string, unknown>, ctx: ActionContext) => Promise<Record<string, unknown>>> = {
  evaluate_queue_item: (p, c) => evaluateQueueItem(p.opportunity_id as string, c),
  assign_opportunity: (p, c) => assignOpportunity(p.opportunity_id as string, p.new_stage as string, p.community_id as string | null, p.reason as string, c),
  send_email: (p, c) => sendEmail(p.contact_id as string, p.opportunity_id as string | null, p.subject as string, p.body as string, c),
  send_sms: (p, c) => sendSms(p.contact_id as string, p.opportunity_id as string | null, p.body as string, c),
  generate_response: (p, c) => generateResponse(p.opportunity_id as string, c),
  promote_opportunity: (p, c) => assignOpportunity(p.opportunity_id as string, p.new_stage as string, undefined as unknown as string, p.reason as string, c),
  demote_opportunity: (p, c) => assignOpportunity(p.opportunity_id as string, p.new_stage as string, undefined as unknown as string, p.reason as string, c),
  update_contact: (p, c) => updateContact(p.contact_id as string, p.updates as Record<string, unknown>, c),
  mark_read: (p, c) => markRead(p.activity_id as string, c),
  cleanse_junk: (_p, c) => cleanseJunk(c),
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, params, context } = body;

    if (!action || !TOOLS[action]) {
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    const ctx: ActionContext = {
      triggered_by: context?.triggered_by ?? "human",
      agent_name: context?.agent_name ?? null,
      confidence_score: context?.confidence_score ?? null,
      reasoning: context?.reasoning ?? null,
      user_id: context?.user_id ?? null,
    };

    const result = await TOOLS[action](params ?? {}, ctx);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
