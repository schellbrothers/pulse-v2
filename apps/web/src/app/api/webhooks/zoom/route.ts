/**
 * Zoom Phone Webhook Handler
 * 
 * Receives real-time events:
 * - phone.sms_sent — outbound SMS from Sales team
 * - phone.sms_received — inbound SMS to Sales team
 * 
 * POST /api/webhooks/zoom
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const ZOOM_WEBHOOK_SECRET = process.env.ZOOM_WEBHOOK_SECRET || "";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
  );
}

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  return digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits.slice(-10);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Zoom URL validation challenge (required during webhook setup)
    if (body.event === "endpoint.url_validation") {
      const hashForValidation = crypto
        .createHmac("sha256", ZOOM_WEBHOOK_SECRET)
        .update(body.payload?.plainToken || "")
        .digest("hex");
      return NextResponse.json({
        plainToken: body.payload?.plainToken,
        encryptedToken: hashForValidation,
      });
    }

    const supabase = getSupabase();
    const event = body.event;
    const payload = body.payload?.object || body.payload || {};

    // Only process SMS events
    if (event !== "phone.sms_sent" && event !== "phone.sms_received") {
      return NextResponse.json({ ok: true, skipped: event });
    }

    const direction = event === "phone.sms_sent" ? "outbound" : "inbound";
    const fromNumber = payload.from?.phone_number || payload.caller_number || "";
    const toNumber = payload.to?.phone_number || payload.callee_number || "";
    const messageBody = payload.message || payload.body || "";
    const dateTime = payload.date_time || new Date().toISOString();
    const senderName = payload.from?.display_name || payload.from?.name || "";
    const recipientName = payload.to?.display_name || payload.to?.name || "";

    // Determine which number is the external party
    const externalNumber = direction === "outbound" ? toNumber : fromNumber;
    const employeeName = direction === "outbound" ? senderName : recipientName;

    // Match external phone to contact
    const normExternal = normalizePhone(externalNumber);
    let contactId: string | null = null;
    let opportunityId: string | null = null;

    if (normExternal) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id")
        .or(`phone.like.%${normExternal}%,phone_secondary.like.%${normExternal}%`)
        .limit(1);

      if (contacts && contacts.length === 1) {
        contactId = contacts[0].id;
        
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id")
          .eq("contact_id", contactId)
          .eq("is_active", true)
          .limit(1);
        if (opps && opps.length === 1) {
          opportunityId = opps[0].id;
        }
      }
    }

    // Create activity
    await supabase.from("activities").insert({
      org_id: ORG_ID,
      type: `sms_${direction}`,
      channel: "sms",
      direction,
      contact_id: contactId,
      opportunity_id: opportunityId,
      occurred_at: dateTime,
      subject: `${direction === "inbound" ? "Inbound" : "Outbound"} Text — ${employeeName}`,
      body: messageBody,
      from_number: fromNumber,
      to_number: toNumber,
      is_read: direction === "outbound",
      needs_response: direction === "inbound",
      metadata: JSON.stringify({
        zoom_event: event,
        sender_name: senderName,
        recipient_name: recipientName,
        employee_name: employeeName,
        match_method: contactId ? "phone_exact" : "no_match",
      }),
    });

    // Audit log
    await supabase.from("action_log").insert({
      org_id: ORG_ID,
      action_type: `zoom_sms_${direction}`,
      triggered_by: "system:zoom_webhook",
      agent_name: "zoom_sms_webhook",
      confidence_score: contactId ? 1.0 : 0.0,
      reasoning: contactId
        ? `SMS ${direction} matched to contact via phone ${normExternal}`
        : `SMS ${direction} — no contact match for ${normExternal}`,
      metadata: { from: fromNumber, to: toNumber, contact_id: contactId },
    });

    return NextResponse.json({ ok: true, direction, matched: !!contactId });
  } catch (err) {
    console.error("[zoom-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
