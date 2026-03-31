"use client";

interface Props {
  title: string;
  right?: React.ReactNode;
  loading?: boolean;
}

export default function TopBar({ title, right, loading }: Props) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        {loading && (
          <div
            style={{
              width: 16,
              height: 16,
              border: "2px solid rgba(89,166,189,0.3)",
              borderTop: "2px solid #59a6bd",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              flexShrink: 0,
            }}
          />
        )}
      </div>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
      )}
    </div>
  );
}
