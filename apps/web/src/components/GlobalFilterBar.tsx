// Server component — fetches divisions + communities, passes to client child
import { createClient } from "@supabase/supabase-js";
import GlobalFilterBarClient from "./GlobalFilterBarClient";

export interface DivisionOption {
  id: string;
  name: string;
}

export interface CommunityOption {
  id: string;
  name: string;
  division_id: string;
}

export default async function GlobalFilterBar() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: divisions }, { data: communities }] = await Promise.all([
    supabase.from("divisions").select("id,name").order("name"),
    supabase.from("communities").select("id,name,division_id").order("name"),
  ]);

  return (
    <GlobalFilterBarClient
      divisions={(divisions ?? []) as DivisionOption[]}
      communities={(communities ?? []) as CommunityOption[]}
    />
  );
}
