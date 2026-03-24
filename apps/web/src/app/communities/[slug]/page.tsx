import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import CommunityDetailClient from "./CommunityDetailClient";

export const revalidate = 30;

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Fetch community first so we have the ID for subsequent queries
  const { data: community } = await supabase
    .from("communities")
    .select("*, divisions(slug, name, region, timezone)")
    .eq("slug", slug)
    .single();

  if (!community) return notFound();

  // Now fetch lots and plans by community_id in parallel
  const [{ data: lotsData }, { data: plansData }] = await Promise.all([
    supabase
      .from("lots")
      .select(
        "id, lot_number, lot_status, construction_status, is_available, lot_premium, address, block, phase, foundation"
      )
      .eq("community_id", community.id)
      .order("lot_number"),
    supabase
      .from("floor_plans")
      .select(
        "id, plan_name, plan_type, base_price, incentive_amount, net_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms, min_heated_sqft, max_heated_sqft, style_filters, popularity, virtual_tour_url, pdf_url, page_url, featured_image_url, elevations"
      )
      .eq("community_id", community.id)
      .order("net_price"),
  ]);

  const comm = {
    ...community,
    division_name: community.divisions?.name ?? "",
    division_slug: community.divisions?.slug ?? "",
  };

  return (
    <CommunityDetailClient
      community={comm}
      plans={plansData ?? []}
      lots={lotsData ?? []}
    />
  );
}
