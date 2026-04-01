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
        background: "rgb(0,27,35)",
        border: "2px solid #59a6bd",
        borderRadius: 3,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#7fc8de";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(89,166,189,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#59a6bd";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Image */}
      <div
        style={{
          width: "100%",
          height: 160,
          background: "rgb(0,20,28)",
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
              color: "rgba(255,255,255,0.2)",
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
              background: "#1a2e10",
              color: "#80B602",
              border: "1px solid #2a4a18",
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
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.3,
          }}
        >
          {planName}
        </div>

        {/* Community / location */}
        {locationLine && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.3 }}>{locationLine}</div>
        )}

        {/* Specs row */}
        {specParts.length > 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
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
              color: "#59a6bd",
              marginTop: 4,
            }}
          >
            {displayPrice}
          </div>
        )}

        {/* Division */}
        {divisionName && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
