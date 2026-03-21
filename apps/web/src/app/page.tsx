"use client";

import Link from "next/link";

type Status = "online" | "ready" | "standby" | "planned";
type Tier = "control" | "active" | "role" | "planned";

interface Agent {
  emoji: string;
  name: string;
  role: string;
  description: string;
  tags: string[];
  status: Status;
  tier: Tier;
  poweredBy?: string;
}

const agents: Agent[] = [
  {
    emoji: "🦞",
    name: "Schellie",
    role: "Master Orchestrator",
    description: "Control plane. Receives objectives, defines missions, assigns agents, writes specs, directs GBR. Does not write code.",
    tags: ["Orchestration", "Specs", "Missions"],
    status: "online",
    tier: "control",
  },
  {
    emoji: "🐟",
    name: "Nemo",
    role: "Analysis Sandbox",
    description: "The active execution environment for all analysis work. Reads legacy Pv1 code and database read-only. Runs discovery, workflow mapping, data normalization, and domain modeling missions as directed by Schellie.",
    tags: ["OpenShell", "NemoClaw", "Read-Only", "Analysis"],
    status: "ready",
    tier: "active",
  },
];

const roles = [
  {
    emoji: "🐠",
    name: "Gill",
    role: "Workflow & Rules",
    description: "Maps business processes. Extracts funnel stages, state transitions, and business rules from Pv1.",
    tags: ["Workflow", "Rules", "Logic"],
  },
  {
    emoji: "🐡",
    name: "Dory",
    role: "Memory & Normalization",
    description: "Maintains system consistency. Produces canonical definitions, entity mappings, and terminology alignment.",
    tags: ["Memory", "Canonical", "Mapping"],
  },
  {
    emoji: "🦀",
    name: "Jacques",
    role: "Data Normalization",
    description: "Structures external data sources — Rilla, Zoom, Outlook, Twilio — into a unified event and engagement model.",
    tags: ["Data", "Events", "Ingestion"],
  },
  {
    emoji: "🐬",
    name: "Destiny",
    role: "AI Layer Design",
    description: "Defines intelligence capabilities: lead scoring models, automation triggers, buying signal detection, recommendations.",
    tags: ["AI Design", "Scoring", "Signals"],
  },
  {
    emoji: "🐙",
    name: "Hank",
    role: "Execution Planning",
    description: "Converts strategy into build steps. Produces MVP scope, backlog, and build sequence for GBR.",
    tags: ["Planning", "Backlog", "MVP"],
  },
];

const gbr = {
  emoji: "🪸",
  name: "GBR",
  fullName: "Great Barrier Reef",
  role: "Execution Sandbox",
  description: "The system's hands. Runs inside OpenShell. Executes specs from Schellie — plans, generates code, builds, self-repairs, commits. No outbound network. LLM relay via Schellie → Spark.",
  tags: ["Execution", "OpenShell", "Build", "Commit"],
  status: "ready" as Status,
};

const statusMap: Record<Status, { label: string; dot: string; text: string }> = {
  online:  { label: "Online",  dot: "bg-[#00c853]", text: "text-[#00c853]" },
  ready:   { label: "Ready",   dot: "bg-[#0070f3]", text: "text-[#0070f3]" },
  standby: { label: "Standby", dot: "bg-[#f5a623]", text: "text-[#f5a623]" },
  planned: { label: "Planned", dot: "bg-[#444]",    text: "text-[#666]"    },
};

const navItems = [
  { icon: "▤", label: "Overview",      href: "/" },
  { icon: "⊡", label: "Agents",        href: "#" },
  { icon: "✓", label: "Tasks",         href: "#" },
  { icon: "⊕", label: "Leads",         href: "#" },
  { icon: "⌂", label: "Communities",   href: "#" },
  { icon: "◷", label: "Calendar",      href: "#" },
  { icon: "◉", label: "Notifications", href: "#" },
  { icon: "⚙", label: "Settings",      href: "#" },
  { icon: "◈", label: "Status",        href: "/status" },
];

const stats = [
  { label: "Active Leads",   value: "0" },
  { label: "Prospects",      value: "0" },
  { label: "Agents Online",  value: "2" },
  { label: "Tasks Pending",  value: "0" },
];

const execModel = [
  { step: "1", label: "Mission defined" },
  { step: "2", label: "Role assigned" },
  { step: "3", label: "Nemo executes" },
  { step: "4", label: "Outputs collected" },
  { step: "5", label: "SPEC written" },
  { step: "6", label: "SPEC → GBR" },
  { step: "7", label: "GBR builds" },
  { step: "8", label: "Review + iterate" },
];

function AgentCard({ agent }: { agent: Agent }) {
  const s = statusMap[agent.status];
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-4 flex flex-col gap-3 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-[#1a1a1a] flex items-center justify-center text-lg">
            {agent.emoji}
          </div>
          <div>
            <div className="font-medium text-[13px] text-[#ededed]">{agent.name}</div>
            <div className="text-[11px] text-[#666]">{agent.role}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${s.text}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${s.dot} ${agent.status === "online" ? "animate-pulse" : ""}`} />
          {s.label}
        </div>
      </div>
      <p className="text-[12px] text-[#a1a1a1] leading-relaxed">{agent.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {agent.tags.map((tag) => (
          <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md border border-[#2a2a2a] text-[#888] bg-[#161616]">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoleCard({ role }: { role: typeof roles[0] }) {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-[#141414] flex items-center justify-center text-base">
          {role.emoji}
        </div>
        <div>
          <div className="font-medium text-[12px] text-[#888]">{role.name}</div>
          <div className="text-[11px] text-[#444]">{role.role}</div>
        </div>
      </div>
      <p className="text-[11px] text-[#555] leading-relaxed">{role.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {role.tags.map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border border-[#1a1a1a] text-[#444]">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function GBRCard() {
  const s = statusMap[gbr.status];
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#111111] p-5 hover:border-[#333] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#1a1a1a] flex items-center justify-center text-xl">
            {gbr.emoji}
          </div>
          <div>
            <div className="font-semibold text-[13px] text-[#ededed]">{gbr.name} <span className="text-[#555] font-normal">— {gbr.fullName}</span></div>
            <div className="text-[11px] text-[#666]">{gbr.role}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${s.text}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </div>
      </div>
      <p className="text-[12px] text-[#a1a1a1] leading-relaxed mb-3">{gbr.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {gbr.tags.map((tag) => (
          <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md border border-[#2a2a2a] text-[#888] bg-[#161616]">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

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
                item.label === "Overview"
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

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#1f1f1f] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-semibold text-[#ededed]">Mission Control</h1>
            <span className="text-[#444] text-[12px]">{dateStr}</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#ededed] text-[#0a0a0a] hover:bg-white transition-colors">
            + New Task
          </button>
        </div>

        <div className="px-6 py-6 space-y-8 max-w-[1400px]">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-4 py-4">
                <div className="text-[28px] font-semibold text-[#ededed] leading-none mb-1">{s.value}</div>
                <div className="text-[12px] text-[#666]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Execution Model */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[13px] font-semibold text-[#ededed]">Execution Model</h2>
              <span className="text-[11px] text-[#555]">Mission → Role → Nemo → SPEC → GBR → Build</span>
            </div>
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {execModel.map((step, i) => (
                <div key={step.step} className="flex items-center">
                  <div className="flex items-center gap-1.5 bg-[#111111] border border-[#1f1f1f] rounded-md px-3 py-2 whitespace-nowrap">
                    <span className="text-[10px] font-medium text-[#555]">{step.step}</span>
                    <span className="text-[11px] text-[#888]">{step.label}</span>
                  </div>
                  {i < execModel.length - 1 && (
                    <div className="text-[#333] px-1 text-[11px]">→</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14px] font-semibold text-[#ededed]">Infrastructure</h2>
                <p className="text-[12px] text-[#555] mt-0.5">2 live sandboxes · Schellie orchestrates · Nemo analyzes · GBR builds</p>
              </div>
            </div>

            {/* Control Plane */}
            <div className="mb-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium text-[#444] uppercase tracking-widest">Control Plane</span>
                <div className="flex-1 h-px bg-[#1f1f1f]" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <AgentCard agent={agents[0]} />
              </div>
            </div>

            <div className="flex justify-start pl-[52px] py-1">
              <div className="w-px h-4 bg-[#2a2a2a]" />
            </div>

            {/* Analysis Sandbox */}
            <div className="mb-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium text-[#444] uppercase tracking-widest">Analysis Sandbox</span>
                <div className="flex-1 h-px bg-[#1f1f1f]" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <AgentCard agent={agents[1]} />
              </div>
            </div>

            <div className="flex justify-start pl-[52px] py-1">
              <div className="w-px h-4 bg-[#2a2a2a]" />
            </div>

            {/* Execution Layer */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium text-[#444] uppercase tracking-widest">Execution Layer</span>
                <div className="flex-1 h-px bg-[#1f1f1f]" />
              </div>
              <GBRCard />
            </div>
          </div>

          {/* Mission Roles */}
          <div>
            <div className="mb-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[14px] font-semibold text-[#ededed]">Mission Roles</h2>
              </div>
              <p className="text-[12px] text-[#555] mb-4">
                Named roles that define <em>how</em> Nemo is tasked — not separate sandboxes. Each role is a mission type with its own domain, constraints, and output format. Dedicated sandboxes added only when a role needs a distinct security boundary.
              </p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {roles.map((r) => <RoleCard key={r.name} role={r} />)}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-[14px] font-semibold text-[#ededed] mb-3">Recent Activity</h2>
            <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] py-12 flex flex-col items-center justify-center gap-2">
              <div className="text-[11px] text-[#444]">No activity yet</div>
              <div className="text-[11px] text-[#333]">Agents are standing by</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}