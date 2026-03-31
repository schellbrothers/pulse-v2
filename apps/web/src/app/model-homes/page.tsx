import { createClient } from "@supabase/supabase-js";
import ModelHomesClient from "./ModelHomesClient";

export const revalidate = 30;

export default async function ModelHomesPage({
  searchParams,
}: {
  searchParams: { div?: string; comm?: string; plan?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  let modelHomesQuery = supabase.from("model_homes").select("*").order("community_name");
  if (searchParams.comm) {
    modelHomesQuery = modelHomesQuery.eq("community_id", searchParams.comm);
  } else if (searchParams.div) {
    modelHomesQuery = modelHomesQuery.eq("division_parent_id", searchParams.div);
  }

  const [{ data: modelHomes }, { data: divisions }] = await Promise.all([
    modelHomesQuery,
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <ModelHomesClient
      modelHomes={modelHomes ?? []}
      divisions={divisions ?? []}
    />
  );
}
