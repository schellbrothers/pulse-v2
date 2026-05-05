import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

// POST — create a new user
export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  const body = await req.json();

  const { first_name, last_name, email, role, division_id } = body as {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    division_id?: string;
  };

  if (!first_name || !last_name || !email || !role) {
    return NextResponse.json({ error: "first_name, last_name, email, and role are required" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("users")
    .insert({
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      email,
      role,
      division_id: division_id || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: data });
}

// PUT — update a user
export async function PUT(req: NextRequest) {
  const sb = getServiceClient();
  const body = await req.json();

  const { id, ...updates } = body as { id: string; [key: string]: unknown };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // If first_name or last_name changed, rebuild full_name
  if (updates.first_name || updates.last_name) {
    const currentFirst = updates.first_name as string | undefined;
    const currentLast = updates.last_name as string | undefined;
    if (currentFirst && currentLast) {
      updates.full_name = `${currentFirst} ${currentLast}`;
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: data });
}
