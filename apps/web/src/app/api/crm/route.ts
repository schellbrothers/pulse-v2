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
    .select("*, contacts(first_name, last_name, email, phone), communities(name, price_from, price_to, hoa_fee, hoa_period, is_55_plus, city, state, school_district, amenities, sales_phone, page_url, short_description, status), divisions(name, region)")
    .eq("id", opportunity_id)
    .single();

  // Get lot stats for this community
  let lotsAvailable = 0, lotsSold = 0, lotsTotal = 0;
  if (opp?.community_id) {
    // Community-level: lots for this community
    const { data: lotData } = await supabase
      .from("lots")
      .select("is_available, lot_status")
      .eq("community_id", opp.community_id);
    if (lotData) {
      lotsTotal = lotData.length;
      lotsAvailable = lotData.filter((l: Record<string, unknown>) => l.is_available).length;
      lotsSold = lotData.filter((l: Record<string, unknown>) => l.lot_status === "sold").length;
    }
  } else if (opp?.division_id) {
    // Division-level: aggregate lots across ALL communities in division
    const { data: divComms } = await supabase
      .from("communities")
      .select("id")
      .eq("division_id", opp.division_id);
    if (divComms && divComms.length > 0) {
      const commIds = divComms.map((c: Record<string, unknown>) => c.id as string);
      const { data: lotData } = await supabase
        .from("lots")
        .select("is_available, lot_status")
        .in("community_id", commIds);
      if (lotData) {
        lotsTotal = lotData.length;
        lotsAvailable = lotData.filter((l: Record<string, unknown>) => l.is_available).length;
        lotsSold = lotData.filter((l: Record<string, unknown>) => l.lot_status === "sold").length;
      }
    }
  }

  // Get plan count + price range
  let planCount = 0, planPriceMin = 0, planPriceMax = 0;
  if (opp?.community_id) {
    const { data: plans } = await supabase
      .from("floor_plans")
      .select("net_price, base_price")
      .eq("community_id", opp.community_id);
    if (plans && plans.length > 0) {
      planCount = plans.length;
      const prices = plans.map((p: Record<string, unknown>) => (p.net_price ?? p.base_price ?? 0) as number).filter((p: number) => p > 0);
      if (prices.length > 0) {
        planPriceMin = Math.min(...prices);
        planPriceMax = Math.max(...prices);
      }
    }
  }

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

// TEST MODE: redirect all outbound emails to this address
const EMAIL_TEST_MODE = false;
const EMAIL_TEST_REDIRECT = "lance@schellbrothers.com";

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
  
  // Send via SendGrid
  const toEmail = EMAIL_TEST_MODE ? EMAIL_TEST_REDIRECT : (contact?.email ?? "");
  const sgSubject = EMAIL_TEST_MODE ? `[TEST] ${subject}` : subject;
  
  if (toEmail) {
    try {
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: "noreply@schellbrothers.com", name: "Schell Brothers" },
          subject: sgSubject,
          content: [{ type: "text/html", value: body }],
          tracking_settings: { open_tracking: { enable: true }, click_tracking: { enable: true } },
          categories: ["pv2_osc_response"],
        }),
      });
      console.log(`[sendEmail] SendGrid: ${sgRes.status} to ${toEmail}`);
    } catch (sgErr) {
      console.error("[sendEmail] SendGrid error:", sgErr);
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
    .select("*, contacts(first_name, last_name, email, phone), communities(name, price_from, price_to, hoa_fee, hoa_period, is_55_plus, city, state, school_district, amenities, sales_phone, page_url, short_description, status), divisions(name, region)")
    .eq("id", opportunity_id)
    .single();

  // Get lot stats for this community
  let lotsAvailable = 0, lotsSold = 0, lotsTotal = 0;
  if (opp?.community_id) {
    // Community-level: lots for this community
    const { data: lotData } = await supabase
      .from("lots")
      .select("is_available, lot_status")
      .eq("community_id", opp.community_id);
    if (lotData) {
      lotsTotal = lotData.length;
      lotsAvailable = lotData.filter((l: Record<string, unknown>) => l.is_available).length;
      lotsSold = lotData.filter((l: Record<string, unknown>) => l.lot_status === "sold").length;
    }
  } else if (opp?.division_id) {
    // Division-level: aggregate lots across ALL communities in division
    const { data: divComms } = await supabase
      .from("communities")
      .select("id")
      .eq("division_id", opp.division_id);
    if (divComms && divComms.length > 0) {
      const commIds = divComms.map((c: Record<string, unknown>) => c.id as string);
      const { data: lotData } = await supabase
        .from("lots")
        .select("is_available, lot_status")
        .in("community_id", commIds);
      if (lotData) {
        lotsTotal = lotData.length;
        lotsAvailable = lotData.filter((l: Record<string, unknown>) => l.is_available).length;
        lotsSold = lotData.filter((l: Record<string, unknown>) => l.lot_status === "sold").length;
      }
    }
  }

  // Get plan count + price range
  let planCount = 0, planPriceMin = 0, planPriceMax = 0;
  if (opp?.community_id) {
    const { data: plans } = await supabase
      .from("floor_plans")
      .select("net_price, base_price")
      .eq("community_id", opp.community_id);
    if (plans && plans.length > 0) {
      planCount = plans.length;
      const prices = plans.map((p: Record<string, unknown>) => (p.net_price ?? p.base_price ?? 0) as number).filter((p: number) => p > 0);
      if (prices.length > 0) {
        planPriceMin = Math.min(...prices);
        planPriceMax = Math.max(...prices);
      }
    }
  }

  if (!opp) return { success: false, error: "Not found" };

  const firstName = (opp as any).contacts?.first_name ?? "there";
  const communityName = (opp as any).communities?.name ?? "our communities";
  const formType = opp.opportunity_source ?? "unknown";
  const priceFrom = (opp as any).communities?.price_from;

  // Look up templates: division-specific first, then defaults
  const divId = opp.division_id;
  const { data: divTmpl } = await supabase.from("response_templates").select("*")
    .or(`form_type_code.eq.${formType},form_type_code.eq.default`)
    .eq("division_id", divId).eq("is_active", true);
  const { data: defTmpl } = await supabase.from("response_templates").select("*")
    .or(`form_type_code.eq.${formType},form_type_code.eq.default`)
    .eq("is_default", true).eq("is_active", true);
  const allTmpl = [...(divTmpl ?? []), ...(defTmpl ?? [])];

  const comm = (opp as Record<string, unknown>).communities as Record<string, unknown> | null;
  const div = (opp as Record<string, unknown>).divisions as Record<string, unknown> | null;
  const divisionName = (div?.name as string) ?? "our communities";
  const priceTo = (comm?.price_to as number) ?? 0;
  const hoaFee = comm?.hoa_fee as number | null;
  const hoaPeriod = (comm?.hoa_period as string) ?? "mo";
  const is55Plus = comm?.is_55_plus as boolean ?? false;
  const commCity = (comm?.city as string) ?? "";
  const commState = (comm?.state as string) ?? "";
  const schoolDistrict = (comm?.school_district as string) ?? "";
  const commAmenities = (comm?.amenities as string) ?? "";
  const salesPhone = (comm?.sales_phone as string) ?? "";
  const commUrl = (comm?.page_url as string) ?? "";
  const commDescription = (comm?.short_description as string) ?? "";
  const commStatus = (comm?.status as string) ?? "";

  function render(s: string): string {
    return s
      // Contact
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{last_name\}\}/g, (opp as any).contacts?.last_name ?? "")
      .replace(/\{\{email\}\}/g, (opp as any).contacts?.email ?? "")
      .replace(/\{\{phone\}\}/g, (opp as any).contacts?.phone ?? "")
      // Community
      .replace(/\{\{community_name\}\}/g, communityName)
      .replace(/\{\{community_city\}\}/g, commCity)
      .replace(/\{\{community_state\}\}/g, commState)
      .replace(/\{\{community_status\}\}/g, commStatus)
      .replace(/\{\{community_description\}\}/g, commDescription)
      .replace(/\{\{community_url\}\}/g, commUrl ? `https://schellbrothers.com${commUrl}` : "https://schellbrothers.com")
      .replace(/\{\{community_amenities\}\}/g, commAmenities)
      // Division
      .replace(/\{\{division_name\}\}/g, divisionName)
      // Pricing
      .replace(/\{\{price_from\}\}/g, priceFrom ? `$${(priceFrom/1000).toFixed(0)}K` : "")
      .replace(/\{\{price_to\}\}/g, priceTo ? `$${(priceTo/1000).toFixed(0)}K` : "")
      .replace(/\{\{price_range\}\}/g, priceFrom && priceTo ? `$${(priceFrom/1000).toFixed(0)}K - $${(priceTo/1000).toFixed(0)}K` : priceFrom ? `from $${(priceFrom/1000).toFixed(0)}K` : "")
      .replace(/\{\{plans_from_price\}\}/g, priceFrom ? `$${(priceFrom/1000).toFixed(0)}K` : "competitive pricing")
      // HOA
      .replace(/\{\{hoa_fee\}\}/g, hoaFee ? `$${hoaFee}` : "")
      .replace(/\{\{hoa_period\}\}/g, hoaPeriod)
      .replace(/\{\{hoa_display\}\}/g, hoaFee ? `$${hoaFee}/${hoaPeriod}` : "")
      // Lots
      .replace(/\{\{available_lots\}\}/g, String(lotsAvailable))
      .replace(/\{\{sold_lots\}\}/g, String(lotsSold))
      .replace(/\{\{total_lots\}\}/g, String(lotsTotal))
      .replace(/\{\{lots_remaining\}\}/g, String(lotsAvailable))
      // Plans
      .replace(/\{\{plan_count\}\}/g, String(planCount))
      .replace(/\{\{plan_price_min\}\}/g, planPriceMin ? `$${(planPriceMin/1000).toFixed(0)}K` : "")
      .replace(/\{\{plan_price_max\}\}/g, planPriceMax ? `$${(planPriceMax/1000).toFixed(0)}K` : "")
      // Schools
      .replace(/\{\{school_district\}\}/g, schoolDistrict)
      // 55+
      .replace(/\{\{is_55_plus\}\}/g, is55Plus ? "55+ community" : "all-ages community")
      // Sales
      .replace(/\{\{sales_phone\}\}/g, salesPhone)
      // OSC (will be replaced with actual user data when we have auth)
      .replace(/\{\{osc_name\}\}/g, "Your Online Sales Consultant")
      .replace(/\{\{osc_phone\}\}/g, "").replace(/\{\{osc_email\}\}/g, "")
      .replace(/\{\{csm_name\}\}/g, "Your Community Sales Manager");
  }

  // Priority: div+formType > generic+formType > div+default > generic+default
  const ea = allTmpl.find(t => t.channel==="email_auto" && t.form_type_code===formType && t.division_id===divId)
    ?? allTmpl.find(t => t.channel==="email_auto" && t.form_type_code===formType)
    ?? allTmpl.find(t => t.channel==="email_auto" && t.form_type_code==="default");
  const ep = allTmpl.find(t => t.channel==="email_personal" && t.form_type_code===formType && t.division_id===divId)
    ?? allTmpl.find(t => t.channel==="email_personal" && t.form_type_code===formType)
    ?? allTmpl.find(t => t.channel==="email_personal" && t.form_type_code==="default");
  const sm = allTmpl.find(t => t.channel==="sms" && t.form_type_code===formType && t.division_id===divId)
    ?? allTmpl.find(t => t.channel==="sms" && t.form_type_code===formType)
    ?? allTmpl.find(t => t.channel==="sms" && t.form_type_code==="default");

  // Auto-confirmation email (SendGrid noreply@)
  let autoSubject = ea ? render(ea.subject ?? "") : `Thank You for Your Interest — Schell Brothers`;
  let autoBody = ea ? render(ea.body ?? "") : `Hi ${firstName}!\n\nThank you for reaching out to Schell Brothers. We received your request and a member of our team will be in touch shortly.\n\nIn the meantime, feel free to explore our communities at schellbrothers.com.`;

  // Personal follow-up email (OSC via Outlook)
  let personalSubject = ep ? render(ep.subject ?? "") : `Welcome — Let's Find Your Perfect Home`;
  let personalBody = ep ? render(ep.body ?? "") : `Hi ${firstName}!\n\nThank you for reaching out. I'd love to help you find your perfect home with Schell Brothers. Let me know if you have any questions — I'm here to help!`;

  // SMS follow-up
  let smsBody = sm ? render(sm.body ?? "") : `Hi ${firstName}! Thanks for reaching out to Schell Brothers!`;
  
  // Build branded HTML email helper
  const BUTTON_COLORS = ["#C41230", "#1B2A4A", "#686126"];
  const TRACKING_BASE = "https://pulse-v2-nine.vercel.app/api/track/click";

  interface CtaButton {
    label: string;
    url: string;
    score_weight: number;
    color?: string;
  }

  interface TrackingRecord {
    tracking_id: string;
    button_label: string;
    button_url: string;
    score_weight: number;
  }

  async function buildCtaButtonsHtml(
    buttons: CtaButton[],
    contactId: string,
    opportunityId: string,
    activityId: string | null,
    renderFn: (s: string) => string
  ): Promise<{ html: string; trackingRecords: TrackingRecord[] }> {
    if (!buttons || buttons.length === 0) {
      // Default button if no custom buttons configured
      return {
        html: `<div style="text-align: center; margin: 32px 0;">
          <a href="https://schellbrothers.com" style="display: inline-block; background: #C41230; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">
            EXPLORE SCHELL BROTHERS
          </a>
        </div>`,
        trackingRecords: [],
      };
    }

    const trackingRecords: TrackingRecord[] = [];
    const btnHtmlParts: string[] = [];

    for (let i = 0; i < buttons.length && i < 3; i++) {
      const btn = buttons[i];
      const resolvedUrl = renderFn(btn.url);
      const trackingId = crypto.randomUUID();
      const color = btn.color || BUTTON_COLORS[i] || BUTTON_COLORS[0];
      const trackingUrl = `${TRACKING_BASE}?id=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(resolvedUrl)}`;

      trackingRecords.push({
        tracking_id: trackingId,
        button_label: btn.label,
        button_url: resolvedUrl,
        score_weight: btn.score_weight ?? 5,
      });

      btnHtmlParts.push(
        `<a href="${trackingUrl}" style="display: inline-block; background: ${color}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-size: 13px; font-weight: 600; margin: 0 8px 8px 0; letter-spacing: 0.5px;">
          ${btn.label.toUpperCase()}
        </a>`
      );
    }

    // Store tracking records in email_clicks
    if (trackingRecords.length > 0) {
      const rows = trackingRecords.map((tr) => ({
        org_id: ORG_ID,
        activity_id: activityId,
        contact_id: contactId,
        opportunity_id: opportunityId,
        button_label: tr.button_label,
        button_url: tr.button_url,
        score_weight: tr.score_weight,
        tracking_id: tr.tracking_id,
      }));
      await supabase.from("email_clicks").insert(rows);
    }

    return {
      html: `<div style="text-align: center; margin: 24px 0;">${btnHtmlParts.join("\n")}</div>`,
      trackingRecords,
    };
  }

  function buildBrandedHtml(subject: string, body: string, ctaHtml: string): string {
    const bodyHtml = body.replace(/\n/g, "<br>");
    return `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 4px solid #C41230;">
      <div style="background: #1B2A4A; padding: 28px 32px; text-align: center;">
        <img src="https://heartbeat-page-designer-production.s3.amazonaws.com/site-8/schell-logo-color-horizontal__76b84a3c12300dd95411702f2f9e9dd6-ebf486218337267c1b432845a3df25be.png" alt="Schell Brothers" style="height: 44px; max-width: 240px;" />
      </div>
      <div style="height: 4px; background: #C41230;"></div>
      <div style="padding: 40px 32px;">
        <h2 style="color: #1B2A4A; font-family: 'Georgia', serif; font-size: 26px; font-weight: 400; margin: 0 0 20px;">
          ${subject}
        </h2>
        <div style="color: #444; font-size: 15px; line-height: 1.8;">
          ${bodyHtml}
        </div>
        ${ctaHtml}
        <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 0; font-style: italic;">
          We maximize happiness rather than profit — and it shows in everything we do.
        </p>
      </div>
      <div style="height: 4px; background: #C41230;"></div>
      <div style="background: #1B2A4A; padding: 24px 32px; text-align: center; border-top: 4px solid #C41230;">
        <p style="color: #ffffff; font-size: 13px; font-weight: 600; margin: 0 0 8px;">Our Mission of Happiness</p>
        <p style="color: rgba(255,255,255,0.6); font-size: 11px; line-height: 1.6; margin: 0 0 12px;">Delaware Beaches · Richmond · Nashville · Boise</p>
        <a href="https://schellbrothers.com" style="color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600;">schellbrothers.com</a>
        <p style="color: rgba(255,255,255,0.4); font-size: 10px; margin: 12px 0 0;">© 2026 Schell Brothers. All rights reserved.</p>
      </div>
    </div>`;
  }

  // Build CTA buttons from template config
  const autoButtons: CtaButton[] = (ea?.buttons as CtaButton[] | undefined) ?? [];
  const personalButtons: CtaButton[] = (ep?.buttons as CtaButton[] | undefined) ?? [];

  // Build HTML with tracked CTA buttons
  const autoCta = await buildCtaButtonsHtml(autoButtons, opp.contact_id, opportunity_id, null, render);
  const personalCta = await buildCtaButtonsHtml(personalButtons, opp.contact_id, opportunity_id, null, render);

  const autoHtml = buildBrandedHtml(autoSubject, autoBody, autoCta.html);
  const personalHtml = buildBrandedHtml(personalSubject, personalBody, personalCta.html);

  return { success: true, data: { email_auto: { subject: autoSubject, body: autoBody, html: autoHtml }, email_personal: { subject: personalSubject, body: personalBody, html: personalHtml }, sms: { body: smsBody }, form_type: formType } };
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
