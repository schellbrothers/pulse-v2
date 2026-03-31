import { createClient } from "@supabase/supabase-js";
import LotsClient from "./LotsClient";

export const revalidate = 30;

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
}

export interface DivisionRow {
  id: string;
  slug: string;
  name: string;
}

export default async function LotsPage({
  searchParams,
}: {
  searchParams: { div?: string; comm?: string; plan?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Fetch all lots — paginate for large datasets
  const PAGE_SIZE = 1000;
  let allLots: LotRow[] = [];
  let page = 0;
  while (true) {
    let q = supabase
      .from("lots")
      .select("*")
      .order("community_name_raw")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (searchParams.comm) {
      q = q.eq("community_id", searchParams.comm);
    }
    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    allLots = allLots.concat(data as LotRow[]);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  let commQuery = supabase.from("communities").select("id,name,city,state,division_id").order("name");
  if (searchParams.div) {
    commQuery = commQuery.eq("division_id", searchParams.div);
  }

  const [{ data: communities }, { data: divisions }] = await Promise.all([
    commQuery,
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <LotsClient
      lots={allLots}
      communities={(communities ?? []) as CommunityRow[]}
      divisions={(divisions ?? []) as DivisionRow[]}
    />
  );
}
