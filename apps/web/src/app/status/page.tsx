"use client";

import Link from "next/link";

type SystemStatus = "online" | "ready" | "unreachable";

const systems = [
  { emoji: "🦞", name: "Schellie",  description: "Orchestrator — OpenClaw on Mac Mini",          status: "online"  as SystemStatus },
  { emoji: "🐟", name: "Nemo",      description: "Analysis sandbox — OpenShell NemoClaw",         status: "ready"   as SystemStatus },
  { emoji: "🪸", name: "GBR",       description: "Execution sandbox — OpenShell",                 status: "ready"   as SystemStatus },
  { emoji: "⚡", name: "Spark",     description: "Local inference — DGX Spark (192.168.101.178)", status: "ready"   as SystemStatus },
  { emoji: "🗄️", name: "Supabase",  description: "Data plane — Postgres via Supabase",            status: "ready"   as SystemStatus },
  { emoji: "🐙", name: "GitHub",    description: "Source control — pulse-v2 repo",                status: "ready"   as SystemStatus },
  { emoji: "▲",  name: "Vercel",    description: "Deployment — CI/CD pipeline",                   status: "ready"   as SystemStatus },
];

const statusMap: Record<SystemStatus, { label: string; dot: string; text: string; pulse: boolean }> = {
  online:      { label: "Online",      dot: "bg-[#00c853]", text: "text-[#00c853]", pulse: true  },
  ready:       { label: "Ready",       dot: "bg-[#0070f3]", text: "text-[#0070f3]", pulse: false },
  unreachable: { label: "Unreachable", dot: "bg-[#ff4444]", text: "text-[#ff4444]", pulse: false },
};

const navItems = [
  { icon: "▤", label: "Overview",      href: "/"       },
  { icon: "⊡", label: "Agents",        href: "#"       },
  { icon: "✓", label: "Tasks",         href: "#"       },
  { icon: "⊕", label: "Leads",         href: "#"       },
  { icon: "⌂", label: "Communities",   href: "#"       },
  { icon: "◷", label: "Calendar",      href: "#"       },
  { icon: "◉", label: "Notifications", href: "#"       },
  { icon: "⚙", label: "Settings",      href: "#"       },
  { icon: "◈", label: "Status",        href: "/status" },
];

export default function StatusPage() {
  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a]">
        <div className="px-4 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <span className="text-base">🦞</span>
            <div>
              <span className="font-semibold text-[13px] text-[#ededed]">Pulse v2</span>
              <div className="text-[10px] text-[#555]">HBx AI Factory</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                item.label === "Status"
                  ? "bg-[#1a1a1a] text-[#ededed]"
                  : "text-[#888] hover:text-[#ededed] hover:bg-[#111111]"
              }`}
            >
              <span className="text-[14px] w-4 text-center opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

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

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3">
          <h1 className="text-[14px] font-semibold text-[#ededed]">System Status</h1>
        </div>

        <div className="px-6 py-6 max-w-[1400px]">
          <div className="grid grid-cols-3 gap-3">
            {systems.map((system) => {
              const s = statusMap[system.status];
              return (
                <div key={system.name} className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-5 hover:border-[#2a2a2a] transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-md bg-[#1a1a1a] flex items-center justify-center text-lg">
                        {system.emoji}
                      </div>
                      <div className="font-medium text-[13px] text-[#ededed]">{system.name}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium ${s.text}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
                      {s.label}
                    </div>
                  </div>
                  <p className="text-[12px] text-[#a1a1a1]">{system.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
