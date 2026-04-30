"use client";

import React from "react";

type SkeletonType = "card" | "list" | "table";

interface LoadingSkeletonProps {
  rows?: number;
  type?: SkeletonType;
}

export default function LoadingSkeleton({
  rows,
  type = "card",
}: LoadingSkeletonProps) {
  const count =
    rows ?? (type === "list" ? 4 : type === "table" ? 5 : 6);

  return (
    <div>
      {type === "card" && (
        <div style={cardGridStyle}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={cardStyle}>
              <div
                style={{
                  ...pulseBlockStyle,
                  height: 100,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
              <div
                style={{
                  ...pulseBlockStyle,
                  height: 14,
                  width: "70%",
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  ...pulseBlockStyle,
                  height: 12,
                  width: "50%",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {type === "list" && (
        <div style={listWrapStyle}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={listRowStyle}>
              <div
                style={{
                  ...pulseBlockStyle,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    ...pulseBlockStyle,
                    height: 14,
                    width: "60%",
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    ...pulseBlockStyle,
                    height: 12,
                    width: "40%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {type === "table" && (
        <div style={tableWrapStyle}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={tableRowStyle}>
              {Array.from({ length: 4 }).map((__, j) => (
                <div
                  key={j}
                  style={{
                    ...pulseBlockStyle,
                    height: 12,
                    flex: 1,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{pulseKeyframes}</style>
    </div>
  );
}

export { LoadingSkeleton };

const pulseKeyframes = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
`;

const pulseBlockStyle: React.CSSProperties = {
  background: "#e5e7eb",
  borderRadius: 6,
  animation: "pulse 1.5s ease-in-out infinite",
};

const cardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  height: 200,
};

const listWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const listRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 16,
  borderBottom: "1px solid #f3f4f6",
};

const tableWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const tableRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "10px 0",
};
