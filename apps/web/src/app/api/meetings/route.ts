import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

let _supabase: ReturnType<typeof getClient>;
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
function supabase() {
  return (_supabase ??= getClient());
}

// Zoom Server-to-Server OAuth
const ZOOM_ACCOUNT_ID = "BJ0E4dt8TbSRwYEwXhydog";
const ZOOM_CLIENT_ID = "8WW3agHRQPO2GuvFDlMIhQ";
const ZOOM_CLIENT_SECRET = "hLiWtwSB5PJ3gWKwUJBIBv7mhCwY5ALD";

let zoomToken: string | null = null;
let zoomTokenExpiry = 0;

async function getZoomToken(): Promise<string> {
  if (zoomToken && Date.now() < zoomTokenExpiry) return zoomToken;

  const creds = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
  });
  const data = await res.json();
  zoomToken = data.access_token;
  zoomTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return zoomToken!;
}

async function zoomPost(path: string, body: Record<string, unknown>) {
  const token = await getZoomToken();
  const res = await fetch(`https://api.zoom.us/v2${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom API ${res.status}: ${err}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { opportunity_id, contact_id, topic, start_time, duration_minutes = 30, user_id } = await req.json();

    if (!opportunity_id || !contact_id) {
      return NextResponse.json({ error: "opportunity_id and contact_id required" }, { status: 400 });
    }

    // Get the user's Zoom ID (the person scheduling the meeting)
    let zoomUserId = "me"; // default
    if (user_id) {
      const { data: users } = await supabase().from("users").select("zoom_user_id, full_name").eq("id", user_id).limit(1);
      if (users?.[0]?.zoom_user_id) {
        zoomUserId = users[0].zoom_user_id;
      }
    }

    // Get contact info for the topic
    const { data: contacts } = await supabase().from("contacts").select("first_name, last_name, email").eq("id", contact_id).limit(1);
    const contact = contacts?.[0];
    const contactName = contact ? `${contact.first_name} ${contact.last_name}`.trim() : "Prospect";

    // Get opportunity's division/community
    const { data: opps } = await supabase().from("opportunities").select("division_id, community_id").eq("id", opportunity_id).limit(1);
    const opp = opps?.[0];

    // Create Zoom meeting
    const meetingTopic = topic || `Meeting with ${contactName}`;
    const meeting = await zoomPost(`/users/${zoomUserId}/meetings`, {
      topic: meetingTopic,
      type: 2, // Scheduled
      start_time: start_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // default: tomorrow
      duration: duration_minutes,
      timezone: "America/New_York",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        auto_recording: "cloud",
        waiting_room: false,
      },
    });

    const meetingId = String(meeting.id);
    const joinUrl = meeting.join_url;

    // Store meeting on opportunity
    await supabase().from("opportunities").update({
      last_activity_at: new Date().toISOString(),
    }).eq("id", opportunity_id);

    // Create activity record
    await supabase().from("activities").insert({
      org_id: "00000000-0000-0000-0000-000000000001",
      contact_id,
      opportunity_id,
      division_id: opp?.division_id,
      community_id: opp?.community_id,
      channel: "meeting",
      direction: "outbound",
      type: "meeting_scheduled",
      subject: meetingTopic,
      body: `Zoom meeting scheduled: ${joinUrl}`,
      occurred_at: new Date().toISOString(),
      zoom_meeting_id: meetingId,
      metadata: JSON.stringify({
        zoom_meeting_id: meetingId,
        join_url: joinUrl,
        start_url: meeting.start_url,
        duration_minutes: duration_minutes,
        scheduled_start: start_time || meeting.start_time,
      }),
    });

    return NextResponse.json({
      success: true,
      meeting_id: meetingId,
      join_url: joinUrl,
      start_url: meeting.start_url,
      topic: meetingTopic,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Meeting creation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
