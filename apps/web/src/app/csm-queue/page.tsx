import { createClient } from "@supabase/supabase-js";
import CsmQueueClient from "./CsmQueueClient";

export const dynamic = "force-dynamic";

export default async function CsmQueuePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: opps }, { data: rawCommunities }, { data: divisions }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*, contacts(first_name, last_name, email, phone), communities(name), divisions(name)")
      .eq("crm_stage", "csm_queue")
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
    supabase.from("divisions").select("id, slug, name").order("name"),
  ]);

  const flatOpps = (opps ?? []).map((o: any) => ({
    id: o.id,
    contact_id: o.contact_id ?? null,
    first_name: o.contacts?.first_name ?? "—",
    last_name: o.contacts?.last_name ?? "",
    email: o.contacts?.email ?? null,
    phone: o.contacts?.phone ?? null,
    source: o.source ?? null,
    opportunity_source: o.opportunity_source ?? null,
    community_id: o.community_id ?? null,
    community_name: o.communities?.name ?? null,
    division_id: o.division_id ?? null,
    division_name: o.divisions?.name ?? null,
    notes: o.notes ?? null,
    is_active: o.is_active ?? true,
    last_activity_at: o.last_activity_at ?? o.created_at,
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
    <CsmQueueClient
      opportunities={flatOpps}
      communities={communities}
      divisions={divisions ?? []}
    />
  );
}
