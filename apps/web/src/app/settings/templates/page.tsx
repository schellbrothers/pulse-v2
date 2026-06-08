import { createClient } from "@supabase/supabase-js";
import TemplatesClient from "./TemplatesClient";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: templates } = await supabase
    .from("response_templates")
    .select("*")
    .eq("is_active", true)
    .order("form_type_code")
    .order("channel");

  return <TemplatesClient templates={templates ?? []} />;
}
