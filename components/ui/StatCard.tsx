"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  color,
}: StatCardProps) {
  return (
    <div style={cardStyle}>
      <div style={labelRowStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <span style={labelStyle}>{label}</span>
      </div>
      <div style={{ ...valueStyle, color: color || "#111827" }}>{value}</div>
    </div>
  );
}

export { StatCard };

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 20,
};

const labelRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

const iconStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "#111827",
};
