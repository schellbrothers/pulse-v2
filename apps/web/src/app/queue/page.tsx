import { createClient } from "@supabase/supabase-js";
import QueueClient from "./QueueClient";

export const revalidate = 30;

export default async function QueuePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: leads }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, communities(name, division_id)")
      .eq("stage", "opportunity")
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  // Leads table has first_name/last_name directly; opportunities are leads with stage='opportunity'
  const flatOpps = (leads ?? []).map((l: any) => ({
    id: l.id,
    contact_id: null,
    first_name: l.first_name ?? "—",
    last_name: l.last_name ?? "",
    email: l.email ?? null,
    phone: l.phone ?? null,
    source: l.source ?? null,
    opportunity_source: l.substage ?? null,
    community_id: l.community_id ?? null,
    division_id: l.communities?.division_id ?? null,
    osc_id: null,
    osc_route_decision: null,
    notes: l.notes ?? null,
    is_active: true,
    last_activity_at: l.last_activity_at ?? l.created_at,
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
    <QueueClient
      opportunities={flatOpps}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
