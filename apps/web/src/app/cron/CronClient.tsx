"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o"
);

// ── Feed definitions ────────────────────────────────────────────────────────
type FeedDef = {
  num: number;
  name: string;
  description: string;
  schedule: string;
  script: string;
  /** Column to filter on in sync_log */
  filterCol: "source" | "feed";
  filterVal: string;
  times: string[];
};

const FEEDS: FeedDef[] = [
  {
    num: 1,
    name: "Web Forms",
    description: "Live web form submissions from SchellBrothers.com",
    schedule: "Every 5 min",
    script: "/api/sync/webforms",
    filterCol: "source",
    filterVal: "webforms",
    times: [], // continuous
  },
  {
    num: 2,
    name: "Division Plans",
    description: "Plans offered at division level",
    schedule: "3× Daily (6 AM, Noon, 6 PM)",
    script: "hbx-sync-division-plans.py",
    filterCol: "feed",
    filterVal: "division_plans",
    times: ["6:00 AM", "12:00 PM", "6:00 PM"],
  },
  {
    num: 3,
    name: "Model Homes",
    description: "Model homes from Heartbeat Page Designer",
    schedule: "3× Daily",
    script: "hbx-sync-model.py",
    filterCol: "feed",
    filterVal: "model_homes",
    times: ["6:00 AM", "12:00 PM", "6:00 PM"],
  },
  {
    num: 4,
    name: "Quick Delivery",
    description: "OpenQD homes from SchellBrothers.com",
    schedule: "3× Daily",
    script: "hbx-sync-quick-delivery.py",
    filterCol: "feed",
    filterVal: "spec_homes",
    times: ["6:00 AM", "12:00 PM", "6:00 PM"],
  },
  {
    num: 5,
    name: "Lots",
    description: "All lots across all communities from HB Lot API",
    schedule: "3× Daily",
    script: "hbx-sync-lots.py",
    filterCol: "feed",
    filterVal: "lots",
    times: ["6:05 AM", "12:05 PM", "6:05 PM"],
  },
  {
    num: 6,
    name: "Community Plans",
    description: "Plans × community intersection with pricing, images, incentives",
    schedule: "3× Daily",
    script: "hbx-sync-community-plans.py",
    filterCol: "feed",
    filterVal: "community_plans",
    times: ["6:05 AM", "12:05 PM", "6:05 PM"],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function nextBatchRun(): string {
  const times = ["6:00 AM", "12:00 PM", "6:00 PM"];
  const et = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const [hStr, mStr] = et.split(":");
  const nowMins = parseInt(hStr) * 60 + parseInt(mStr);

  const fmtDate = (offsetDays: number, label: string) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const datePart = d.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
    });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; const tzAbbr = d.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop(); return `${datePart}, ${label} ${tzAbbr}`;
  };

  for (const t of times) {
    const [time, ampm] = t.split(" ");
    const [h, m] = time.split(":").map(Number);
    let hours = h;
    if (ampm === "PM" && h !== 12) hours += 12;
    if (ampm === "AM" && h === 12) hours = 0;
    if (hours * 60 + (m ?? 0) > nowMins) return fmtDate(0, t);
  }
  return fmtDate(1, times[0]);
}

// ── Sync row type ────────────────────────────────────────────────────────────

type SyncEntry = {
  status: string;
  rows_upserted: number | null;
  rows_synced: number | null;
  rows_total: number | null;
  duration_ms: number | null;
  synced_at: string;
  error_message: string | null;
};

// ── Component ────────────────────────────────────────────────────────────────

export default function CronClient() {
  const [data, setData] = useState<Record<string, SyncEntry | null>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    // Fire all feed queries in parallel
    const results = await Promise.all(
      FEEDS.map(async (f) => {
        const col = f.filterCol;
        const { data: rows } = await supabase
          .from("sync_log")
          .select("status,rows_upserted,rows_synced,rows_total,duration_ms,synced_at,error_message")
          .eq(col, f.filterVal)
          .order("synced_at", { ascending: false })
          .limit(1);

        const entry: SyncEntry | null = rows && rows.length > 0 ? rows[0] : null;
        return [f.filterVal, entry] as const;
      })
    );

    const map: Record<string, SyncEntry | null> = {};
    for (const [key, val] of results) {
      map[key] = val;
    }
    setData(map);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", padding: "32px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            Data Sync &amp; Cron Jobs
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "4px 0 0 0" }}>
            Automated data feeds and scheduled tasks
          </p>
        </div>
        <button
          disabled
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.35)",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ↻ Sync Now
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {["#", "Feed", "Schedule", "Script / Endpoint", "Last Run", "Rows", "Duration", "Status"].map(
                (h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: i === 0 ? "center" : "left",
                      fontWeight: 500,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {FEEDS.map((feed) => {
              const entry = data[feed.filterVal];
              const rowCount =
                entry?.rows_upserted ?? entry?.rows_synced ?? entry?.rows_total ?? null;
              const isOk = entry?.status === "success" || entry?.status === "ok";
              const isError = entry ? !isOk : false;

              return (
                <tr
                  key={feed.num}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* # */}
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.3)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {feed.num}
                  </td>

                  {/* Feed */}
                  <td style={{ padding: "12px 14px", minWidth: 200 }}>
                    <div style={{ fontWeight: 600, color: "#fafafa" }}>{feed.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                      {feed.description}
                    </div>
                  </td>

                  {/* Schedule */}
                  <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                    {feed.schedule}
                  </td>

                  {/* Script */}
                  <td style={{ padding: "12px 14px" }}>
                    <code
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                        background: "rgba(255,255,255,0.04)",
                        padding: "2px 6px",
                        borderRadius: 3,
                      }}
                    >
                      {feed.script}
                    </code>
                  </td>

                  {/* Last Run */}
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "rgba(255,255,255,0.5)",
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {loading ? "—" : entry ? timeAgo(entry.synced_at) : "Never"}
                  </td>

                  {/* Rows */}
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "rgba(255,255,255,0.5)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {loading ? "—" : rowCount !== null ? rowCount.toLocaleString() : "—"}
                  </td>

                  {/* Duration */}
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "rgba(255,255,255,0.5)",
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {loading
                      ? "—"
                      : entry?.duration_ms != null
                        ? fmtDuration(entry.duration_ms)
                        : "—"}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    {loading ? (
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>…</span>
                    ) : !entry ? (
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                    ) : isOk ? (
                      <span style={{ color: "#80B602", fontWeight: 500 }}>● OK</span>
                    ) : isError ? (
                      <span
                        style={{ color: "#E32027", fontWeight: 500, cursor: "help" }}
                        title={entry.error_message ?? "Unknown error"}
                      >
                        ● Error
                      </span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "rgba(255,255,255,0.3)",
        }}
      >
        <span>Next batch: {nextBatchRun()}</span>
        <span>
          Auto-refresh every 30s · Last refreshed{" "}
          {lastRefresh.toLocaleTimeString("en-US", {
            timeZone: "America/New_York",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
