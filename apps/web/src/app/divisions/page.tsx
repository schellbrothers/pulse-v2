import { createClient } from "@supabase/supabase-js";
import DivisionsClient from "./DivisionsClient";

export const revalidate = 60;

interface CommunityRef {
  id: string;
  status: string | null;
  price_from: number | null;
  division_id: string;
}

interface RawDivision {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  heartbeat_division_id: number | null;
  communities: CommunityRef[];
}

export interface DivisionStats {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  heartbeat_division_id: number | null;
  community_count: number;
  plan_count: number;
  available_lots: number;
  model_homes: number;
  qd_homes: number;
  price_min: number | null;
  price_max: number | null;
}

export default async function DivisionsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [
    { data: rawDivisions },
    { data: divisionPlans },
    { data: lots },
    { data: modelHomes },
    { data: specHomes },
  ] = await Promise.all([
    supabase.from("divisions")
      .select("*, communities(id, status, price_from, division_id)")
      .order("name")
      .returns<RawDivision[]>(),
    supabase.from("division_plans").select("division_parent_id"),
    supabase.from("lots").select("community_id,lot_status"),
    supabase.from("model_homes").select("division_parent_id"),
    supabase.from("spec_homes").select("division_parent_id"),
  ]);

  // Build community → division map for lots
  const commDivMap: Record<string, string> = {};
  for (const d of rawDivisions ?? []) {
    for (const c of d.communities ?? []) {
      commDivMap[c.id] = d.id;
    }
  }

  // Count plans per division using division_parent_id (integer)
  const planCountByHBId: Record<number, number> = {};
  for (const dp of divisionPlans ?? []) {
    const id = Number(dp.division_parent_id);
    planCountByHBId[id] = (planCountByHBId[id] ?? 0) + 1;
  }

  // Count available lots per division (via community lookup)
  const availLotsByDiv: Record<string, number> = {};
  for (const lot of lots ?? []) {
    if (lot.lot_status === "Available Homesite" && lot.community_id) {
      const divId = commDivMap[lot.community_id];
      if (divId) availLotsByDiv[divId] = (availLotsByDiv[divId] ?? 0) + 1;
    }
  }

  // Count model homes per division using division_parent_id (integer)
  const modelByHBId: Record<number, number> = {};
  for (const mh of modelHomes ?? []) {
    const id = Number(mh.division_parent_id);
    modelByHBId[id] = (modelByHBId[id] ?? 0) + 1;
  }

  // Count QD homes per division
  const qdByHBId: Record<number, number> = {};
  for (const sh of specHomes ?? []) {
    const id = Number(sh.division_parent_id);
    qdByHBId[id] = (qdByHBId[id] ?? 0) + 1;
  }

  const divStats: DivisionStats[] = (rawDivisions ?? []).map((d: RawDivision) => {
    const comms = d.communities ?? [];
    const prices = comms.map((c: CommunityRef) => c.price_from).filter((p): p is number => p != null);
    const hbId = d.heartbeat_division_id ?? 0;
    return {
      id:                    d.id,
      slug:                  d.slug,
      name:                  d.name,
      region:                d.region,
      timezone:              d.timezone,
      state_codes:           d.state_codes ?? [],
      is_active:             d.is_active,
      heartbeat_division_id: d.heartbeat_division_id,
      community_count:       comms.length,
      plan_count:            planCountByHBId[hbId] ?? 0,
      available_lots:        availLotsByDiv[d.id] ?? 0,
      model_homes:           modelByHBId[hbId] ?? 0,
      qd_homes:              qdByHBId[hbId] ?? 0,
      price_min:             prices.length ? Math.min(...prices) : null,
      price_max:             prices.length ? Math.max(...prices) : null,
    };
  });

  return <DivisionsClient divisions={divStats} />;
}
