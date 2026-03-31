import { createClient } from "@supabase/supabase-js";
import CommunitiesClient from "./CommunitiesClient";

export const revalidate = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DivisionJoin {
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
}

interface RawCommunity {
  id: string;
  division_id: string;
  name: string;
  slug: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  price_from: number | null;
  price_to: number | null;
  is_55_plus: boolean;
  has_model: boolean;
  has_lotworks: boolean;
  hoa_fee: number | null;
  hoa_period: string | null;
  natural_gas: string | null;
  electric: string | null;
  water: string | null;
  sewer: string | null;
  cable_internet: string | null;
  trash: string | null;
  amenities: string | null;
  created_at: string;
  updated_at: string;
  divisions: DivisionJoin | null;
}

interface Division {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: { div?: string; comm?: string; plan?: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  let commQuery = supabase
    .from("communities")
    .select(`*, divisions(slug, name, region, timezone, state_codes)`)
    .order("name")
    .returns<RawCommunity[]>();
  if (searchParams.div) {
    commQuery = commQuery.eq("division_id", searchParams.div) as typeof commQuery;
  }

  const [{ data: communities }, { data: divisions }] = await Promise.all([
    commQuery,
    supabase
      .from("divisions")
      .select("*")
      .order("name")
      .returns<Division[]>(),
  ]);

  // Flatten the nested divisions join into flat fields
  const flatCommunities = (communities ?? []).map((c: RawCommunity) => ({
    // Spread all DB columns — includes all Heartbeat-enriched fields automatically
    ...c,
    // Flatten division join
    division_slug:  c.divisions?.slug     ?? "",
    division_name:  c.divisions?.name     ?? "",
    region:         c.divisions?.region   ?? "",
    timezone:       c.divisions?.timezone ?? "",
    // Remove the nested object
    divisions:      undefined,
  }));

  return (
    <CommunitiesClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      communities={flatCommunities as any[]}
      divisions={divisions ?? []}
    />
  );
}
