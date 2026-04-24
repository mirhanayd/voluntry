"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface EventRow {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  currentParticipants?: number;
  maxParticipants?: number;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  pending_approval: { bg: "rgba(234,179,8,0.12)", color: "#92400e" },
  published: { bg: "rgba(36,99,68,0.1)", color: "#246344" },
  rejected: { bg: "rgba(239,68,68,0.1)", color: "#b91c1c" },
  completed: { bg: "rgba(107,114,128,0.1)", color: "#374151" },
};

export default function OrganizerEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchEvents() {
      try {
        const snap = await getDocs(
          query(
            collection(db, "events"),
            where("organizerId", "==", user!.uid)
          )
        );
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as EventRow)
        );
        rows.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEvents(rows);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [user, authLoading]);

  return (
    <div style={page}>
      <div style={headerRow}>
        <div>
          <h1 style={heading}>My Events</h1>
          <p style={sub}>All events you have created</p>
        </div>
        <Link href="/organizer/events/create" style={createBtn}>
          + Create Event
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : events.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: "#6b7280", margin: 0 }}>
            You haven&apos;t created any events yet.
          </p>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {["Title", "Date", "Location", "Participants", "Status", "Actions"].map(
                  (h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const sc = statusColors[ev.status] || statusColors.completed;
                return (
                  <tr key={ev.id}>
                    <td style={td}>{ev.title}</td>
                    <td style={td}>{ev.date}</td>
                    <td style={td}>{ev.location}</td>
                    <td style={td}>
                      {ev.currentParticipants ?? 0}/{ev.maxParticipants ?? "—"}
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          ...statusChip,
                          background: sc.bg,
                          color: sc.color,
                        }}
                      >
                        {ev.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <Link
                        href={`/organizer/events/${ev.id}/participants`}
                        style={viewBtn}
                      >
                        View Participants
                      </Link>
                      <Link
                        href={`/organizer/events/${ev.id}/feedback`}
                        style={{ ...viewBtn, marginLeft: 8 }}
                      >
                        Feedback
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */

const page: React.CSSProperties = {
  flex: 1,
  padding: "2.5rem 2rem",
  background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  minHeight: "100vh",
  overflowX: "auto",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "1.5rem",
  flexWrap: "wrap",
  gap: 12,
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
  margin: 0,
};

const createBtn: React.CSSProperties = {
  padding: "8px 18px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "#246344",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  textDecoration: "none",
  cursor: "pointer",
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "3rem",
  textAlign: "center",
};

const tableWrap: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflowX: "auto",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.84rem",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontWeight: 600,
  fontSize: "0.76rem",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
};

const statusChip: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: "0.76rem",
  fontWeight: 600,
  textTransform: "capitalize",
};

const viewBtn: React.CSSProperties = {
  padding: "4px 12px",
  fontSize: "0.78rem",
  fontWeight: 600,
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #d1fae5",
  borderRadius: 4,
  cursor: "pointer",
  textDecoration: "none",
};
