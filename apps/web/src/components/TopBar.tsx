"use client";

interface Props {
  title: string;
  right?: React.ReactNode;
}

export default function TopBar({ title, right }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 44,
        borderBottom: "1px solid #444444",
        background: "#2a2b2e",
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: 15,
          fontWeight: 600,
          margin: 0,
          fontFamily: "var(--font-display)",
        }}
      >
        {title}
      </h1>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
      )}
    </div>
  );
}
