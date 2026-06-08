import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Lazily instantiate at request time so a missing env var never breaks the
// build's page-data collection step.
let _supabaseAdmin: ReturnType<typeof getClient>;
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
function supabaseAdmin() {
  return (_supabaseAdmin ??= getClient());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  let query = supabaseAdmin().from("hbx_tasks").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin().from("hbx_tasks").insert([{
    name: body.name,
    description: body.description || null,
    task_type: body.task_type || "feature",
    github_repo: body.github_repo || "rob-hoeller/pulse-v2",
    status: "planning",
  }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Log history
  await supabaseAdmin().from("hbx_task_history").insert([{ task_id: data.id, previous_status: null, new_status: "planning", changed_by: "schellie" }]);
  return NextResponse.json(data, { status: 201 });
}
