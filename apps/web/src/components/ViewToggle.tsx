"use client";

interface Props {
  view: "card" | "table";
  onChange: (v: "card" | "table") => void;
}

export default function ViewToggle({ view, onChange }: Props) {
  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 6,
    border: "1px solid #1f1f1f",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    transition: "background 0.15s, border-color 0.15s",
  };

  const activeStyle: React.CSSProperties = {
    ...btnBase,
    background: "#1a1a1a",
    borderColor: "#2a2a2a",
    color: "#ededed",
  };

  const inactiveStyle: React.CSSProperties = {
    ...btnBase,
    color: "#555",
  };

  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button
        style={view === "card" ? activeStyle : inactiveStyle}
        onClick={() => onChange("card")}
        title="Card view"
      >
        ⊞
      </button>
      <button
        style={view === "table" ? activeStyle : inactiveStyle}
        onClick={() => onChange("table")}
        title="Table view"
      >
        ≡
      </button>
    </div>
  );
}
