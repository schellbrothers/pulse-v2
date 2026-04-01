import { createClient } from "@supabase/supabase-js";
import ModelHomesClient from "./ModelHomesClient";

export const revalidate = 30;

export default async function ModelHomesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: modelHomes }, { data: divisions }, { data: communities }] = await Promise.all([
    supabase.from("model_homes").select("*").order("community_name"),
    supabase.from("divisions").select("id,slug,name").order("name"),
    supabase.from("communities").select("id,name").order("name"),
  ]);

  return (
    <ModelHomesClient
      modelHomes={modelHomes ?? []}
      divisions={divisions ?? []}
      communities={communities ?? []}
    />
  );
}
