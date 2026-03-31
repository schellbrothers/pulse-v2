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
        borderBottom: "1px solid #1f1f1f",
        background: "#0d0d0d",
        flexShrink: 0,
      }}
    >
      <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</h1>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
      )}
    </div>
  );
}
