"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  rightContent,
}: PageHeaderProps) {
  return (
    <div style={containerStyle}>
      <div>
        <h1 style={titleStyle}>{title}</h1>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
}

export { PageHeader };

const containerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  margin: "4px 0 0",
};
