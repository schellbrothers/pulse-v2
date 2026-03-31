"use client";

interface CommunityCardProps {
  name: string;
  city?: string | null;
  state?: string | null;
  priceFrom?: number | null;
  tagline?: string | null;
  imageUrl?: string | null;
  modelHomeName?: string | null;
  status?: string | null;
  amenities?: string[] | null;
  onClick?: () => void;
}

function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

export default function CommunityCard({
  name,
  city,
  state,
  priceFrom,
  tagline,
  imageUrl,
  modelHomeName,
  status,
  amenities,
  onClick,
}: CommunityCardProps) {
  const location = [city, state].filter(Boolean).join(", ");

  return (
    <div
      onClick={onClick}
      style={{
        background: "#3E3F44",
        border: "1px solid #555",
        borderRadius: 3,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#666";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#555";
      }}
    >
      {/* Image */}
      <div
        style={{
          width: "100%",
          height: 180,
          background: "#2a2b2e",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
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

        {/* Status badge */}
        {status && status !== "Active" && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(0,0,0,0.75)",
              color: "rgba(255,255,255,0.7)",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "2px 7px",
              backdropFilter: "blur(4px)",
            }}
          >
            {status}
          </div>
        )}

        {/* Model home badge */}
        {modelHomeName && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              background: "#1a3040",
              color: "#59a6bd",
              border: "1px solid #2a5070",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "2px 7px",
            }}
          >
            Model Home
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {/* Community name */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            lineHeight: 1.3,
          }}
        >
          {name}
        </div>

        {/* Location */}
        {location && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{location}</div>
        )}

        {/* Price from */}
        {priceFrom != null && priceFrom > 0 && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#59a6bd",
              marginTop: 2,
            }}
          >
            From {formatPrice(priceFrom)}
          </div>
        )}

        {/* Tagline */}
        {tagline && (
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.4,
              marginTop: 2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {tagline}
          </div>
        )}

        {/* Amenities */}
        {amenities && amenities.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            {amenities.slice(0, 3).map((a, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.5)",
                  background: "#2a2b2e",
                  border: "1px solid #444",
                  borderRadius: 3,
                  padding: "1px 5px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
