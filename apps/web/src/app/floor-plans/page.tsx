import { createClient } from "@supabase/supabase-js";
import FloorPlansClient from "./FloorPlansClient";

export const revalidate = 30;

export default async function FloorPlansPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: plans }, { data: communities }, { data: divisions }] = await Promise.all([
    supabase
      .from("floor_plans")
      .select(
        "id,community_id,plan_name,plan_type,base_price,incentive_amount,net_price,min_bedrooms,max_bedrooms,min_bathrooms,max_bathrooms,min_heated_sqft,max_heated_sqft,style_filters,popularity,featured_image_url,virtual_tour_url,page_url,pdf_url,elevations"
      )
      .order("plan_name"),
    supabase.from("communities").select("id,name,division_id,model_homes").order("name"),
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <FloorPlansClient
      plans={plans ?? []}
      communities={communities ?? []}
      divisions={divisions ?? []}
    />
  );
}
