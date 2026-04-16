import { createClient } from "@supabase/supabase-js";
import ProspectsClient from "./ProspectsClient";

export const revalidate = 30;

export default async function ProspectsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: prospects }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("prospects")
      .select("*, communities(name, division_id)")
      .order("last_contacted_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  // Flatten — prospects table has first_name/last_name directly (v1 schema)
  const flatProspects = (prospects ?? []).map((p: any) => ({
    id: p.id,
    contact_id: null as string | null,
    first_name: p.first_name ?? "—",
    last_name: p.last_name ?? "",
    email: p.email ?? null,
    phone: p.phone ?? null,
    crm_stage: p.stage ?? "prospect_c",
    community_id: p.community_id,
    community_name: p.communities?.name ?? null,
    division_id: p.communities?.division_id ?? null,
    floor_plan_name: null,
    csm_id: p.assigned_osc_id ?? null,
    budget_min: p.budget_min,
    budget_max: p.budget_max,
    contract_date: null,
    estimated_move_in: p.desired_move_in,
    last_activity_at: p.last_contacted_at,
    notes: null,
    is_active: true,
    created_at: p.created_at,
  }));

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return (
    <ProspectsClient
      prospects={flatProspects}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
