import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const url = request.nextUrl.searchParams.get("url");

  if (!id || !url) {
    return NextResponse.redirect("https://schellbrothers.com");
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
    );

    // Record the click timestamp
    await supabase
      .from("email_clicks")
      .update({ clicked_at: new Date().toISOString() })
      .eq("tracking_id", id);
  } catch (err) {
    console.error("[click-track] Error recording click:", err);
  }

  // Always redirect to the actual URL, even if tracking fails
  return NextResponse.redirect(url);
}
