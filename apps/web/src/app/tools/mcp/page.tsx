"use client";

import { useEffect, useState } from "react";

interface HealthData {
  status: string;
  toolCount?: number;
  version?: string;
  url?: string;
  [key: string]: unknown;
}

interface MCPTool {
  name: string;
  description?: string;
  [key: string]: unknown;
}

export default function MCPToolsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Tester state
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [paramsJson, setParamsJson] = useState<string>("{}");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Health check (public, no auth)
      try {
        const res = await fetch("/api/mcp-proxy?endpoint=health");
        const data = await res.json();
        setHealth(data);
      } catch (e) {
        setHealthError(String(e));
      }

      // Tools list (via auth header on the client — list is non-sensitive)
      try {
        const res = await fetch("/api/mcp-proxy?endpoint=tools");
        const data = await res.json();
        const list: MCPTool[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.tools)
          ? data.tools
          : [];
        setTools(list);
        if (list.length > 0) setSelectedTool(list[0].name);
      } catch (e) {
        setToolsError(String(e));
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  async function runTool() {
    setRunError(null);
    setResult(null);
    setRunning(true);
    try {
      let params: unknown = {};
      try {
        params = JSON.parse(paramsJson);
      } catch {
        setRunError("Invalid JSON in params");
        setRunning(false);
        return;
      }
      const res = await fetch("/api/mcp-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName: selectedTool, params }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setRunError(String(e));
    } finally {
      setRunning(false);
    }
  }

  const isHealthy = health?.status === "ok" || health?.status === "healthy";

  return (
    <div
      style={{
        background: "#121314",
        minHeight: "100vh",
        color: "white",
        padding: "32px",
        fontFamily: "inherit",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: 0,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          ⬡ MCP Tools
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
          Model Context Protocol — tool registry &amp; tester
        </p>
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Loading…</div>
      )}

      {!loading && (
        <>
          {/* ── Health Card ──────────────────────────────────────── */}
          <div
            style={{
              background: "#1a1b1d",
              border: "1px solid #333333",
              borderRadius: 6,
              padding: "20px 24px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Health Status
            </div>
            {healthError ? (
              <div style={{ color: "#d21d40", fontSize: 13 }}>
                Error fetching health: {healthError}
              </div>
            ) : health ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
                {/* Status badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isHealthy ? "#80B602" : "#d21d40",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isHealthy ? "#80B602" : "#d21d40",
                    }}
                  >
                    {health.status?.toUpperCase() ?? "UNKNOWN"}
                  </span>
                </div>
                {health.version !== undefined && (
                  <Stat label="Version" value={String(health.version)} />
                )}
                {health.toolCount !== undefined && (
                  <Stat label="Tools" value={String(health.toolCount)} />
                )}
                {tools.length > 0 && health.toolCount === undefined && (
                  <Stat label="Tools" value={String(tools.length)} />
                )}
                <Stat label="MCP URL" value="https://pv2-mcp.vercel.app" mono />
              </div>
            ) : null}
          </div>

          {/* ── Tools List ───────────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Available Tools ({tools.length})
            </div>
            {toolsError ? (
              <div style={{ color: "#d21d40", fontSize: 13 }}>
                Error fetching tools: {toolsError}
              </div>
            ) : tools.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                No tools found.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    style={{
                      background: "#1a1b1d",
                      border: "1px solid #333333",
                      borderRadius: 6,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.9)",
                        marginBottom: tool.description ? 6 : 0,
                      }}
                    >
                      {tool.name}
                    </div>
                    {tool.description && (
                      <div
                        title={tool.description}
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.45)",
                          lineHeight: 1.5,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                        }}
                      >
                        {tool.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Tool Tester ──────────────────────────────────────── */}
          <div
            style={{
              background: "#1a1b1d",
              border: "1px solid #333333",
              borderRadius: 6,
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Tool Tester
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Tool select */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: 6,
                  }}
                >
                  Tool
                </label>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  style={{
                    background: "#0e0f10",
                    border: "1px solid #333333",
                    borderRadius: 4,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    padding: "7px 12px",
                    width: "100%",
                    maxWidth: 360,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {tools.length === 0 && (
                    <option value="">No tools available</option>
                  )}
                  {tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Params textarea */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: 6,
                  }}
                >
                  Params (JSON)
                </label>
                <textarea
                  value={paramsJson}
                  onChange={(e) => setParamsJson(e.target.value)}
                  placeholder="{}"
                  rows={5}
                  style={{
                    width: "100%",
                    maxWidth: 560,
                    background: "#0e0f10",
                    border: "1px solid #333333",
                    borderRadius: 4,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    fontFamily: "monospace",
                    padding: "8px 12px",
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Run button */}
              <div>
                <button
                  onClick={runTool}
                  disabled={running || !selectedTool}
                  style={{
                    background: running ? "#1b2a3a" : "#223347",
                    border: "1px solid #2e4560",
                    borderRadius: 4,
                    color: running ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.9)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "8px 24px",
                    cursor: running || !selectedTool ? "not-allowed" : "pointer",
                    transition: "background 0.1s",
                  }}
                >
                  {running ? "Running…" : "Run"}
                </button>
              </div>

              {/* Error */}
              {runError && (
                <div
                  style={{
                    background: "rgba(210,29,64,0.1)",
                    border: "1px solid rgba(210,29,64,0.4)",
                    borderRadius: 4,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#d21d40",
                  }}
                >
                  {runError}
                </div>
              )}

              {/* Result panel */}
              {result !== null && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 6,
                    }}
                  >
                    Response
                  </div>
                  <pre
                    style={{
                      background: "#0e0f10",
                      border: "1px solid #333333",
                      borderRadius: 4,
                      padding: "12px 14px",
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: "rgba(255,255,255,0.8)",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      margin: 0,
                      maxHeight: 400,
                      overflowY: "auto",
                    }}
                  >
                    {result}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.8)",
          fontFamily: mono ? "monospace" : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}
