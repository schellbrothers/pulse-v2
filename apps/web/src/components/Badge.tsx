"use client";

type BadgeVariant =
  | "model"
  | "sold"
  | "qd"
  | "active"
  | "sold-out"
  | "leaseback"
  | "coming-soon"
  | "custom";

interface Props {
  variant: BadgeVariant;
  label?: string;
  customColor?: string;
  customBg?: string;
  customBorder?: string;
}

const VARIANT_STYLES: Record<
  Exclude<BadgeVariant, "custom">,
  { bg: string; color: string; border: string; label: string }
> = {
  model: {
    bg: "#161820",
    color: "#5b80a0",
    border: "#1a2a3f",
    label: "Model",
  },
  sold: {
    bg: "#1e1212",
    color: "#8a5a5a",
    border: "#3f1a1a",
    label: "Sold",
  },
  qd: {
    bg: "#1e1e12",
    color: "#8a7a5a",
    border: "#3f3f1a",
    label: "Quick Delivery",
  },
  active: {
    bg: "#0f1e0f",
    color: "#4a8a4a",
    border: "#1a3f1a",
    label: "Active",
  },
  "sold-out": {
    bg: "#1a1a1a",
    color: "#555",
    border: "#222",
    label: "Sold Out",
  },
  leaseback: {
    bg: "#1a1220",
    color: "#7a5a8a",
    border: "#2a1a3f",
    label: "Leaseback",
  },
  "coming-soon": {
    bg: "#1a1a0a",
    color: "#7a7a40",
    border: "#3a3a10",
    label: "Coming Soon",
  },
};

export default function Badge({
  variant,
  label,
  customColor,
  customBg,
  customBorder,
}: Props) {
  let bg: string;
  let color: string;
  let border: string;
  let defaultLabel: string;

  if (variant === "custom") {
    bg = customBg ?? "#1a1a1a";
    color = customColor ?? "#888";
    border = customBorder ?? "#222";
    defaultLabel = label ?? "—";
  } else {
    const s = VARIANT_STYLES[variant];
    bg = customBg ?? s.bg;
    color = customColor ?? s.color;
    border = customBorder ?? s.border;
    defaultLabel = s.label;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {label ?? defaultLabel}
    </span>
  );
}
