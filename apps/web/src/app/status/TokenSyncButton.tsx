"use client";
import { useState } from "react";

export function TokenSyncButton() {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token-sync", { method: "POST" });
      if (res.ok) {
        setLastSync(new Date());
      } else {
        const data = await res.json();
        setError(data.error ?? "Sync failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const secondsAgo = lastSync
    ? Math.round((Date.now() - lastSync.getTime()) / 1000)
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {lastSync && !error && (
        <span style={{ fontSize: 10, color: "#555" }}>
          Updated {secondsAgo}s ago
        </span>
      )}
      {error && (
        <span style={{ fontSize: 10, color: "#E32027" }}>{error}</span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        style={{
          background: "transparent",
          border: "1px solid #333",
          borderRadius: 3,
          color: loading ? "#444" : "#888",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 10,
          fontWeight: 600,
          padding: "3px 8px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontFamily: "inherit",
        }}
      >
        {loading ? "Syncing…" : "↻ Sync Now"}
      </button>
    </div>
  );
}
