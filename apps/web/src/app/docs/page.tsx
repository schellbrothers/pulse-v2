import { createClient } from "@supabase/supabase-js";
import DocsClient from "./DocsClient";

export const revalidate = 60;

export default async function DocsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: docs } = await supabase
    .from("docs")
    .select("id, slug, title, category, content, sort_order, updated_at")
    .eq("is_published", true)
    .order("category")
    .order("sort_order");

  return <DocsClient docs={docs ?? []} />;
}
