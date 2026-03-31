"use client";

import { useState, useEffect } from "react";
import { useGlobalFilter } from "@/context/GlobalFilterContext";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import TopBar from "@/components/TopBar";
import StatsBar from "@/components/StatsBar";
import ViewToggle from "@/components/ViewToggle";
import type { DivisionStats } from "./page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "TBD";
  if (min != null && max != null)
    return `$${(min / 1000).toFixed(0)}K – $${(max / 1000).toFixed(0)}K`;
  if (min != null) return `From $${(min / 1000).toFixed(0)}K`;
  return `Up to $${(max! / 1000).toFixed(0)}K`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  divisions: DivisionStats[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DivisionsClient({ divisions }: Props) {
  const { filter, labels } = useGlobalFilter();
  const [view, setView] = useState<"card" | "table">("card");
  const [selectedDivId, setSelectedDivId] = useState<string | null>(() => filter.divisionId ?? null);

  useEffect(() => {
    setSelectedDivId(filter.divisionId ?? null);
  }, [filter.divisionId]);

  // Aggregate stats
  const totalCommunities = divisions.reduce((s, d) => s + d.community_count, 0);
  const totalActive = divisions.reduce((s, d) => s + d.active_count, 0);
  const totalComingSoon = divisions.reduce((s, d) => s + d.coming_soon_count, 0);
  const totalPlans = divisions.reduce((s, d) => s + d.plan_count, 0);

  const stats = [
    { label: "Divisions",    value: divisions.length },
    { label: "Communities",  value: totalCommunities },
    { label: "Active",       value: totalActive, color: "#4ade80" },
    { label: "Coming Soon",  value: totalComingSoon, color: "#f5a623" },
    { label: "Plans",        value: totalPlans, color: "#818cf8" },
  ];

  // ── Card view ──────────────────────────────────────────────────────────────

  const cardView = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 16,
        padding: 24,
      }}
    >
      {divisions.map((d) => (
        <div
          key={d.id}
          style={{
            background: "#111",
            border: `1px solid ${selectedDivId === d.id ? "#818cf8" : "#1f1f1f"}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Navy header */}
          <div
            style={{
              background: "#223347",
              padding: "14px 16px 12px",
              borderBottom: "1px solid #1a2a3a",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  margin: 0,
                  letterSpacing: "0.01em",
                }}
              >
                {d.name}
              </h2>
              {d.is_active && (
                <span
                  style={{
                    background: "rgba(0,200,83,0.15)",
                    color: "#4ade80",
                    border: "1px solid rgba(0,200,83,0.3)",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Active
                </span>
              )}
            </div>
            <div style={{ color: "#7a9bbf", fontSize: 12, marginTop: 4 }}>
              {[d.state_codes?.join(", "), d.region].filter(Boolean).join(" · ")}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "14px 16px 16px" }}>
            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                { label: "Communities", value: d.community_count, color: "#ededed" },
                { label: "Plans",       value: d.plan_count,       color: "#818cf8" },
                { label: "Active",      value: d.active_count,     color: "#4ade80" },
                { label: "Coming Soon", value: d.coming_soon_count, color: "#f5a623" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "#161616",
                    borderRadius: 8,
                    padding: "8px 12px",
                    border: "1px solid #1f1f1f",
                  }}
                >
                  <div
                    style={{
                      color: "#555",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 3,
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      color: stat.color,
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Price range */}
            <div
              style={{
                fontSize: 12,
                color: "#8a7a5a",
                marginBottom: 14,
                fontWeight: 500,
              }}
            >
              {formatPriceRange(d.price_min, d.price_max)}
            </div>

            {/* CTA */}
            <Link
              href={`/communities?division=${d.slug}`}
              style={{
                display: "block",
                textAlign: "center",
                background: "#1a2a3a",
                border: "1px solid #223347",
                color: "#7aafdf",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.15s",
              }}
            >
              View Communities →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Table view ─────────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    background: "#0d0d0d",
    color: "#555",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "8px 14px",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #1f1f1f",
    textAlign: "left",
  };

  const tdStyle: React.CSSProperties = {
    padding: "8px 14px",
    color: "#a1a1a1",
    fontSize: 13,
    borderBottom: "1px solid #161616",
    whiteSpace: "nowrap",
  };

  const tableView = (
    <div style={{ padding: "0 0 40px", overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
      >
        <thead>
          <tr>
            {[
              "Division",
              "States",
              "Region",
              "Communities",
              "Plans",
              "Active",
              "Coming Soon",
              "Price Range",
            ].map((h) => (
              <th key={h} style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {divisions.map((d) => (
            <tr
              key={d.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#111")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <td style={{ ...tdStyle, color: "#ededed", fontWeight: 600 }}>
                <Link
                  href={`/communities?division=${d.slug}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {d.name}
                </Link>
              </td>
              <td style={tdStyle}>{d.state_codes?.join(", ") || "—"}</td>
              <td style={tdStyle}>{d.region || "—"}</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>{d.community_count}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#818cf8" }}>{d.plan_count}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#4ade80" }}>{d.active_count}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: "#f5a623" }}>{d.coming_soon_count}</td>
              <td style={tdStyle}>{formatPriceRange(d.price_min, d.price_max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <PageShell
      topBar={
        <TopBar
          title="Divisions"
          right={
            <ViewToggle view={view} onChange={setView} />
          }
        />
      }
      filtersBar={
        <>
          {(filter.divisionId || filter.communityId) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px", background: "#0d0d0d", borderBottom: "1px solid #1f1f1f", fontSize: 11, color: "#555" }}>
              <span>Filtered:</span>
              {labels.division && <span style={{ color: "#a1a1a1" }}>{labels.division}</span>}
              {labels.community && <><span>›</span><span style={{ color: "#a1a1a1" }}>{labels.community}</span></>}
              {labels.plan && <><span>›</span><span style={{ color: "#a1a1a1" }}>{labels.plan}</span></>}
            </div>
          )}
          <StatsBar stats={stats} />
        </>
      }
    >
      {view === "card" ? cardView : tableView}
    </PageShell>
  );
}
