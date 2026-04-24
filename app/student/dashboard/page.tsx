"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db }       from "@/lib/firebase";
import { useAuth }  from "@/hooks/useAuth";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface UpcomingEvent {
  eventId: string;
  title: string;
  date: string;
  location: string;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function StudentDashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const [fullName, setFullName]             = useState("");
  const [totalPoints, setTotalPoints]       = useState<number | null>(null);
  const [eventsAttended, setEventsAttended] = useState<number | null>(null);
  const [certsEarned, setCertsEarned]       = useState<number | null>(null);
  const [upcoming, setUpcoming]             = useState<UpcomingEvent[]>([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchDashboard() {
      try {
        const uid = user!.uid;

        const [userSnap, attendedSnap, certsSnap, appliedSnap] =
          await Promise.all([
            // 1. User doc
            getDoc(doc(db, "users", uid)),
            // 2. Attended participations
            getDocs(
              query(
                collection(db, "participations"),
                where("userId", "==", uid),
                where("attendanceConfirmed", "==", true)
              )
            ),
            // 3. Certificates
            getDocs(
              query(
                collection(db, "certificates"),
                where("uid", "==", uid)
              )
            ),
            // 4. Applied participations (for upcoming)
            getDocs(
              query(
                collection(db, "participations"),
                where("userId", "==", uid),
                where("status", "==", "applied")
              )
            ),
          ]);

        // User info
        if (userSnap.exists()) {
          const u = userSnap.data();
          setFullName(u.fullName ?? "Student");
          setTotalPoints(u.points ?? 0);
        }

        setEventsAttended(attendedSnap.size);
        setCertsEarned(certsSnap.size);

        // Upcoming events — fetch each event doc
        const today = new Date().toISOString().split("T")[0];
        const upcomingRows: UpcomingEvent[] = [];

        for (const pDoc of appliedSnap.docs) {
          const p = pDoc.data();
          try {
            const evSnap = await getDoc(doc(db, "events", p.eventId));
            if (evSnap.exists()) {
              const ev = evSnap.data();
              if (ev.date && ev.date >= today) {
                upcomingRows.push({
                  eventId:  p.eventId,
                  title:    ev.title    ?? "Untitled",
                  date:     ev.date,
                  location: ev.location ?? "—",
                });
              }
            }
          } catch {
            /* skip individual failures */
          }
        }

        // Sort ascending by date, take first 5
        upcomingRows.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setUpcoming(upcomingRows.slice(0, 5));
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user, authLoading]);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  if (loading || authLoading) {
    return (
      <div style={page}>
        <p style={{ color: "#9ca3af" }}>Loading…</p>
      </div>
    );
  }

  const cards = [
    { label: "Total Points",        value: totalPoints,    icon: "⭐" },
    { label: "Events Attended",     value: eventsAttended, icon: "📋" },
    { label: "Certificates Earned", value: certsEarned,    icon: "🏆" },
  ];

  return (
    <div style={page}>
      {/* Welcome */}
      <h1 style={heading}>Welcome back, {fullName}!</h1>
      <p style={sub}>Here&apos;s a quick overview of your activity</p>

      {/* Stat cards */}
      <div style={grid}>
        {cards.map((c) => (
          <div key={c.label} style={cardStyle}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{c.icon}</div>
            <p style={cardLabel}>{c.label}</p>
            {c.value !== null ? (
              <p style={cardValue}>{c.value}</p>
            ) : (
              <p style={loadingVal}>—</p>
            )}
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <h2 style={sectionTitle}>Upcoming Events</h2>

      {upcoming.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: "#6b7280", margin: 0 }}>
            You have no upcoming events. Discover events to get started.
          </p>
        </div>
      ) : (
        <div style={listWrap}>
          {upcoming.map((ev) => (
            <div key={ev.eventId} style={eventRow}>
              <div>
                <p style={eventTitle}>{ev.title}</p>
                <p style={eventMeta}>
                  {ev.date} · {ev.location}
                </p>
              </div>
              <span style={appliedChip}>Applied</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */

const page: React.CSSProperties = {
  flex: 1,
  padding: "2.5rem 2rem",
  background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  minHeight: "100vh",
  overflowY: "auto",
};

const heading: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 0.25rem",
};

const sub: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#6b7280",
  margin: "0 0 2rem",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "1.25rem",
  marginBottom: "2.5rem",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.5rem",
  transition: "box-shadow 0.2s",
};

const cardLabel: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "0 0 0.5rem",
};

const cardValue: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 700,
  color: "#246344",
  margin: 0,
};

const loadingVal: React.CSSProperties = {
  fontSize: "1rem",
  color: "#9ca3af",
  margin: 0,
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 1rem",
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "3rem",
  textAlign: "center",
};

const listWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const eventRow: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1rem 1.25rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const eventTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.92rem",
  color: "#111827",
  margin: "0 0 4px",
};

const eventMeta: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#6b7280",
  margin: 0,
};

const appliedChip: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: "0.76rem",
  fontWeight: 600,
  background: "rgba(36,99,68,0.10)",
  color: "#246344",
  textTransform: "capitalize",
};
