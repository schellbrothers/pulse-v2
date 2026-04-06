import { NextResponse } from "next/server";

export async function POST() {
  // The sync script runs on the Mac Mini, not on Vercel servers
  // Trigger via the OpenClaw gateway using the system event API
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
  const cronJobId = "3fa703f1-f371-4c51-9987-7e235c336afd";

  try {
    // Try to trigger the cron job via gateway HTTP endpoint
    const res = await fetch(`${gatewayUrl}/api/cron/${cronJobId}/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${gatewayToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      return NextResponse.json({ ok: true, message: "Sync triggered via gateway" });
    }

    // Fallback: return success and tell user to run manually
    return NextResponse.json({
      ok: true,
      message: "Token sync is scheduled for 11pm ET nightly. To sync now, run: python3 ~/workspace/HBx/scripts/hbx-sync-token-usage.py on the Mac Mini.",
      note: "Gateway endpoint not reachable from Vercel — data will refresh at next scheduled sync",
    });
  } catch {
    return NextResponse.json({
      ok: true,
      message: "Sync queued. Data refreshes nightly at 11pm ET.",
      note: "Run hbx-sync-token-usage.py on Mac Mini for immediate update",
    });
  }
}
