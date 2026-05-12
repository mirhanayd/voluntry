"use client";

import { useEffect, useState } from "react";
import { useParams }            from "next/navigation";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db }                          from "@/lib/firebase";
import { awardPoints, generateCertificate } from "@/lib/pointsHelper";
import ImageUpload from "@/components/ImageUpload";
import { resolveOrganizerFromEventData } from "@/lib/clientProfiles";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface EventData {
  title: string;
  date: string;
  pointValue: number;
  status: string;
  organizerName?: string;
  organizerId?: string;
  organizerAvatarURL?: string;
}

interface ParticipantRow {
  participationId: string;
  userId: string;
  fullName: string;
  departmentName: string;
  studentNumber: string;
  appliedDate: string;
  attendanceConfirmed: boolean;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function ParticipantsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent]             = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState(false);
  const [successMsg, setSuccessMsg]   = useState("");
  const [errorMsg, setErrorMsg]       = useState("");

  const [shareNote, setShareNote] = useState("");
  const [sharePhotos, setSharePhotos] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  /* ── Fetch event + participants ─────────────────────────────────────────── */

  useEffect(() => {
    if (!eventId) return;

    async function fetchData() {
      try {
        // Event
        const eventSnap = await getDoc(doc(db, "events", eventId));
        if (!eventSnap.exists()) {
          setErrorMsg("Event not found.");
          setLoading(false);
          return;
        }
        const rawEventData = eventSnap.data() as EventData;
        const organizer = await resolveOrganizerFromEventData(rawEventData);
        const evData: EventData = {
          ...rawEventData,
          organizerId: organizer.id || rawEventData.organizerId,
          organizerName: organizer.name,
          organizerAvatarURL:
            organizer.avatarURL || rawEventData.organizerAvatarURL || "",
        };
        setEvent(evData);

        // Participations
        const partSnap = await getDocs(
          query(
            collection(db, "participations"),
            where("eventId", "==", eventId)
          )
        );

        const rows: ParticipantRow[] = [];

        for (const partDoc of partSnap.docs) {
          const p = partDoc.data();
          // Fetch user info
          let fullName       = "Unknown";
          let departmentName = "—";
          let studentNumber  = "—";

          try {
            const userSnap = await getDoc(doc(db, "users", p.userId));
            if (userSnap.exists()) {
              const u        = userSnap.data();
              fullName       = u.fullName       ?? "Unknown";
              departmentName = u.departmentName ?? "—";
              studentNumber  = u.studentNumber  ?? "—";
            }
          } catch {
            /* ignore individual user-fetch errors */
          }

          rows.push({
            participationId:   partDoc.id,
            userId:            p.userId,
            fullName,
            departmentName,
            studentNumber,
            appliedDate:       p.appliedDate ?? p.createdAt ?? "—",
            attendanceConfirmed: p.attendanceConfirmed ?? false,
          });
        }

        setParticipants(rows);
      } catch (err) {
        console.error("Failed to load participants:", err);
        setErrorMsg("Failed to load participants.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [eventId]);

  /* ── Select / deselect helpers ──────────────────────────────────────────── */

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === participants.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(participants.map((p) => p.userId)));
    }
  };

  /* ── Mark as completed ──────────────────────────────────────────────────── */

  const handleMarkCompleted = async () => {
    try {
      await updateDoc(doc(db, "events", eventId), { status: "completed" });
      setEvent((prev) => (prev ? { ...prev, status: "completed" } : prev));
      setSuccessMsg("Event marked as completed.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to mark event as completed.");
    }
  };

  /* ── Confirm attendance & distribute points / certificates ──────────────── */

  const handleDistribute = async () => {
    if (selected.size === 0) {
      setErrorMsg("Please select at least one student.");
      return;
    }
    if (!event) return;

    setProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      for (const uid of selected) {
        await awardPoints(uid, eventId, event.pointValue);
        await generateCertificate(uid, eventId);
      }

      setSuccessMsg(
        `Points and certificates have been distributed to ${selected.size} student${selected.size > 1 ? "s" : ""}.`
      );
      setSelected(new Set());

      // Refresh attendance flags
      setParticipants((prev) =>
        prev.map((p) =>
          selected.has(p.userId) ? { ...p, attendanceConfirmed: true } : p
        )
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while distributing points. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  /* ── Share to Feed ──────────────────────────────────────────────────────── */

  const handleShareToFeed = async () => {
    if (!event) return;
    setSharing(true);
    setErrorMsg("");
    try {
      const confirmedCount = participants.filter((p) => p.attendanceConfirmed).length;
      await addDoc(collection(db, "feed-posts"), {
        type: "event_completed",
        eventId,
        eventTitle: event.title,
        eventDate: event.date,
        organizerName: event.organizerName || "Organization",
        organizerId: event.organizerId || "",
        organizerAvatarURL: event.organizerAvatarURL || "",
        pointValue: event.pointValue,
        participantCount: confirmedCount,
        completionNote: shareNote.trim(),
        photoURLs: sharePhotos,
        isPublic: true,
        createdAt: new Date().toISOString(),
      });
      setShared(true);
      setSuccessMsg("Successfully shared to the community feed!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to share to feed.");
    } finally {
      setSharing(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={page}>
        <p style={{ color: "#9ca3af" }}>Loading participants…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={page}>
        <p style={{ color: "#b91c1c" }}>{errorMsg || "Event not found."}</p>
      </div>
    );
  }

  const isCompleted  = event.status === "completed";
  const isPublished  = event.status === "published";

  return (
    <div style={page}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={headerRow}>
        <div>
          <h1 style={heading}>Participants</h1>
          <p style={sub}>
            {event.title} — {event.date}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isPublished && (
            <button onClick={handleMarkCompleted} style={completeBtn}>
              Mark as Completed
            </button>
          )}

          {isCompleted && (
            <button
              onClick={handleDistribute}
              disabled={processing || selected.size === 0}
              style={{
                ...distributeBtn,
                opacity: processing || selected.size === 0 ? 0.6 : 1,
                cursor:
                  processing || selected.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              {processing
                ? "Distributing…"
                : `Confirm Attendance & Distribute Points (${selected.size})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      {successMsg && <div style={successBox}>{successMsg}</div>}
      {errorMsg   && <div style={errorBox}>{errorMsg}</div>}

      {!isCompleted && (
        <div style={infoBanner}>
          ℹ️ Attendance confirmation will be available once the event is marked as
          completed.
        </div>
      )}

      {/* ── Share to Feed ── */}
      {isCompleted && !shared && (
        <div style={shareBox}>
          <h3 style={shareTitle}>Share to Feed</h3>
          <p style={shareSub}>Let students know how the event went! Add a note and some photos.</p>
          
          <textarea
            style={shareTextarea}
            placeholder="Write a short note about the event... (e.g. Thanks to all 50 volunteers who showed up today!)"
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
          />

          <div style={sharePhotosWrap}>
            {sharePhotos.map((url, i) => (
              <img key={i} src={url} alt={`Upload ${i}`} style={sharePhotoImg} />
            ))}
            
            {sharePhotos.length < 3 && (
              <div style={{ width: 100, height: 100 }}>
                <ImageUpload
                  shape="square"
                  size={100}
                  storagePath={`events/${eventId}/feed_${Date.now()}.jpg`}
                  onUploadComplete={(url) => setSharePhotos((p) => [...p, url])}
                />
              </div>
            )}
          </div>

          <button 
            style={{...shareBtn, opacity: sharing ? 0.7 : 1}} 
            disabled={sharing}
            onClick={handleShareToFeed}
          >
            {sharing ? "Sharing..." : "Post to Feed"}
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {participants.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: "#6b7280", margin: 0 }}>
            No participants have applied for this event yet.
          </p>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {isCompleted && (
                  <th style={th}>
                    <input
                      type="checkbox"
                      checked={selected.size === participants.length}
                      onChange={toggleAll}
                      style={{ accentColor: "#246344" }}
                    />
                  </th>
                )}
                {["Full Name", "Department", "Student Number", "Applied Date", "Attendance Status"].map(
                  (h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.participationId}>
                  {isCompleted && (
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.userId)}
                        onChange={() => toggleSelect(p.userId)}
                        disabled={p.attendanceConfirmed}
                        style={{ accentColor: "#246344" }}
                      />
                    </td>
                  )}
                  <td style={td}>{p.fullName}</td>
                  <td style={td}>{p.departmentName}</td>
                  <td style={td}>{p.studentNumber}</td>
                  <td style={td}>{p.appliedDate}</td>
                  <td style={td}>
                    <span
                      style={{
                        ...statusChip,
                        background: p.attendanceConfirmed
                          ? "rgba(36,99,68,0.10)"
                          : "rgba(234,179,8,0.12)",
                        color: p.attendanceConfirmed ? "#246344" : "#92400e",
                      }}
                    >
                      {p.attendanceConfirmed ? "Confirmed" : "Pending"}
                    </span>
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

/* ── Styles ───────────────────────────────────────────────────────────────── */

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

const completeBtn: React.CSSProperties = {
  padding: "8px 18px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "#374151",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const distributeBtn: React.CSSProperties = {
  padding: "8px 18px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "#246344",
  color: "#fff",
  border: "none",
  borderRadius: 6,
};

const successBox: React.CSSProperties = {
  background: "#f0faf5",
  border: "1px solid #86efac",
  color: "#246344",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: "0.85rem",
  marginBottom: "1rem",
  fontWeight: 500,
};

const errorBox: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  color: "#b91c1c",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: "0.85rem",
  marginBottom: "1rem",
};

const infoBanner: React.CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e40af",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: "0.85rem",
  marginBottom: "1rem",
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

const shareBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.5rem",
  marginBottom: "1.5rem",
};

const shareTitle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 4px",
};

const shareSub: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#6b7280",
  margin: "0 0 1rem",
};

const shareTextarea: React.CSSProperties = {
  width: "100%",
  minHeight: 80,
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: "0.9rem",
  fontFamily: "inherit",
  marginBottom: 12,
  resize: "vertical",
  boxSizing: "border-box",
};

const sharePhotosWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 16,
  flexWrap: "wrap",
};

const sharePhotoImg: React.CSSProperties = {
  width: 100,
  height: 100,
  objectFit: "cover",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
};

const shareBtn: React.CSSProperties = {
  padding: "8px 18px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
