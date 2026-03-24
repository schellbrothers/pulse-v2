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
  is_lotworks: boolean;
  is_marketing_active: boolean;
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
  // ── new fields ──
  abbr: string | null;
  division_code: string | null;
  sales_email: string | null;
  amenities_structured: string | null;   // JSON array from Heartbeat
  hours: string | null;                   // JSON object {day: time}
  natural_gas: string | null;
  electric: string | null;
  water: string | null;
  sewer: string | null;
  trash: string | null;
  cable_internet: string | null;
  included_features_url: string | null;
  design_center_url: string | null;
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingBottom: 6,
        borderBottom: "1px solid #161616",
        marginBottom: 6,
      }}
    >
      <span style={{ fontSize: 11, color: "#555", flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#a1a1a1", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunityDetailClient({ community, plans, lots }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [mainView, setMainView] = useState<"map-plans" | "lots">("map-plans");
  const [lotStatusFilter, setLotStatusFilter] = useState("all");
  const [lotSearch, setLotSearch] = useState("");

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
  const statBlocks: Array<{ label: string; value: string; color: string; clickable?: boolean; lotFilter?: string }> = [
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
              style={{
                backgroundColor: "#0a0a0a", padding: "14px 20px",
                cursor: s.clickable ? "pointer" : "default",
                borderBottom: s.clickable && mainView === "lots" && (s as any).lotFilter === lotStatusFilter ? "2px solid #ededed" : "2px solid transparent",
                transition: "background 0.15s",
              }}
              onClick={() => { if (s.clickable) { setMainView("lots"); setLotStatusFilter((s as any).lotFilter || "all"); } }}
              onMouseEnter={e => { if (s.clickable) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#111111"; }}
              onMouseLeave={e => { if (s.clickable) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0a0a0a"; }}
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
  
      {/* ── LOT TABLE VIEW (takes over when mainView === "lots") ── */}
      {mainView === "lots" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Lot table toolbar */}
          <div style={{ padding: "10px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", gap: 12, backgroundColor: "#0a0a0a", flexShrink: 0 }}>
            <button
              onClick={() => setMainView("map-plans")}
              style={{ fontSize: 12, color: "#555", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Map & Plans
            </button>
            <span style={{ color: "#2a2a2a" }}>|</span>
            <span style={{ fontSize: 12, color: "#ededed", fontWeight: 500 }}>Lots — {community.name}</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {/* Status filter tabs */}
              {["all", "Available Homesite", "Future Homesite", "Quick Delivery", "Sold"].map(f => (
                <button key={f} onClick={() => setLotStatusFilter(f)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 4, cursor: "pointer",
                    backgroundColor: lotStatusFilter === f ? "#1a1a1a" : "transparent",
                    border: lotStatusFilter === f ? "1px solid #2a2a2a" : "1px solid transparent",
                    color: lotStatusFilter === f ? "#ededed" : "#555",
                    transition: "all 0.1s",
                  }}>
                  {f === "all" ? "All" : f === "Available Homesite" ? "Available" : f === "Future Homesite" ? "Future" : f === "Quick Delivery" ? "QD" : "Sold"}
                </button>
              ))}
              <input
                value={lotSearch}
                onChange={e => setLotSearch(e.target.value)}
                placeholder="Search lot # or address..."
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, backgroundColor: "#111", border: "1px solid #2a2a2a", color: "#a1a1a1", outline: "none", width: 180 }}
              />
            </div>
          </div>
          {/* Lot table */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 800, fontSize: 12, borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr style={{ backgroundColor: "#0d0d0d" }}>
                  {["Lot #", "Block", "Phase", "Status", "Construction", "Premium", "Address"].map(h => (
                    <th key={h} style={{ padding: "6px 14px", textAlign: "left", fontWeight: 500, fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #1f1f1f", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots
                  .filter(l => lotStatusFilter === "all" || l.lot_status === lotStatusFilter)
                  .filter(l => !lotSearch || l.lot_number.includes(lotSearch) || (l.address || "").toLowerCase().includes(lotSearch.toLowerCase()))
                  .map(l => {
                    const isAvail = l.lot_status === "Available Homesite";
                    const isQD = l.lot_status === "Quick Delivery";
                    const isFuture = l.lot_status === "Future Homesite";
                    const statusColor = isAvail || isQD ? "#00c853" : isFuture ? "#f5a623" : "#444";
                    const statusBg = isAvail || isQD ? "#1a2a1a" : isFuture ? "#2a2a1a" : "#1a1a1a";
                    const statusBorder = isAvail || isQD ? "#1f3f1f" : isFuture ? "#3f3a1f" : "#2a2a2a";
                    return (
                      <tr key={l.id} style={{ borderBottom: "1px solid #1a1a1a" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#111111")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                        <td style={{ padding: "8px 14px", color: "#ededed", fontWeight: 500 }}>{l.lot_number}</td>
                        <td style={{ padding: "8px 14px", color: "#555" }}>{l.block || "—"}</td>
                        <td style={{ padding: "8px 14px", color: "#555", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{l.phase || "—"}</td>
                        <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
                            {l.lot_status === "Available Homesite" ? "Available" : l.lot_status === "Future Homesite" ? "Future" : l.lot_status === "Quick Delivery" ? "Quick Del" : l.lot_status || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 14px", color: "#666", whiteSpace: "nowrap" }}>{l.construction_status || "—"}</td>
                        <td style={{ padding: "8px 14px", color: l.lot_premium > 0 ? "#f5a623" : "#444", whiteSpace: "nowrap" }}>
                          {l.lot_premium > 0 ? `+$${l.lot_premium.toLocaleString()}` : "—"}
                        </td>
                        <td style={{ padding: "8px 14px", color: "#555" }}>{l.address || "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                        style={{ height: 180, overflow: "hidden", backgroundColor: "#111" }}
                      >
                        <img
                          src={p.featured_image_url}
                          alt={p.plan_name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            backgroundColor: "#0a0a0a",
                            display: "block",
                          }}
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          height: 180,
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
      )}

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

                {/* ── OVERVIEW ── */}
                {community.description && (
                  <Section title="Overview">
                    <p style={{ fontSize: 12, color: "#a1a1a1", lineHeight: 1.7, margin: 0 }}>
                      {community.description}
                    </p>
                  </Section>
                )}

                {/* ── KEY FACTS ── */}
                <Section title="Key Facts">
                  <Row label="Priced From"   value={community.priced_from ? `$${community.priced_from.toLocaleString()}` : null} />
                  <Row label="HOA"           value={community.hoa_fee ? `$${community.hoa_fee}/mo` : null} />
                  <Row label="Location"      value={[community.city, community.state, community.zip].filter(Boolean).join(", ")} />
                  <Row label="Division"      value={community.division_name} />
                  <Row label="Abbreviation"  value={community.abbr} />
                  <Row label="55+ Community" value={community.is_55_plus ? "Yes" : null} />
                  <Row label="LotWorks"      value={community.is_lotworks ? "Active" : null} />
                  <Row label="Status"        value={community.is_marketing_active ? "Marketing Active" : "Not Active"} />
                </Section>

                {/* ── SALES CONTACT ── */}
                {(community.sales_phone || community.sales_center_address) && (
                  <Section title="Sales Contact">
                    <Row label="Phone"   value={community.sales_phone} />
                    <Row label="Address" value={community.sales_center_address} />
                    {community.sales_email && (
                      <Row label="Email" value={community.sales_email} />
                    )}
                  </Section>
                )}

                {/* ── HOURS ── */}
                {community.hours && (() => {
                  try {
                    const hours = typeof community.hours === "string" ? JSON.parse(community.hours) : community.hours;
                    const entries = Object.entries(hours as Record<string, string>);
                    if (entries.length === 0) return null;
                    return (
                      <Section title="Hours">
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {entries.map(([day, time]) => (
                            <div key={day} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 4, borderBottom: "1px solid #161616" }}>
                              <span style={{ fontSize: 11, color: "#555" }}>{day}</span>
                              <span style={{ fontSize: 11, color: "#a1a1a1" }}>{time}</span>
                            </div>
                          ))}
                        </div>
                      </Section>
                    );
                  } catch { return null; }
                })()}

                {/* ── SCHOOLS ── */}
                {community.school_district && (
                  <Section title="Schools">
                    <Row label="District"   value={community.school_district} />
                    <Row label="Elementary" value={community.school_elementary} />
                    <Row label="Middle"     value={community.school_middle} />
                    <Row label="High"       value={community.school_high} />
                  </Section>
                )}

                {/* ── UTILITIES ── */}
                {(community.natural_gas || community.electric || community.water || community.sewer || community.trash) && (
                  <Section title="Utilities">
                    <Row label="Natural Gas"      value={community.natural_gas} />
                    <Row label="Electric"         value={community.electric} />
                    <Row label="Water"            value={community.water} />
                    <Row label="Sewer"            value={community.sewer} />
                    <Row label="Trash"            value={community.trash} />
                    <Row label="Cable / Internet" value={community.cable_internet} />
                  </Section>
                )}

                {/* ── AMENITIES ── */}
                {(() => {
                  // Use structured amenities if available, fall back to string
                  try {
                    if (community.amenities_structured) {
                      const amenities = typeof community.amenities_structured === "string"
                        ? JSON.parse(community.amenities_structured)
                        : community.amenities_structured;
                      if (Array.isArray(amenities) && amenities.length > 0) {
                        return (
                          <Section title="Amenities">
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                              {(amenities as Array<{ name: string }>).map((a) => (
                                <span key={a.name} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4,
                                  backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1" }}>
                                  {a.name}
                                </span>
                              ))}
                            </div>
                          </Section>
                        );
                      }
                    }
                  } catch {}
                  // Fall back to string
                  if (community.amenities) {
                    const items = community.amenities.split(";").map((s: string) => s.trim()).filter(Boolean);
                    return (
                      <Section title="Amenities">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                          {items.map((item: string) => (
                            <span key={item} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4,
                              backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1" }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </Section>
                    );
                  }
                  return null;
                })()}

                {/* ── MODEL & SPEC HOMES ── */}
                {(() => {
                  try {
                    const models = community.model_homes
                      ? (typeof community.model_homes === "string" ? JSON.parse(community.model_homes) : community.model_homes) as Array<{ name: string; url: string; home_id: number }>
                      : [];
                    const specs = community.spec_homes
                      ? (typeof community.spec_homes === "string" ? JSON.parse(community.spec_homes) : community.spec_homes) as Array<{ name: string; url: string; home_id: number; lot_block_number?: string }>
                      : [];

                    if (models.length === 0 && specs.length === 0) return null;
                    return (
                      <Section title="Model & Spec Homes">
                        {models.length > 0 && (
                          <>
                            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Model Homes</div>
                            {models.map(m => (
                              <a key={m.home_id} href={`https://schellbrothers.com${m.url}`} target="_blank" rel="noreferrer"
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                                  padding: "6px 0", borderBottom: "1px solid #161616", textDecoration: "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#a855f7", flexShrink: 0, display: "inline-block" }} />
                                  <span style={{ fontSize: 12, color: "#ededed", fontWeight: 500 }}>{m.name}</span>
                                </div>
                                <span style={{ fontSize: 11, color: "#555" }}>↗</span>
                              </a>
                            ))}
                          </>
                        )}
                        {specs.length > 0 && (
                          <>
                            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: models.length > 0 ? 12 : 0, marginBottom: 6 }}>Spec / Quick Delivery</div>
                            {specs.map(s => (
                              <a key={s.home_id} href={`https://schellbrothers.com${s.url}`} target="_blank" rel="noreferrer"
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                                  padding: "6px 0", borderBottom: "1px solid #161616", textDecoration: "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#0070f3", flexShrink: 0, display: "inline-block" }} />
                                  <span style={{ fontSize: 12, color: "#ededed", fontWeight: 500 }}>{s.name}</span>
                                  {s.lot_block_number && <span style={{ fontSize: 11, color: "#555" }}>· Lot {s.lot_block_number}</span>}
                                </div>
                                <span style={{ fontSize: 11, color: "#555" }}>↗</span>
                              </a>
                            ))}
                          </>
                        )}
                      </Section>
                    );
                  } catch { return null; }
                })()}

                {/* ── RESOURCES ── */}
                {(community.brochure_url || community.included_features_url || community.design_center_url || community.page_url || community.marketing_video_url || community.flickr_set_id) && (
                  <Section title="Resources">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      {community.brochure_url && (
                        <a href={community.brochure_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1", textDecoration: "none" }}>
                          ⬇ Brochure
                        </a>
                      )}
                      {community.included_features_url && (
                        <a href={community.included_features_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1", textDecoration: "none" }}>
                          ⬇ Included Features
                        </a>
                      )}
                      {community.design_center_url && (
                        <a href={community.design_center_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1", textDecoration: "none" }}>
                          🎨 Design Center
                        </a>
                      )}
                      {community.page_url && (
                        <a href={`https://schellbrothers.com${community.page_url}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1", textDecoration: "none" }}>
                          ↗ Website
                        </a>
                      )}
                      {community.marketing_video_url && (
                        <a href={community.marketing_video_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, backgroundColor: "#1a1f2e", border: "1px solid #1a2a3f", color: "#0070f3", textDecoration: "none" }}>
                          ▶ Video
                        </a>
                      )}
                      {community.flickr_set_id && (
                        <a href={`https://www.flickr.com/photos/schellbrothers/sets/${community.flickr_set_id}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1", textDecoration: "none" }}>
                          📷 Photo Gallery
                        </a>
                      )}
                    </div>
                  </Section>
                )}

              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
