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
    bg: "#1a3040",
    color: "#59a6bd",
    border: "#2a5070",
    label: "Model",
  },
  sold: {
    bg: "#3a1818",
    color: "#E32027",
    border: "#5a2020",
    label: "Sold",
  },
  qd: {
    bg: "#3a2e18",
    color: "#e07000",
    border: "#5a4a20",
    label: "Quick Delivery",
  },
  active: {
    bg: "#1a2e10",
    color: "#80B602",
    border: "#2a4a18",
    label: "Active",
  },
  "sold-out": {
    bg: "#2a2b2e",
    color: "#999",
    border: "#444",
    label: "Sold Out",
  },
  leaseback: {
    bg: "#2e2a18",
    color: "#e07000",
    border: "#4a4018",
    label: "Leaseback",
  },
  "coming-soon": {
    bg: "#2a2b2e",
    color: "#666",
    border: "#444",
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
    bg = customBg ?? "#2a2b2e";
    color = customColor ?? "#999";
    border = customBorder ?? "#444";
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
