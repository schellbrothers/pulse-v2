"use client";

import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: "auto" | "half" | "full";
}

const HEIGHT_MAP = {
  auto: "auto",
  half: "50vh",
  full: "90vh",
};

export default function BottomSheet({ open, onClose, title, children, height = "half" }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const maxH = HEIGHT_MAP[height];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 100,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          background: "#111",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: maxH,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "bottomSheetSlideUp 0.25s ease-out",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#3f3f46" }} />
        </div>

        {/* Title */}
        {title && (
          <div style={{
            padding: "4px 20px 12px",
            borderBottom: "1px solid #1f1f1f",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#fafafa" }}>{title}</span>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#555",
                fontSize: 18,
                cursor: "pointer",
                padding: "4px 8px",
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
          {children}
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes bottomSheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
