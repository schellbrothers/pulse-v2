import { createClient } from "@supabase/supabase-js";
import LeadsClient from "./LeadsClient";

export const revalidate = 30;

export default async function LeadsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: leads }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, communities(name, division_id)")
      .neq("stage", "opportunity")
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  // Leads table has first_name/last_name directly (v1 schema)
  const flatLeads = (leads ?? []).map((l: any) => ({
    id: l.id,
    contact_id: null,
    first_name: l.first_name ?? "—",
    last_name: l.last_name ?? "",
    email: l.email ?? null,
    phone: l.phone ?? null,
    stage: l.stage ?? "lead",
    substage: l.substage ?? null,
    source: l.source ?? null,
    community_id: l.community_id ?? null,
    division_id: l.communities?.division_id ?? null,
    budget_min: l.budget_min ?? null,
    budget_max: l.budget_max ?? null,
    desired_move_date: l.desired_move_date ?? null,
    bedrooms: l.bedrooms ?? null,
    agent_name: l.agent_name ?? null,
    last_activity_at: l.last_activity_at ?? l.created_at,
    notes: l.notes ?? null,
    is_active: true,
    created_at: l.created_at,
  }));

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return (
    <LeadsClient
      leads={flatLeads}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
