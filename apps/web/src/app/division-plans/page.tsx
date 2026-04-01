import { createClient } from "@supabase/supabase-js";
import DivisionPlansClient from "./DivisionPlansClient";

export const revalidate = 30;

export interface DivisionPlan {
  id: string;
  model_id: number | null;
  division_parent_id: number | null;
  division_parent_name: string | null;
  name: string | null;
  marketing_name: string | null;
  plan_type: string | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  min_bathrooms: number | null;
  max_bathrooms: number | null;
  min_heated_sqft: number | null;
  max_heated_sqft: number | null;
  min_total_sqft: number | null;
  max_total_sqft: number | null;
  min_floors: number | null;
  max_floors: number | null;
  basement: boolean | null;
  style_filters: unknown[] | null;
  popularity: number | null;
  model_homes_count: number | null;
  spec_homes_count: number | null;
  featured_image_url: string | null;
  pdf_url: string | null;
  virtual_tour_url: string | null;
  page_url: string | null;
  description: string | null;
  is_marketing_active: boolean | null;
  [key: string]: unknown;
}

export interface Division {
  id: string;
  slug: string;
  name: string;
  heartbeat_division_id?: number | null;
}

export default async function DivisionPlansPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: divisionPlans }, { data: divisions }] = await Promise.all([
    supabase.from("division_plans").select("*").order("marketing_name"),
    supabase.from("divisions").select("id,slug,name,heartbeat_division_id").order("name"),
  ]);

  return (
    <DivisionPlansClient
      divisionPlans={(divisionPlans ?? []) as DivisionPlan[]}
      divisions={(divisions ?? []) as Division[]}
    />
  );
}
