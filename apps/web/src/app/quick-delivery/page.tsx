import { createClient } from "@supabase/supabase-js";
import QuickDeliveryClient from "./QuickDeliveryClient";

export const revalidate = 30;

export default async function QuickDeliveryPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: communities }, { data: divisions }, { data: lots }] = await Promise.all([
    supabase
      .from("communities")
      .select("id,name,city,state,status,featured_image_url,division_id,page_url,spec_homes")
      .not("spec_homes", "is", null)
      .order("name"),
    supabase.from("divisions").select("id,slug,name").order("name"),
    supabase
      .from("lots")
      .select("community_id,lot_number,construction_status,lot_premium,address,lot_status")
      .limit(5000),
  ]);

  return (
    <QuickDeliveryClient
      communities={communities ?? []}
      divisions={divisions ?? []}
      lots={lots ?? []}
    />
  );
}
