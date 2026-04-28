import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

// GET — fetch SLA config + business hours
export async function GET() {
  const sb = getServiceClient();

  const [{ data: slaData, error: slaErr }, { data: bhData, error: bhErr }] = await Promise.all([
    sb.from("sla_config").select("id, target_minutes, warning_pct, is_active"),
    sb.from("business_hours").select("*").eq("id", "default").single(),
  ]);

  if (slaErr) return NextResponse.json({ error: slaErr.message }, { status: 500 });

  return NextResponse.json({
    sla_config: slaData ?? [],
    business_hours: bhData ?? null,
  });
}

// PUT — save SLA config + business hours
export async function PUT(req: NextRequest) {
  const sb = getServiceClient();
  const body = await req.json();

  const { sla_timers, business_hours } = body as {
    sla_timers?: { id: string; target_minutes: number; warning_pct: number }[];
    business_hours?: { start_time: string; end_time: string; timezone: string; work_days: number[] };
  };

  // Update each SLA timer individually (UPDATE only, not INSERT)
  if (sla_timers && sla_timers.length > 0) {
    for (const timer of sla_timers) {
      const { error } = await sb
        .from("sla_config")
        .update({
          target_minutes: timer.target_minutes,
          warning_pct: timer.warning_pct,
          updated_at: new Date().toISOString(),
        })
        .eq("id", timer.id);

      if (error) {
        return NextResponse.json(
          { error: `Failed to update ${timer.id}: ${error.message}` },
          { status: 500 }
        );
      }
    }
  }

  // Update business hours
  if (business_hours) {
    const { error } = await sb
      .from("business_hours")
      .update({
        start_time: business_hours.start_time,
        end_time: business_hours.end_time,
        timezone: business_hours.timezone,
        work_days: business_hours.work_days,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");

    if (error) {
      return NextResponse.json(
        { error: `Failed to update business hours: ${error.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
