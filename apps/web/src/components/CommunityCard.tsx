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
          height: 180,
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
              color: "#333",
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
              color: "#a1a1a1",
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
              background: "#161820",
              color: "#5b80a0",
              border: "1px solid #1a2a3f",
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
            color: "var(--text)",
            lineHeight: 1.3,
          }}
        >
          {name}
        </div>

        {/* Location */}
        {location && (
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.3 }}>{location}</div>
        )}

        {/* Price from */}
        {priceFrom != null && priceFrom > 0 && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8a7a5a",
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
              color: "#888",
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
                  color: "#555",
                  background: "#1a1a1a",
                  border: "1px solid #222",
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
