import { createClient } from "@supabase/supabase-js";
import LotsClient from "./LotsClient";

export const revalidate = 30;

export default async function LotsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const PAGE_SIZE = 1000;
  let allLots: unknown[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("lots").select("*").order("community_name_raw")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allLots = allLots.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const [{ data: communities }, { data: divisions }] = await Promise.all([
    supabase.from("communities").select("id,name,city,state,division_id,slug").order("name"),
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <LotsClient
      lots={allLots as Parameters<typeof LotsClient>[0]["lots"]}
      communities={communities ?? []}
      divisions={divisions ?? []}
    />
  );
}
