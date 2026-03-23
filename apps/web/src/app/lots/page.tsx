import { createClient } from "@supabase/supabase-js";
import LotsClient from "./LotsClient";

export const revalidate = 30;

export default async function LotsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: lots }, { data: divisions }, { data: communities }] = await Promise.all([
    supabase
      .from("lots")
      .select(
        "id, community_id, community_name_raw, division_raw, lot_number, block, phase, lot_status, construction_status, is_buildable, is_available, is_hide_from_marketing, address, lot_premium"
      )
      .order("division_raw")
      .order("community_name_raw")
      .order("lot_number"),
    supabase.from("divisions").select("id, slug, name").order("name"),
    supabase.from("communities").select("id, name, division_id").order("name"),
  ]);

  return (
    <LotsClient
      lots={lots ?? []}
      divisions={divisions ?? []}
      communities={communities ?? []}
    />
  );
}
