"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface EventRow {
  id: string;
  title: string;
  organizer: string;
  date: string;
  location: string;
  pointValue: number;
  status: string;
  rejectionNote?: string;
}

type Filter = "pending_approval" | "published" | "rejected" | "all";

export default function EventAuditPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending_approval");

  // ── Fetch events ────────────────────────────────────────────────────────
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "events"));
      const rows = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as EventRow)
      );
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setEvents(rows);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // ── Approve ─────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    if (!confirm("Approve this event? It will be published to students."))
      return;
    try {
      await updateDoc(doc(db, "events", id), { status: "published" });
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "published" } : e))
      );
    } catch (err) {
      console.error("Failed to approve event:", err);
    }
  };

  // ── Reject ──────────────────────────────────────────────────────────────
  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return; // cancelled
    try {
      await updateDoc(doc(db, "events", id), {
        status: "rejected",
        rejectionNote: reason || "",
      });
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: "rejected", rejectionNote: reason || "" }
            : e
        )
      );
    } catch (err) {
      console.error("Failed to reject event:", err);
    }
  };

  // ── Filtered list ───────────────────────────────────────────────────────
  const visible =
    filter === "all" ? events : events.filter((e) => e.status === filter);

  const pendingCount = events.filter(
    (e) => e.status === "pending_approval"
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={page}>
      <h1 style={heading}>Event Audit</h1>
      <p style={sub}>Review, approve, or reject event submissions</p>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        {(
          [
            ["pending_approval", "Pending"],
            ["published", "Published"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              ...filterBtn,
              background: filter === key ? "#246344" : "#fff",
              color: filter === key ? "#fff" : "#374151",
              border:
                filter === key
                  ? "1px solid #246344"
                  : "1px solid #d1d5db",
            }}
          >
            {label}
            {key === "pending_approval" && pendingCount > 0 && (
              <span style={badge}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : visible.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No events found.</p>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {[
                  "Title",
                  "Organizer",
                  "Date",
                  "Location",
                  "Points",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((ev) => (
                <tr key={ev.id}>
                  <td style={td}>{ev.title}</td>
                  <td style={td}>{ev.organizer || "—"}</td>
                  <td style={td}>{ev.date || "—"}</td>
                  <td style={td}>{ev.location || "—"}</td>
                  <td style={td}>{ev.pointValue ?? "—"}</td>
                  <td style={td}>
                    <span
                      style={{
                        ...chip,
                        background:
                          ev.status === "published"
                            ? "rgba(36,99,68,0.1)"
                            : ev.status === "rejected"
                            ? "rgba(185,28,28,0.08)"
                            : "rgba(234,179,8,0.12)",
                        color:
                          ev.status === "published"
                            ? "#246344"
                            : ev.status === "rejected"
                            ? "#b91c1c"
                            : "#92400e",
                      }}
                    >
                      {ev.status === "pending_approval"
                        ? "Pending"
                        : ev.status}
                    </span>
                    {ev.status === "rejected" && ev.rejectionNote && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#9ca3af",
                          marginTop: 2,
                        }}
                      >
                        Note: {ev.rejectionNote}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {ev.status === "pending_approval" && (
                      <>
                        <button
                          onClick={() => handleApprove(ev.id)}
                          style={approveBtn}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(ev.id)}
                          style={rejectBtn}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {ev.status !== "pending_approval" && (
                      <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const page: React.CSSProperties = {
  flex: 1, padding: "2.5rem 2rem", background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", minHeight: "100vh", overflowX: "auto",
};
const heading: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 4px" };
const sub: React.CSSProperties = { fontSize: "0.88rem", color: "#6b7280", margin: "0 0 1.5rem" };
const filterBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: "0.82rem", fontWeight: 500, borderRadius: 6, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
};
const badge: React.CSSProperties = {
  background: "#fff", color: "#246344", fontSize: "0.72rem", fontWeight: 700, borderRadius: 10, padding: "1px 7px",
};
const tableWrap: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflowX: "auto" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" };
const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: "0.76rem",
  color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #f3f4f6", color: "#111827" };
const chip: React.CSSProperties = {
  display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.76rem", fontWeight: 600, textTransform: "capitalize",
};
const approveBtn: React.CSSProperties = {
  padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600,
  background: "#246344", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", marginRight: 6,
};
const rejectBtn: React.CSSProperties = {
  padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600,
  background: "#fff", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: 4, cursor: "pointer",
};
