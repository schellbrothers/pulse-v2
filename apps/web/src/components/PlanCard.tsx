"use client";

interface PlanCardProps {
  planName: string;
  communityName?: string | null;
  divisionName?: string | null;
  city?: string | null;
  state?: string | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  basePrice?: number | null;
  netPrice?: number | null;
  priceFormatted?: string | null;
  incentiveAmount?: number | null;
  imageUrl?: string | null;
  pageUrl?: string | null;
  onClick?: () => void;
}

function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

function formatIncentive(n: number): string {
  if (n >= 1000) return "Save $" + Math.round(n / 1000) + "k";
  return "Save $" + n.toLocaleString("en-US");
}

export default function PlanCard({
  planName,
  communityName,
  divisionName,
  city,
  state,
  beds,
  baths,
  sqft,
  basePrice,
  netPrice,
  priceFormatted,
  incentiveAmount,
  imageUrl,
  pageUrl,
  onClick,
}: PlanCardProps) {
  const displayPrice = priceFormatted
    ? priceFormatted
    : netPrice != null
    ? formatPrice(netPrice)
    : basePrice != null
    ? formatPrice(basePrice)
    : null;

  const hasIncentive = incentiveAmount != null && incentiveAmount > 0;

  const specParts: string[] = [];
  if (beds != null) specParts.push(`${beds} bd`);
  if (baths != null) specParts.push(`${baths} ba`);
  if (sqft != null) specParts.push(`${sqft.toLocaleString()} sf`);

  const locationLine = [communityName, city && state ? `${city}, ${state}` : city ?? state]
    .filter(Boolean)
    .join(" · ");

  const card = (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Image */}
      <div
        style={{
          width: "100%",
          height: 160,
          background: "#1a1a1a",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={planName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#333",
              fontSize: 11,
            }}
          >
            No Image
          </div>
        )}

        {/* Incentive badge overlay */}
        {hasIncentive && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "#0f1e0f",
              color: "#4a8a4a",
              border: "1px solid #1a3f1a",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "2px 7px",
            }}
          >
            {formatIncentive(incentiveAmount!)}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {/* Plan name */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.3,
          }}
        >
          {planName}
        </div>

        {/* Community / location */}
        {locationLine && (
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.3 }}>{locationLine}</div>
        )}

        {/* Specs row */}
        {specParts.length > 0 && (
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            {specParts.join(" · ")}
          </div>
        )}

        {/* Price */}
        {displayPrice && (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 600,
              color: "#8a7a5a",
              marginTop: 4,
            }}
          >
            {displayPrice}
          </div>
        )}

        {/* Division */}
        {divisionName && (
          <div style={{ fontSize: 10, color: "#444", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {divisionName}
          </div>
        )}
      </div>
    </div>
  );

  if (pageUrl && !onClick) {
    return (
      <a href={pageUrl} style={{ textDecoration: "none" }} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return card;
}
