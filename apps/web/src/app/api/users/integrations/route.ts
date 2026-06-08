import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Lazily create the client at request time (never at build time) so a missing
// service-role key doesn't break the build.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );
}

// GET /api/users/integrations?user_id=...
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// POST /api/users/integrations  { user_id, integration_type, credentials }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user_id, integration_type, credentials } = body;
  if (!user_id || !integration_type) {
    return NextResponse.json(
      { error: "user_id and integration_type are required" },
      { status: 400 },
    );
  }

  const { data, error } = await getSupabase()
    .from("user_integrations")
    .upsert({
      user_id,
      integration_type,
      ...(credentials ?? {}),
      updated_at: new Date().toISOString(),
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
