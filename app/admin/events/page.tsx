"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { resolveOrganizerFromEventData } from "@/lib/clientProfiles";

interface EventRow {
  id: string;
  title: string;
  organizerName?: string;
  organizerId?: string;
  organizerAvatarURL?: string;
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
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  // ── Fetch events ────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "events"));
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const organizer = await resolveOrganizerFromEventData(data);
          return {
            id: d.id,
            ...data,
            organizerId: organizer.id || data.organizerId || "",
            organizerName: organizer.name,
            organizerAvatarURL:
              organizer.avatarURL || data.organizerAvatarURL || "",
          } as EventRow;
        })
      );
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setEvents(rows);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      showToast("Failed to fetch events.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Approve ─────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    const confirmed = await confirm({
      title: "Approve Event",
      message: "Approve this event? It will be published to students.",
      confirmLabel: "Approve",
    });
    if (!confirmed) return;
    try {
      const eventRef = doc(db, "events", id);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        const ev = eventSnap.data();
        const organizer = await resolveOrganizerFromEventData(ev);
        const organizerId = organizer.id || ev.organizerId || "";
        const organizerAvatarURL = organizer.avatarURL || ev.organizerAvatarURL || "";

        await updateDoc(eventRef, {
          status: "published",
          organizerId,
          organizerName: organizer.name,
          organizerAvatarURL,
        });

        // Create new_event feed post
        await addDoc(collection(db, "feed-posts"), {
          type: "new_event",
          eventId: id,
          eventTitle: ev.title || "",
          eventDate: ev.date || "",
          organizerId,
          organizerName: organizer.name,
          organizerAvatarURL,
          pointValue: ev.pointValue || 0,
          coverURL: ev.coverURL || "",
          location: ev.location || "",
          maxParticipants: ev.maxParticipants || 0,
          currentParticipants: ev.currentParticipants || 0,
          eventDescription: ev.description || "",
          isPublic: true,
          createdAt: new Date().toISOString(),
        });
      }

      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "published" } : e))
      );
      showToast("Event approved and published.", "success");
    } catch (err) {
      console.error("Failed to approve event:", err);
      showToast("Failed to approve event.", "error");
    }
  };

  // ── Reject ──────────────────────────────────────────────────────────────
  const handleReject = async (id: string, reason: string) => {
    const note = reason.trim();
    try {
      await updateDoc(doc(db, "events", id), {
        status: "rejected",
        rejectionNote: note || "",
      });
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: "rejected", rejectionNote: note || "" }
            : e
        )
      );
      setRejectingId(null);
      setRejectionReason("");
      showToast("Event rejected.", "warning");
    } catch (err) {
      console.error("Failed to reject event:", err);
      showToast("Failed to reject event.", "error");
    }
  };

  const startReject = (id: string) => {
    setRejectingId(id);
    setRejectionReason("");
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectionReason("");
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
                <Fragment key={ev.id}>
                  <tr>
                    <td style={td}>{ev.title}</td>
                    <td style={td}>{ev.organizerName || "—"}</td>
                    <td style={td}>{ev.date || "—"}</td>
                    <td style={td}>{ev.location || "—"}</td>
                    <td style={td}>{ev.pointValue ?? "—"}</td>
                    <td style={td}>
                      <StatusBadge status={ev.status} />
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
                            onClick={() => startReject(ev.id)}
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
                  {rejectingId === ev.id && (
                    <tr>
                      <td colSpan={7} style={rejectRow}>
                        <div style={rejectInputWrap}>
                          <input
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            placeholder="Rejection reason"
                            style={rejectInput}
                          />
                          <button
                            type="button"
                            onClick={() => void handleReject(ev.id, rejectionReason)}
                            style={confirmRejectBtn}
                          >
                            Confirm Rejection
                          </button>
                          <button
                            type="button"
                            onClick={cancelReject}
                            style={cancelRejectBtn}
                            aria-label="Cancel rejection"
                          >
                            X
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
const approveBtn: React.CSSProperties = {
  padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600,
  background: "#246344", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", marginRight: 6,
};
const rejectBtn: React.CSSProperties = {
  padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600,
  background: "#fff", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: 4, cursor: "pointer",
};
const rejectRow: React.CSSProperties = {
  padding: "10px 14px",
  background: "#fff",
  borderBottom: "1px solid #f3f4f6",
};
const rejectInputWrap: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};
const rejectInput: React.CSSProperties = {
  border: "1px solid #fca5a5",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  width: "100%",
  outline: "none",
};
const confirmRejectBtn: React.CSSProperties = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const cancelRejectBtn: React.CSSProperties = {
  background: "#fff",
  color: "#b91c1c",
  border: "1px solid #fca5a5",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
};
