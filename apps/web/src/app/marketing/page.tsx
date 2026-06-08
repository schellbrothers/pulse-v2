import { createClient } from "@supabase/supabase-js";
import MarketingClient from "./MarketingClient";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: contacts }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("marketing_contacts")
      .select("*, communities(name, division_id)")
      .order("subscribed_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  const flatContacts = (contacts ?? []).map((c: any) => ({
    id: c.id,
    first_name: c.first_name ?? "—",
    last_name: c.last_name ?? "",
    email: c.email ?? null,
    phone: c.phone ?? null,
    source: c.source ?? null,
    community_id: c.community_id ?? null,
    division_id: c.communities?.division_id ?? null,
    subscribed_at: c.subscribed_at ?? c.created_at,
    is_active: c.is_active ?? true,
    created_at: c.created_at,
  }));

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return (
    <MarketingClient
      contacts={flatContacts}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
