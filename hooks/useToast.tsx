"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

/* ── Context ───────────────────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

/* ── Provider ──────────────────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* ── Toast container ─────────────────────────────────────────────── */}
      <div style={containerStyle}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...toastStyle,
              ...variantStyles[t.variant],
            }}
            onClick={() => dismiss(t.id)}
          >
            <span style={{ marginRight: 8, fontSize: "1.1rem" }}>
              {t.variant === "success"
                ? "✓"
                : t.variant === "error"
                ? "✕"
                : "ℹ"}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────────────── */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

/* ── Styles ────────────────────────────────────────────────────────────────── */

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  pointerEvents: "none",
};

const toastStyle: React.CSSProperties = {
  pointerEvents: "auto",
  padding: "12px 20px",
  borderRadius: 10,
  fontSize: "0.88rem",
  fontWeight: 600,
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  animation: "toast-slide-in 0.3s ease",
  minWidth: 260,
  maxWidth: 420,
};

const variantStyles: Record<ToastVariant, React.CSSProperties> = {
  success: {
    background: "#f0faf5",
    color: "#246344",
    border: "1px solid #86efac",
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
  },
  info: {
    background: "#eff6ff",
    color: "#1e40af",
    border: "1px solid #93c5fd",
  },
};
