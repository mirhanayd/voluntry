"use client";

import React from "react";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: EmptyStateAction;
}

export default function EmptyState({
  emoji,
  title,
  subtitle,
  action,
}: EmptyStateProps) {
  return (
    <div style={wrapperStyle}>
      <div style={emojiStyle}>{emoji}</div>
      <div style={titleStyle}>{title}</div>
      {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
      {action &&
        (action.href ? (
          <Link href={action.href} style={actionStyle}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} style={actionStyle}>
            {action.label}
          </button>
        ))}
    </div>
  );
}

export { EmptyState };

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "48px 24px",
  textAlign: "center",
};

const emojiStyle: React.CSSProperties = {
  fontSize: 48,
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#374151",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  marginTop: 4,
};

const actionStyle: React.CSSProperties = {
  background: "#246344",
  color: "#ffffff",
  borderRadius: 8,
  padding: "10px 20px",
  marginTop: 16,
  fontSize: 14,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  display: "inline-block",
};
