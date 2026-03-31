"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import FiltersBar from "@/components/FiltersBar";
import StatsBar from "@/components/StatsBar";
import ViewToggle from "@/components/ViewToggle";
import CommunityCard from "@/components/CommunityCard";
import SlideOver from "@/components/SlideOver";
import Badge from "@/components/Badge";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
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
  // Heartbeat fields
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
  featured_image_url: string | null;
  brochure_url: string | null;
  lot_map_url: string | null;
  page_url: string | null;
  flickr_set_id: string | null;
  marketing_video_url: string | null;
  is_lotworks: boolean | null;
  model_homes: string | null;
  spec_homes: string | null;
}

type CommunityTableRow = Community & Record<string, unknown> & {
  _status_display: string;
  _city_state: string;
  _hoa_display: string;
  _price_display: string;
};

interface Props {
  communities: Community[];
  divisions: Division[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusLabel(status: string | null): string {
  switch (status) {
    case "active":       return "Active";
    case "now-selling":  return "Now Selling";
    case "last-chance":  return "Last Chance";
    case "coming-soon":  return "Coming Soon";
    case "sold-out":     return "Sold Out";
    default:             return status ?? "Unknown";
  }
}

function isActiveStatus(status: string | null): boolean {
  return ["active", "now-selling", "last-chance"].includes(status ?? "");
}

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return `$${(n / 1000).toFixed(0)}K`;
}

function formatHoa(fee: number | null, period: string | null): string {
  if (fee == null) return "—";
  return `$${fee.toLocaleString()}/${period ?? "mo"}`;
}

function StatusBadge({ status }: { status: string | null }) {
  const active = isActiveStatus(status);
  return (
    <span style={{
      fontSize: 11, padding: "2px 7px", borderRadius: 4,
      background: active ? "#1a2a1a" : "var(--surface-2)",
      color: active ? "#4ade80" : "var(--text-3)",
      border: `1px solid ${active ? "#1f3f1f" : "var(--border)"}`,
      fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {getStatusLabel(status)}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: "var(--text-3)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, margin: "0 0 10px" }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <span style={{ color: "var(--text-3)", fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text-2)", fontSize: 12, textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function CommunitiesInner({ communities, divisions }: Props) {
  const searchParams = useSearchParams();
  const { filter, labels } = useGlobalFilter();

  const [view, setView] = useState<"card" | "table">("card");
  const [divisionFilter, setDivisionFilter] = useState<string>(() => {
    if (filter.divisionId) {
      return divisions.find(d => d.id === filter.divisionId)?.slug ?? "all";
    }
    return searchParams.get("division") ?? "all";
  });
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Community | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("communities-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  // Sync local division filter when global filter changes
  useEffect(() => {
    if (filter.divisionId) {
      const slug = divisions.find(d => d.id === filter.divisionId)?.slug;
      setDivisionFilter(slug ?? "all");
    } else {
      setDivisionFilter(searchParams.get("division") ?? "all");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.divisionId]);

  const handleViewChange = (v: "card" | "table") => {
    setView(v);
    localStorage.setItem("communities-view", v);
  };

  // Unique states
  const allStates = Array.from(
    new Set(communities.map((c) => c.state).filter(Boolean))
  ).sort() as string[];

  // Filter
  const filtered = communities.filter((c) => {
    // Global filter takes priority
    if (filter.communityId && c.id !== filter.communityId) return false;
    if (divisionFilter !== "all" && c.division_slug !== divisionFilter) return false;
    if (!filter.communityId && stateFilter !== "all" && c.state !== stateFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "active" && !isActiveStatus(c.status)) return false;
      if (statusFilter === "coming-soon" && c.status !== "coming-soon") return false;
      if (statusFilter === "sold-out" && c.status !== "sold-out") return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Aggregate stats
  const allPrices = communities.map((c) => c.price_from).filter((p): p is number => p != null);
  const priceMin = allPrices.length ? Math.min(...allPrices) : null;
  const priceMax = allPrices.length ? Math.max(...allPrices) : null;
  const priceRange = priceMin != null && priceMax != null
    ? `$${(priceMin / 1000).toFixed(0)}K – $${(priceMax / 1000).toFixed(0)}K`
    : "—";

  const statsBarItems = [
    { label: "Total",      value: filtered.length },
    { label: "Active",     value: filtered.filter((c) => isActiveStatus(c.status)).length, color: "#4ade80" },
    { label: "Coming Soon",value: filtered.filter((c) => c.status === "coming-soon").length, color: "#f5a623" },
    { label: "States",     value: new Set(filtered.map((c) => c.state).filter(Boolean)).size },
    { label: "Divisions",  value: new Set(filtered.map((c) => c.division_slug).filter(Boolean)).size },
    { label: "Price Range",value: priceRange, color: "#59a6bd" },
  ];

  // ── Table setup ────────────────────────────────────────────────────────────

  const tableRows: CommunityTableRow[] = filtered.map((c) => ({
    ...c,
    _status_display: getStatusLabel(c.status),
    _city_state: [c.city, c.state].filter(Boolean).join(", "),
    _hoa_display: formatHoa(c.hoa_fee, c.hoa_period),
    _price_display: formatPrice(c.price_from),
  }));

  const tableColumns: Column<CommunityTableRow>[] = [
    {
      key: "name",
      label: "Community",
      sortable: true,
      render: (_v, row) => (
        <span style={{ color: "var(--text)", fontWeight: 500 }}>{row.name}</span>
      ),
    },
    {
      key: "_city_state",
      label: "Location",
      sortable: true,
    },
    {
      key: "division_name",
      label: "Division",
      sortable: true,
    },
    {
      key: "_price_display",
      label: "Price From",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      render: (_v, row) => <StatusBadge status={row.status} />,
    },
    {
      key: "_hoa_display",
      label: "HOA",
      sortable: true,
    },
    {
      key: "has_model",
      label: "Model",
      render: (_v, row) => (
        <span style={{ color: row.has_model ? "#4ade80" : "#333", fontSize: 12 }}>
          {row.has_model ? "Yes" : "—"}
        </span>
      ),
    },
    {
      key: "page_url",
      label: "View",
      render: (_v, row) =>
        row.page_url ? (
          <a
            href={`https://schellbrothers.com${row.page_url}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#818cf8", fontSize: 11, textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            ↗
          </a>
        ) : null,
    },
  ];

  const dataTableStats: DataTableStatItem[] = [
    { label: "Communities", value: filtered.length, color: "var(--text)" },
    { label: "Active", value: filtered.filter((c) => isActiveStatus(c.status)).length, color: "#4ade80" },
  ];

  // ── Card view ──────────────────────────────────────────────────────────────

  const cardView = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
        padding: 24,
      }}
    >
      {filtered.map((c) => {
        const amenityList = c.amenities
          ? c.amenities.split(",").map((a) => a.trim()).filter(Boolean)
          : [];
        return (
          <CommunityCard
            key={c.id}
            name={c.name}
            city={c.city}
            state={c.state}
            priceFrom={c.price_from}
            tagline={c.short_description}
            imageUrl={c.featured_image_url}
            modelHomeName={c.has_model ? "Model Home" : null}
            status={getStatusLabel(c.status)}
            amenities={amenityList}
            onClick={() => setSelected(c)}
          />
        );
      })}
      {filtered.length === 0 && (
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            color: "rgba(255,255,255,0.3)",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 32 }}>⊘</span>
          <span style={{ fontSize: 13 }}>No results match the current filter</span>
        </div>
      )}
    </div>
  );

  // ── Table view ─────────────────────────────────────────────────────────────

  const tableView = (
    <DataTable<CommunityTableRow>
      columns={tableColumns}
      rows={tableRows}
      stats={dataTableStats}
      defaultPageSize={100}
      onRowClick={(row) => setSelected(row)}
      emptyMessage="No communities"
      minWidth={1100}
    />
  );

  // ── Slide-over content ─────────────────────────────────────────────────────

  const amenities = selected?.amenities
    ? selected.amenities.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const allUtilsNull = selected
    ? [selected.natural_gas, selected.electric, selected.water, selected.sewer, selected.cable_internet, selected.trash].every((v) => v == null)
    : true;

  // ── Filters ────────────────────────────────────────────────────────────────

  const divisionOptions = [
    { value: "all", label: "All Divisions" },
    ...divisions.map((d) => ({ value: d.slug, label: d.name })),
  ];

  const stateOptions = [
    { value: "all", label: "All States" },
    ...allStates.map((s) => ({ value: s, label: s })),
  ];

  const statusOptions = [
    { value: "all",         label: "All Statuses" },
    { value: "active",      label: "Active" },
    { value: "coming-soon", label: "Coming Soon" },
    { value: "sold-out",    label: "Sold Out" },
  ];

  return (
    <PageShell
      topBar={
        <TopBar
          title="Communities"
          right={<ViewToggle view={view} onChange={handleViewChange} />}
        />
      }
      filtersBar={
        <>
          {(filter.divisionId || filter.communityId) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-3)" }}>
              <span>Filtered:</span>
              {labels.division && <span style={{ color: "var(--text-2)" }}>{labels.division}</span>}
              {labels.community && <><span>›</span><span style={{ color: "var(--text-2)" }}>{labels.community}</span></>}
              {labels.plan && <><span>›</span><span style={{ color: "var(--text-2)" }}>{labels.plan}</span></>}
            </div>
          )}
          <FiltersBar
            filters={[
              ...(!filter.divisionId ? [{
                value: divisionFilter,
                onChange: setDivisionFilter,
                options: divisionOptions,
                placeholder: "All Divisions",
              }] : []),
              ...(!filter.communityId ? [{
                value: stateFilter,
                onChange: setStateFilter,
                options: stateOptions,
                placeholder: "All States",
              }] : []),
              {
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
                placeholder: "All Statuses",
              },
            ]}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search communities…"
          />
          <StatsBar stats={statsBarItems} />
        </>
      }
    >
      {view === "card" ? cardView : tableView}

      {/* Slide-over */}
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={
          selected
            ? [selected.city, selected.state].filter(Boolean).join(", ")
            : undefined
        }
        badge={selected ? <StatusBadge status={selected.status} /> : undefined}
        width={500}
      >
        {selected && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Hero image */}
            {selected.featured_image_url && (
              <div
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 20,
                  background: "var(--surface-2)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.featured_image_url}
                  alt={selected.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Badges */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {selected.division_name && (
                <Badge variant="custom" label={selected.division_name} customColor="#818cf8" customBg="#1a1a2e" customBorder="#2a2a4a" />
              )}
              {selected.is_55_plus && (
                <Badge variant="custom" label="55+" customColor="#f5a623" customBg="#2a2a1a" customBorder="#3f3a1f" />
              )}
              {selected.has_model && <Badge variant="model" />}
            </div>

            {/* Description */}
            {selected.short_description && (
              <p
                style={{
                  fontSize: 13,
                  color: "#888",
                  lineHeight: 1.5,
                  marginBottom: 20,
                  margin: "0 0 20px",
                }}
              >
                {selected.short_description}
              </p>
            )}

            <Section title="Overview">
              <Row label="Division" value={selected.division_name || selected.division_slug} />
              <Row label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ") || null} />
              <Row label="Price From" value={formatPrice(selected.price_from)} />
              <Row label="Price To"   value={formatPrice(selected.price_to)} />
              {selected.hoa_fee != null && (
                <Row label="HOA" value={formatHoa(selected.hoa_fee, selected.hoa_period)} />
              )}
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

            {amenities.length > 0 && (
              <Section title="Amenities">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {amenities.map((a) => (
                    <span
                      key={a}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text-2)",
                        borderRadius: 6,
                        fontSize: 11,
                        padding: "3px 9px",
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {selected.page_url && (
                <a
                  href={`https://schellbrothers.com${selected.page_url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 6,
                    background: "#1a2a3a",
                    border: "1px solid #223347",
                    color: "#7aafdf",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  ↗ SchellBrothers.com
                </a>
              )}
              <a
                href={`/plans?community=${selected.id}`}
                style={{
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: "#1a1a2e",
                  border: "1px solid #2a2a4a",
                  color: "#818cf8",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                View Plans →
              </a>
              {selected.brochure_url && (
                <a
                  href={selected.brochure_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 6,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  ⬇ Brochure
                </a>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}

// ─── Export (wrapped in Suspense for useSearchParams) ─────────────────────────

export default function CommunitiesClient(props: Props) {
  return (
    <Suspense>
      <CommunitiesInner {...props} />
    </Suspense>
  );
}
