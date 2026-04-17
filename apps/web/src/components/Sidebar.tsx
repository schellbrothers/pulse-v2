"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

// ── Canonical nav items — single source of truth ─────────────────────────────
// To add a new page: add one entry here. All client pages inherit it automatically.
export const NAV_ITEMS = [
  // ── WORKSPACE: role-based command centers ──
  { icon: "◎", label: "OSC",             href: "/workspace/osc",   group: "core" },
  { icon: "◉", label: "CSM",             href: "/workspace/csm",   group: "core" },
  { icon: "◈", label: "DSM",             href: "/workspace/dsm",   group: "core" },
  // ── DATA: CRM pipeline + reference tables ──
  { icon: "✓", label: "Tasks",           href: "/tasks",           group: "data" },
  { icon: "⊕", label: "Leads",           href: "/leads",           group: "data" },
  { icon: "⊙", label: "Queue",            href: "/queue",            group: "data" },
  { icon: "◧", label: "Prospects",       href: "/prospects",       group: "data" },
  { icon: "⊞", label: "Customers",       href: "/customers",       group: "data" },
  { icon: "◎", label: "Marketing",        href: "/marketing",       group: "data" },
  { icon: "◉", label: "Contacts",         href: "/contacts",        group: "data" },
  { icon: "⊞", label: "Divisions",       href: "/divisions",       group: "data" },
  { icon: "⌂", label: "Communities",     href: "/communities",     group: "data" },
  { icon: "◱", label: "Division Plans",  href: "/division-plans",  group: "data" },
  { icon: "◫", label: "Community Plans", href: "/community-plans", group: "data" },
  { icon: "⌂", label: "Model Homes",     href: "/model-homes",     group: "data" },
  { icon: "◈", label: "Quick Delivery",  href: "/quick-delivery",  group: "data" },
  { icon: "◫", label: "Lots",            href: "/lots",            group: "data" },
  // ── TOOLS ──
  { icon: "⊡", label: "Agents",          href: "#",               group: "tools" },
  { icon: "◷", label: "Calendar",        href: "#",               group: "tools" },
  { icon: "◉", label: "Notifications",   href: "#",               group: "tools" },
  { icon: "⚙", label: "Settings",        href: "#",               group: "tools" },
  { icon: "◈", label: "Status",          href: "/status",         group: "tools" },
  { icon: "◧", label: "Docs",            href: "/docs",           group: "tools" },
  { icon: "⬡", label: "MCP Tools",       href: "/tools/mcp",      group: "tools" },
] as const;

const GROUP_LABELS: Record<string, string> = {
  core: "WORKSPACE",
  data: "DATA",
  tools: "TOOLS",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { filter } = useGlobalFilter();

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #333333",
        background: "#222323",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          height: 56,
          padding: "0 16px",
          borderBottom: "1px solid #333333",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🦞</span>
          <div>
            <span
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: "#59a6bd",
                letterSpacing: "0.02em",
              }}
            >
              Pulse v2
            </span>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>HBx AI Factory</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item, i) => {
          const prevItem = i > 0 ? NAV_ITEMS[i - 1] : null;
          const isFirstInGroup = !prevItem || prevItem.group !== item.group;
          const href = item.href as string;
          const isActive =
            href === pathname ||
            (href !== "/" && href !== "#" && pathname.startsWith(href));

          return (
            <div key={item.label}>
              {/* Group label */}
              {isFirstInGroup && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    padding: i === 0 ? "4px 10px 4px" : "12px 10px 4px",
                  }}
                >
                  {GROUP_LABELS[item.group]}
                </div>
              )}
              <Link
                href={item.href === "#" ? "#" : (() => {
                const [basePath, itemQuery] = item.href.split("?");
                const params = new URLSearchParams();
                // Preserve global filter params from React context
                if (filter.divisionId) params.set("div", filter.divisionId);
                if (filter.communityId) params.set("comm", filter.communityId);
                if (filter.planModelId) params.set("plan", filter.planModelId);
                // Apply item's own params (e.g. mode)
                if (itemQuery) new URLSearchParams(itemQuery).forEach((v, k) => params.set(k, v));
                const qs = params.toString();
                return qs ? `${basePath}?${qs}` : basePath;
              })()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  borderRadius: 3,
                  fontSize: 13,
                  textDecoration: "none",
                  transition: "background 0.1s, color 0.1s",
                  marginBottom: 1,
                  borderLeft: isActive ? "3px solid #59a6bd" : "3px solid transparent",
                  background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
                  paddingLeft: 7, // 10px - 3px border = 7px to keep visual alignment
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.9)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.6)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    width: 16,
                    textAlign: "center",
                    opacity: isActive ? 1 : 0.7,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid #333333",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#3E3F44",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              🦞
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 8,
                height: 8,
                background: "#80B602",
                borderRadius: "50%",
                border: "1px solid #222323",
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(255,255,255,0.9)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Schellie
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Orchestrator · Online
            </div>
          </div>
        </div>
        {/* Version */}
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: "rgba(255,255,255,0.2)",
            textAlign: "right",
          }}
        >
          v2.0.0-hbv1
        </div>
      </div>
    </aside>
  );
}
