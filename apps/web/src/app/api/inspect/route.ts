/**
 * Script/Source Inspector API
 * Reads scripts from local filesystem (Mac Mini) or shows unavailable on Vercel.
 * MCP tools fetched from MCP server directly.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MCP_URL = process.env.PV2_MCP_URL || "https://pv2-mcp.vercel.app";
const MCP_KEY = process.env.PV2_MCP_API_KEY || "pv2-mcp-secret-key-change-me";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const name = searchParams.get("name");

  if (!type || !name) {
    return NextResponse.json({ error: "type and name required" }, { status: 400 });
  }

  try {
    if (type === "script" || type === "api") {
      // Read from local filesystem (only works on Mac Mini, not Vercel serverless)
      try {
        const fs = await import("fs");
        const pathMod = await import("path");
        
        let filePath: string;
        if (type === "api") {
          const routePath = name.replace(/^\/api\//, "");
          filePath = pathMod.join(process.cwd(), "src/app/api", routePath, "route.ts");
        } else {
          const SCRIPTS_DIR = process.env.HBX_SCRIPTS_DIR || "/Users/schellie/.openclaw/workspace/HBx/scripts";
          filePath = pathMod.join(SCRIPTS_DIR, name);
        }
        
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          const lang = name.endsWith(".ts") ? "typescript" : name.endsWith(".sh") ? "bash" : "python";
          return NextResponse.json({
            name, type, language: lang,
            path: filePath,
            lines: content.split("\n").length,
            content,
          });
        }
      } catch {
        // fs not available on serverless — expected on Vercel
      }

      return NextResponse.json({
        error: `Script inspection requires local access. View from Mac Mini or add GITHUB_TOKEN env var.`,
      }, { status: 404 });
    }

    if (type === "mcp") {
      try {
        const res = await fetch(`${MCP_URL}/tools`, {
          headers: { Authorization: `Bearer ${MCP_KEY}` },
        });
        if (!res.ok) throw new Error(`MCP: ${res.status}`);
        const data = await res.json();
        const tools = data.tools || data.result || data;
        const tool = Array.isArray(tools)
          ? tools.find((t: Record<string, unknown>) => t.name === name)
          : null;
        return NextResponse.json({
          name, type: "mcp", language: "json",
          content: JSON.stringify(tool || tools, null, 2),
          description: tool?.description,
        });
      } catch (e) {
        return NextResponse.json({
          name, type: "mcp", language: "text",
          content: `MCP server unavailable: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
