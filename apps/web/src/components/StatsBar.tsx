"use client";

interface Stat {
  label: string;
  value: string | number;
  color?: string;
}

interface Props {
  stats: Stat[];
}

export default function StatsBar({ stats }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        padding: "10px 24px",
        borderBottom: "1px solid #1f1f1f",
        background: "#0a0a0a",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {stats.map((stat, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: stat.color ?? "#ededed",
              lineHeight: 1.2,
            }}
          >
            {stat.value}
          </span>
          <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
