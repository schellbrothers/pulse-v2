"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  division_name: string;
  division_slug: string;
  description: string | null;
  short_description: string | null;
  priced_from: number | null;
  hoa_fee: number | null;
  hoa_period: string | null;
  is_55_plus: boolean;
  has_model: boolean;
  has_lotworks: boolean;
  school_district: string | null;
  school_elementary: string | null;
  school_middle: string | null;
  school_high: string | null;
  sales_phone: string | null;
  sales_center_address: string | null;
  amenities: string | null;
  featured_image_url: string | null;
  logo_image_url: string | null;
  brochure_url: string | null;
  lot_map_url: string | null;
  page_url: string | null;
  marketing_video_url: string | null;
  latitude: number | null;
  longitude: number | null;
  flickr_set_id: string | null;
  model_homes: string | null;
  spec_homes: string | null;
}

interface Plan {
  id: string;
  plan_name: string;
  plan_type: string | null;
  base_price: number | null;
  incentive_amount: number | null;
  net_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  min_bathrooms: number | null;
  max_bathrooms: number | null;
  min_heated_sqft: number | null;
  max_heated_sqft: number | null;
  style_filters: string[] | null;
  popularity: number | null;
  virtual_tour_url: string | null;
  pdf_url: string | null;
  page_url: string | null;
  featured_image_url: string | null;
}

interface Lot {
  id: string;
  lot_number: string;
  lot_status: string | null;
  construction_status: string | null;
  is_available: boolean;
  lot_premium: number;
  address: string | null;
  block: string | null;
  phase: string | null;
}

interface Props {
  community: Community;
  plans: Plan[];
  lots: Lot[];
}

interface ModelHome {
  name: string;
  url: string;
  home_id: number;
}

interface SpecHome {
  name: string;
  url: string;
  home_id: number;
  lot_block_number: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const active = ["active", "now-selling", "last-chance"].includes(status ?? "");
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 4,
        backgroundColor: active ? "#1a2a1a" : "#1a1a1a",
        color: active ? "#00c853" : "#555",
        border: `1px solid ${active ? "#1f3f1f" : "#2a2a2a"}`,
        fontWeight: 500,
      }}
    >
      {active ? "Active" : "Not Active"}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunityDetailClient({ community, plans, lots }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Lot stats
  const lotStats = {
    total: lots.length,
    available: lots.filter((l) => l.lot_status === "Available Homesite").length,
    sold: lots.filter((l) => l.lot_status === "Sold").length,
    future: lots.filter((l) => l.lot_status === "Future Homesite").length,
    model: lots.filter((l) => (l.lot_status || "").includes("Model")).length,
    qd: lots.filter((l) => l.lot_status === "Quick Delivery").length,
  };

  // Incentive — all plans in a community share the same incentive
  const incentive =
    plans.find((p) => p.incentive_amount && p.incentive_amount > 0)?.incentive_amount ?? 0;

  // Stats blocks — 7 blocks
  const statBlocks = [
    {
      label: "Priced From",
      value: community.priced_from ? `$${community.priced_from.toLocaleString()}` : "—",
      color: "#00c853",
    },
    {
      label: "Incentive",
      value: incentive > 0 ? `-$${incentive.toLocaleString()}` : "—",
      color: "#f5a623",
    },
    {
      label: "Available Lots",
      value: lotStats.available.toString(),
      color: "#00c853",
    },
    {
      label: "Total Lots",
      value: lotStats.total.toString(),
      color: "#666",
    },
    {
      label: "Floor Plans",
      value: plans.length.toString(),
      color: "#a1a1a1",
    },
    {
      label: "HOA / mo",
      value: community.hoa_fee ? `$${community.hoa_fee}` : "—",
      color: "#a1a1a1",
    },
    {
      label: "Sold",
      value: lotStats.sold.toString(),
      color: "#555",
    },
  ];

  // Parse model + spec homes safely
  let modelHomes: ModelHome[] = [];
  let specHomes: SpecHome[] = [];
  try {
    modelHomes = JSON.parse(community.model_homes || "[]") as ModelHome[];
  } catch {
    modelHomes = [];
  }
  try {
    specHomes = JSON.parse(community.spec_homes || "[]") as SpecHome[];
  } catch {
    specHomes = [];
  }

  // Amenities pills
  const amenityList = community.amenities
    ? community.amenities
        .split(";")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  // Section label style (shared)
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
    fontWeight: 500,
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar activeHref="/communities" />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Hero Bar ─────────────────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: "1px solid #1f1f1f",
            padding: "16px 24px",
            backgroundColor: "#0a0a0a",
            flexShrink: 0,
            zIndex: 10,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Left: breadcrumb + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a
                href="/communities"
                style={{ color: "#555", fontSize: 12, textDecoration: "none" }}
              >
                ← Communities
              </a>
              <span style={{ color: "#333" }}>/</span>
              <span style={{ color: "#ededed", fontSize: 14, fontWeight: 600 }}>
                {community.name}
              </span>
              <StatusBadge status={community.status} />
              {community.is_55_plus && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 3,
                    backgroundColor: "#1a1f2e",
                    color: "#0070f3",
                    border: "1px solid #1a2a3f",
                  }}
                >
                  55+
                </span>
              )}
              {community.city && community.state && (
                <span style={{ fontSize: 12, color: "#555" }}>
                  {community.city}, {community.state}
                </span>
              )}
            </div>

            {/* Right: resource links + Info button */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => setShowInfo(true)}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 4,
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  color: "#a1a1a1",
                  cursor: "pointer",
                }}
              >
                ⓘ Info
              </button>
              {community.brochure_url && (
                <a
                  href={community.brochure_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#a1a1a1",
                    textDecoration: "none",
                  }}
                >
                  ⬇ Brochure
                </a>
              )}
              {community.lot_map_url && (
                <a
                  href={community.lot_map_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#a1a1a1",
                    textDecoration: "none",
                  }}
                >
                  ◫ Lot Map
                </a>
              )}
              {community.page_url && (
                <a
                  href={`https://schellbrothers.com${community.page_url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#a1a1a1",
                    textDecoration: "none",
                  }}
                >
                  ↗ Website
                </a>
              )}
              {community.marketing_video_url && (
                <a
                  href={community.marketing_video_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    backgroundColor: "#1a1f2e",
                    border: "1px solid #1a2a3f",
                    color: "#0070f3",
                    textDecoration: "none",
                  }}
                >
                  ▶ Video
                </a>
              )}
            </div>
          </div>

          {community.short_description && (
            <div
              style={{
                fontSize: 12,
                color: "#555",
                marginTop: 6,
                fontStyle: "italic",
              }}
            >
              {community.short_description}
            </div>
          )}
        </div>

        {/* ── Stats Row — 7 blocks ─────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 1,
            borderBottom: "1px solid #1f1f1f",
            backgroundColor: "#1f1f1f",
            flexShrink: 0,
          }}
        >
          {statBlocks.map((s) => (
            <div
              key={s.label}
              style={{ backgroundColor: "#0a0a0a", padding: "14px 20px" }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Content — Map + Floor Plan Cards (full height) ──────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* LEFT: LotWorks Map — full height */}
          <div
            style={{
              borderRight: "1px solid #1f1f1f",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Map header */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #1f1f1f",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Site Map &amp; Lots
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                  {[
                    { color: "#00c853", label: `${lotStats.available} Available` },
                    { color: "#f5a623", label: `${lotStats.future} Future` },
                    { color: "#a855f7", label: `${lotStats.model} Model` },
                    { color: "#0070f3", label: `${lotStats.qd} QD` },
                  ]
                    .filter((s) => parseInt(s.label) > 0)
                    .map((s) => (
                      <span
                        key={s.label}
                        style={{ display: "flex", alignItems: "center", gap: 4, color: "#555" }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: s.color,
                            display: "inline-block",
                          }}
                        />
                        {s.label}
                      </span>
                    ))}
                </div>
                {community.lot_map_url && (
                  <a
                    href={community.lot_map_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11, color: "#555", textDecoration: "none" }}
                  >
                    Open ↗
                  </a>
                )}
              </div>
            </div>

            {/* Map iframe or empty state */}
            {community.lot_map_url ? (
              <iframe
                src={community.lot_map_url}
                style={{ flex: 1, border: "none", display: "block", width: "100%" }}
                title="Lot Map"
                loading="lazy"
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#333",
                  fontSize: 13,
                }}
              >
                No lot map available
              </div>
            )}
          </div>

          {/* RIGHT: Floor Plan Cards — scrollable */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Plans header */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #1f1f1f",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Floor Plans
              </span>
              <span style={{ fontSize: 11, color: "#444" }}>
                {plans.length} plans · click to explore
              </span>
            </div>

            {/* Scrollable plan card grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {plans.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    style={{
                      borderRadius: 8,
                      border:
                        selectedPlan?.id === p.id
                          ? "1px solid #2a2a2a"
                          : "1px solid #1f1f1f",
                      backgroundColor:
                        selectedPlan?.id === p.id ? "#161616" : "#0d0d0d",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPlan?.id !== p.id)
                        e.currentTarget.style.borderColor = "#2a2a2a";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPlan?.id !== p.id)
                        e.currentTarget.style.borderColor = "#1f1f1f";
                    }}
                  >
                    {/* Plan image */}
                    {p.featured_image_url ? (
                      <div
                        style={{ height: 130, overflow: "hidden", backgroundColor: "#111" }}
                      >
                        <img
                          src={p.featured_image_url}
                          alt={p.plan_name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          height: 130,
                          backgroundColor: "#111",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ color: "#333", fontSize: 28 }}>⌂</span>
                      </div>
                    )}

                    {/* Plan info */}
                    <div style={{ padding: "10px 12px" }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#ededed",
                          marginBottom: 4,
                        }}
                      >
                        {p.plan_name}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>
                        {p.min_bedrooms === p.max_bedrooms
                          ? p.min_bedrooms
                          : `${p.min_bedrooms}–${p.max_bedrooms}`}
                        bd{" · "}
                        {p.min_bathrooms === p.max_bathrooms
                          ? p.min_bathrooms
                          : `${p.min_bathrooms}–${p.max_bathrooms}`}
                        ba
                        {p.min_heated_sqft
                          ? ` · ${p.min_heated_sqft.toLocaleString()}–${p.max_heated_sqft?.toLocaleString()} sf`
                          : ""}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <span
                            style={{ fontSize: 14, fontWeight: 700, color: "#00c853" }}
                          >
                            {p.net_price ? `$${p.net_price.toLocaleString()}` : "—"}
                          </span>
                          {p.base_price && p.base_price !== p.net_price && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#444",
                                marginLeft: 6,
                                textDecoration: "line-through",
                              }}
                            >
                              ${p.base_price.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {(p.style_filters ?? []).length > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 7px",
                              borderRadius: 4,
                              backgroundColor: "#1a1f2e",
                              color: "#0070f3",
                              border: "1px solid #1a2a3f",
                            }}
                          >
                            {(p.style_filters ?? [])[0]}
                          </span>
                        )}
                      </div>
                      {p.popularity && p.popularity > 0 && (
                        <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>
                          ★ Interest score: {p.popularity}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Plan Slide-Over ───────────────────────────────────────────────── */}
        {selectedPlan !== null && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setSelectedPlan(null)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 40,
              }}
            />

            {/* Panel */}
            <div
              style={{
                position: "fixed",
                right: 0,
                top: 0,
                height: "100%",
                width: 560,
                backgroundColor: "#0f0f0f",
                borderLeft: "1px solid #1f1f1f",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #1f1f1f",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ededed" }}>
                    {selectedPlan.plan_name}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(selectedPlan.style_filters ?? []).map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: 4,
                          backgroundColor: "#1a1f2e",
                          color: "#0070f3",
                          border: "1px solid #1a2a3f",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {selectedPlan.virtual_tour_url && (
                    <a
                      href={selectedPlan.virtual_tour_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 4,
                        backgroundColor: "#1a1f2e",
                        border: "1px solid #1a2a3f",
                        color: "#0070f3",
                        textDecoration: "none",
                      }}
                    >
                      ▶ Virtual Tour
                    </a>
                  )}
                  {selectedPlan.pdf_url && (
                    <a
                      href={selectedPlan.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 4,
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        color: "#a1a1a1",
                        textDecoration: "none",
                      }}
                    >
                      ⬇ PDF
                    </a>
                  )}
                  {selectedPlan.page_url && (
                    <a
                      href={`https://schellbrothers.com${selectedPlan.page_url}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 4,
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        color: "#a1a1a1",
                        textDecoration: "none",
                      }}
                    >
                      ↗ Website
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedPlan(null)}
                    style={{
                      fontSize: 16,
                      background: "none",
                      border: "none",
                      color: "#555",
                      cursor: "pointer",
                      padding: "4px 8px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Plan image */}
              {selectedPlan.featured_image_url && (
                <div style={{ height: 220, overflow: "hidden", backgroundColor: "#111", flexShrink: 0 }}>
                  <img
                    src={selectedPlan.featured_image_url}
                    alt={selectedPlan.plan_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
              )}

              {/* Panel body */}
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>

                {/* Pricing section */}
                <div>
                  <div style={sectionLabel}>Pricing</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedPlan.net_price && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#555" }}>Net Price</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#00c853" }}>
                          ${selectedPlan.net_price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedPlan.base_price && selectedPlan.base_price !== selectedPlan.net_price && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#555" }}>Base Price</span>
                        <span style={{ fontSize: 13, color: "#444", textDecoration: "line-through" }}>
                          ${selectedPlan.base_price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedPlan.incentive_amount && selectedPlan.incentive_amount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#555" }}>Incentive</span>
                        <span style={{ fontSize: 13, color: "#f5a623" }}>
                          -${selectedPlan.incentive_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specs section */}
                <div>
                  <div style={sectionLabel}>Specifications</div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {(selectedPlan.min_bedrooms || selectedPlan.max_bedrooms) && (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 6,
                          backgroundColor: "#141414",
                          border: "1px solid #1a1a1a",
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#444", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Bedrooms
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>
                          {selectedPlan.min_bedrooms === selectedPlan.max_bedrooms
                            ? selectedPlan.min_bedrooms
                            : `${selectedPlan.min_bedrooms}–${selectedPlan.max_bedrooms}`}
                        </div>
                      </div>
                    )}
                    {(selectedPlan.min_bathrooms || selectedPlan.max_bathrooms) && (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 6,
                          backgroundColor: "#141414",
                          border: "1px solid #1a1a1a",
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#444", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Bathrooms
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>
                          {selectedPlan.min_bathrooms === selectedPlan.max_bathrooms
                            ? selectedPlan.min_bathrooms
                            : `${selectedPlan.min_bathrooms}–${selectedPlan.max_bathrooms}`}
                        </div>
                      </div>
                    )}
                    {(selectedPlan.min_heated_sqft || selectedPlan.max_heated_sqft) && (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 6,
                          backgroundColor: "#141414",
                          border: "1px solid #1a1a1a",
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#444", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Sq Ft
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>
                          {selectedPlan.min_heated_sqft === selectedPlan.max_heated_sqft
                            ? (selectedPlan.min_heated_sqft ?? 0).toLocaleString()
                            : `${(selectedPlan.min_heated_sqft ?? 0).toLocaleString()}–${(selectedPlan.max_heated_sqft ?? 0).toLocaleString()}`}
                        </div>
                      </div>
                    )}
                    {selectedPlan.plan_type && (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 6,
                          backgroundColor: "#141414",
                          border: "1px solid #1a1a1a",
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#444", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Type
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>
                          {selectedPlan.plan_type}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Popularity */}
                {selectedPlan.popularity && selectedPlan.popularity > 0 && (
                  <div>
                    <div style={sectionLabel}>Buyer Interest</div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 6,
                        backgroundColor: "#141414",
                        border: "1px solid #1a1a1a",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>★</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ededed" }}>
                          {selectedPlan.popularity}
                        </div>
                        <div style={{ fontSize: 11, color: "#555" }}>Interest score</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer action */}
              {selectedPlan.virtual_tour_url && (
                <div
                  style={{
                    padding: "16px 20px",
                    borderTop: "1px solid #1f1f1f",
                    flexShrink: 0,
                  }}
                >
                  <a
                    href={selectedPlan.virtual_tour_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "10px 0",
                      borderRadius: 6,
                      backgroundColor: "#0070f3",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    ▶ Open Virtual Tour
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Community Info Slide-Over ─────────────────────────────────────── */}
        {showInfo && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setShowInfo(false)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 40,
              }}
            />

            {/* Panel */}
            <div
              style={{
                position: "fixed",
                right: 0,
                top: 0,
                height: "100%",
                width: 560,
                backgroundColor: "#0f0f0f",
                borderLeft: "1px solid #1f1f1f",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #1f1f1f",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ededed" }}>
                    {community.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={community.status} />
                    {community.city && community.state && (
                      <span style={{ fontSize: 12, color: "#555" }}>
                        {community.city}, {community.state}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  style={{
                    fontSize: 16,
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    padding: "4px 8px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Panel body */}
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Overview / Description */}
                {community.description && (
                  <div>
                    <div style={sectionLabel}>Overview</div>
                    <p style={{ fontSize: 13, color: "#a1a1a1", lineHeight: 1.6, margin: 0 }}>
                      {community.description}
                    </p>
                  </div>
                )}

                {/* Schools */}
                {(community.school_district ||
                  community.school_elementary ||
                  community.school_middle ||
                  community.school_high) && (
                  <div>
                    <div style={sectionLabel}>Schools</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {community.school_district && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0 }}>
                            District
                          </span>
                          <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                            {community.school_district}
                          </span>
                        </div>
                      )}
                      {community.school_elementary && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0 }}>
                            Elementary
                          </span>
                          <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                            {community.school_elementary}
                          </span>
                        </div>
                      )}
                      {community.school_middle && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0 }}>
                            Middle
                          </span>
                          <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                            {community.school_middle}
                          </span>
                        </div>
                      )}
                      {community.school_high && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0 }}>
                            High
                          </span>
                          <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                            {community.school_high}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact */}
                {(community.sales_phone || community.sales_center_address) && (
                  <div>
                    <div style={sectionLabel}>Sales Contact</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {community.sales_phone && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0 }}>
                            Phone
                          </span>
                          <a
                            href={`tel:${community.sales_phone}`}
                            style={{ fontSize: 12, color: "#a1a1a1", textDecoration: "none" }}
                          >
                            {community.sales_phone}
                          </a>
                        </div>
                      )}
                      {community.sales_center_address && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0 }}>
                            Address
                          </span>
                          <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                            {community.sales_center_address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* HOA */}
                {community.hoa_fee && (
                  <div>
                    <div style={sectionLabel}>HOA</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0 }}>
                          Fee
                        </span>
                        <span style={{ fontSize: 12, color: "#a1a1a1" }}>
                          ${community.hoa_fee.toLocaleString()}
                          {community.hoa_period ? ` / ${community.hoa_period}` : " / mo"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {amenityList.length > 0 && (
                  <div>
                    <div style={sectionLabel}>Amenities</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {amenityList.map((a) => (
                        <span
                          key={a}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 12,
                            backgroundColor: "#161616",
                            border: "1px solid #2a2a2a",
                            color: "#a1a1a1",
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model & Spec Homes */}
                {(modelHomes.length > 0 || specHomes.length > 0) && (
                  <div>
                    <div style={sectionLabel}>Model &amp; Spec Homes</div>

                    {modelHomes.length > 0 && (
                      <div style={{ marginBottom: specHomes.length > 0 ? 16 : 0 }}>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#333",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 8,
                          }}
                        >
                          Model Homes
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {modelHomes.map((m) => (
                            <div
                              key={m.home_id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 10px",
                                borderRadius: 4,
                                backgroundColor: "#141414",
                                border: "1px solid #1a1a1a",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    backgroundColor: "#a855f7",
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ fontSize: 12, color: "#ededed" }}>{m.name}</span>
                              </div>
                              <a
                                href={`https://schellbrothers.com${m.url}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: 11, color: "#555", textDecoration: "none" }}
                              >
                                ↗
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {specHomes.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#333",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 8,
                          }}
                        >
                          Spec Homes
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {specHomes.map((s) => (
                            <div
                              key={s.home_id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 10px",
                                borderRadius: 4,
                                backgroundColor: "#141414",
                                border: "1px solid #1a1a1a",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    backgroundColor: "#0070f3",
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ fontSize: 12, color: "#ededed" }}>{s.name}</span>
                                {s.lot_block_number && (
                                  <span style={{ fontSize: 11, color: "#555" }}>
                                    · Lot {s.lot_block_number}
                                  </span>
                                )}
                              </div>
                              <a
                                href={`https://schellbrothers.com${s.url}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: 11, color: "#555", textDecoration: "none" }}
                              >
                                ↗
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
