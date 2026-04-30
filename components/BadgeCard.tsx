"use client";

import React from "react";

/* ── Badge config ────────────────────────────────────────────────────────────── */

type BadgeType = "starter" | "active" | "champion";

interface BadgeConfig {
  label: string;
  description: string;
  requirement: number;
  color: string;
  bgColor: string;
  svgPath: string;
}

const BADGES: Record<BadgeType, BadgeConfig> = {
  starter: {
    label: "Starter",
    description: "Complete your first event",
    requirement: 1,
    color: "#f59e0b",
    bgColor: "#fef3c7",
    svgPath: "/badges/starter.svg",
  },
  active: {
    label: "Active Volunteer",
    description: "Complete 5 events",
    requirement: 5,
    color: "#3b82f6",
    bgColor: "#dbeafe",
    svgPath: "/badges/active.svg",
  },
  champion: {
    label: "Champion",
    description: "Complete 10 events",
    requirement: 10,
    color: "#8b5cf6",
    bgColor: "#faf5ff",
    svgPath: "/badges/champion.svg",
  },
};

/* ── Props ───────────────────────────────────────────────────────────────────── */

interface BadgeCardProps {
  badge: BadgeType;
  earned: boolean;
  currentCount: number;
}

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function BadgeCard({ badge, earned, currentCount }: BadgeCardProps) {
  const cfg = BADGES[badge];
  const progress = Math.min(currentCount / cfg.requirement, 1);

  return (
    <div
      style={{
        ...card,
        boxShadow: earned
          ? `0 0 0 3px ${cfg.color}33`
          : "none",
      }}
    >
      {/* Badge image */}
      <img
        src={cfg.svgPath}
        alt={cfg.label}
        style={{
          width: 80,
          height: 80,
          marginBottom: 12,
          filter: earned ? "none" : "grayscale(100%) opacity(0.4)",
          transition: "filter 0.3s",
        }}
      />

      {/* Label */}
      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 700,
          color: earned ? cfg.color : "#9ca3af",
        }}
      >
        {cfg.label}
      </p>

      {/* Description */}
      <p style={descStyle}>{cfg.description}</p>

      {/* Earned / Progress */}
      {earned ? (
        <span
          style={{
            ...earnedBadge,
            background: cfg.bgColor,
            color: cfg.color,
            border: `1px solid ${cfg.color}`,
          }}
        >
          ✓ Earned
        </span>
      ) : (
        <div style={progressWrapper}>
          <p style={progressText}>
            {currentCount} / {cfg.requirement} events
          </p>
          <div style={progressBarBg}>
            <div
              style={{
                height: 6,
                borderRadius: 4,
                background: cfg.color,
                width: `${progress * 100}%`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
  minWidth: 0,
  transition: "box-shadow 0.3s",
};

const descStyle: React.CSSProperties = {
  margin: "4px 0 12px",
  fontSize: 12,
  color: "#9ca3af",
};

const earnedBadge: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 12,
  padding: "3px 12px",
};

const progressWrapper: React.CSSProperties = {
  width: "100%",
};

const progressText: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: 12,
  color: "#6b7280",
};

const progressBarBg: React.CSSProperties = {
  width: "100%",
  height: 6,
  borderRadius: 4,
  background: "#e5e7eb",
  overflow: "hidden",
};
