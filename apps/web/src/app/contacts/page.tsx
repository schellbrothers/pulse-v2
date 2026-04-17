import { createClient } from "@supabase/supabase-js";
import ContactsClient from "./ContactsClient";

export const revalidate = 30;

export default async function ContactsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: contacts }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, contact_members(id, role, first_name, last_name, is_primary, relationship), opportunities(id, crm_stage, community_id, communities(name))")
      .order("created_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  // Flatten contacts with computed fields
  const flatContacts = (contacts ?? []).map((c: any) => {
    const members = c.contact_members ?? [];
    const opps = c.opportunities ?? [];
    const stages = [...new Set(opps.map((o: any) => o.crm_stage).filter(Boolean))] as string[];
    const communityNames = [...new Set(opps.map((o: any) => o.communities?.name).filter(Boolean))] as string[];

    return {
      id: c.id,
      first_name: c.first_name ?? "—",
      last_name: c.last_name ?? "",
      email: c.email ?? null,
      phone: c.phone ?? null,
      source: c.source ?? null,
      lifecycle_stage: c.lifecycle_stage ?? null,
      created_at: c.created_at,
      members,
      member_count: members.length,
      opportunities: opps,
      opportunity_count: opps.length,
      stages,
      communities: communityNames,
    };
  });

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return (
    <ContactsClient
      contacts={flatContacts}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
