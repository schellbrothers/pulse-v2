import { createClient } from "@supabase/supabase-js";
import LotsClient from "./LotsClient";

export const revalidate = 30;

export default async function LotsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Fetch all lots — Supabase default limit is 1000, must paginate for 3,486 rows
  const PAGE_SIZE = 1000;
  let allLots: any[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("lots")
      .select(
        "id, community_id, community_name_raw, division_raw, lot_number, block, phase, lot_status, construction_status, is_buildable, is_available, is_hide_from_marketing, address, lot_premium, foundation"
      )
      .order("division_raw")
      .order("community_name_raw")
      .order("lot_number")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allLots = allLots.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const [{ data: divisions }, { data: communities }] = await Promise.all([
    supabase.from("divisions").select("id, slug, name").order("name"),
    supabase.from("communities").select("id, name, division_id").order("name"),
  ]);
  const lots = allLots;

  return (
    <LotsClient
      lots={lots ?? []}
      divisions={divisions ?? []}
      communities={communities ?? []}
    />
  );
}
