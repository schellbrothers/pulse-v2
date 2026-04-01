"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import CommunityCard from "@/components/CommunityCard";
import PlanCard from "@/components/PlanCard";


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
  short_description: string | null;
  total_homesites: number | null;
  has_model: boolean;
  lot_map_url?: string | null;
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#222326" }}>
      {/* Top bar — HBv1 style */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 52,
          borderBottom: "1px solid #3a3b3e",
          background: "#222326",
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
              background: "#2a2b2e",
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#222326" }}>
      {/* Top bar — breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          height: 52,
          borderBottom: "1px solid #3a3b3e",
          background: "#2a2b2e",
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
          background: "#1a1a1e",
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
                    background: "#2a2b2e",
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
type CommunityTabId = "performance" | "sitemap" | "prospects" | "communications" | "calendar";

const COMMUNITY_TABS: { id: CommunityTabId; label: string }[] = [
  { id: "performance", label: "📊 Performance" },
  { id: "sitemap", label: "🗺 Sitemap & Plans" },
  { id: "prospects", label: "👥 Prospects" },
  { id: "communications", label: "💬 Communications" },
  { id: "calendar", label: "📅 Calendar" },
];

function CommunityView({ community, plans, lots, modelHome, specHomes, divisions }: CommunityViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CommunityTabId>("performance");
  const [activeCommTab, setActiveCommTab] = useState<"Email" | "SMS" | "Calls">("Email");
  const [selectedMessage, setSelectedMessage] = useState<DummyMessage | null>(null);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0d0d0d" }}>

      {/* ── Breadcrumb top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          height: 44,
          borderBottom: "1px solid #1f1f1f",
          background: "#0d0d0d",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          ← Corp
        </button>
        {division && (
          <>
            <span style={{ color: "#333" }}>·</span>
            <button
              onClick={() => router.push(`/?div=${division.id}`)}
              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              {division.name}
            </button>
          </>
        )}
        <span style={{ color: "#333" }}>·</span>
        <h1 style={{ fontFamily: "var(--font-display)", color: "#ededed", fontSize: 15, fontWeight: 600, margin: 0 }}>
          {community.name}
        </h1>
      </div>

      {/* ── Community hero header (always visible) ── */}
      <div style={{ flexShrink: 0, background: "#2a2b2e", borderBottom: "1px solid #3a3b3e" }}>
        <div style={{ width: "100%", height: 160, overflow: "hidden", position: "relative" }}>
          {community.featured_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.featured_image_url as string}
              alt={community.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#1e1f22" }} />
          )}
          {/* Gradient overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "60%",
              background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
            }}
          />
          {/* Text overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 24,
              zIndex: 2,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#ffffff" }}>
              {community.name}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              {[community.city, community.state].filter(Boolean).join(" · ")}
              {division ? ` · ${division.name}` : ""}
            </div>
          </div>
        </div>

        {/* Community meta pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 24px 12px", alignItems: "center" }}>
          {community.price_from && (
            <span style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "3px 8px", fontSize: 11, color: "#59a6bd", fontWeight: 600 }}>
              From {formatPrice(community.price_from as number)}
            </span>
          )}
          {community.hoa_fee && (
            <span style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "3px 8px", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              ${community.hoa_fee}/mo HOA
            </span>
          )}
          {community.total_homesites && (
            <span style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "3px 8px", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              {community.total_homesites} homesites
            </span>
          )}
          {community.school_district && (
            <span style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "3px 8px", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              {community.school_district}
            </span>
          )}
          {community.page_url && (
            <a
              href={community.page_url as string}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
                border: "1px solid #59a6bd",
                background: "rgba(89,166,189,0.15)",
                color: "#59a6bd",
                borderRadius: 3,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              View on schellbrothers.com ↗
            </a>
          )}
        </div>
      </div>

      {/* ── HBv1-style tab bar ── */}
      <div
        style={{
          background: "#1a1a1e",
          borderBottom: "2px solid #444",
          display: "flex",
          gap: 0,
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        {COMMUNITY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "3px solid #59a6bd" : "3px solid transparent",
              marginBottom: -2,
              color: activeTab === tab.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
              fontSize: 13,
              fontFamily: "Open Sans, Arial, sans-serif",
              fontWeight: activeTab === tab.id ? 600 : 400,
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

      {/* ── Tab content area ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PERFORMANCE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "performance" && (
          <div style={{ padding: 24 }}>
            {/* Stats Row (8 cards) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 10,
                marginBottom: 32,
              }}
            >
              <StatCard label="Plans" value={plans.length} accent="#223347" />
              <StatCard label="Avail Lots" value={availableLots.length} accent="#00c853" />
              <StatCard label="Under Const" value={underConstruction.length} accent="#5b80a0" />
              <StatCard label="QD Homes" value={specHomes.length + qdLots.length} accent="#8a7a5a" />
              <StatCard label="Leads" value="—" accent="#a855f7" comingSoon />
              <StatCard label="Prospects" value="—" accent="#f59e0b" comingSoon />
              <StatCard label="Appts" value="—" accent="#f59e0b" comingSoon />
              <StatCard label="Contracts" value="—" accent="#00c853" comingSoon />
            </div>

            {/* Sales Performance */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                  Sales Performance
                </h2>
                <span style={{ fontSize: 12, color: "#555" }}>{currentYear}</span>
                <ComingSoonBanner source="HBv1 Sales API" />
              </div>
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      <td style={{ width: 70, fontSize: 12, fontWeight: 700, color: "#ffffff", background: "#E32027", paddingBottom: 8, paddingLeft: 6, paddingTop: 6, textAlign: "center" }}>{currentYear}</td>
                      {MONTHS.map((m) => (
                        <th key={m} style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, textAlign: "center", paddingBottom: 8, minWidth: 52, background: "#1d1d1d", border: "1px solid #333", padding: "6px 4px" }}>
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Net", color: "#ffffff", size: 18 },
                      { label: "Goal", color: "rgba(255,255,255,0.5)", size: 13 },
                      { label: "Var", color: "rgba(255,255,255,0.5)", size: 13 },
                    ].map((row) => (
                      <tr key={row.label} style={{ borderTop: "1px solid #1a1a1a" }}>
                        <td style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, padding: "8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          {row.label}
                        </td>
                        {MONTHS.map((m) => (
                          <td key={m} style={{ textAlign: "center", padding: "8px 4px" }}>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: row.size, color: row.color }}>—</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {["Weekly Net Sales", "Avg Sale Price", "Avg Upgrades"].map((c) => (
                  <div key={c} style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "12px 14px" }}>
                    <PlaceholderValue />
                    <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4, fontWeight: 500 }}>{c}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appointments */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                  Appointments
                </h2>
                <ComingSoonBanner source="Pulse v1" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                {["Held", "Set", "Upcoming", "Cancelled", "Conversion %"].map((label) => (
                  <PlaceholderStatCard key={label} label={label} accent="#f59e0b" />
                ))}
              </div>
            </div>

            {/* Prospecting & Engagement */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                  Prospecting &amp; Engagement
                </h2>
                <ComingSoonBanner source="Pulse v1 + Mailchimp" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                {["New Prospects", "Total Prospects", "A Prospects", "Unique Contacts", "Campaigns Sent"].map((label) => (
                  <PlaceholderStatCard key={label} label={label} accent="#a855f7" />
                ))}
              </div>
            </div>

            {/* Inventory & Sales Pace */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                  Inventory &amp; Sales Pace
                </h2>
                <span style={{ background: "#0d1f0d", color: "#00c853", border: "1px solid #1a3f1a", borderRadius: 4, fontSize: 9, fontWeight: 600, padding: "2px 7px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Live
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
                <StatCard label="Available Lots" value={availableLots.length} accent="#00c853" />
                <StatCard label="Buildable" value={buildableLots.length} accent="#00c853" />
                <StatCard label="Future" value={futureLots.length} accent="#5b80a0" />
                <StatCard label="Sold / Closed" value={soldLots.length} accent="#ef4444" />
                <StatCard label="3-Mo Pace" value="—" accent="#f59e0b" comingSoon />
                <StatCard label="Proj. Sell-Out" value="—" accent="#f59e0b" comingSoon />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Phase Breakdown</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#1d1d1d", borderRadius: 3, overflow: "hidden" }}>
                    <thead>
                      <tr style={{ background: "#161616" }}>
                        {["Phase", "Total", "Available", "Sold", "Under Const", "Future"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, textAlign: h === "Phase" ? "left" : "center", borderBottom: "1px solid #1f1f1f" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {phaseRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "12px", fontSize: 12, color: "#555", textAlign: "center" }}>No lots found</td>
                        </tr>
                      ) : (
                        phaseRows.map(([phase, data], idx) => (
                          <tr key={phase} style={{ background: idx % 2 === 0 ? "#111" : "#0d0d0d", borderBottom: "1px solid #1a1a1a" }}>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#ededed", fontWeight: 600 }}>{phase}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#888", textAlign: "center" }}>{data.total}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#00c853", textAlign: "center" }}>{data.available || "—"}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#ef4444", textAlign: "center" }}>{data.sold || "—"}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#5b80a0", textAlign: "center" }}>{data.underConst || "—"}</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, color: "#666", textAlign: "center" }}>{data.future || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Construction Pipeline</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                  <StatCard label="Settled / Closed" value={settled} accent="#555" />
                  <StatCard label="Under Construction" value={activeConstruction} accent="#5b80a0" />
                  <StatCard label="Sold – Not Started" value={soldNotStarted} accent="#f59e0b" />
                  <StatCard label="Not Sold" value={notSold} accent="#00c853" />
                </div>
              </div>
            </div>

            {/* Plans Available */}
            <div style={{ marginBottom: 32 }}>
              <SectionHeader title="Plans Available" count={sortedPlans.length} />
              {sortedPlans.length === 0 ? (
                <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "24px", color: "#555", fontSize: 13, textAlign: "center" }}>
                  No plans configured in Heartbeat for this community
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                  {sortedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      planName={plan.plan_name}
                      beds={plan.beds}
                      baths={plan.baths}
                      sqft={plan.sqft_min}
                      netPrice={plan.net_price}
                      basePrice={plan.base_price}
                      incentiveAmount={plan.incentive_amount}
                      imageUrl={plan.featured_image_url}
                      pageUrl={plan.page_url ?? undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Model Home + Quick Delivery */}
            <div style={{ marginBottom: 32 }}>
              <SectionHeader title="Model Home" />
              {modelHome ? (
                <div style={{ background: "#111", border: "1px solid #1a2a3f", borderRadius: 10, overflow: "hidden", maxWidth: 480, marginBottom: 20 }}>
                  {modelHome.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={modelHome.image_url} alt={modelHome.model_name ?? "Model Home"} style={{ width: "100%", height: 200, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: 100, background: "#161820", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 11 }}>No Image</div>
                  )}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ background: "#161820", color: "#5b80a0", border: "1px solid #1a2a3f", borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 7px" }}>Model Home</span>
                      {modelHome.leaseback && (
                        <span style={{ background: "#1f1a0f", color: "#8a7a5a", border: "1px solid #3f3a1f", borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 7px" }}>Leaseback</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "#ededed", marginBottom: 4 }}>
                      {modelHome.model_marketing_name ?? modelHome.model_name ?? modelHome.name ?? "Model"}
                    </div>
                    {modelHome.address && <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{modelHome.address}</div>}
                    {modelHome.open_hours && <div style={{ fontSize: 12, color: "#666", marginBottom: 8, whiteSpace: "pre-line" }}>{modelHome.open_hours}</div>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {modelHome.virtual_tour_url && (
                        <a href={modelHome.virtual_tour_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#818cf8", textDecoration: "none", background: "#12121f", border: "1px solid #2a2a4a", borderRadius: 5, padding: "4px 8px" }}>Virtual Tour →</a>
                      )}
                      {modelHome.page_url && (
                        <a href={modelHome.page_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#5b80a0", textDecoration: "none", background: "#111820", border: "1px solid #1a2a3f", borderRadius: 5, padding: "4px 8px" }}>schellbrothers.com ↗</a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "20px 24px", color: "#555", fontSize: 13, marginBottom: 20 }}>
                  No model home for this community
                </div>
              )}

              <SectionHeader title="Quick Delivery" count={specHomes.length} />
              {specHomes.length === 0 ? (
                <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "20px 24px", color: "#555", fontSize: 13 }}>
                  No quick delivery homes available
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {specHomes.map((s) => (
                    <div key={s.id} style={{ background: "#111", border: "1px solid #1f1f1f", borderLeft: "2px solid #8a7a5a", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 3 }}>{s.plan_name ?? "Quick Delivery"}</div>
                      {s.address && <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{s.address}</div>}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "#666" }}>
                        {s.beds && <span>{s.beds} bd</span>}
                        {s.baths && <span>{s.baths} ba</span>}
                        {s.sqft && <span>{s.sqft.toLocaleString()} sf</span>}
                        {s.list_price && <span style={{ color: "#8a7a5a", fontWeight: 600 }}>{formatPrice(s.list_price)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SITEMAP & PLANS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "sitemap" && (
          <div style={{ display: "flex", gap: 0, height: "100%", minHeight: 0 }}>
            {/* Left 60% — Lot Map */}
            <div style={{ flex: "0 0 60%", padding: 24, borderRight: "1px solid #1f1f1f", overflowY: "auto" }}>
              <SectionHeader title="Interactive Lot Map" />
              {community.lot_map_url ? (
                <iframe
                  src={community.lot_map_url}
                  style={{ width: "100%", height: 500, border: "none", borderRadius: 3 }}
                  title="Lot Map"
                />
              ) : (
                <div style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  Lot map not configured for this community
                </div>
              )}
              {/* Legend */}
              <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                <span>🟢 Available</span>
                <span>🔵 Sold</span>
                <span>🟡 Under Construction</span>
                <span>⬜ Future</span>
              </div>
            </div>

            {/* Right 40% — Plan Cards + Lots Table */}
            <div style={{ flex: "0 0 40%", padding: 24, overflowY: "auto" }}>
              <SectionHeader title={`Plans Available (${sortedPlans.length})`} />
              {sortedPlans.length === 0 ? (
                <div style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "20px", color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
                  No plans configured for this community
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {sortedPlans.map((plan) => (
                    <div key={plan.id} style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, padding: "12px 14px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "#ededed", marginBottom: 4 }}>{plan.plan_name}</div>
                      <div style={{ display: "flex", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.5)", flexWrap: "wrap" }}>
                        {plan.beds && <span>{plan.beds} bd</span>}
                        {plan.baths && <span>{plan.baths} ba</span>}
                        {plan.sqft_min && <span>{plan.sqft_min.toLocaleString()} sf</span>}
                        {(plan.net_price ?? plan.base_price) && (
                          <span style={{ color: "#59a6bd", fontWeight: 600 }}>{formatPrice((plan.net_price ?? plan.base_price) as number)}</span>
                        )}
                        {plan.incentive_amount && plan.incentive_amount > 0 && (
                          <span style={{ background: "#80B602", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                            -{formatPrice(plan.incentive_amount)} incentive
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Lots table */}
              <div style={{ fontSize: 12, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Available Lots</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#2a2b2e" }}>
                      {["Lot #", "Phase", "Address", "Status", "Premium"].map((h) => (
                        <th key={h} style={{ padding: "6px 10px", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #444" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableLots.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "10px", color: "#555", textAlign: "center" }}>No available lots</td>
                      </tr>
                    ) : (
                      availableLots.map((lot) => (
                        <tr key={lot.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                          <td style={{ padding: "6px 10px", color: "#ededed" }}>{lot.lot_number ?? "—"}</td>
                          <td style={{ padding: "6px 10px", color: "#888" }}>{lot.phase ?? "—"}</td>
                          <td style={{ padding: "6px 10px", color: "#888", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.address ?? "—"}</td>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{ color: lotStatusColor(lot.lot_status), fontWeight: 600 }}>{lot.lot_status ?? "—"}</span>
                          </td>
                          <td style={{ padding: "6px 10px", color: "#8a7a5a" }}>
                            {lot.lot_premium ? formatPrice(lot.lot_premium) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PROSPECTS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "prospects" && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                Prospects — {community.name}
              </h2>
              <ComingSoonBanner source="Pulse v1" />
            </div>

            <div style={{ background: "#1d1d1d", border: "1px solid #555", borderRadius: 3, overflow: "hidden", maxWidth: 700 }}>
              {/* AI scoring header */}
              <div style={{ background: "#2a2b2e", padding: "12px 16px", borderBottom: "1px solid #444", display: "flex", gap: 24, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>AI Lead Scoring</span>
                <span style={{ fontSize: 12 }}>🔥 <span style={{ color: "#ef4444" }}>High</span> <span style={{ color: "#555" }}>(0)</span></span>
                <span style={{ fontSize: 12 }}>⚡ <span style={{ color: "#f59e0b" }}>Medium</span> <span style={{ color: "#555" }}>(0)</span></span>
                <span style={{ fontSize: 12 }}>📋 <span style={{ color: "#888" }}>Low</span> <span style={{ color: "#555" }}>(0)</span></span>
              </div>

              {/* Empty state */}
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>No prospect data connected</div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 24 }}>Connect Pulse v1 to see leads and prospects here</div>
                <div style={{ fontSize: 12, color: "#555", textAlign: "left", display: "inline-block" }}>
                  <div style={{ marginBottom: 6, color: "#59a6bd" }}>This tab will show:</div>
                  <div>• AI-scored prospect list</div>
                  <div>• Follow-up queue with Schellie suggestions</div>
                  <div>• Funnel stage distribution</div>
                  <div>• Auto-promotion alerts</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: COMMUNICATIONS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "communications" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Source banner */}
            <div style={{ background: "#1a1200", border: "1px solid #3f2f00", padding: "8px 24px", fontSize: 12, color: "#8a7a5a", flexShrink: 0 }}>
              ⚠ Live data not connected — showing sample messages · Zoom / Outlook / Rilla
            </div>

            {/* Two-column layout */}
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              {/* Left 70% — Email/SMS/Calls tabs + message list */}
              <div style={{ flex: "0 0 70%", borderRight: "1px solid #1f1f1f", display: "flex", flexDirection: "column" }}>
                {/* Comm channel tab bar */}
                <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1f1f1f", padding: "0 24px", background: "#111", flexShrink: 0 }}>
                  {(["Email", "SMS", "Calls"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveCommTab(tab); setSelectedMessage(null); }}
                      style={{
                        background: "none",
                        border: "none",
                        borderBottom: activeCommTab === tab ? "2px solid #59a6bd" : "2px solid transparent",
                        color: activeCommTab === tab ? "#ededed" : "#555",
                        fontSize: 13,
                        fontWeight: activeCommTab === tab ? 600 : 400,
                        padding: "10px 14px 12px",
                        cursor: "pointer",
                        marginBottom: -1,
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Message list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                  {(DUMMY_MESSAGES[activeCommTab] ?? []).map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      style={{
                        background: selectedMessage?.id === msg.id ? "#1a2a3f" : "#111",
                        border: "1px solid",
                        borderColor: selectedMessage?.id === msg.id ? "#2a4a6f" : "#1f1f1f",
                        borderRadius: 8,
                        padding: "12px 14px",
                        cursor: "pointer",
                        marginBottom: 8,
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => { if (selectedMessage?.id !== msg.id) (e.currentTarget as HTMLDivElement).style.borderColor = "#2a3f5a"; }}
                      onMouseLeave={(e) => { if (selectedMessage?.id !== msg.id) (e.currentTarget as HTMLDivElement).style.borderColor = "#1f1f1f"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ background: msg.direction === "IN" ? "#1a2a3f" : "#1a1a1a", color: msg.direction === "IN" ? "#5b80a0" : "#888", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {msg.direction === "IN" ? "● IN" : "→ OUT"}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>{msg.contact}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "#555" }}>CSM: {msg.csm}</span>
                          <span style={{ background: msg.status === "NEW" ? "#3f0d0d" : msg.status === "COMPLETED" ? "#0d2f0d" : "#1a1a1a", color: msg.status === "NEW" ? "#ef4444" : msg.status === "COMPLETED" ? "#00c853" : "#666", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {msg.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        &ldquo;{msg.preview}&rdquo;
                      </div>
                      <div style={{ fontSize: 11, color: "#555" }}>{msg.community} · {msg.timeAgo}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 30% — Message detail or Schellie response */}
              <div style={{ flex: "0 0 30%", overflowY: "auto", padding: 16, background: "#0d0d0d" }}>
                {selectedMessage ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "#ededed" }}>
                        {selectedMessage.contact}
                      </span>
                      <span style={{ background: selectedMessage.direction === "IN" ? "#1a2a3f" : "#1a1a1a", color: selectedMessage.direction === "IN" ? "#5b80a0" : "#888", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {selectedMessage.direction}
                      </span>
                      <span style={{ color: "#555", fontSize: 11 }}>{selectedMessage.timeAgo}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 16, fontStyle: "italic" }}>
                      Subject: {selectedMessage.subject}
                    </div>
                    <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#bbb", lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line" }}>
                      {selectedMessage.body}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                      {["Reply", "Mark Complete", "Schedule Follow-up"].map((action) => (
                        <button key={action} style={{ background: "#161616", border: "1px solid #2a2a2a", color: "#888", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                          {action}
                        </button>
                      ))}
                    </div>

                    {/* Schellie Suggested Response */}
                    <div style={{ background: "#0f1a2a", border: "1px solid #1a3f6f", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: "#5b80a0", fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>
                        ✦ Schellie Suggested Response
                      </div>
                      <div style={{ fontSize: 12, color: "#8aadcc", lineHeight: 1.7, marginBottom: 14 }}>
                        {`Hi ${selectedMessage.contact.split(" ")[0]}, thank you for reaching out! ${selectedMessage.direction === "IN" ? "I'd love to help answer your questions and find the perfect home for you at " + community.name + ". Would you be available for a quick call this week?" : "Looking forward to connecting with you soon. Please don't hesitate to reach out with any questions."}`}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ background: "#1a3f6f", border: "1px solid #2a5f9f", color: "#8aadcc", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          Use This Response
                        </button>
                        <button style={{ background: "#161616", border: "1px solid #2a2a2a", color: "#666", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                    <div>Select a message to view details</div>
                    <div style={{ fontSize: 11, marginTop: 6, color: "#444" }}>Schellie response box will appear here</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: CALENDAR */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "calendar" && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#ededed", margin: 0 }}>
                Appointments — {community.name}
              </h2>
              <ComingSoonBanner source="Pulse v1" />
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#ededed", marginBottom: 16 }}>{calMonthName}</div>

            {/* Calendar grid */}
            <div style={{ border: "1px solid #444", borderRadius: 3, overflow: "hidden", maxWidth: 700 }}>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#2a2b2e", borderBottom: "1px solid #444" }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {calDays.map((day, i) => {
                  const isToday = day === todayDate;
                  return (
                    <div
                      key={i}
                      style={{
                        height: 40,
                        background: day == null ? "#1d1d1d" : "#2a2b2e",
                        border: isToday ? "1px solid #59a6bd" : "none",
                        borderRight: "1px solid #444",
                        borderBottom: "1px solid #444",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-end",
                        padding: "4px 6px",
                        boxSizing: "border-box",
                      }}
                    >
                      {day != null && (
                        <span style={{ fontSize: 11, color: isToday ? "#59a6bd" : "rgba(255,255,255,0.4)", fontWeight: isToday ? 700 : 400 }}>
                          {day}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: "#555", textAlign: "center" }}>
              No appointments data connected
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

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
