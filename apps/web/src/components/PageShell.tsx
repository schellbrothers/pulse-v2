"use client";

interface Props {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  filtersBar?: React.ReactNode;
}

export default function PageShell({ children, topBar, filtersBar }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {topBar}
        {filtersBar}
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </main>
    </div>
  );
}
