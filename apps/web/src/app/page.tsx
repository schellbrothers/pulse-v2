import { createClient } from "@supabase/supabase-js";
import OverviewClient from "./OverviewClient";

export const revalidate = 60;

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ div?: string; comm?: string; plan?: string }>;
}) {
  const { div: filterDiv, comm: filterComm } = await searchParams;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // ── Community View ──────────────────────────────────────────────────────────
  if (filterComm) {
    const [
      { data: communityData },
      { data: plans },
      { data: lots },
      { data: modelHomeData },
      { data: specHomesData },
      { data: divisions },
    ] = await Promise.all([
      supabase.from("communities").select("*").eq("id", filterComm).single(),
      supabase
        .from("community_plans")
        .select("*")
        .eq("community_id", filterComm)
        .order("net_price"),
      supabase
        .from("lots")
        .select("id,community_id,lot_number,lot_status,construction_status,is_available,lot_premium,address,phase,is_buildable")
        .eq("community_id", filterComm)
        .order("lot_number"),
      supabase.from("model_homes").select("*").eq("community_id", filterComm).maybeSingle(),
      supabase.from("spec_homes").select("*").eq("community_id", filterComm),
      supabase.from("divisions").select("id,name,slug,heartbeat_division_id"),
    ]);

    const community = communityData;

    // If model_homes.community_id is not a UUID match, also try by community_name
    let resolvedModelHome = modelHomeData;
    if (!resolvedModelHome && community?.name) {
      const { data: mhByName } = await supabase
        .from("model_homes")
        .select("*")
        .eq("community_name", community.name)
        .maybeSingle();
      resolvedModelHome = mhByName;
    }

    // Same for spec_homes: if none returned by UUID, try by community_name
    let resolvedSpecHomes = specHomesData ?? [];
    if (resolvedSpecHomes.length === 0 && community?.name) {
      const { data: shByName } = await supabase
        .from("spec_homes")
        .select("*")
        .eq("community_name", community.name);
      resolvedSpecHomes = shByName ?? [];
    }

    return (
      <OverviewClient
        view="community"
        community={community ?? {}}
        plans={plans ?? []}
        lots={lots ?? []}
        modelHome={resolvedModelHome}
        specHomes={resolvedSpecHomes}
        divisions={divisions ?? []}
      />
    );
  }

  // ── Division View ───────────────────────────────────────────────────────────
  if (filterDiv) {
    const [
      { data: communities },
      { data: divisionPlans },
      { data: lots },
      { data: divisions },
    ] = await Promise.all([
      supabase
        .from("communities")
        .select("*")
        .eq("division_id", filterDiv)
        .order("name"),
      supabase
        .from("division_plans")
        .select("id,division_id,marketing_name")
        .eq("division_id", filterDiv),
      supabase
        .from("lots")
        .select("id,community_id,lot_number,lot_status,construction_status,is_available,lot_premium,address"),
      supabase.from("divisions").select("*"),
    ]);

    return (
      <OverviewClient
        view="division"
        communities={communities ?? []}
        divisionPlans={divisionPlans ?? []}
        lots={lots ?? []}
        divisions={divisions ?? []}
        selectedDivisionId={filterDiv}
      />
    );
  }

  // ── Corp View ───────────────────────────────────────────────────────────────
  const [
    { data: divisions },
    { data: communities },
    { data: lots },
    { data: modelHomes },
    { data: specHomes },
  ] = await Promise.all([
    supabase.from("divisions").select("*").order("name"),
    supabase
      .from("communities")
      .select("id,name,city,state,division_id,price_from,featured_image_url,model_homes,amenities,status,page_url,hoa_fee,hoa_period,school_district,short_description,total_homesites,has_model")
      .order("name"),
    supabase
      .from("lots")
      .select("id,community_id,lot_number,lot_status,construction_status,is_available,lot_premium,address"),
    supabase.from("model_homes").select("id,community_id,community_name,name,address,city,state,model_name,model_marketing_name,image_url,virtual_tour_url,page_url,open_hours,leaseback"),
    supabase.from("spec_homes").select("id,community_id,community_name,plan_name,address,city,state,beds,baths,sqft,list_price,image_url,page_url"),
  ]);

  return (
    <OverviewClient
      view="corp"
      divisions={divisions ?? []}
      communities={communities ?? []}
      lots={lots ?? []}
      modelHomes={modelHomes ?? []}
      specHomes={specHomes ?? []}
    />
  );
}
