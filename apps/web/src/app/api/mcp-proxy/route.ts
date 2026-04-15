import { NextRequest, NextResponse } from "next/server";

const MCP_URL = process.env.PV2_MCP_URL ?? "https://pv2-mcp.vercel.app";
const MCP_KEY = process.env.PV2_MCP_API_KEY ?? "pv2-mcp-secret-key-change-me";

const AUTH_HEADERS = {
  Authorization: `Bearer ${MCP_KEY}`,
  "Content-Type": "application/json",
};

// GET /api/mcp-proxy?endpoint=health|tools
export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint") ?? "health";
  const allowed = ["health", "tools"];
  if (!allowed.includes(endpoint)) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }
  const r = await fetch(`${MCP_URL}/${endpoint}`, { headers: AUTH_HEADERS });
  const data = await r.json();
  return NextResponse.json(data);
}

// POST /api/mcp-proxy — tool call
export async function POST(req: NextRequest) {
  const { toolName, params } = await req.json();
  const r = await fetch(`${MCP_URL}/tools/${toolName}`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify(params),
  });
  const data = await r.json();
  return NextResponse.json(data);
}
