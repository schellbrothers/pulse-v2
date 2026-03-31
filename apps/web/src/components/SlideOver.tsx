"use client";

import { useEffect } from "react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}

export default function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  width = 480,
}: SlideOverProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 40,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: "#111",
          borderLeft: "1px solid #1f1f1f",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 14px",
            borderBottom: "1px solid #1f1f1f",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#ededed",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h2>
                {badge}
              </div>
              {subtitle && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{subtitle}</div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#555",
                fontSize: 18,
                cursor: "pointer",
                padding: "0 2px",
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>{children}</div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}

export function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value?: string | number | null | React.ReactNode;
  mono?: boolean;
  dim?: boolean;
}

export function Row({ label, value, mono, dim }: RowProps) {
  if (value == null || value === "" || value === "—") {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        minHeight: 20,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "#555",
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: dim ? "#555" : "#ededed",
          fontFamily: mono ? "var(--font-mono)" : undefined,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}
