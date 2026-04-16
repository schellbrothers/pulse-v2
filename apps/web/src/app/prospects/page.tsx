import { createClient } from "@supabase/supabase-js";
import ProspectsClient from "./ProspectsClient";

export const revalidate = 30;

export default async function ProspectsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: prospects }, { data: rawCommunities }] = await Promise.all([
    supabase
      .from("prospects")
      .select("*, contacts(first_name, last_name, email, phone), communities(name), floor_plans(marketing_name)")
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
  ]);

  // Flatten joined data for client
  const flatProspects = (prospects ?? []).map((p: any) => ({
    id: p.id,
    contact_id: p.contact_id,
    first_name: p.contacts?.first_name ?? "—",
    last_name: p.contacts?.last_name ?? "",
    email: p.contacts?.email ?? null,
    phone: p.contacts?.phone ?? null,
    crm_stage: p.crm_stage ?? "prospect_c",
    community_id: p.community_id,
    community_name: p.communities?.name ?? null,
    floor_plan_name: p.floor_plans?.marketing_name ?? null,
    csm_id: p.csm_id,
    budget_min: p.budget_min,
    budget_max: p.budget_max,
    contract_date: p.contract_date,
    estimated_move_in: p.estimated_move_in,
    last_activity_at: p.last_activity_at,
    notes: p.notes,
    is_active: p.is_active,
    created_at: p.created_at,
  }));

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return <ProspectsClient prospects={flatProspects} communities={communities} />;
}
