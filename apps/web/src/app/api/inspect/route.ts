/**
 * Script/Source Inspector API
 * 
 * GET /api/inspect?type=script&name=hbx-sync-zoom-calls.py
 * GET /api/inspect?type=api&name=/api/sync/webforms
 * GET /api/inspect?type=mcp&name=capture_lead
 * 
 * Returns the source code for inspection in the UI.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SCRIPTS_DIR = process.env.HBX_SCRIPTS_DIR || "/Users/schellie/.openclaw/workspace/HBx/scripts";
const API_DIR = process.env.API_DIR || path.join(process.cwd(), "src/app/api");
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
    if (type === "script") {
      // Read HBx Python script
      const filePath = path.join(SCRIPTS_DIR, name);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `Script not found: ${name}` }, { status: 404 });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json({
        name,
        type: "python",
        language: "python",
        path: filePath,
        lines: content.split("\n").length,
        content,
      });
    }

    if (type === "api") {
      // Read Next.js API route source
      const routePath = name.replace(/^\/api\//, "");
      const filePath = path.join(API_DIR, routePath, "route.ts");
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `API route not found: ${name}` }, { status: 404 });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json({
        name,
        type: "api",
        language: "typescript",
        path: filePath,
        lines: content.split("\n").length,
        content,
      });
    }

    if (type === "mcp") {
      // Fetch MCP tool schema from the MCP server
      try {
        const res = await fetch(`${MCP_URL}/tools`, {
          headers: { Authorization: `Bearer ${MCP_KEY}` },
        });
        if (!res.ok) throw new Error(`MCP server returned ${res.status}`);
        const data = await res.json();
        const tools = data.tools || data.result || data;
        const tool = Array.isArray(tools) ? tools.find((t: Record<string, unknown>) => t.name === name) : null;
        
        if (tool) {
          return NextResponse.json({
            name,
            type: "mcp",
            language: "json",
            content: JSON.stringify(tool, null, 2),
            description: tool.description,
            schema: tool.input_schema || tool.schema,
          });
        }
        
        // If individual tool not found, return full tool list
        return NextResponse.json({
          name,
          type: "mcp",
          language: "json",
          content: JSON.stringify(tools, null, 2),
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
