import { createClient } from "@supabase/supabase-js";
import OpportunitiesClient from "./OpportunitiesClient";

export const revalidate = 30;

export default async function OpportunitiesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: leads }, { data: rawCommunities }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("crm_stage", "opportunity")
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("communities")
      .select("id, name, slug, divisions(slug, name)")
      .order("name"),
  ]);

  const communities = (rawCommunities ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    slug: (c.slug ?? null) as string | null,
    division_slug: ((c.divisions as any)?.slug ?? "") as string,
    division_name: ((c.divisions as any)?.name ?? "") as string,
  }));

  return <OpportunitiesClient opportunities={leads ?? []} communities={communities} />;
}
