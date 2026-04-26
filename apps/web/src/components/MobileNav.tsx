"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

// ─── More Menu Links ──────────────────────────────────────────────────────────

const MORE_LINKS = [
  { group: "Pipeline", items: [
    { label: "Leads", href: "/leads" },
    { label: "Queue", href: "/queue" },
    { label: "Prospects", href: "/prospects" },
    { label: "Homeowners", href: "/customers" },
  ]},
  { group: "CRM", items: [
    { label: "Contacts", href: "/contacts" },
    { label: "Tasks", href: "/tasks" },
  ]},
  { group: "Reference", items: [
    { label: "Divisions", href: "/divisions" },
    { label: "Communities", href: "/communities" },
    { label: "Plans", href: "/community-plans" },
    { label: "Model Homes", href: "/model-homes" },
    { label: "Quick Delivery", href: "/quick-delivery" },
    { label: "Lots", href: "/lots" },
  ]},
  { group: "Tools", items: [
    { label: "Calendar", href: "/calendar" },
    { label: "Cron", href: "/cron" },
    { label: "Status", href: "/status" },
    { label: "Docs", href: "/docs" },
    { label: "MCP Tools", href: "/tools/mcp" },
  ]},
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function QueueIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#fafafa" : "#71717a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CommHubIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#fafafa" : "#71717a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#fafafa" : "#71717a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileNav() {
  const pathname = usePathname();
  const { filter } = useGlobalFilter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Determine workspace context — OSC or CSM
  const isOsc = pathname.startsWith("/workspace/osc");
  const isCsm = pathname.startsWith("/workspace/csm");
  const isWorkspace = isOsc || isCsm;
  const queueHref = isCsm ? "/workspace/csm" : "/workspace/osc";

  // Build href with filter params
  function buildHref(base: string): string {
    const params = new URLSearchParams();
    if (filter.divisionId) params.set("div", filter.divisionId);
    if (filter.communityId) params.set("comm", filter.communityId);
    if (filter.userId) params.set("user", filter.userId);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  // Active detection
  const queueActive = isWorkspace;
  const commActive = false; // Comm Hub is part of the workspace, not a separate route yet

  const tabs = [
    {
      key: "queue",
      label: isCsm ? "CSM" : "OSC",
      href: buildHref(queueHref),
      icon: <QueueIcon active={queueActive && !moreOpen} />,
      active: queueActive && !moreOpen,
    },
    {
      key: "comm",
      label: "Comm Hub",
      href: buildHref(queueHref),
      icon: <CommHubIcon active={commActive} />,
      active: commActive,
    },
    {
      key: "more",
      label: "More",
      href: "#",
      icon: <MoreIcon active={moreOpen} />,
      active: moreOpen,
    },
  ];

  return (
    <>
      {/* Bottom Nav Bar — mobile only */}
      <nav
        className="mobile-nav-bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: "#09090b",
          borderTop: "1px solid #27272a",
          display: "none", // hidden by default (desktop)
          alignItems: "center",
          justifyContent: "space-around",
          zIndex: 90,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {tabs.map(tab => (
          tab.key === "more" ? (
            <button
              key={tab.key}
              onClick={() => setMoreOpen(!moreOpen)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 16px",
                minWidth: 64,
                minHeight: 44,
              }}
            >
              {tab.icon}
              <span style={{ fontSize: 10, color: tab.active ? "#fafafa" : "#71717a", fontWeight: tab.active ? 600 : 400 }}>
                {tab.label}
              </span>
            </button>
          ) : (
            <Link
              key={tab.key}
              href={tab.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                textDecoration: "none",
                padding: "6px 16px",
                minWidth: 64,
                minHeight: 44,
              }}
            >
              {tab.icon}
              <span style={{ fontSize: 10, color: tab.active ? "#fafafa" : "#71717a", fontWeight: tab.active ? 600 : 400 }}>
                {tab.label}
              </span>
            </Link>
          )
        ))}
      </nav>

      {/* More menu slide-up */}
      {moreOpen && (
        <>
          <div
            onClick={() => setMoreOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 88,
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 56,
              left: 0,
              right: 0,
              zIndex: 89,
              background: "#18181b",
              borderTop: "1px solid #27272a",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "60vh",
              overflow: "auto",
              animation: "mobileNavSlideUp 0.2s ease-out",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Handle bar */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#3f3f46" }} />
            </div>

            {MORE_LINKS.map(group => (
              <div key={group.group} style={{ padding: "8px 20px" }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}>
                  {group.group}
                </div>
                {group.items.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={buildHref(item.href)}
                      onClick={() => setMoreOpen(false)}
                      style={{
                        display: "block",
                        padding: "12px 12px",
                        fontSize: 14,
                        color: isActive ? "#fafafa" : "#a1a1aa",
                        fontWeight: isActive ? 600 : 400,
                        textDecoration: "none",
                        borderRadius: 6,
                        minHeight: 44,
                        lineHeight: "20px",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Workspace links */}
            <div style={{ padding: "8px 20px 20px" }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6,
              }}>
                Workspace
              </div>
              {[
                { label: "OSC", href: "/workspace/osc" },
                { label: "CSM", href: "/workspace/csm" },
                { label: "DSM", href: "/workspace/dsm" },
                { label: "Marketing", href: "/workspace/marketing" },
              ].map(item => (
                <Link
                  key={item.href}
                  href={buildHref(item.href)}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: "block",
                    padding: "12px 12px",
                    fontSize: 14,
                    color: pathname.startsWith(item.href) ? "#fafafa" : "#a1a1aa",
                    fontWeight: pathname.startsWith(item.href) ? 600 : 400,
                    textDecoration: "none",
                    borderRadius: 6,
                    minHeight: 44,
                    lineHeight: "20px",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* CSS for mobile-only display */}
      <style>{`
        @media (max-width: 767px) {
          .mobile-nav-bar {
            display: flex !important;
          }
        }
        @keyframes mobileNavSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
