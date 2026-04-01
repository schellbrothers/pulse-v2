import { createClient } from "@supabase/supabase-js";
import LotsClient from "./LotsClient";

export interface LotRow {
  id: string | number;
  community_id: string | null;
  community_name_raw: string | null;
  division_raw: string | null;
  lot_number: string | null;
  block: string | null;
  phase: string | null;
  lot_status: string | null;
  construction_status: string | null;
  is_buildable: boolean | null;
  is_available: boolean | null;
  is_hide_from_marketing: boolean | null;
  address: string | null;
  lot_premium: number | null;
  foundation: string | null;
  synced_at: string | null;
  [key: string]: unknown;
}

export interface CommunityRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  division_id: string | null;
  slug: string | null;
}

export interface DivisionRow {
  id: string;
  slug: string;
  name: string;
}


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
    supabase.from("divisions").select("id,slug,name,heartbeat_division_id").order("name"),
  ]);

  return (
    <LotsClient
      lots={allLots as Parameters<typeof LotsClient>[0]["lots"]}
      communities={communities ?? []}
      divisions={divisions ?? []}
    />
  );
}
