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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: task }, { data: documents }, { data: history }] = await Promise.all([
    supabaseAdmin().from("hbx_tasks").select("*").eq("id", id).single(),
    supabaseAdmin().from("hbx_task_documents").select("*").eq("task_id", id).order("created_at"),
    supabaseAdmin().from("hbx_task_history").select("*").eq("task_id", id).order("changed_at"),
  ]);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...task, documents: documents ?? [], history: history ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { data: current } = await supabaseAdmin().from("hbx_tasks").select("status").eq("id", id).single();
  const { data, error } = await supabaseAdmin().from("hbx_tasks").update(body).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Log status change
  if (body.status && current && body.status !== current.status) {
    await supabaseAdmin().from("hbx_task_history").insert([{
      task_id: id, previous_status: current.status, new_status: body.status,
      changed_by: body.changed_by || "schellie", note: body.note || null,
    }]);
  }
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin().from("hbx_tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
