"use client";

import Sidebar from "./Sidebar";

interface Props {
  activeHref: string;
  title?: string;
  children: React.ReactNode;
  topBar?: React.ReactNode;
  filtersBar?: React.ReactNode;
}

export default function PageShell({ activeHref, title, children, topBar, filtersBar }: Props) {
  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref={activeHref} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {topBar}
        {filtersBar}
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </main>
    </div>
  );
}
