import { createClient } from "@supabase/supabase-js";
import QuickDeliveryClient from "./QuickDeliveryClient";

export const revalidate = 30;

export default async function QuickDeliveryPage({
  searchParams,
}: {
  searchParams: { div?: string; comm?: string; plan?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  let specHomesQuery = supabase.from("spec_homes").select("*").order("community_name");
  if (searchParams.comm) {
    specHomesQuery = specHomesQuery.eq("community_id", searchParams.comm);
  } else if (searchParams.div) {
    specHomesQuery = specHomesQuery.eq("division_parent_id", searchParams.div);
  }

  const [{ data: specHomes }, { data: divisions }] = await Promise.all([
    specHomesQuery,
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <QuickDeliveryClient
      specHomes={specHomes ?? []}
      divisions={divisions ?? []}
    />
  );
}
