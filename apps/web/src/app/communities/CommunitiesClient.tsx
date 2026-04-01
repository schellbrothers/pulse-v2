"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import SlideOver from "@/components/SlideOver";
import Badge from "@/components/Badge";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import DataTable, { type Column } from "@/components/DataTable";

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
  division_slug: string;
  division_name: string;
  region: string;
  timezone: string;
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

function filterSelectStyle(active: boolean): React.CSSProperties {
  return {
    background: "#1a1a1e",
    border: `1px solid ${active ? "#80B602" : "#333"}`,
    color: active ? "#80B602" : "#888",
    borderRadius: 3,
    height: 28,
    fontSize: 12,
    padding: "0 6px",
    cursor: "pointer",
    outline: "none",
  };
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
      <h3 style={{ color: "var(--text-3)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
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

  // Unique states
  const allStates = Array.from(
    new Set(communities.map((c) => c.state).filter(Boolean))
  ).sort() as string[];

  // Filter
  const filtered = communities.filter((c) => {
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

  // Table rows
  const tableRows: CommunityTableRow[] = filtered.map((c) => ({
    ...c,
    _hoa_display: formatHoa(c.hoa_fee, c.hoa_period),
    _price_display: formatPrice(c.price_from),
  }));

  const tableColumns: Column<CommunityTableRow>[] = [
    {
      key: "name",
      label: "Community",
      sortable: true,
      render: (_v, row) => (
        <span style={{ color: "#ededed", fontWeight: 500 }}>{row.name}</span>
      ),
    },
    {
      key: "city",
      label: "City",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.city ?? "—"}</span>,
    },
    {
      key: "state",
      label: "State",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.state ?? "—"}</span>,
    },
    {
      key: "division_name",
      label: "Division",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row.division_name}</span>,
    },
    {
      key: "_price_display",
      label: "Price From",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._price_display}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (_v, row) => <StatusBadge status={row.status} />,
    },
    {
      key: "_hoa_display",
      label: "HOA/mo",
      sortable: true,
      render: (_v, row) => <span style={{ color: "#888", fontSize: 13 }}>{row._hoa_display}</span>,
    },
    {
      key: "model_homes",
      label: "Plans",
      render: () => <span style={{ color: "#555", fontSize: 13 }}>—</span>,
    },
    {
      key: "has_model",
      label: "Model Home",
      render: (_v, row) => (
        <span style={{ color: row.has_model ? "#4ade80" : "#555", fontSize: 12 }}>
          {row.has_model ? "Yes" : "—"}
        </span>
      ),
    },
  ];

  // Filter options
  const divisionOptions = divisions.map((d) => ({ value: d.slug, label: d.name }));
  const stateOptions = allStates.map((s) => ({ value: s, label: s }));

  // Inline filters for TopBar
  const inlineFilters = (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {!filter.divisionId && (
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          style={filterSelectStyle(divisionFilter !== "all")}
        >
          <option value="all">All Divisions</option>
          {divisionOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {!filter.communityId && (
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          style={filterSelectStyle(stateFilter !== "all")}
        >
          <option value="all">All States</option>
          {stateOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={filterSelectStyle(statusFilter !== "all")}
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="coming-soon">Coming Soon</option>
        <option value="sold-out">Sold Out</option>
      </select>
      <input
        type="text"
        placeholder="Search communities…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          background: "#1a1a1e",
          border: "1px solid #333",
          color: search ? "#ededed" : "#888",
          borderRadius: 3,
          height: 28,
          fontSize: 12,
          padding: "0 8px",
          width: 180,
          outline: "none",
        }}
      />
    </div>
  );

  // Amenities for slide-over
  const amenities = selected?.amenities
    ? selected.amenities.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const allUtilsNull = selected
    ? [selected.natural_gas, selected.electric, selected.water, selected.sewer, selected.cable_internet, selected.trash].every((v) => v == null)
    : true;

  return (
    <PageShell
      topBar={<TopBar title="Communities" right={inlineFilters} />}
      filtersBar={
        (filter.divisionId || filter.communityId) ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-3)" }}>
            <span>Filtered:</span>
            {labels.division && <span style={{ color: "var(--text-2)" }}>{labels.division}</span>}
            {labels.community && <><span>›</span><span style={{ color: "var(--text-2)" }}>{labels.community}</span></>}
            {labels.plan && <><span>›</span><span style={{ color: "var(--text-2)" }}>{labels.plan}</span></>}
          </div>
        ) : undefined
      }
    >
      <DataTable<CommunityTableRow>
        columns={tableColumns}
        rows={tableRows}
        defaultPageSize={100}
        onRowClick={(row) => setSelected(row)}
        emptyMessage="No communities match the current filter"
        minWidth={1100}
      />

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
            {selected.featured_image_url && (
              <div style={{ width: "100%", height: 180, borderRadius: 8, overflow: "hidden", marginBottom: 20, background: "var(--surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.featured_image_url} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {selected.division_name && (
                <Badge variant="custom" label={selected.division_name} customColor="#818cf8" customBg="#1a1a2e" customBorder="#2a2a4a" />
              )}
              {selected.is_55_plus && (
                <Badge variant="custom" label="55+" customColor="#f5a623" customBg="#2a2a1a" customBorder="#3f3a1f" />
              )}
              {selected.has_model && <Badge variant="model" />}
            </div>

            {selected.short_description && (
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.5, margin: "0 0 20px" }}>
                {selected.short_description}
              </p>
            )}

            <Section title="Overview">
              <InfoRow label="Division" value={selected.division_name || selected.division_slug} />
              <InfoRow label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ") || null} />
              <InfoRow label="Price From" value={formatPrice(selected.price_from)} />
              <InfoRow label="Price To" value={formatPrice(selected.price_to)} />
              {selected.hoa_fee != null && (
                <InfoRow label="HOA" value={formatHoa(selected.hoa_fee, selected.hoa_period)} />
              )}
            </Section>

            {selected.school_district && (
              <Section title="Schools">
                <InfoRow label="District"   value={selected.school_district} />
                <InfoRow label="Elementary" value={selected.school_elementary} />
                <InfoRow label="Middle"     value={selected.school_middle} />
                <InfoRow label="High"       value={selected.school_high} />
              </Section>
            )}

            {(selected.sales_phone || selected.sales_center_address) && (
              <Section title="Sales">
                <InfoRow label="Phone"   value={selected.sales_phone} />
                <InfoRow label="Address" value={selected.sales_center_address} />
              </Section>
            )}

            {!allUtilsNull && (
              <Section title="Utilities">
                {selected.natural_gas    != null && <InfoRow label="Natural Gas"    value={selected.natural_gas} />}
                {selected.electric       != null && <InfoRow label="Electric"       value={selected.electric} />}
                {selected.water          != null && <InfoRow label="Water"          value={selected.water} />}
                {selected.sewer          != null && <InfoRow label="Sewer"          value={selected.sewer} />}
                {selected.cable_internet != null && <InfoRow label="Cable/Internet" value={selected.cable_internet} />}
                {selected.trash          != null && <InfoRow label="Trash"          value={selected.trash} />}
              </Section>
            )}

            {amenities.length > 0 && (
              <Section title="Amenities">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {amenities.map((a) => (
                    <span key={a} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)", borderRadius: 6, fontSize: 11, padding: "3px 9px" }}>
                      {a}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {selected.page_url && (
                <a href={`https://schellbrothers.com${selected.page_url}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, background: "#1a2a3a", border: "1px solid #223347", color: "#7aafdf", textDecoration: "none", fontWeight: 500 }}>
                  ↗ SchellBrothers.com
                </a>
              )}
              <a href={`/plans?community=${selected.id}`}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
                View Plans →
              </a>
              {selected.brochure_url && (
                <a href={selected.brochure_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)", textDecoration: "none", fontWeight: 500 }}>
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

// ─── Export ───────────────────────────────────────────────────────────────────

export default function CommunitiesClient(props: Props) {
  return (
    <Suspense>
      <CommunitiesInner {...props} />
    </Suspense>
  );
}
