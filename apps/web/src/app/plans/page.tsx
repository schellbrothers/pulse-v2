import { createClient } from "@supabase/supabase-js";
import PlansClient from "./PlansClient";

export const revalidate = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DivisionPlan {
  id: string;
  division_id: string;
  marketing_name: string;
  plan_type: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  sqft_min: number | null;
  sqft_max: number | null;
  style: string | null;
  featured_image_url: string | null;
  page_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityPlan {
  id: string;
  community_id: string;
  plan_id: string | null;
  plan_name: string;
  division_id: string | null;
  beds: number | null;
  baths: number | null;
  sqft_min: number | null;
  sqft_max: number | null;
  base_price: number | null;
  incentive_amount: number | null;
  net_price: number | null;
  style_filters: string[] | null;
  featured_image_url: string | null;
  page_url: string | null;
  virtual_tour_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  division_id: string;
  featured_image_url: string | null;
}

export interface Division {
  id: string;
  slug: string;
  name: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlansPage({
  searchParams,
}: {
  searchParams: { div?: string; comm?: string; plan?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  let divisionPlansQuery = supabase
    .from("division_plans")
    .select("*")
    .order("marketing_name")
    .returns<DivisionPlan[]>();
  if (searchParams.div) {
    divisionPlansQuery = divisionPlansQuery.eq("division_id", searchParams.div) as typeof divisionPlansQuery;
  }

  let communityPlansQuery = supabase
    .from("community_plans")
    .select("*")
    .order("plan_name")
    .returns<CommunityPlan[]>();
  if (searchParams.comm) {
    communityPlansQuery = communityPlansQuery.eq("community_id", searchParams.comm) as typeof communityPlansQuery;
  } else if (searchParams.div) {
    communityPlansQuery = communityPlansQuery.eq("division_id", searchParams.div) as typeof communityPlansQuery;
  }

  let commQuery = supabase
    .from("communities")
    .select("id,name,city,state,division_id,featured_image_url")
    .order("name")
    .returns<Community[]>();
  if (searchParams.div) {
    commQuery = commQuery.eq("division_id", searchParams.div) as typeof commQuery;
  }

  const [
    { data: divisionPlans },
    { data: communityPlans },
    { data: communities },
    { data: divisions },
  ] = await Promise.all([
    divisionPlansQuery,
    communityPlansQuery,
    commQuery,
    supabase
      .from("divisions")
      .select("id,slug,name")
      .order("name")
      .returns<Division[]>(),
  ]);

  return (
    <PlansClient
      divisionPlans={divisionPlans ?? []}
      communityPlans={communityPlans ?? []}
      communities={communities ?? []}
      divisions={divisions ?? []}
    />
  );
}
