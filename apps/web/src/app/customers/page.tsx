import { createClient } from "@supabase/supabase-js";
import CustomersClient from "./CustomersClient";

export const revalidate = 30;

export default async function CustomersPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: homeOwners }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("home_owners")
      .select("*, contacts(first_name, last_name, email, phone), communities(name, division_id), floor_plans(marketing_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  // Flatten — home_owners uses contact_id FK to contacts table
  const flatCustomers = (homeOwners ?? []).map((h: any) => ({
    id: h.id,
    contact_id: h.contact_id,
    first_name: h.contacts?.first_name ?? "—",
    last_name: h.contacts?.last_name ?? "",
    email: h.contacts?.email ?? null,
    phone: h.contacts?.phone ?? null,
    community_id: h.community_id,
    community_name: h.communities?.name ?? null,
    division_id: h.division_id ?? h.communities?.division_id ?? null,
    floor_plan_name: h.floor_plans?.marketing_name ?? null,
    purchase_price: h.purchase_price,
    settlement_date: h.settlement_date,
    move_in_date: h.move_in_date,
    post_sale_stage: h.post_sale_stage ?? "sold_not_started",
    created_at: h.created_at,
  }));

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return (
    <CustomersClient
      customers={flatCustomers}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
