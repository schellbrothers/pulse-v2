"use client";

import Link from "next/link";

// ── Canonical nav items — single source of truth ─────────────────────────────
// To add a new page: add one entry here. All client pages inherit it automatically.
export const NAV_ITEMS = [
  { icon: "▤", label: "Overview",      href: "/"            },
  { icon: "⊡", label: "Agents",        href: "#"            },
  { icon: "✓", label: "Tasks",         href: "/tasks"       },
  { icon: "⊕", label: "Leads",         href: "/leads"       },
  { icon: "⌂", label: "Communities",   href: "/communities" },
  { icon: "◫", label: "Lots",          href: "/lots"        },
  { icon: "◱", label: "Floor Plans",    href: "/floor-plans"  },
  { icon: "⌂", label: "Model Homes",    href: "/model-homes"  },
  { icon: "⚡", label: "Quick Delivery", href: "/quick-delivery" },
  { icon: "⊞", label: "Divisions",     href: "/divisions"   },
  { icon: "◷", label: "Calendar",      href: "#"            },
  { icon: "◉", label: "Notifications", href: "#"            },
  { icon: "⚙", label: "Settings",      href: "#"            },
  { icon: "◈", label: "Status",        href: "/status"      },
  { icon: "◧", label: "Docs",          href: "/docs"        },
] as const;

interface SidebarProps {
  activeHref: string;
}

export default function Sidebar({ activeHref }: SidebarProps) {
  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <span className="text-base">🦞</span>
          <div>
            <span className="font-semibold text-[13px] text-[#ededed]">Pulse v2</span>
            <div className="text-[10px] text-[#555]">HBx AI Factory</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
              item.href === activeHref
                ? "bg-[#1a1a1a] text-[#ededed]"
                : "text-[#888] hover:text-[#ededed] hover:bg-[#111111]"
            }`}
          >
            <span className="text-[14px] w-4 text-center opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs">🦞</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#00c853] rounded-full border border-[#0a0a0a] animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-[#ededed] truncate">Schellie</div>
            <div className="text-[11px] text-[#555] truncate">Orchestrator · Online</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
