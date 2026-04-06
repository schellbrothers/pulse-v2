import { exec } from "child_process";
import { NextResponse } from "next/server";

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    exec(
      "python3 /Users/schellie/.openclaw/workspace/HBx/scripts/hbx-sync-token-usage.py",
      { timeout: 120000 },
      (error, stdout) => {
        if (error) {
          resolve(
            NextResponse.json({ ok: false, error: error.message }, { status: 500 })
          );
        } else {
          resolve(NextResponse.json({ ok: true, output: stdout }));
        }
      }
    );
  });
}
