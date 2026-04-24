"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Stats {
  totalEvents: number | null;
  totalVolunteerHours: number | null;
  distributedRewards: number | null;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({
    totalEvents: null,
    totalVolunteerHours: null,
    distributedRewards: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [eventsSnap, participationsSnap, rewardsSnap] =
          await Promise.all([
            getDocs(collection(db, "events")),
            getDocs(collection(db, "participations")),
            getDocs(collection(db, "rewards")),
          ]);

        // Sum hours from participations (fallback to 0 if field missing)
        let totalHours = 0;
        participationsSnap.docs.forEach((d) => {
          const data = d.data();
          totalHours += data.hours || data.volunteerHours || 0;
        });

        setStats({
          totalEvents: eventsSnap.size,
          totalVolunteerHours: totalHours,
          distributedRewards: rewardsSnap.size,
        });
      } catch (err) {
        console.error("Failed to fetch report stats:", err);
      }
    }

    fetchStats();
  }, []);

  const cards = [
    { label: "Total Events", value: stats.totalEvents },
    { label: "Total Volunteer Hours", value: stats.totalVolunteerHours },
    { label: "Distributed Rewards", value: stats.distributedRewards },
  ];

  return (
    <div style={page}>
      <h1 style={heading}>Reports</h1>
      <p style={sub}>Platform-wide statistics at a glance</p>

      <div style={grid}>
        {cards.map((card) => (
          <div key={card.label} style={cardStyle}>
            <p style={cardLabel}>{card.label}</p>
            {card.value !== null ? (
              <p style={cardValue}>{card.value}</p>
            ) : (
              <p style={loadingValue}>Loading...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const page: React.CSSProperties = {
  flex: 1, padding: "2.5rem 2rem", background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", minHeight: "100vh",
};
const heading: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 4px" };
const sub: React.CSSProperties = { fontSize: "0.88rem", color: "#6b7280", margin: "0 0 2rem" };
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem",
};
const cardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem", transition: "box-shadow 0.2s",
};
const cardLabel: React.CSSProperties = {
  fontSize: "0.78rem", fontWeight: 600, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem",
};
const cardValue: React.CSSProperties = { fontSize: "2rem", fontWeight: 700, color: "#246344", margin: 0 };
const loadingValue: React.CSSProperties = { fontSize: "1rem", color: "#9ca3af", margin: 0 };
