import { createClient } from "@supabase/supabase-js";
import CommunityPlansClient from "./CommunityPlansClient";

export const revalidate = 30;

export interface CommunityPlan {
  id: string;
  community_id: string | null;
  model_id: number | null;
  division_parent_id: number | null;
  plan_name: string | null;
  marketing_name: string | null;
  plan_type: string | null;
  base_price: number | null;
  incentive_amount: number | null;
  net_price: number | null;
  base_price_formatted: string | null;
  price_formatted: string | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  min_bathrooms: number | null;
  max_bathrooms: number | null;
  min_heated_sqft: number | null;
  max_heated_sqft: number | null;
  style_filters: unknown[] | null;
  featured_image_url: string | null;
  page_url: string | null;
  description: string | null;
  is_marketing_active: boolean | null;
  [key: string]: unknown;
}

export interface Community {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  division_id: string | null;
}

export interface Division {
  id: string;
  slug: string;
  name: string;
  heartbeat_division_id?: number | null;
}

export default async function CommunityPlansPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: communityPlans }, { data: communities }, { data: divisions }] = await Promise.all([
    supabase.from("community_plans").select("*").order("plan_name"),
    supabase.from("communities").select("id,name,city,state,division_id").order("name"),
    supabase.from("divisions").select("id,slug,name,heartbeat_division_id").order("name"),
  ]);

  return (
    <CommunityPlansClient
      communityPlans={(communityPlans ?? []) as CommunityPlan[]}
      communities={(communities ?? []) as Community[]}
      divisions={(divisions ?? []) as Division[]}
    />
  );
}
