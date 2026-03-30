import { createClient } from "@supabase/supabase-js";
import QuickDeliveryClient from "./QuickDeliveryClient";

export const revalidate = 30;

export default async function QuickDeliveryPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: qdLots }, { data: communities }, { data: divisions }] = await Promise.all([
    supabase
      .from("lots")
      .select("id,community_id,community_name_raw,division_raw,lot_number,block,lot_status,construction_status,lot_premium,address,is_available")
      .eq("lot_status", "Quick Delivery")
      .order("community_name_raw"),
    supabase
      .from("communities")
      .select("id,name,city,state,division_id,featured_image_url")
      .order("name"),
    supabase.from("divisions").select("id,slug,name").order("name"),
  ]);

  return (
    <QuickDeliveryClient
      qdLots={qdLots ?? []}
      communities={communities ?? []}
      divisions={divisions ?? []}
    />
  );
}
