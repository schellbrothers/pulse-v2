import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

// Mask sensitive fields — never leak raw secrets to the client
function maskSecret(val: string | null | undefined): string | null {
  if (!val) return null;
  if (val.length <= 8) return "••••••••";
  return val.substring(0, 4) + "••••" + val.substring(val.length - 4);
}

// GET — fetch integrations for a user (or all users)
export async function GET(req: NextRequest) {
  const sb = getServiceClient();
  const userId = req.nextUrl.searchParams.get("user_id");

  let query = sb.from("user_integrations").select("*");
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query.order("integration_type");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mask secrets before returning
  const masked = (data ?? []).map((row) => ({
    ...row,
    api_key: maskSecret(row.api_key),
    api_secret: maskSecret(row.api_secret),
    access_token: maskSecret(row.access_token),
    refresh_token: maskSecret(row.refresh_token),
  }));

  return NextResponse.json({ integrations: masked });
}

// POST — upsert an integration
export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  const body = await req.json();

  const {
    user_id,
    integration_type,
    is_enabled,
    account_id,
    external_user_id,
    api_key,
    api_secret,
    access_token,
    refresh_token,
    token_expires_at,
    webhook_url,
    config,
  } = body as {
    user_id: string;
    integration_type: string;
    is_enabled?: boolean;
    account_id?: string;
    external_user_id?: string;
    api_key?: string;
    api_secret?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    webhook_url?: string;
    config?: Record<string, unknown>;
  };

  if (!user_id || !integration_type) {
    return NextResponse.json({ error: "user_id and integration_type are required" }, { status: 400 });
  }

  // Build upsert payload — only include fields that were actually sent
  const payload: Record<string, unknown> = {
    user_id,
    integration_type,
    updated_at: new Date().toISOString(),
  };

  if (is_enabled !== undefined) payload.is_enabled = is_enabled;
  if (account_id !== undefined) payload.account_id = account_id;
  if (external_user_id !== undefined) payload.external_user_id = external_user_id;
  if (webhook_url !== undefined) payload.webhook_url = webhook_url;
  if (token_expires_at !== undefined) payload.token_expires_at = token_expires_at;
  if (config !== undefined) payload.config = config;

  // Only update secrets if they don't look like masked values
  if (api_key && !api_key.includes("••••")) payload.api_key = api_key;
  if (api_secret && !api_secret.includes("••••")) payload.api_secret = api_secret;
  if (access_token && !access_token.includes("••••")) payload.access_token = access_token;
  if (refresh_token && !refresh_token.includes("••••")) payload.refresh_token = refresh_token;

  const { data, error } = await sb
    .from("user_integrations")
    .upsert(payload, { onConflict: "user_id,integration_type" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return masked version
  return NextResponse.json({
    integration: {
      ...data,
      api_key: maskSecret(data.api_key),
      api_secret: maskSecret(data.api_secret),
      access_token: maskSecret(data.access_token),
      refresh_token: maskSecret(data.refresh_token),
    },
  });
}

// DELETE — remove an integration
export async function DELETE(req: NextRequest) {
  const sb = getServiceClient();
  const userId = req.nextUrl.searchParams.get("user_id");
  const integrationType = req.nextUrl.searchParams.get("integration_type");

  if (!userId || !integrationType) {
    return NextResponse.json({ error: "user_id and integration_type required" }, { status: 400 });
  }

  const { error } = await sb
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("integration_type", integrationType);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
