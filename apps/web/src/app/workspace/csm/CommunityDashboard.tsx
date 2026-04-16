"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunityViewProps {
  community: Record<string, any>;
  plans: any[];
  lots: any[];
  modelHome: any | null;
  specHomes: any[];
  divisions: { id: string; name: string; slug: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min != null) return `${formatPrice(min)}+`;
  return `up to ${formatPrice(max)}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, subtitle, active, onClick,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 20px",
        backgroundColor: active ? "#18181b" : "#09090b",
        border: `1px solid ${active ? "#3f3f46" : "#27272a"}`,
        borderRadius: 8,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = "#52525b";
          e.currentTarget.style.backgroundColor = "#18181b";
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = active ? "#3f3f46" : "#27272a";
          e.currentTarget.style.backgroundColor = active ? "#18181b" : "#09090b";
        }
      }}
    >
      <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: 24, fontWeight: 600, color: "#fafafa", lineHeight: 1.2 }}>
        {value}
      </span>
      {subtitle && (
        <span style={{ fontSize: 11, color: "#52525b" }}>{subtitle}</span>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{title}</span>
        {count !== undefined && (
          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Data Table ───────────────────────────────────────────────────────────────

function MiniTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                padding: "8px 14px", textAlign: "left", fontSize: 11, color: "#71717a",
                fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em",
                backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#3f3f46" }}>No data</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#18181b")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "8px 14px", fontSize: 12, color: j === 0 ? "#fafafa" : "#a1a1aa",
                  fontWeight: j === 0 ? 500 : 400, borderBottom: "1px solid #18181b",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Drill-down panels ────────────────────────────────────────────────────────

type DrillPanel = null | "plans" | "lots" | "leads" | "prospects" | "customers" | "appointments" | "qd";

// ─── Main Component ──────────────────────────────────────────────────────────

function CommunityView({ community, plans, lots, modelHome, specHomes, divisions }: CommunityViewProps) {
  const [drill, setDrill] = useState<DrillPanel>(null);
  const [prospects, setProspects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const availableLots = lots.filter((l: any) => l.is_available);
  const underConstruction = lots.filter((l: any) => l.construction_status === "under-construction" || l.lot_status === "under-construction");
  const qdLots = lots.filter((l: any) => l.lot_status === "quick-delivery");
  const division = divisions.find(d => d.id === community.division_id);

  // Fetch CRM data for this community
  useEffect(() => {
    if (!community?.id) return;
    const cid = community.id;

    Promise.all([
      supabase.from("prospects").select("*").eq("community_id", cid),
      supabase.from("leads").select("*").eq("community_id", cid).neq("stage", "opportunity"),
      supabase.from("home_owners").select("*, contacts(first_name, last_name, email, phone)").eq("community_id", cid),
    ]).then(([pRes, lRes, hRes]) => {
      setProspects(pRes.data ?? []);
      setLeads(lRes.data ?? []);
      setCustomers(hRes.data ?? []);
    });
  }, [community?.id]);

  function toggleDrill(panel: DrillPanel) {
    setDrill(prev => prev === panel ? null : panel);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          {division && (
            <span style={{ fontSize: 12, color: "#52525b" }}>{division.name} /</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#fafafa", margin: 0 }}>{community.name}</h1>
          <span style={{ fontSize: 12, color: "#52525b" }}>
            {[community.city, community.state].filter(Boolean).join(", ")}
          </span>
        </div>
        {community.price_from && (
          <span style={{ fontSize: 12, color: "#71717a", marginTop: 4, display: "block" }}>
            From {formatPrice(community.price_from)}
            {community.hoa_fee ? ` · HOA ${formatPrice(community.hoa_fee)}/${community.hoa_period ?? "mo"}` : ""}
          </span>
        )}
      </div>

      {/* Metric grid */}
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <MetricCard label="Plans" value={plans.length} onClick={() => toggleDrill("plans")} active={drill === "plans"} />
          <MetricCard label="Available Lots" value={availableLots.length} subtitle={`${lots.length} total`} onClick={() => toggleDrill("lots")} active={drill === "lots"} />
          <MetricCard label="Under Construction" value={underConstruction.length} />
          <MetricCard label="QD / Spec Homes" value={specHomes.length + qdLots.length} onClick={(specHomes.length + qdLots.length) > 0 ? () => toggleDrill("qd") : undefined} active={drill === "qd"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
          <MetricCard label="Leads" value={leads.length} onClick={() => toggleDrill("leads")} active={drill === "leads"} />
          <MetricCard label="Prospects" value={prospects.length}
            subtitle={prospects.length > 0 ? `A: ${prospects.filter((p: any) => p.stage === "prospect_a").length} · B: ${prospects.filter((p: any) => p.stage === "prospect_b").length} · C: ${prospects.filter((p: any) => p.stage === "prospect_c").length}` : undefined}
            onClick={() => toggleDrill("prospects")} active={drill === "prospects"} />
          <MetricCard label="Customers" value={customers.length} onClick={() => toggleDrill("customers")} active={drill === "customers"} />
          <MetricCard label="Appointments" value="—" subtitle="Coming soon" />
        </div>
      </div>

      {/* Drill-down panel */}
      {drill && (
        <div style={{ padding: "0 24px 24px" }}>
          {drill === "plans" && (
            <Section title="Floor Plans" count={plans.length}>
              <MiniTable
                headers={["Plan", "Price", "Beds", "Baths", "Sq Ft"]}
                rows={plans.map((p: any) => [
                  p.marketing_name ?? p.plan_name ?? "—",
                  formatPrice(p.net_price ?? p.base_price),
                  p.beds ?? "—",
                  p.baths ?? "—",
                  p.sqft ? p.sqft.toLocaleString() : "—",
                ])}
              />
            </Section>
          )}

          {drill === "lots" && (
            <Section title="Lots" count={lots.length}>
              <MiniTable
                headers={["Lot #", "Status", "Available", "Premium", "Address"]}
                rows={lots.map((l: any) => [
                  l.lot_number ?? "—",
                  l.lot_status ?? "—",
                  l.is_available ? "✓" : "—",
                  l.lot_premium ? formatPrice(l.lot_premium) : "—",
                  l.address ?? "—",
                ])}
              />
            </Section>
          )}

          {drill === "leads" && (
            <Section title="Leads" count={leads.length}>
              <MiniTable
                headers={["Name", "Stage", "Source", "Last Activity", "Created"]}
                rows={leads.map((l: any) => [
                  `${l.first_name} ${l.last_name}`,
                  l.stage ?? "—",
                  l.source ?? "—",
                  relativeTime(l.last_activity_at),
                  new Date(l.created_at).toLocaleDateString(),
                ])}
              />
            </Section>
          )}

          {drill === "prospects" && (
            <Section title="Prospects" count={prospects.length}>
              <MiniTable
                headers={["Name", "Stage", "Budget", "Phone", "Last Contact", "Created"]}
                rows={prospects.map((p: any) => [
                  `${p.first_name} ${p.last_name}`,
                  ({ prospect_a: "A", prospect_b: "B", prospect_c: "C" } as Record<string, string>)[p.stage] ?? p.stage,
                  formatBudget(p.budget_min, p.budget_max),
                  p.phone ?? "—",
                  relativeTime(p.last_contacted_at),
                  new Date(p.created_at).toLocaleDateString(),
                ])}
              />
            </Section>
          )}

          {drill === "customers" && (
            <Section title="Customers" count={customers.length}>
              <MiniTable
                headers={["Name", "Purchase Price", "Settlement", "Move-In", "Stage"]}
                rows={customers.map((c: any) => [
                  `${c.contacts?.first_name ?? "—"} ${c.contacts?.last_name ?? ""}`,
                  formatPrice(c.purchase_price),
                  c.settlement_date ? new Date(c.settlement_date).toLocaleDateString() : "—",
                  c.move_in_date ? new Date(c.move_in_date).toLocaleDateString() : "—",
                  c.post_sale_stage ?? "—",
                ])}
              />
            </Section>
          )}

          {drill === "qd" && (
            <Section title="Quick Delivery / Spec Homes" count={specHomes.length + qdLots.length}>
              <MiniTable
                headers={["Plan", "Address", "Price", "Beds", "Baths", "Sq Ft"]}
                rows={specHomes.map((s: any) => [
                  s.plan_name ?? "—",
                  s.address ?? "—",
                  formatPrice(s.list_price),
                  s.beds ?? "—",
                  s.baths ?? "—",
                  s.sqft ? s.sqft.toLocaleString() : "—",
                ])}
              />
            </Section>
          )}
        </div>
      )}

      {/* Community details */}
      <div style={{ padding: "0 24px 24px" }}>
        {/* Model Home */}
        {modelHome && (
          <Section title="Model Home">
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 13, color: "#fafafa", fontWeight: 500 }}>{modelHome.name ?? modelHome.model_marketing_name ?? "Model Home"}</div>
              {modelHome.address && <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>{modelHome.address}, {modelHome.city}, {modelHome.state}</div>}
              {modelHome.open_hours && <div style={{ fontSize: 12, color: "#52525b", marginTop: 4 }}>Hours: {modelHome.open_hours}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {modelHome.virtual_tour_url && (
                  <a href={modelHome.virtual_tour_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#a1a1aa", textDecoration: "underline" }}>Virtual Tour ↗</a>
                )}
                {modelHome.page_url && (
                  <a href={modelHome.page_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#a1a1aa", textDecoration: "underline" }}>Details ↗</a>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Community Info */}
        <Section title="Community Info">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Schools</div>
              {[
                ["District", community.school_district],
                ["Elementary", community.school_elementary],
                ["Middle", community.school_middle],
                ["High", community.school_high],
              ].map(([label, val]) => val && (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ fontSize: 12, color: "#52525b" }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#a1a1aa" }}>{val as string}</span>
                </div>
              ))}
              {!community.school_district && <span style={{ fontSize: 12, color: "#3f3f46" }}>No school data</span>}
            </div>
            <div style={{ padding: 16, border: "1px solid #27272a", borderRadius: 8, backgroundColor: "#09090b" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Details</div>
              {[
                ["Total Homesites", community.total_homesites],
                ["Status", community.status],
                ["Has Model", community.has_model ? "Yes" : "No"],
                ["55+", community.is_55_plus ? "Yes" : "No"],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ fontSize: 12, color: "#52525b" }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#a1a1aa" }}>{String(val ?? "—")}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Amenities */}
        {community.amenities && (
          <Section title="Amenities">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {community.amenities.split(",").map((a: string) => a.trim()).filter(Boolean).map((a: string) => (
                <span key={a} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 4,
                  backgroundColor: "#18181b", border: "1px solid #27272a", color: "#a1a1aa",
                }}>{a}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Links */}
        <Section title="Links">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {community.page_url && (
              <a href={`https://schellbrothers.com${community.page_url}`} target="_blank" rel="noreferrer" style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#18181b",
                border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none",
              }}>SchellBrothers.com ↗</a>
            )}
            {community.brochure_url && (
              <a href={community.brochure_url} target="_blank" rel="noreferrer" style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#18181b",
                border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none",
              }}>Brochure ↗</a>
            )}
            {community.lot_map_url && (
              <a href={community.lot_map_url} target="_blank" rel="noreferrer" style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 6, backgroundColor: "#18181b",
                border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none",
              }}>Site Map ↗</a>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

export default CommunityView;
