import { createClient } from "@supabase/supabase-js";
import QuickDeliveryClient from "./QuickDeliveryClient";

export const revalidate = 30;

export default async function QuickDeliveryPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: specHomes }, { data: divisions }] = await Promise.all([
    supabase.from("spec_homes").select("*").order("community_name"),
    supabase.from("divisions").select("id,slug,name,heartbeat_division_id").order("name"),
  ]);

  return (
    <QuickDeliveryClient
      specHomes={specHomes ?? []}
      divisions={divisions ?? []}
    />
  );
}
