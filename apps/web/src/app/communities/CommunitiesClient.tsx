"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DataTable, { type Column, type StatItem as DataTableStatItem } from "@/components/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Division {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
}

interface Community {
  id: string;
  division_id: string;
  name: string;
  slug: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  price_from: number | null;
  price_to: number | null;
  is_55_plus: boolean;
  has_model: boolean;
  has_lotworks: boolean | null;
  hoa_fee: number | null;
  hoa_period: string | null;
  natural_gas: string | null;
  electric: string | null;
  water: string | null;
  sewer: string | null;
  cable_internet: string | null;
  trash: string | null;
  amenities: string | null;
  // joined fields
  division_slug: string;
  division_name: string;
  region: string;
  timezone: string;
  // New Heartbeat fields
  heartbeat_community_id: number | null;
  abbr: string | null;
  sales_phone: string | null;
  sales_center_address: string | null;
  zip: string | null;
  priced_from: number | null;
  short_description: string | null;
  school_district: string | null;
  school_elementary: string | null;
  school_middle: string | null;
  school_high: string | null;
  logo_image_url: string | null;
  brochure_url: string | null;
  lot_map_url: string | null;
  page_url: string | null;
  flickr_set_id: string | null;
  marketing_video_url: string | null;
  is_lotworks: boolean | null;
  model_homes: string | null;   // JSON string
  spec_homes: string | null;    // JSON string
}

// Augmented row type for DataTable (adds computed/display fields)
type CommunityTableRow = Community & Record<string, unknown> & {
  _status_display: string;
  _tag: string;
  _city_state: string;
  _hoa_display: string;
  _available: string;
};

interface Props {
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusAndTag(status: string | null): { isActive: boolean; tag: string | null } {
  switch (status) {
    case "active":       return { isActive: true,  tag: null };
    case "now-selling":  return { isActive: true,  tag: "Now Selling" };
    case "last-chance":  return { isActive: true,  tag: "Last Chance" };
    case "coming-soon":  return { isActive: false, tag: "Coming Soon" };
    case "sold-out":     return { isActive: false, tag: "Sold Out" };
    default:             return { isActive: false, tag: null };
  }
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "#555" }}>{label}:</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value.toLocaleString()}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const { isActive } = getStatusAndTag(status);
  return (
    <span style={{
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 4,
      backgroundColor: isActive ? "#1a2a1a" : "#1a1a1a",
      color: isActive ? "#00c853" : "#555",
      border: `1px solid ${isActive ? "#1f3f1f" : "#2a2a2a"}`,
      fontWeight: 500,
    }}>
      {isActive ? "Active" : "Not Active"}
    </span>
  );
}

function TagBadge({ status }: { status: string | null }) {
  const { tag } = getStatusAndTag(status);
  if (!tag) return null;
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    "Now Selling":  { bg: "#1a1f2e", text: "#0070f3", border: "#1a2a3f" },
    "Last Chance":  { bg: "#2a1a1a", text: "#ff6b6b", border: "#3f1f1f" },
    "Coming Soon":  { bg: "#2a2a1a", text: "#f5a623", border: "#3f3a1f" },
    "Sold Out":     { bg: "#1a1a1a", text: "#555",    border: "#2a2a2a" },
  };
  const s = styles[tag] ?? { bg: "#1a1a1a", text: "#555", border: "#2a2a2a" };
  return (
    <span style={{
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 4,
      backgroundColor: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
      fontWeight: 500,
    }}>
      {tag}
    </span>
  );
}

function formatPrice(n: number | null) {
  if (n == null) return "—";
  return `$${(n / 1000).toFixed(0)}K`;
}

function formatHoa(fee: number | null, period: string | null) {
  if (fee == null) return "—";
  return `$${fee.toLocaleString()}/${period ?? "mo"}`;
}

// ─── Slide-over helpers ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 style={{ color: "#555", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#666", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#a1a1a1", fontSize: 12, textAlign: "right", maxWidth: "60%" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function CommunitiesInner(props: Props) {
  const { communities, divisions } = props;
  const searchParams = useSearchParams();

  const [view, setView] = useState<"card" | "table">("card");
  const [divisionFilter, setDivisionFilter] = useState<string>(
    searchParams.get("division") ?? "all"
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selected, setSelected] = useState<Community | null>(null);

  // Hydrate view from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem("communities-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  function handleViewChange(v: "card" | "table") {
    setView(v);
    localStorage.setItem("communities-view", v);
  }

  const rows = communities
    .filter(c => divisionFilter === "all" || c.division_slug === divisionFilter)
    .filter(c => {
      if (tagFilter === "all") return true;
      const { tag } = getStatusAndTag(c.status);
      if (tagFilter === "active") return getStatusAndTag(c.status).isActive;
      if (tagFilter === "not-active") return !getStatusAndTag(c.status).isActive;
      return tag === tagFilter;
    })
    .filter(c => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return getStatusAndTag(c.status).isActive;
      if (statusFilter === "not-active") return !getStatusAndTag(c.status).isActive;
      return true;
    });

  // Augmented rows for DataTable — adds computed display fields
  const tableRows: CommunityTableRow[] = rows.map(c => {
    const { isActive, tag } = getStatusAndTag(c.status);
    return {
      ...c,
      _status_display: isActive ? "Active" : "Not Active",
      _tag: tag ?? "",
      _city_state: [c.city, c.state].filter(Boolean).join(", "),
      _hoa_display: formatHoa(c.hoa_fee, c.hoa_period),
      _available: c.has_lotworks ? "Yes" : "—",
    };
  });

  // Stats (based on filtered rows, excluding sold-out from total)
  const stats = {
    total: rows.filter(c => c.status !== "sold-out").length,
    active: rows.filter(c => ["active","now-selling","last-chance"].includes(c.status ?? "")).length,
    comingSoon: rows.filter(c => c.status === "coming-soon").length,
    soldOut: rows.filter(c => c.status === "sold-out").length,
  };

  const dataTableStats: DataTableStatItem[] = [
    { label: "Total",       value: stats.total,     color: "#666" },
    { label: "Active",      value: stats.active,    color: "#00c853" },
    { label: "Coming Soon", value: stats.comingSoon, color: "#f5a623" },
    { label: "Sold Out",    value: stats.soldOut,   color: "#555" },
  ];

  // DataTable column definitions
  const tableColumns: Column<CommunityTableRow>[] = [
    {
      key: "name",
      label: "Name",
      sticky: true,
      render: (_val, row) => (
        <span style={{ color: "#ededed", fontWeight: 500, fontSize: 13 }}>
          {row.name}
          {row.is_55_plus && (
            <span style={{
              color: "#f5a623", fontSize: 10, fontWeight: 600, marginLeft: 6,
              background: "#2a2a1a", border: "1px solid #3f3a1f", borderRadius: 4, padding: "1px 5px",
            }}>
              55+
            </span>
          )}
        </span>
      ),
    },
    {
      key: "division_name",
      label: "Division",
      filterable: true,
    },
    {
      key: "_status_display",
      label: "Status",
      filterable: true,
      render: (_val, row) => <StatusBadge status={row.status} />,
    },
    {
      key: "_tag",
      label: "Tag",
      filterable: true,
      render: (_val, row) => <TagBadge status={row.status} />,
    },
    {
      key: "_city_state",
      label: "City/State",
    },
    {
      key: "price_from",
      label: "Price From",
      render: (val) => formatPrice(val as number | null),
    },
    {
      key: "_hoa_display",
      label: "HOA",
      sortable: false,
    },
    {
      key: "_available",
      label: "Available",
    },
    {
      key: "foundation",
      label: "Foundation",
    },
    {
      key: "amenities",
      label: "Amenities",
      sortable: false,
      render: (val) => {
        const s = val as string | null;
        if (!s) return "—";
        return s.length > 50 ? s.slice(0, 50) + "…" : s;
      },
    },
  ];

  // ── Sidebar ────────────────────────────────────────────────────────────────

  const sidebar = (
    <Sidebar activeHref="/communities" />
  );

  // ── Top bar ────────────────────────────────────────────────────────────────

  const topBar = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 44, borderBottom: "1px solid #1f1f1f",
      background: "#0d0d0d", flexShrink: 0,
    }}>
      <h1 style={{ color: "#ededed", fontSize: 14, fontWeight: 600, margin: 0 }}>Communities</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Division filter */}
        <select
          value={divisionFilter}
          onChange={e => setDivisionFilter(e.target.value)}
          style={{
            background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ededed",
            borderRadius: 8, padding: "4px 10px", fontSize: 13, cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="all">All Divisions</option>
          {divisions.map(d => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-[#a1a1a1] text-[12px] rounded px-3 py-1.5 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="not-active">Not Active</option>
        </select>

        {/* Tag filter */}
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-[#a1a1a1] text-[12px] rounded px-3 py-1.5 outline-none"
        >
          <option value="all">All Tags</option>
          <option value="Now Selling">Now Selling</option>
          <option value="Last Chance">Last Chance</option>
          <option value="Coming Soon">Coming Soon</option>
          <option value="Sold Out">Sold Out</option>
        </select>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 2, background: "#1a1a1a", borderRadius: 8, padding: 3, border: "1px solid #2a2a2a" }}>
          {(["card", "table"] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              style={{
                background: view === v ? "#2a2a2a" : "transparent",
                border: "none", color: view === v ? "#ededed" : "#555",
                borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {i === 0 ? "⊞" : "≡"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Card view ──────────────────────────────────────────────────────────────

  const cardView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ padding: 24 }}>
      {rows.map(c => {
        const amenityList = c.amenities
          ? c.amenities.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        const visibleAmenities = amenityList.slice(0, 3);
        const overflow = amenityList.length - 3;

        return (
          <div
            key={c.id}
            onClick={() => c.slug ? window.location.href = `/communities/${c.slug}` : setSelected(c)}
            style={{
              background: "#111", border: "1px solid #1f1f1f", borderRadius: 12,
              padding: 12, cursor: "pointer", transition: "border-color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#333")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}
          >
            {/* Badges row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                background: "#1a1a2e", color: "#818cf8", border: "1px solid #2a2a4a",
                borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {c.division_name || c.division_slug}
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <StatusBadge status={c.status} />
                <TagBadge status={c.status} />
              </div>
            </div>

            {/* Name */}
            <div style={{ color: "#ededed", fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
              {c.name}
              {c.is_55_plus && (
                <span style={{ color: "#f5a623", fontSize: 10, fontWeight: 600, marginLeft: 6,
                  background: "#2a2a1a", border: "1px solid #3f3a1f", borderRadius: 4, padding: "1px 5px" }}>
                  55+
                </span>
              )}
            </div>

            {/* Location */}
            {(c.city || c.state) && (
              <div style={{ color: "#666", fontSize: 13, marginBottom: 10 }}>
                {[c.city, c.state].filter(Boolean).join(", ")}
              </div>
            )}

            {/* Price / HOA */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ color: "#555", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>From</div>
                <div style={{ color: "#ededed", fontSize: 14, fontWeight: 600 }}>{formatPrice(c.price_from)}</div>
              </div>
              {c.hoa_fee != null && (
                <div>
                  <div style={{ color: "#555", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>HOA</div>
                  <div style={{ color: "#ededed", fontSize: 14, fontWeight: 600 }}>{formatHoa(c.hoa_fee, c.hoa_period)}</div>
                </div>
              )}
            </div>

            {/* Amenity tags */}
            {visibleAmenities.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {visibleAmenities.map(a => (
                  <span key={a} style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888",
                    borderRadius: 4, fontSize: 10, padding: "2px 7px",
                  }}>
                    {a}
                  </span>
                ))}
                {overflow > 0 && (
                  <span style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555",
                    borderRadius: 4, fontSize: 10, padding: "2px 7px",
                  }}>
                    +{overflow}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Table view (DataTable) ─────────────────────────────────────────────────

  const tableView = (
    <DataTable<CommunityTableRow>
      columns={tableColumns}
      rows={tableRows}
      stats={dataTableStats}
      defaultPageSize={100}
      onRowClick={(row) => setSelected(row)}
      emptyMessage="No communities"
      minWidth={1200}
    />
  );

  // ── Slide-over panel ───────────────────────────────────────────────────────

  const allUtilsNull = selected
    ? [selected.natural_gas, selected.electric, selected.water, selected.sewer, selected.cable_internet, selected.trash].every(v => v == null)
    : true;

  const slideOver = selected && (
    <>
      {/* Overlay */}
      <div
        onClick={() => setSelected(null)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40,
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: 480, height: "100vh",
        background: "#111", borderLeft: "1px solid #1f1f1f", zIndex: 50,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #1f1f1f",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{
                background: "#1a1a2e", color: "#818cf8", border: "1px solid #2a2a4a",
                borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {selected.division_name || selected.division_slug}
              </span>
              <StatusBadge status={selected.status} />
              <TagBadge status={selected.status} />
            </div>
            <h2 style={{ color: "#ededed", fontSize: 16, fontWeight: 600, margin: 0 }}>
              {selected.name}
              {selected.is_55_plus && (
                <span style={{ color: "#f5a623", fontSize: 11, fontWeight: 600, marginLeft: 8,
                  background: "#2a2a1a", border: "1px solid #3f3a1f", borderRadius: 4, padding: "2px 6px" }}>
                  55+
                </span>
              )}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selected?.slug && (
              <a
                href={`/communities/${selected.slug}`}
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4,
                  backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a",
                  color: "#a1a1a1", textDecoration: "none", whiteSpace: "nowrap" }}
              >
                View Dashboard →
              </a>
            )}
          <button
            onClick={() => setSelected(null)}
            style={{
              background: "transparent", border: "none", color: "#555",
              fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1,
              marginTop: 2,
            }}
          >
            ×
          </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <Section title="Overview">
            <Row label="Division" value={selected.division_name || selected.division_slug} />
            <Row label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ") || null} />
            <Row label="Region"   value={selected.region} />
            <Row label="Timezone" value={selected.timezone} />
            <Row
              label="Status"
              value={getStatusAndTag(selected.status).isActive ? "Active" : "Not Active"}
            />
            {getStatusAndTag(selected.status).tag && (
              <Row
                label="Tag"
                value={getStatusAndTag(selected.status).tag}
              />
            )}
            {selected.short_description && (
              <div style={{ fontSize: 12, color: "#666", fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>
                {selected.short_description}
              </div>
            )}
          </Section>

          <Section title="Pricing">
            <Row label="Price From" value={formatPrice(selected.price_from)} />
            <Row label="Price To"   value={formatPrice(selected.price_to)} />
            <Row label="HOA"        value={selected.hoa_fee != null ? formatHoa(selected.hoa_fee, selected.hoa_period) : null} />
            <Row label="Priced From" value={selected.priced_from ? `$${selected.priced_from.toLocaleString()}` : null} />
          </Section>

          {selected.school_district && (
            <Section title="Schools">
              <Row label="District"   value={selected.school_district} />
              <Row label="Elementary" value={selected.school_elementary} />
              <Row label="Middle"     value={selected.school_middle} />
              <Row label="High"       value={selected.school_high} />
            </Section>
          )}

          {(selected.sales_phone || selected.sales_center_address) && (
            <Section title="Sales">
              <Row label="Phone"   value={selected.sales_phone} />
              <Row label="Address" value={selected.sales_center_address} />
            </Section>
          )}

          {(selected.brochure_url || selected.lot_map_url || selected.page_url || selected.marketing_video_url) && (
            <Section title="Resources">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {selected.brochure_url && (
                  <a href={selected.brochure_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4,
                      backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#a1a1a1", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    ⬇ Brochure
                  </a>
                )}
                {selected.lot_map_url && (
                  <a href={selected.lot_map_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4,
                      backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#a1a1a1", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    ◫ Lot Map
                  </a>
                )}
                {selected.page_url && (
                  <a href={`https://schellbrothers.com${selected.page_url}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4,
                      backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#a1a1a1", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    ↗ Website
                  </a>
                )}
                {selected.marketing_video_url && (
                  <a href={selected.marketing_video_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4,
                      backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#0070f3", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    ▶ Video
                  </a>
                )}
              </div>
            </Section>
          )}

          <Section title="Features">
            <Row label="Model Home"  value={selected.has_model  ? "Yes" : "No"} />
            <Row label="Lot Works"   value={selected.has_lotworks ? "Yes" : "No"} />
            <Row label="55+ Comm."   value={selected.is_55_plus  ? "Yes" : "No"} />
          </Section>

          {!allUtilsNull && (
            <Section title="Utilities">
              {selected.natural_gas    != null && <Row label="Natural Gas"    value={selected.natural_gas} />}
              {selected.electric       != null && <Row label="Electric"       value={selected.electric} />}
              {selected.water          != null && <Row label="Water"          value={selected.water} />}
              {selected.sewer          != null && <Row label="Sewer"          value={selected.sewer} />}
              {selected.cable_internet != null && <Row label="Cable/Internet" value={selected.cable_internet} />}
              {selected.trash          != null && <Row label="Trash"          value={selected.trash} />}
            </Section>
          )}

          {selected.amenities && (
            <Section title="Amenities">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selected.amenities.split(",").map(a => a.trim()).filter(Boolean).map(a => (
                  <span key={a} style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a1a1a1",
                    borderRadius: 6, fontSize: 12, padding: "3px 10px",
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d0d0d", overflow: "hidden" }}>
      {sidebar}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {topBar}
        {/* Stats bar — shown in card view; DataTable renders its own stats ribbon in table view */}
        {view === "card" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 20,
            padding: "6px 24px", backgroundColor: "#0d0d0d",
            borderBottom: "1px solid #1a1a1a", flexShrink: 0,
          }}>
            <StatItem label="Total" value={stats.total} color="#666" />
            <StatItem label="Active" value={stats.active} color="#00c853" />
            <StatItem label="Coming Soon" value={stats.comingSoon} color="#f5a623" />
            <StatItem label="Sold Out" value={stats.soldOut} color="#555" />
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "card" ? cardView : tableView}
        </div>
      </div>

      {slideOver}
    </div>
  );
}

// ─── Default export (wraps inner with Suspense) ───────────────────────────────

export default function CommunitiesClient(props: Props) {
  return (
    <Suspense>
      <CommunitiesInner {...props} />
    </Suspense>
  );
}
