import { createClient } from "@supabase/supabase-js";
import ProspectsClient from "./ProspectsClient";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: opps }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*, contacts(first_name, last_name, email, phone), communities(name), divisions(name), floor_plans(marketing_name)")
      .in("crm_stage", ["prospect_c", "prospect_b", "prospect_a"])
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  const flatProspects = (opps ?? []).map((o: any) => ({
    id: o.id,
    contact_id: o.contact_id ?? null as string | null,
    first_name: o.contacts?.first_name ?? "—",
    last_name: o.contacts?.last_name ?? "",
    email: o.contacts?.email ?? null,
    phone: o.contacts?.phone ?? null,
    crm_stage: o.crm_stage,
    community_id: o.community_id ?? null,
    community_name: o.communities?.name ?? null,
    division_id: o.division_id ?? null,
    division_name: o.divisions?.name ?? null,
    floor_plan_name: o.floor_plans?.marketing_name ?? null,
    csm_id: null,
    budget_min: o.budget_min ?? null,
    budget_max: o.budget_max ?? null,
    contract_date: o.contract_date ?? null,
    estimated_move_in: o.desired_move_in ?? null,
    last_activity_at: o.last_activity_at ?? o.created_at,
    notes: o.notes ?? null,
    is_active: o.is_active ?? true,
    created_at: o.created_at,
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
