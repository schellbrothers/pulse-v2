"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error";
}

interface ToastContextValue {
  showToast: (text: string, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback — no-op if outside provider
    return { showToast: () => {} };
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — above MobileNav (56px) */}
      <div
        style={{
          position: "fixed",
          bottom: 64,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
          width: "90%",
          maxWidth: 400,
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: ToastMessage }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in
    requestAnimationFrame(() => setVisible(true));
    // Trigger slide-out before removal
    const timer = setTimeout(() => setVisible(false), 2700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        backgroundColor: toast.type === "success" ? "#166534" : "#991b1b",
        color: toast.type === "success" ? "#bbf7d0" : "#fecaca",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        transform: visible ? "translateY(0)" : "translateY(20px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.25s ease, opacity 0.25s ease",
        pointerEvents: "auto",
        textAlign: "center",
      }}
    >
      {toast.text}
    </div>
  );
}
