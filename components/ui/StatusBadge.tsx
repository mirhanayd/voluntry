"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
}

interface StatusConfig {
  label: string;
  bg: string;
  color: string;
  border: string;
}

function getStatusConfig(status: string): StatusConfig {
  const key = status.toLowerCase();

  if (key === "pending" || key === "applied") {
    return {
      label: "Pending",
      bg: "#fffbeb",
      color: "#92400e",
      border: "#fcd34d",
    };
  }

  if (key === "approved") {
    return {
      label: "Approved",
      bg: "#f0faf5",
      color: "#166534",
      border: "#86efac",
    };
  }

  if (key === "published") {
    return {
      label: "Published",
      bg: "#f0faf5",
      color: "#166534",
      border: "#86efac",
    };
  }

  if (key === "rejected") {
    return {
      label: "Rejected",
      bg: "#fef2f2",
      color: "#b91c1c",
      border: "#fca5a5",
    };
  }

  if (key === "completed") {
    return {
      label: "Completed ✓",
      bg: "#f0faf5",
      color: "#246344",
      border: "#246344",
    };
  }

  if (key === "pending_approval") {
    return {
      label: "Pending Approval",
      bg: "#fffbeb",
      color: "#92400e",
      border: "#fcd34d",
    };
  }

  if (key === "active") {
    return {
      label: "Active",
      bg: "#dbeafe",
      color: "#1e40af",
      border: "#93c5fd",
    };
  }

  return {
    label: status,
    bg: "#f3f4f6",
    color: "#374151",
    border: "#d1d5db",
  };
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const badge = getStatusConfig(status);

  return (
    <span
      style={{
        ...badgeStyle,
        background: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.border}`,
      }}
    >
      {badge.label}
    </span>
  );
}

export { StatusBadge };

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "3px 10px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap",
};
