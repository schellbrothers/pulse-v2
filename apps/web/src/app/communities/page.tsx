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

export default async function CommunitiesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: communities }, { data: divisions }] = await Promise.all([
    supabase
      .from("communities")
      .select(`*, divisions(slug, name, region, timezone, state_codes)`)
      .order("name")
      .returns<RawCommunity[]>(),
    supabase
      .from("divisions")
      .select("*")
      .order("name")
      .returns<Division[]>(),
  ]);

  // Flatten the nested divisions join into flat fields
  const flatCommunities = (communities ?? []).map((c: RawCommunity) => ({
    id:             c.id,
    division_id:    c.division_id,
    name:           c.name,
    slug:           c.slug,
    status:         c.status,
    city:           c.city,
    state:          c.state,
    price_from:     c.price_from,
    price_to:       c.price_to,
    is_55_plus:     c.is_55_plus,
    has_model:      c.has_model,
    has_lotworks:   c.has_lotworks,
    hoa_fee:        c.hoa_fee,
    hoa_period:     c.hoa_period,
    natural_gas:    c.natural_gas,
    electric:       c.electric,
    water:          c.water,
    sewer:          c.sewer,
    cable_internet: c.cable_internet,
    trash:          c.trash,
    amenities:      c.amenities,
    division_slug:  c.divisions?.slug     ?? "",
    division_name:  c.divisions?.name     ?? "",
    region:         c.divisions?.region   ?? "",
    timezone:       c.divisions?.timezone ?? "",
  }));

  return (
    <CommunitiesClient
      communities={flatCommunities}
      divisions={divisions ?? []}
    />
  );
}
