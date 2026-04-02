"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import CommunityCard from "@/components/CommunityCard";
import PlanCard from "@/components/PlanCard";
import SlideOver, { Section, Row } from "@/components/SlideOver";
import DataTable, { type Column } from "@/components/DataTable";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface Division {
  id: string;
  slug: string;
  name: string;
  region: string;
  timezone: string;
  state_codes: string[];
  is_active: boolean;
}

export interface Community {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  division_id: string;
  price_from: number | null;
  featured_image_url: string | null;
  model_homes: string | null;
  amenities: string | null;
  amenities_structured?: unknown[] | null;
  status: string | null;
  page_url: string | null;
  hoa_fee: number | null;
  hoa_period: string | null;
  school_district: string | null;
  school_elementary?: string | null;
  school_middle?: string | null;
  school_high?: string | null;
  electric?: string | null;
  gas?: string | null;
  water?: string | null;
  sewer?: string | null;
  trash?: string | null;
  cable_internet?: string | null;
  short_description: string | null;
  total_homesites: number | null;
  has_model: boolean;
  is_55_plus?: boolean | null;
  hours?: unknown | null;
  lot_map_url?: string | null;
  brochure_url?: string | null;
  included_features_url?: string | null;
  website_url?: string | null;
  design_center_url?: string | null;
  sales_center_address?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CommunityPlan {
  id: string;
  community_id: string;
  plan_name: string;
  beds: number | null;
  baths: number | null;
  sqft_min: number | null;
  sqft_max: number | null;
  base_price: number | null;
  incentive_amount: number | null;
  net_price: number | null;
  featured_image_url: string | null;
  page_url: string | null;
}

export interface LotRow {
  id: string | number;
  community_id: string | null;
  lot_number: string | null;
  lot_status: string | null;
  construction_status: string | null;
  is_available: boolean | null;
  lot_premium: number | null;
  address: string | null;
  phase?: string | null;
  is_buildable?: boolean | null;
}

export interface ModelHome {
  id: string;
  community_id: string | null;
  community_name: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  model_name: string | null;
  model_marketing_name: string | null;
  image_url: string | null;
  virtual_tour_url: string | null;
  page_url: string | null;
  open_hours: string | null;
  leaseback: boolean | null;
}

export interface SpecHome {
  id: string;
  community_id: string | null;
  community_name: string | null;
  plan_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  list_price: number | null;
  image_url: string | null;
  page_url: string | null;
}

export interface DivisionPlan {
  id: string;
  division_id: string;
  marketing_name: string;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

function ComingSoonBadge() {
  return (
    <span
      style={{
        display: "inline-block",
        background: "#1a1a1a",
        color: "#555",
        border: "1px solid #2a2a2a",
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 600,
        padding: "1px 7px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginLeft: 6,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      Coming Soon
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  accent: string;
  comingSoon?: boolean;
}

function StatCard({ label, value, accent, comingSoon }: StatCardProps) {
  const tintMap: Record<string, string> = {
    "#59a6bd": "rgb(0,27,35)",
    "#80B602": "rgb(29,41,0)",
    "#E32027": "rgb(40,5,5)",
    "#e07000": "rgb(35,20,0)",
    "#a855f7": "rgb(25,5,35)",
    "#f59e0b": "rgb(35,25,0)",
    "#00c853": "rgb(0,30,10)",
    "#5b80a0": "rgb(5,15,25)",
    "#ef4444": "rgb(40,5,5)",
    "#555": "rgb(20,20,20)",
    "#8a7a5a": "rgb(25,20,5)",
  };
  const bgTint = tintMap[accent] ?? "rgb(20,20,20)";

  return (
    <div
      style={{
        background: bgTint,
        border: `2px solid ${accent}`,
        borderRadius: 3,
        padding: 16,
        minHeight: 80,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.5)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 28,
          fontWeight: 700,
          color: comingSoon ? "#333" : "#ffffff",
          lineHeight: 1.1,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {value}
        {comingSoon && <ComingSoonBadge />}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count, right }: { title: string; count?: number; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #444" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
          {title}
        </span>
        {count !== undefined && (
          <span style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "1px 7px", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {count}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

// ─── Funnel Placeholder ───────────────────────────────────────────────────────

function FunnelPlaceholder() {
  const stages = [
    "Subscribed → Lead",
    "Lead → Prospect",
    "Prospect → Contract",
    "Contract → Close",
    "Overall",
  ];
  return (
    <div>
      <SectionHeader title="Funnel Metrics" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {stages.map((stage) => (
          <div
            key={stage}
            style={{
              background: "#111",
              border: "1px solid #1f1f1f",
              borderRadius: 8,
              padding: "12px 14px",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 700,
                color: "#ededed",
              }}
            >
              —
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#555",
                marginTop: 4,
                lineHeight: 1.3,
              }}
            >
              {stage}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "inline-block",
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 12,
                fontSize: 9,
                color: "#444",
                fontWeight: 600,
                padding: "2px 7px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              • Coming Soon
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#444",
          padding: "10px 14px",
          background: "#0d0d0d",
          borderRadius: 6,
          border: "1px solid #1a1a1a",
        }}
      >
        Funnel data coming soon — connect lead system
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORP VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface CorpViewProps {
  divisions: Division[];
  communities: Community[];
  lots: LotRow[];
  modelHomes: ModelHome[];
  specHomes: SpecHome[];
}

// ─── HBv1 Funnel Placeholder (Corp / Division) ────────────────────────────────
function HBv1FunnelPlaceholder() {
  const stages = [
    "Subscribed → Lead",
    "Lead → Prospect",
    "Prospect → Contract",
    "Contract → Close",
    "Overall",
  ];
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionHeader title="Sales Funnel" right={<ComingSoonBanner source="Lead System" />} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
        }}
      >
        {stages.map((stage) => (
          <div
            key={stage}
            style={{
              background: "#1d1d1d",
              border: "1px solid #555",
              borderRadius: 3,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 700,
                color: "#333",
                marginBottom: 4,
              }}
            >
              —
            </div>
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.3 }}>{stage}</div>
            <div style={{ marginTop: 6, fontSize: 10, color: "#444" }}>—</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorpView({ divisions, communities, lots, modelHomes, specHomes }: CorpViewProps) {
  const router = useRouter();

  const availableLots = lots.filter((l) => l.is_available);
  const totalLots = lots.length;

  // Group communities by division
  const commByDiv: Record<string, Community[]> = {};
  for (const c of communities) {
    if (!commByDiv[c.division_id]) commByDiv[c.division_id] = [];
    commByDiv[c.division_id].push(c);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#121314" }}>
      {/* Top bar — HBv1 style */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 52,
          borderBottom: "1px solid #3a3b3e",
          background: "#121314",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            color: "#ededed",
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
          }}
        >
          HBx Intelligence Platform
        </h1>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "var(--font-body)" }}>{dateStr}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* Summary stats — 7 cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Divisions", value: divisions.length, accent: "#59a6bd" },
            { label: "Communities", value: communities.length, accent: "#59a6bd" },
            { label: "Plans", value: "—", accent: "#59a6bd" },
            { label: "Available Lots", value: availableLots.length || "—", accent: "#80B602" },
            { label: "Leads", value: "—", accent: "#a855f7", cs: true },
            { label: "Prospects", value: "—", accent: "#f59e0b", cs: true },
            { label: "Contracts", value: "—", accent: "#80B602", cs: true },
          ].map((s) => {
            const tintMap: Record<string, string> = {
              "#59a6bd": "rgb(0,27,35)",
              "#80B602": "rgb(29,41,0)",
              "#a855f7": "rgb(25,5,35)",
              "#f59e0b": "rgb(35,25,0)",
            };
            const bgTint = tintMap[s.accent] ?? "rgb(20,20,20)";
            return (
            <div
              key={s.label}
              style={{
                background: bgTint,
                border: `2px solid ${s.accent}`,
                borderRadius: 3,
                padding: 16,
                minHeight: 80,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 8,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: s.cs ? "#333" : "#ffffff",
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>
            </div>
            );
          })}
        </div>

        {/* Division cards — 2×N grid */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 600,
              color: "#ededed",
              margin: 0,
            }}
          >
            Divisions
          </h2>
          <span
            style={{
              background: "#161718",
              border: "1px solid #444",
              borderRadius: 20,
              color: "rgba(255,255,255,0.4)",
              fontSize: 11,
              fontWeight: 600,
              padding: "1px 9px",
            }}
          >
            {divisions.length}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
            marginBottom: 32,
          }}
        >
          {divisions.map((div) => {
            const divComms = commByDiv[div.id] ?? [];
            const divCommIds = new Set(divComms.map((c) => c.id));
            const divLots = lots.filter((l) => l.community_id != null && divCommIds.has(l.community_id));
            const divAvailLots = divLots.filter((l) => l.is_available);
            const totalDivLots = divLots.length;
            const barWidth =
              totalDivLots > 0
                ? `${Math.round((divAvailLots.length / totalDivLots) * 100)}%`
                : "0%";

            return (
              <div
                key={div.id}
                onClick={() => router.push(`/?div=${div.id}`)}
                style={{
                  background: "#1d1d1d",
                  border: "1px solid #555",
                  borderLeft: "3px solid #59a6bd",
                  borderRadius: 3,
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#59a6bd";
                  el.style.boxShadow = "0 2px 8px rgba(89,166,189,0.2)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#555";
                  el.style.boxShadow = "none";
                }}
              >
                {/* Division name */}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#ededed",
                    marginBottom: 2,
                  }}
                >
                  {div.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 10, fontFamily: "var(--font-body)" }}>
                  {divComms.length} Communities
                </div>

                {/* Lot count + mini progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-body)" }}>
                      Available Lots
                    </span>
                    <span style={{ fontSize: 12, color: "#ededed", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                      {divAvailLots.length}
                      {totalDivLots > 0 && (
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>
                          {" "}/ {totalDivLots}
                        </span>
                      )}
                    </span>
                  </div>
                  {/* Progress bar track */}
                  <div
                    style={{
                      background: "#444",
                      height: 4,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "#59a6bd",
                        height: "100%",
                        borderRadius: 2,
                        width: barWidth,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>

                {/* Leads / Prospects placeholder */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)" }}>
                    Leads: —
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)" }}>
                    Prospects: —
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Funnel section */}
        <HBv1FunnelPlaceholder />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVISION VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface DivisionViewProps {
  communities: Community[];
  divisionPlans: DivisionPlan[];
  lots: LotRow[];
  divisions: Division[];
  selectedDivisionId: string;
}

type DivisionTabId = "overview" | "communities";

const DIVISION_TABS: { id: DivisionTabId; label: string }[] = [
  { id: "overview", label: "📊 Overview" },
  { id: "communities", label: "🏘 Communities" },
];

function DivisionView({ communities, divisionPlans, lots, divisions, selectedDivisionId }: DivisionViewProps) {
  const router = useRouter();
  const [divTab, setDivTab] = useState<DivisionTabId>("overview");

  const division = divisions.find((d) => d.id === selectedDivisionId);
  const commIds = new Set(communities.map((c) => c.id));
  const availableLots = lots.filter((l) => l.is_available && l.community_id != null && commIds.has(l.community_id));
  const underConstruction = lots.filter(
    (l) => l.construction_status === "Under Construction" && l.community_id != null && commIds.has(l.community_id)
  );
  const modelHomeComms = communities.filter((c) => c.has_model);
  const qdLots = lots.filter((l) => l.lot_status === "Quick Delivery" && l.community_id != null && commIds.has(l.community_id));

  // Top communities scaffold — sorted by community name
  const topCommunities = [...communities].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#121314" }}>
      {/* Top bar — breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          height: 52,
          borderBottom: "1px solid #3a3b3e",
          background: "#161718",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
            fontFamily: "var(--font-body)",
          }}
        >
          ← Corp
        </button>
        <span style={{ color: "#444" }}>·</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            color: "#ededed",
            fontSize: 15,
            fontWeight: 700,
            margin: 0,
          }}
        >
          {division?.name ?? "Division"}
        </h1>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "var(--font-body)", marginLeft: 4 }}>
          {communities.length} Communities · {divisionPlans.length} Plans
        </span>
      </div>

      {/* HBv1 sub-tab bar */}
      <div
        style={{
          background: "#161718",
          borderBottom: "2px solid #444",
          display: "flex",
          gap: 0,
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        {DIVISION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDivTab(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: divTab === tab.id ? "3px solid #59a6bd" : "3px solid transparent",
              marginBottom: -2,
              color: divTab === tab.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
              fontSize: 13,
              fontFamily: "Open Sans, Arial, sans-serif",
              fontWeight: divTab === tab.id ? 600 : 400,
              padding: "12px 20px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ─── Overview tab ─── */}
        {divTab === "overview" && (
          <div style={{ padding: 24 }}>
            {/* 7 stat cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 10,
                marginBottom: 28,
              }}
            >
              {[
                { label: "Communities", value: communities.length, accent: "#59a6bd", cs: false },
                { label: "Plans", value: divisionPlans.length, accent: "#59a6bd", cs: false },
                { label: "Available Lots", value: availableLots.length, accent: "#80B602", cs: false },
                { label: "Under Construction", value: underConstruction.length, accent: "#5b80a0", cs: false },
                { label: "Model Homes", value: modelHomeComms.length, accent: "#59a6bd", cs: false },
                { label: "QD Homes", value: qdLots.length, accent: "#e07000", cs: false },
                { label: "Leads", value: "—", accent: "#a855f7", cs: true },
              ].map((s) => {
                const tintMap: Record<string, string> = {
                  "#59a6bd": "rgb(0,27,35)",
                  "#80B602": "rgb(29,41,0)",
                  "#5b80a0": "rgb(5,15,25)",
                  "#e07000": "rgb(35,20,0)",
                  "#a855f7": "rgb(25,5,35)",
                };
                const bgTint = tintMap[s.accent] ?? "rgb(20,20,20)";
                return (
                <div
                  key={s.label}
                  style={{
                    background: bgTint,
                    border: `2px solid ${s.accent}`,
                    borderRadius: 3,
                    padding: 16,
                    minHeight: 80,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 8,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 28,
                      fontWeight: 700,
                      color: s.cs ? "#333" : "#ffffff",
                      lineHeight: 1.1,
                    }}
                  >
                    {s.value}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Funnel placeholder */}
            <HBv1FunnelPlaceholder />

            {/* Top Communities table */}
            <div style={{ marginBottom: 32 }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#ededed",
                  margin: "0 0 16px 0",
                }}
              >
                Top Communities
              </h2>
              <div
                style={{
                  background: "#1d1d1d",
                  border: "1px solid #555",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                    padding: "8px 16px",
                    borderBottom: "1px solid #555",
                    background: "#161718",
                  }}
                >
                  {["Community", "Avail Lots", "Plans", "Leads", "Contracts"].map((h) => (
                    <div
                      key={h}
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
                {/* Data rows */}
                {topCommunities.map((comm, i) => {
                  const commAvail = lots.filter(
                    (l) => l.community_id === comm.id && l.is_available
                  ).length;
                  return (
                    <div
                      key={comm.id}
                      onClick={() => router.push(`/?comm=${comm.id}`)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                        padding: "9px 16px",
                        borderBottom: i < topCommunities.length - 1 ? "1px solid #4a4b50" : "none",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "#484950";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 13,
                          color: "#ededed",
                          fontWeight: 600,
                        }}
                      >
                        {comm.name}
                      </div>
                      <div style={{ fontSize: 13, color: "#ededed", fontFamily: "var(--font-body)" }}>
                        {commAvail || "—"}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>—</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>—</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>—</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Communities tab ─── */}
        {divTab === "communities" && (
          <div style={{ padding: 24 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
                marginBottom: 32,
              }}
            >
              {communities.map((comm) => {
                const hasModel = comm.has_model;
                return (
                  <CommunityCard
                    key={comm.id}
                    name={comm.name}
                    city={comm.city}
                    state={comm.state}
                    priceFrom={comm.price_from}
                    imageUrl={comm.featured_image_url}
                    modelHomeName={hasModel ? "Model Home" : null}
                    status={comm.status}
                    amenities={
                      comm.amenities
                        ? comm.amenities.split(";").map((a: string) => a.trim()).filter(Boolean)
                        : null
                    }
                    onClick={() => router.push(`/?comm=${comm.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface CommunityViewProps {
  community: Community & Record<string, unknown>;
  plans: CommunityPlan[];
  lots: LotRow[];
  modelHome: ModelHome | null;
  specHomes: SpecHome[];
  divisions: { id: string; name: string; slug: string }[];
}

// ─── Coming Soon Banner ───────────────────────────────────────────────────────
function ComingSoonBanner({ source }: { source: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 3,
        fontSize: 10,
        color: "rgba(255,255,255,0.3)",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "inline-block" }} />
      {source} · Coming Soon
    </div>
  );
}

// ─── Placeholder Stat Value ───────────────────────────────────────────────────
function PlaceholderValue() {
  return (
    <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "#333" }}>—</span>
  );
}

// ─── Placeholder Stat Card ────────────────────────────────────────────────────
function PlaceholderStatCard({ label, accent = "#59a6bd" }: { label: string; accent?: string }) {
  const tintMap: Record<string, string> = {
    "#59a6bd": "rgb(0,27,35)",
    "#80B602": "rgb(29,41,0)",
    "#E32027": "rgb(40,5,5)",
    "#e07000": "rgb(35,20,0)",
    "#a855f7": "rgb(25,5,35)",
    "#f59e0b": "rgb(35,25,0)",
    "#223347": "rgb(5,15,25)",
  };
  const bgTint = tintMap[accent] ?? "rgb(20,20,20)";
  return (
    <div
      style={{
        background: bgTint,
        border: `2px solid ${accent}`,
        borderRadius: 3,
        padding: 16,
        minHeight: 80,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.5)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <PlaceholderValue />
    </div>
  );
}

// ─── Dummy messages for comm hub ──────────────────────────────────────────────
interface DummyMessage {
  id: number;
  direction: "IN" | "OUT";
  contact: string;
  csm: string;
  status: "NEW" | "SENT" | "COMPLETED";
  subject: string;
  preview: string;
  timeAgo: string;
  community: string;
  body: string;
}

const DUMMY_MESSAGES: Record<string, DummyMessage[]> = {
  Email: [
    {
      id: 1,
      direction: "IN",
      contact: "John Smith",
      csm: "Sarah Jones",
      status: "NEW",
      subject: "Follow up on Jameson floor plan",
      preview: "I wanted to follow up on the Jameson floor plan we discussed during my visit last week...",
      timeAgo: "2h ago",
      community: "Cardinal Grove",
      body: "Hi Sarah,\n\nI wanted to follow up on the Jameson floor plan we discussed during my visit last week. My wife and I are really interested and would love to schedule another appointment to go through the options.\n\nBest,\nJohn",
    },
    {
      id: 2,
      direction: "OUT",
      contact: "Mary Johnson",
      csm: "Mike Davis",
      status: "SENT",
      subject: "Thank you for your visit!",
      preview: "Thank you for visiting! We have some exciting new availability you should know about...",
      timeAgo: "Yesterday",
      community: "Cardinal Grove",
      body: "Hi Mary,\n\nThank you for visiting our community! We have some exciting new availability that just opened up. I'd love to connect and share more details about what might be the perfect fit for you.\n\nBest,\nMike",
    },
    {
      id: 3,
      direction: "IN",
      contact: "Robert Chen",
      csm: "Sarah Jones",
      status: "COMPLETED",
      subject: "Contract signing appointment",
      preview: "We are ready to move forward and would like to schedule our contract signing appointment...",
      timeAgo: "3d ago",
      community: "Cardinal Grove",
      body: "Hi Sarah,\n\nWe are ready to move forward and would like to schedule our contract signing appointment. Please let us know your availability this week.\n\nThank you,\nRobert",
    },
  ],
  SMS: [
    {
      id: 4,
      direction: "IN",
      contact: "Lisa Park",
      csm: "Sarah Jones",
      status: "NEW",
      subject: "SMS",
      preview: "Hey! Are there any lots left in Section 3? We are very interested...",
      timeAgo: "1h ago",
      community: "Cardinal Grove",
      body: "Hey! Are there any lots left in Section 3? We are very interested and want to move quickly if something is available.",
    },
    {
      id: 5,
      direction: "OUT",
      contact: "Tom Martinez",
      csm: "Mike Davis",
      status: "SENT",
      subject: "SMS",
      preview: "Hi Tom, just wanted to remind you about your appointment tomorrow at 2pm...",
      timeAgo: "4h ago",
      community: "Cardinal Grove",
      body: "Hi Tom, just wanted to remind you about your appointment tomorrow at 2pm. Looking forward to seeing you!",
    },
    {
      id: 6,
      direction: "IN",
      contact: "Karen White",
      csm: "Sarah Jones",
      status: "COMPLETED",
      subject: "SMS",
      preview: "Thank you so much! We are so excited about our new home...",
      timeAgo: "2d ago",
      community: "Cardinal Grove",
      body: "Thank you so much! We are so excited about our new home. You have been amazing throughout this whole process!",
    },
  ],
  Calls: [
    {
      id: 7,
      direction: "IN",
      contact: "David Lee",
      csm: "Sarah Jones",
      status: "NEW",
      subject: "Inbound call — pricing inquiry",
      preview: "Called asking about pricing for the Madison plan and lot premiums in Phase 2...",
      timeAgo: "30m ago",
      community: "Cardinal Grove",
      body: "Called asking about pricing for the Madison plan and lot premiums in Phase 2. Interested in 3-4 bedroom options. Mentioned budget around $550k. Requested callback from CSM.",
    },
    {
      id: 8,
      direction: "OUT",
      contact: "Jennifer Adams",
      csm: "Mike Davis",
      status: "SENT",
      subject: "Outbound follow-up call",
      preview: "Follow-up call after community visit. Left voicemail regarding new incentives...",
      timeAgo: "Yesterday",
      community: "Cardinal Grove",
      body: "Follow-up call after community visit last Saturday. Left voicemail regarding new incentives available through end of quarter. Requested callback.",
    },
    {
      id: 9,
      direction: "IN",
      contact: "Mark Thompson",
      csm: "Sarah Jones",
      status: "COMPLETED",
      subject: "Post-contract questions",
      preview: "Had questions about design center appointment and construction timeline...",
      timeAgo: "4d ago",
      community: "Cardinal Grove",
      body: "Had questions about design center appointment and construction timeline. All questions addressed. Scheduled design center appointment for next Tuesday at 10am.",
    },
  ],
};

// ─── Tab types ────────────────────────────────────────────────────────────────
type CommTab = 'overview'|'plans'|'lots'|'siteplan'|'leads'|'calendar'|'comms'|'amenities'|'designcenter'|'info';

const COMMUNITY_TABS: { id: CommTab; icon: string; label: string }[] = [
  { id: 'overview',     icon: '◉', label: 'Overview'      },
  { id: 'plans',        icon: '◱', label: 'Plans'          },
  { id: 'lots',         icon: '◫', label: 'Lots'           },
  { id: 'siteplan',     icon: '⊞', label: 'Site Plan'     },
  { id: 'leads',        icon: '⊕', label: 'Leads'          },
  { id: 'calendar',     icon: '◷', label: 'Calendar'       },
  { id: 'comms',        icon: '◈', label: 'Comm Hub'       },
  { id: 'amenities',    icon: '⌂', label: 'Amenities'     },
  { id: 'designcenter', icon: '✦', label: 'Design Center' },
  { id: 'info',         icon: '◧', label: 'Info'           },
];

// ─── Info Row helper ──────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, color: "#555", minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#888" }}>{value}</span>
    </div>
  );
}

function CommunityView({ community, plans, lots, specHomes, divisions }: CommunityViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CommTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('community-active-tab') as CommTab | null;
      if (saved) return saved;
    }
    return 'overview';
  });

  function handleTabChange(tab: CommTab) {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('community-active-tab', tab);
    }
  }
  const [activeCommTab, setActiveCommTab] = useState<"Email" | "SMS" | "Calls">("Email");
  const [selectedMessage, setSelectedMessage] = useState<DummyMessage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CommunityPlan | null>(null);
  const [selectedLot, setSelectedLot] = useState<LotRow | null>(null);
  const [lotStatusFilter, setLotStatusFilter] = useState<string>('all');

  const division = divisions.find((d) => d.id === community.division_id);

  // ─── Lot Counts ───────────────────────────────────────────────────────────
  const availableLots = lots.filter((l) => l.lot_status === "Available" || l.lot_status === "Available Homesite");
  const buildableLots = lots.filter((l) => l.is_buildable === true && (l.lot_status === "Available" || l.lot_status === "Available Homesite"));
  const futureLots = lots.filter((l) => l.lot_status === "Future");
  const soldLots = lots.filter((l) => l.lot_status === "Sold" || l.lot_status === "Closed");
  const underConstruction = lots.filter((l) => l.construction_status === "Under Construction");
  const qdLots = lots.filter((l) => l.lot_status === "Quick Delivery");

  // ─── Phase Breakdown ──────────────────────────────────────────────────────
  interface PhaseData {
    total: number;
    available: number;
    sold: number;
    underConst: number;
    future: number;
  }
  const phaseMap = lots.reduce<Record<string, PhaseData>>((acc, lot) => {
    const key = lot.phase ?? "Unphased";
    if (!acc[key]) acc[key] = { total: 0, available: 0, sold: 0, underConst: 0, future: 0 };
    acc[key].total += 1;
    if (lot.lot_status === "Available" || lot.lot_status === "Available Homesite") acc[key].available += 1;
    if (lot.lot_status === "Sold" || lot.lot_status === "Closed") acc[key].sold += 1;
    if (lot.construction_status === "Under Construction") acc[key].underConst += 1;
    if (lot.lot_status === "Future") acc[key].future += 1;
    return acc;
  }, {});
  const phaseRows = Object.entries(phaseMap).sort(([a], [b]) => a.localeCompare(b));

  // ─── Construction Pipeline ────────────────────────────────────────────────
  const settled = lots.filter((l) => l.construction_status === "Settled" || l.lot_status === "Closed").length;
  const activeConstruction = lots.filter((l) => l.construction_status === "Under Construction").length;
  const soldNotStarted = lots.filter((l) => (l.lot_status === "Sold") && (l.construction_status === "Not Started" || !l.construction_status)).length;
  const notSold = lots.filter((l) => l.lot_status === "Available" || l.lot_status === "Available Homesite").length;

  // ─── Plans sorted by net_price ASC nulls last ────────────────────────────
  const sortedPlans = [...plans].sort((a, b) => {
    if (a.net_price == null && b.net_price == null) return 0;
    if (a.net_price == null) return 1;
    if (b.net_price == null) return -1;
    return a.net_price - b.net_price;
  });

  const lotStatusColor = (status: string | null) => {
    if (status === "Available" || status === "Available Homesite") return "#00c853";
    if (status === "Sold" || status === "Closed") return "#ef4444";
    if (status === "Reserved") return "#f59e0b";
    if (status === "Future") return "#5b80a0";
    return "#555";
  };

  const currentYear = new Date().getFullYear();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ─── Calendar helpers ────────────────────────────────────────────────────
  const today = new Date();
  const calYear = today.getFullYear();
  const calMonth = today.getMonth();
  const calMonthName = today.toLocaleString("en-US", { month: "long", year: "numeric" });
  // First day of month (0=Sun…6=Sat). Convert to Mon-based (0=Mon…6=Sun)
  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const firstMon = (firstDow === 0 ? 6 : firstDow - 1); // offset for Mon grid
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstMon + daysInMonth) / 7) * 7;
  const calDays: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstMon + 1;
    calDays.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
  }
  const todayDate = today.getDate();

  // ─── Lot status filter ─────────────────────────────────────────────────────
  const filteredLots = lotStatusFilter === 'all' ? lots : lots.filter(l => l.lot_status === lotStatusFilter);
  const uniqueLotStatuses = Array.from(new Set(lots.map(l => l.lot_status).filter(Boolean))) as string[];

  // ─── Plans DataTable columns ────────────────────────────────────────────────
  const planColumns: Column<CommunityPlan & Record<string, unknown>>[] = [
    { key: 'plan_name', label: 'Plan Name', sortable: true },
    { key: 'beds', label: 'Beds', align: 'center', sortable: true },
    { key: 'baths', label: 'Baths', align: 'center', sortable: true },
    { key: 'sqft_min', label: 'Sqft', align: 'right', sortable: true, render: (v) => v ? Number(v).toLocaleString() : '—' },
    { key: 'base_price', label: 'Base Price', align: 'right', sortable: true, render: (v) => v ? '$' + Number(v).toLocaleString() : '—' },
    { key: 'incentive_amount', label: 'Incentive', align: 'right', sortable: true, render: (v) => v && Number(v) > 0 ? '-$' + Number(v).toLocaleString() : '—' },
    { key: 'net_price', label: 'Net Price', align: 'right', sortable: true, render: (v) => v ? '$' + Number(v).toLocaleString() : '—' },
    { key: 'page_url', label: 'View', align: 'center', render: (v) => v ? <a href={String(v)} target="_blank" rel="noopener noreferrer" style={{ color: '#59a6bd', fontSize: 12 }}>↗</a> : '—' },
  ];

  // ─── Lots DataTable columns ─────────────────────────────────────────────────
  const lotColumns: Column<LotRow & Record<string, unknown>>[] = [
    { key: 'lot_number', label: 'Lot #', sortable: true },
    { key: 'phase', label: 'Phase', sortable: true, render: (v) => (v as string | null) ?? '—' },
    { key: 'address', label: 'Address', render: (v) => (v as string | null) ?? '—' },
    { key: 'lot_status', label: 'Status', sortable: true, render: (v) => {
      const s = v as string | null;
      const color = s === 'Available' || s === 'Available Homesite' ? '#00c853' : s === 'Sold' || s === 'Closed' ? '#ef4444' : s === 'Reserved' ? '#f59e0b' : s === 'Future' ? '#5b80a0' : s === 'Quick Delivery' ? '#8a7a5a' : '#555';
      return <span style={{ color, fontWeight: 600 }}><span style={{ marginRight: 4 }}>●</span>{s ?? '—'}</span>;
    }},
    { key: 'construction_status', label: 'Construction', render: (v) => (v as string | null) ?? '—' },
    { key: 'lot_premium', label: 'Premium', align: 'right', render: (v) => v ? '$' + Number(v).toLocaleString() : '—' },
    { key: 'is_buildable', label: 'Foundation', align: 'center', render: (v) => v ? '✓' : '—' },
  ];

  // ─── Amenities ──────────────────────────────────────────────────────────────
  let amenityList: string[] = [];
  if (community.amenities_structured && Array.isArray(community.amenities_structured)) {
    amenityList = (community.amenities_structured as Array<{ name?: string } | string>).map(a => typeof a === 'string' ? a : (a?.name ?? '')).filter(Boolean);
  } else if (community.amenities) {
    amenityList = community.amenities.split(';').map(s => s.trim()).filter(Boolean);
  }

  // ─── Info: Hours ────────────────────────────────────────────────────────────
  let hoursObj: Record<string, string> = {};
  if (community.hours) {
    try { hoursObj = typeof community.hours === 'string' ? JSON.parse(community.hours) : (community.hours as Record<string, string>); } catch { hoursObj = {}; }
  }

  const priceFrom = community.price_from ? community.price_from.toLocaleString() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#121314" }}>

      {/* ── Header (no image) ── */}
      <div style={{ background: "#0d0e10", borderBottom: "1px solid #222", padding: "16px 24px", flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12, padding: 0 }}>← Corp</button>
          {division && (
            <>
              <span style={{ color: "#333" }}>·</span>
              <button onClick={() => router.push(`/?div=${division.id}`)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12, padding: 0 }}>{division.name}</button>
            </>
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#ededed" }}>{community.name}</div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          {[community.city, community.state].filter(Boolean).join(" · ")}
          {division ? ` · ${division.name}` : ""}
          {priceFrom ? ` · Priced from $${priceFrom}` : ""}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {community.status && (
            <span style={{ background: "#1a1a1e", border: "1px solid #2a2a2a", borderRadius: 3, padding: "2px 10px", fontSize: 11, color: "#888" }}>{community.status}</span>
          )}
          {community.total_homesites && (
            <span style={{ background: "#1a1a1e", border: "1px solid #2a2a2a", borderRadius: 3, padding: "2px 10px", fontSize: 11, color: "#888" }}>{community.total_homesites} homesites</span>
          )}
          {(community.hoa_fee || community.hoa_period) && (
            <span style={{ background: "#1a1a1e", border: "1px solid #2a2a2a", borderRadius: 3, padding: "2px 10px", fontSize: 11, color: "#888" }}>
              {community.hoa_fee ? `$${Number(community.hoa_fee).toLocaleString()}` : ""}
              {community.hoa_period ? `/${community.hoa_period} HOA` : " HOA"}
            </span>
          )}
          {community.school_district && (
            <span style={{ background: "#1a1a1e", border: "1px solid #2a2a2a", borderRadius: 3, padding: "2px 10px", fontSize: 11, color: "#888" }}>{community.school_district}</span>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", background: "#0d0e10", borderBottom: "2px solid #1a1a1e", flexShrink: 0, overflowX: "auto" }}>
        {COMMUNITY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #80B602" : "2px solid transparent",
              marginBottom: -2,
              color: activeTab === tab.id ? "#ededed" : "#555",
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 600 : 400,
              padding: "10px 16px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {/* ═══ OVERVIEW ═══════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ padding: 24 }}>
            {/* Real stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
              <StatCard label="Plans" value={plans.length} accent="#223347" />
              <StatCard label="Avail Lots" value={availableLots.length} accent="#00c853" />
              <StatCard label="Under Const" value={underConstruction.length} accent="#5b80a0" />
              <StatCard label="QD Homes" value={specHomes.length + qdLots.length} accent="#8a7a5a" />
            </div>
            {/* Placeholder stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 32 }}>
              <StatCard label="Leads" value="—" accent="#a855f7" comingSoon />
              <StatCard label="Prospects" value="—" accent="#f59e0b" comingSoon />
              <StatCard label="Appointments" value="—" accent="#f59e0b" comingSoon />
              <StatCard label="Contracts" value="—" accent="#00c853" comingSoon />
            </div>

            {/* Sales Performance */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: 0 }}>Sales Performance</h2>
                <ComingSoonBanner source="HBv1 Sales API" />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      <td style={{ width: 60, fontSize: 12, fontWeight: 700, color: "#fff", background: "#E32027", padding: "6px 8px", textAlign: "center" }}>{currentYear}</td>
                      {MONTHS.map((m) => (
                        <th key={m} style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, textAlign: "center", background: "#1d1d1d", border: "1px solid #333", padding: "6px 4px", minWidth: 48 }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[{ label: "Net" }, { label: "Goal" }, { label: "Var" }].map((row) => (
                      <tr key={row.label} style={{ borderTop: "1px solid #1a1a1a" }}>
                        <td style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, padding: "8px 6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{row.label}</td>
                        {MONTHS.map((m) => (
                          <td key={m} style={{ textAlign: "center", padding: "8px 4px" }}>
                            <span style={{ fontSize: 13, color: "#333" }}>—</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Appointments */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: 0 }}>Appointments</h2>
                <ComingSoonBanner source="Pulse v1" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {["Held", "Set", "Upcoming", "Cancelled", "Conversion %"].map((label) => (
                  <PlaceholderStatCard key={label} label={label} accent="#f59e0b" />
                ))}
              </div>
            </div>

            {/* Prospecting */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: 0 }}>Prospecting</h2>
                <ComingSoonBanner source="Pulse v1" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {["New Prospects", "Total Prospects", "A Prospects", "Unique Contacts", "Campaigns Sent"].map((label) => (
                  <PlaceholderStatCard key={label} label={label} accent="#a855f7" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PLANS ══════════════════════════════════════════════════════════ */}
        {activeTab === 'plans' && (
          <div style={{ padding: 24 }}>
            <DataTable<CommunityPlan & Record<string, unknown>>
              columns={planColumns}
              rows={sortedPlans as (CommunityPlan & Record<string, unknown>)[]}
              onRowClick={(row) => setSelectedPlan(row as CommunityPlan)}
              emptyMessage="No plans configured for this community"
            />
            <SlideOver open={!!selectedPlan} onClose={() => setSelectedPlan(null)} title={selectedPlan?.plan_name ?? "Plan"} subtitle={selectedPlan ? [selectedPlan.beds && `${selectedPlan.beds} bd`, selectedPlan.baths && `${selectedPlan.baths} ba`, selectedPlan.sqft_min && `${selectedPlan.sqft_min.toLocaleString()} sf`].filter(Boolean).join(" · ") : undefined}>
              {selectedPlan && (
                <>
                  <Section title="Pricing">
                    <Row label="Base Price" value={selectedPlan.base_price ? '$' + selectedPlan.base_price.toLocaleString() : '—'} />
                    <Row label="Incentive" value={selectedPlan.incentive_amount && selectedPlan.incentive_amount > 0 ? '-$' + selectedPlan.incentive_amount.toLocaleString() : '—'} />
                    <Row label="Net Price" value={selectedPlan.net_price ? '$' + selectedPlan.net_price.toLocaleString() : '—'} />
                  </Section>
                  <Section title="Specs">
                    <Row label="Beds" value={selectedPlan.beds ?? '—'} />
                    <Row label="Baths" value={selectedPlan.baths ?? '—'} />
                    <Row label="Sqft" value={selectedPlan.sqft_min ? selectedPlan.sqft_min.toLocaleString() : '—'} />
                  </Section>
                  {selectedPlan.page_url && (
                    <div style={{ padding: "12px 24px" }}>
                      <a href={selectedPlan.page_url} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd", fontSize: 13 }}>View on schellbrothers.com ↗</a>
                    </div>
                  )}
                </>
              )}
            </SlideOver>
          </div>
        )}

        {/* ═══ LOTS ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'lots' && (
          <div style={{ padding: 24 }}>
            {/* Status filter */}
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, color: "#555" }}>Status:</label>
              <select
                value={lotStatusFilter}
                onChange={(e) => setLotStatusFilter(e.target.value)}
                style={{ background: "#1a1a1e", border: "1px solid #2a2a2a", color: "#888", borderRadius: 3, padding: "4px 10px", fontSize: 12 }}
              >
                <option value="all">All</option>
                {uniqueLotStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span style={{ fontSize: 11, color: "#555" }}>{filteredLots.length} lots</span>
            </div>
            <DataTable<LotRow & Record<string, unknown>>
              columns={lotColumns}
              rows={filteredLots as (LotRow & Record<string, unknown>)[]}
              onRowClick={(row) => setSelectedLot(row as LotRow)}
              emptyMessage="No lots found"
            />
            <SlideOver open={!!selectedLot} onClose={() => setSelectedLot(null)} title={`Lot ${selectedLot?.lot_number ?? ''}`} subtitle={selectedLot?.address ?? undefined}>
              {selectedLot && (
                <Section title="Lot Details">
                  <Row label="Lot #" value={selectedLot.lot_number ?? '—'} />
                  <Row label="Phase" value={selectedLot.phase ?? '—'} />
                  <Row label="Address" value={selectedLot.address ?? '—'} />
                  <Row label="Status" value={selectedLot.lot_status ?? '—'} />
                  <Row label="Construction" value={selectedLot.construction_status ?? '—'} />
                  <Row label="Premium" value={selectedLot.lot_premium ? '$' + selectedLot.lot_premium.toLocaleString() : '—'} />
                  <Row label="Buildable" value={selectedLot.is_buildable ? 'Yes' : selectedLot.is_buildable === false ? 'No' : '—'} />
                  <Row label="Available" value={selectedLot.is_available ? 'Yes' : 'No'} />
                </Section>
              )}
            </SlideOver>
          </div>
        )}

        {/* ═══ SITE PLAN ══════════════════════════════════════════════════════ */}
        {activeTab === 'siteplan' && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, padding: "8px 24px", background: "#0d0e10", borderBottom: "1px solid #1a1a1e", fontSize: 12, color: "#888", flexShrink: 0 }}>
              <span><span style={{ color: "#00c853" }}>●</span> Available</span>
              <span><span style={{ color: "#ef4444" }}>●</span> Sold</span>
              <span><span style={{ color: "#5b80a0" }}>●</span> Under Construction</span>
              <span><span style={{ color: "#f59e0b" }}>●</span> Future</span>
            </div>
            {community.lot_map_url ? (
              <iframe src={community.lot_map_url} style={{ width: "100%", flex: 1, border: "none" }} title="Site Plan" />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#555", gap: 8 }}>
                <span style={{ fontSize: 32 }}>⊞</span>
                <div style={{ fontSize: 14 }}>No lot map configured for this community</div>
              </div>
            )}
          </div>
        )}

        {/* ═══ LEADS ══════════════════════════════════════════════════════════ */}
        {activeTab === 'leads' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
              {["Leads", "Prospects", "Appointments"].map(label => (
                <PlaceholderStatCard key={label} label={label} accent="#a855f7" />
              ))}
            </div>
            <div style={{ background: "#1a1a1e", border: "1px solid #2a2a2a", borderRadius: 3, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0d0e10" }}>
                    {["Name", "Stage", "Score", "Last Contact", "Next Action", "OSC"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #2a2a2a" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: "#555", fontSize: 13 }}>
                      Connect Pulse v1 to see lead data
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ CALENDAR ═══════════════════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: 0 }}>{calMonthName}</h2>
              <ComingSoonBanner source="Pulse v1" />
            </div>
            <div style={{ border: "1px solid #2a2a2a", borderRadius: 3, overflow: "hidden", maxWidth: 700 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#0d0e10", borderBottom: "1px solid #2a2a2a" }}>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                  <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {calDays.map((day, i) => {
                  const isToday = day === todayDate;
                  return (
                    <div key={i} style={{ height: 44, background: day == null ? "#0a0a0c" : "#111316", border: isToday ? "1px solid #80B602" : "none", borderRight: "1px solid #1a1a1e", borderBottom: "1px solid #1a1a1e", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "4px 6px", boxSizing: "border-box" }}>
                      {day != null && <span style={{ fontSize: 11, color: isToday ? "#80B602" : "#444", fontWeight: isToday ? 700 : 400 }}>{day}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#555", textAlign: "center" }}>No appointments data connected</div>
          </div>
        )}

        {/* ═══ COMMS ══════════════════════════════════════════════════════════ */}
        {activeTab === 'comms' && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Warning banner */}
            <div style={{ background: "#1a1200", border: "1px solid #3f2f00", padding: "8px 24px", fontSize: 12, color: "#8a7a5a", flexShrink: 0 }}>
              ⚠ Live data not connected · Zoom / Outlook / Rilla
            </div>
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              {/* Left 70% */}
              <div style={{ flex: "0 0 70%", borderRight: "1px solid #1a1a1e", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1a1a1e", padding: "0 24px", background: "#0d0e10", flexShrink: 0 }}>
                  {(["Email", "SMS", "Calls"] as const).map((tab) => (
                    <button key={tab} onClick={() => { setActiveCommTab(tab); setSelectedMessage(null); }} style={{ background: "none", border: "none", borderBottom: activeCommTab === tab ? "2px solid #80B602" : "2px solid transparent", color: activeCommTab === tab ? "#ededed" : "#555", fontSize: 13, fontWeight: activeCommTab === tab ? 600 : 400, padding: "10px 14px 12px", cursor: "pointer", marginBottom: -1 }}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                  {(DUMMY_MESSAGES[activeCommTab] ?? []).map((msg) => (
                    <div key={msg.id} onClick={() => setSelectedMessage(msg)} style={{ background: selectedMessage?.id === msg.id ? "#1a2a3f" : "#111", border: "1px solid", borderColor: selectedMessage?.id === msg.id ? "#2a4a6f" : "#1f1f1f", borderRadius: 6, padding: "12px 14px", cursor: "pointer", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ background: msg.direction === "IN" ? "#1a2a3f" : "#1a1a1a", color: msg.direction === "IN" ? "#5b80a0" : "#888", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{msg.direction === "IN" ? "● IN" : "→ OUT"}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>{msg.contact}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#555" }}>{msg.timeAgo}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>&ldquo;{msg.preview}&rdquo;</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right 30% */}
              <div style={{ flex: "0 0 30%", overflowY: "auto", padding: 16, background: "#0d0d0d" }}>
                {/* Schellie box */}
                <div style={{ background: "#0a1520", border: "1px solid #1a3050", borderRadius: 6, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#5b80a0", fontWeight: 700, marginBottom: 8 }}>✦ Schellie</div>
                  <div style={{ fontSize: 12, color: "#5b80a0", lineHeight: 1.6 }}>
                    {selectedMessage
                      ? `Hi ${selectedMessage.contact.split(" ")[0]}, thank you for reaching out! I'd love to help you find the perfect home at ${community.name}. Would you be available for a quick call this week?`
                      : "Select a message to see suggested responses."}
                  </div>
                </div>
                {selectedMessage && (
                  <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 6, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 6 }}>{selectedMessage.contact}</div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 10, fontStyle: "italic" }}>{selectedMessage.subject}</div>
                    <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7, whiteSpace: "pre-line" }}>{selectedMessage.body}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ AMENITIES ══════════════════════════════════════════════════════ */}
        {activeTab === 'amenities' && (
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ededed", marginBottom: 16 }}>Amenities</h2>
            {amenityList.length === 0 ? (
              <div style={{ color: "#555", fontSize: 13 }}>No amenities data available.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {amenityList.map((name, i) => (
                  <div key={i} style={{ background: "#1a1a1e", border: "1px solid #222", borderRadius: 3, padding: "12px 16px", color: "#aaa", fontSize: 13 }}>
                    ◆ {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ DESIGN CENTER ══════════════════════════════════════════════════ */}
        {activeTab === 'designcenter' && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {community.design_center_url ? (
              <>
                <div style={{ background: "#0d0e10", borderBottom: "1px solid #1a1a1e", padding: "8px 24px", fontSize: 12, color: "#888", flexShrink: 0 }}>
                  Design Center — <a href={community.design_center_url} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd" }}>{community.design_center_url} ↗</a>
                </div>
                <iframe src={community.design_center_url} style={{ width: "100%", flex: 1, border: "none" }} title="Design Center" />
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#555", gap: 8 }}>
                <span style={{ fontSize: 32 }}>✦</span>
                <div style={{ fontSize: 14 }}>No design center URL configured</div>
                <a href="https://style.schellbrothers.com" target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd", fontSize: 13 }}>Visit style.schellbrothers.com ↗</a>
              </div>
            )}
          </div>
        )}

        {/* ═══ INFO ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'info' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 900 }}>
              {/* Left column */}
              <div>
                {/* Location */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>Location</div>
                  {community.sales_center_address && <InfoRow label="Sales Center" value={community.sales_center_address} />}
                  <InfoRow label="City / State" value={[community.city, community.state, community.zip].filter(Boolean).join(', ') || '—'} />
                  {community.latitude && community.longitude && (
                    <InfoRow label="Map" value={<a href={`https://maps.google.com/?q=${community.latitude},${community.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd" }}>{community.latitude}, {community.longitude} ↗</a>} />
                  )}
                </div>

                {/* Pricing */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>Pricing</div>
                  <InfoRow label="Priced From" value={community.price_from ? '$' + community.price_from.toLocaleString() : '—'} />
                  <InfoRow label="HOA Fee" value={community.hoa_fee ? `$${Number(community.hoa_fee).toLocaleString()} / ${community.hoa_period ?? 'mo'}` : '—'} />
                </div>

                {/* Schools */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>Schools</div>
                  <InfoRow label="District" value={community.school_district ?? '—'} />
                  <InfoRow label="Elementary" value={community.school_elementary ?? '—'} />
                  <InfoRow label="Middle" value={community.school_middle ?? '—'} />
                  <InfoRow label="High School" value={community.school_high ?? '—'} />
                </div>

                {/* Utilities */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>Utilities</div>
                  <InfoRow label="Electric" value={community.electric ?? '—'} />
                  <InfoRow label="Gas" value={community.gas ?? '—'} />
                  <InfoRow label="Water" value={community.water ?? '—'} />
                  <InfoRow label="Sewer" value={community.sewer ?? '—'} />
                  <InfoRow label="Trash" value={community.trash ?? '—'} />
                  <InfoRow label="Cable / Internet" value={community.cable_internet ?? '—'} />
                </div>
              </div>

              {/* Right column */}
              <div>
                {/* Community */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>Community</div>
                  <InfoRow label="Total Homesites" value={community.total_homesites ?? '—'} />
                  <InfoRow label="55+" value={community.is_55_plus ? 'Yes' : community.is_55_plus === false ? 'No' : '—'} />
                  <InfoRow label="Lot Map" value={community.lot_map_url ? 'Yes' : 'No'} />
                </div>

                {/* Hours */}
                {Object.keys(hoursObj).length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>Hours</div>
                    {Object.entries(hoursObj).map(([day, time]) => (
                      <InfoRow key={day} label={day} value={time} />
                    ))}
                  </div>
                )}

                {/* Resources */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>Resources</div>
                  {community.brochure_url && <InfoRow label="Brochure" value={<a href={community.brochure_url} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd" }}>Download ↗</a>} />}
                  {community.included_features_url && <InfoRow label="Included Features" value={<a href={community.included_features_url} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd" }}>View ↗</a>} />}
                  {community.design_center_url && <InfoRow label="Design Center" value={<a href={community.design_center_url} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd" }}>Open ↗</a>} />}
                  {community.website_url && <InfoRow label="Website" value={<a href={community.website_url} target="_blank" rel="noopener noreferrer" style={{ color: "#59a6bd" }}>Visit ↗</a>} />}
                  {!community.brochure_url && !community.included_features_url && !community.design_center_url && !community.website_url && (
                    <InfoRow label="Links" value="None configured" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

type OverviewClientProps =
  | ({ view: "corp" } & CorpViewProps)
  | ({ view: "division" } & DivisionViewProps)
  | ({ view: "community" } & CommunityViewProps);

export default function OverviewClient(props: OverviewClientProps) {
  if (props.view === "corp") {
    const { view: _v, ...rest } = props;
    return <CorpView {...rest} />;
  }
  if (props.view === "division") {
    const { view: _v, ...rest } = props;
    return <DivisionView {...rest} />;
  }
  const { view: _v, ...rest } = props;
  return <CommunityView {...rest} />;
}
