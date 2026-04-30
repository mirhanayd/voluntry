"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  useConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ useConfirm: confirm }}>
      {children}
      {isOpen && options && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={titleStyle}>{options.title}</h3>
            <p style={messageStyle}>{options.message}</p>
            <div style={buttonContainerStyle}>
              <button style={cancelButtonStyle} onClick={handleCancel}>
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                style={{
                  ...confirmButtonStyle,
                  background: options.destructive ? "#dc2626" : "#246344",
                }}
                onClick={handleConfirm}
              >
                {options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.useConfirm;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: "24px",
  borderRadius: "8px",
  width: "90%",
  maxWidth: "400px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: "18px",
  fontWeight: 600,
  color: "#111827",
};

const messageStyle: React.CSSProperties = {
  margin: "0 0 24px 0",
  fontSize: "14px",
  color: "#4b5563",
  lineHeight: 1.5,
};

const buttonContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
};

const baseButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
};

const cancelButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: "#f3f4f6",
  color: "#374151",
};

const confirmButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  color: "#fff",
};
