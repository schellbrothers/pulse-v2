"use client";

import Link from "next/link";

// ─── Agent Registry ───────────────────────────────────────────────────────────

interface AgentDef {
  slug: string;
  name: string;
  icon: string;
  description: string;
  status: "active" | "inactive" | "draft";
}

const AGENTS: AgentDef[] = [
  {
    slug: "schellie",
    name: "Schellie",
    icon: "🐚",
    description:
      "Customer-facing chat agent. Handles live conversations, lead capture, and visitor engagement.",
    status: "active",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentDef["status"] }) {
  const color =
    status === "active" ? "#80B602" : status === "inactive" ? "#71717a" : "#fbbf24";
  const label =
    status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Draft";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color,
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsDirectoryPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#09090b",
        color: "#fafafa",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 24px 0",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: "#fafafa",
          }}
        >
          Agents
        </h1>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: 13,
            color: "#71717a",
          }}
        >
          Manage AI agents deployed across the platform
        </p>
      </div>

      {/* Agent Grid */}
      <div
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {/* Agent Cards */}
        {AGENTS.map((agent) => (
          <Link
            key={agent.slug}
            href={`/tools/agents/${agent.slug}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                padding: 20,
                cursor: "pointer",
                transition: "border-color 0.15s, background-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3f3f46";
                e.currentTarget.style.backgroundColor = "#1c1c1f";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#27272a";
                e.currentTarget.style.backgroundColor = "#18181b";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{agent.icon}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#fafafa" }}>
                    {agent.name}
                  </span>
                </div>
                <StatusDot status={agent.status} />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#a1a1aa",
                  lineHeight: 1.5,
                }}
              >
                {agent.description}
              </p>
            </div>
          </Link>
        ))}

        {/* + Add Agent placeholder */}
        <div
          style={{
            backgroundColor: "#18181b",
            border: "1px dashed #27272a",
            borderRadius: 8,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 120,
            opacity: 0.5,
            cursor: "not-allowed",
          }}
        >
          <span style={{ fontSize: 28, color: "#3f3f46", marginBottom: 8 }}>+</span>
          <span style={{ fontSize: 13, color: "#3f3f46", fontWeight: 500 }}>
            Add Agent
          </span>
          <span style={{ fontSize: 11, color: "#27272a", marginTop: 4 }}>
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}
