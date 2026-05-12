"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";

/* ── Types ───────────────────────────────────────────────────────────────────── */

interface EventData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  pointValue: number;
  organizerName: string;
  departmentRestriction: string[];
  coverURL: string;
  galleryURLs: string[];
}

type ApplyState = "can_apply" | "already_applied" | "event_full";

/* ── Date formatter ──────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(t: string): string {
  if (!t) return "";
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return t;
  }
}

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applyState, setApplyState] = useState<ApplyState>("can_apply");
  const [applying, setApplying] = useState(false);

  /* ── Fetch event document ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (!eventId) return;

    async function fetchEvent() {
      try {
        const snap = await getDoc(doc(db, "events", eventId));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          const d = snap.data();
          setEvent({
            title: d.title ?? "",
            description: d.description ?? "",
            date: d.date ?? "",
            time: d.time ?? "",
            location: d.location ?? "",
            maxParticipants: d.maxParticipants ?? 0,
            currentParticipants: d.currentParticipants ?? 0,
            pointValue: d.pointValue ?? 0,
            organizerName: d.organizerName ?? "",
            departmentRestriction: d.departmentRestriction ?? [],
            coverURL: d.coverURL ?? "",
            galleryURLs: d.galleryURLs ?? [],
          });
        }
      } catch (err) {
        console.error("Event fetch error:", err);
        showToast("Failed to load event details.", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /* ── Check participation status ────────────────────────────────────────────── */

  useEffect(() => {
    if (authLoading || !user || !event) return;



    async function checkParticipation() {
      try {
        const q = query(
          collection(db, "participations"),
          where("userId", "==", user!.uid),
          where("eventId", "==", eventId)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          setApplyState("already_applied");
        } else if (event!.currentParticipants >= event!.maxParticipants) {
          setApplyState("event_full");
        } else {
          setApplyState("can_apply");
        }
      } catch (err) {
        console.error("Participation check error:", err);
      }
    }

    checkParticipation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, event]);

  /* ── Apply handler ─────────────────────────────────────────────────────────── */

  const handleApply = async () => {
    if (!user || !event || applying) return;



    setApplying(true);
    try {
      // Double-check: already applied?
      const q = query(
        collection(db, "participations"),
        where("userId", "==", user.uid),
        where("eventId", "==", eventId)
      );
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        showToast("You have already applied for this event.", "info");
        setApplyState("already_applied");
        return;
      }

      // Double-check: event full?
      if (event.currentParticipants >= event.maxParticipants) {
        showToast("This event is full.", "error");
        setApplyState("event_full");
        return;
      }

      // Write participation document
      await addDoc(collection(db, "participations"), {
        userId: user.uid,
        eventId,
        status: "applied",
        attendanceConfirmed: false,
        appliedAt: new Date().toISOString(),
      });

      // Increment participant count on the event
      await updateDoc(doc(db, "events", eventId), {
        currentParticipants: increment(1),
      });

      // Update local state
      setEvent((prev) =>
        prev ? { ...prev, currentParticipants: prev.currentParticipants + 1 } : prev
      );
      setApplyState("already_applied");
      showToast("Your application has been submitted! ✓", "success");
    } catch (err) {
      console.error("Apply error:", err);
      showToast("Failed to submit application. Please try again.", "error");
    } finally {
      setApplying(false);
    }
  };

  /* ── Loading state ─────────────────────────────────────────────────────────── */

  if (loading || authLoading) {
    return (
      <main style={mainArea}>
        <div style={skeletonCover} />
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px" }}>
          <div style={{ ...skeletonLine, width: "60%", height: 28 }} />
          <div style={{ ...skeletonLine, width: "30%", height: 16, marginTop: 8 }} />
          <div style={{ ...skeletonLine, width: "100%", height: 120, marginTop: 24 }} />
        </div>
        <style>{pulseKeyframes}</style>
      </main>
    );
  }

  /* ── Not found state ───────────────────────────────────────────────────────── */

  if (notFound || !event) {
    return (
      <main style={mainArea}>
        <div style={notFoundWrapper}>
          <span style={{ fontSize: 48 }}>🔍</span>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "12px 0 4px" }}>
            Event not found
          </p>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
            This event may have been removed or does not exist.
          </p>
          <button
            onClick={() => router.push("/student/events")}
            style={backBtnPrimary}
          >
            ← Back to Events
          </button>
        </div>
      </main>
    );
  }

  /* ── Determine department restrictions display ─────────────────────────────── */

  const hasRestrictions =
    event.departmentRestriction.length > 0 &&
    !(event.departmentRestriction.length === 1 && event.departmentRestriction[0] === "All");

  const hasCover =
    typeof event.coverURL === "string" && event.coverURL.trim() !== "";

  const hasGallery =
    Array.isArray(event.galleryURLs) && event.galleryURLs.length > 0;

  /* ── Render ────────────────────────────────────────────────────────────────── */

  return (
    <main style={mainArea}>
      {/* Cover image */}
      <div style={{ position: "relative" }}>
        {hasCover ? (
          <img
            src={event.coverURL}
            alt={event.title}
            style={coverImage}
          />
        ) : (
          <div style={coverPlaceholder}>
            <span style={{ fontSize: 56 }}>📅</span>
          </div>
        )}

        {/* Back button overlay */}
        <button
          onClick={() => router.push("/student/events")}
          style={backBtnOverlay}
        >
          ← Back to Events
        </button>
      </div>

      {/* Main content */}
      <div style={contentWrapper}>
        <div className="event-detail-layout">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div style={leftCol}>
            <h1 style={titleStyle}>{event.title}</h1>
            <p style={organizerLine}>by {event.organizerName}</p>

            {/* Info row */}
            <div style={infoRow}>
              <span style={infoItem}>
                📅 {formatDate(event.date)}{event.time ? ` at ${formatTime(event.time)}` : ""}
              </span>
              <span style={infoItem}>📍 {event.location}</span>
            </div>

            {/* Participants */}
            <p style={participantsText}>
              {event.currentParticipants} / {event.maxParticipants} participants
            </p>

            {/* Department restrictions */}
            {hasRestrictions && (
              <div style={restrictionRow}>
                <span style={restrictionLabel}>Open to:</span>
                {event.departmentRestriction.map((dept) => (
                  <span key={dept} style={deptTag}>
                    {dept}
                  </span>
                ))}
              </div>
            )}

            {/* Divider */}
            <hr style={divider} />

            {/* Description */}
            <p style={descriptionStyle}>{event.description}</p>
          </div>

          {/* ── Right column (sidebar card) ─────────────────────────────── */}
          <div className="event-detail-sidebar">
            <div style={sideCard}>
              {/* Points */}
              <p style={pointsLarge}>+{event.pointValue} pts</p>
              <p style={pointsSub}>Points earned upon completion</p>

              <hr style={divider} />

              {/* Apply button */}
              {applyState === "already_applied" && (
                <button disabled style={btnApplied}>
                  Application Submitted ✓
                </button>
              )}
              {applyState === "event_full" && (
                <button disabled style={btnFull}>
                  Event is Full
                </button>
              )}

              {applyState === "can_apply" && (
                <button
                  style={{
                    ...btnApply,
                    opacity: applying ? 0.7 : 1,
                    cursor: applying ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  disabled={applying}
                  onClick={handleApply}
                  onMouseEnter={(e) => {
                    if (!applying) e.currentTarget.style.background = "#1a4a32";
                  }}
                  onMouseLeave={(e) => {
                    if (!applying) e.currentTarget.style.background = "#246344";
                  }}
                >
                  {applying && <span style={spinnerStyle} />}
                  {applying ? "Applying..." : "Apply Now"}
                </button>
              )}

              {/* Gallery thumbnails */}
              {hasGallery && (
                <div style={galleryRow}>
                  {event.galleryURLs.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Gallery ${idx + 1}`}
                      style={galleryThumb}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{pulseKeyframes}</style>
      <style>{`
        .event-detail-layout {
          display: flex;
          gap: 28px;
          align-items: flex-start;
        }
        .event-detail-sidebar {
          width: 280px;
          flex-shrink: 0;
          position: sticky;
          top: 24px;
        }
        @media (max-width: 768px) {
          .event-detail-layout {
            flex-direction: column;
          }
          .event-detail-sidebar {
            width: 100%;
            position: relative;
            top: 0;
          }
        }
      `}</style>
    </main>
  );
}

/* ── Keyframes ───────────────────────────────────────────────────────────────── */

const pulseKeyframes = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const mainArea: React.CSSProperties = {
  flex: 1,
  background: "#f9fafb",
  overflowY: "auto",
};

/* Cover */

const coverImage: React.CSSProperties = {
  width: "100%",
  height: 280,
  objectFit: "cover",
  borderRadius: "0 0 16px 16px",
  display: "block",
};

const coverPlaceholder: React.CSSProperties = {
  width: "100%",
  height: 280,
  background: "#f0faf5",
  borderRadius: "0 0 16px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/* Back button */

const backBtnOverlay: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  background: "rgba(255,255,255,0.9)",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 14,
  fontWeight: 600,
  color: "#246344",
  cursor: "pointer",
  backdropFilter: "blur(4px)",
  transition: "background 0.2s",
};

const backBtnPrimary: React.CSSProperties = {
  background: "#246344",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

/* Content layout */

const contentWrapper: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: 24,
};

const leftCol: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

/* Text styles */

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const organizerLine: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  margin: "4px 0 16px",
};

const infoRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 20,
  marginBottom: 8,
};

const infoItem: React.CSSProperties = {
  fontSize: 14,
  color: "#374151",
};

const participantsText: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  margin: "4px 0 12px",
};

/* Department restrictions */

const restrictionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  marginBottom: 12,
};

const restrictionLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginRight: 4,
};

const deptTag: React.CSSProperties = {
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #bbf7d0",
  borderRadius: 14,
  padding: "2px 10px",
  fontSize: 12,
  fontWeight: 500,
};

/* Divider */

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  margin: "16px 0",
};

/* Description */

const descriptionStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#374151",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
  margin: 0,
};

/* Side card */

const sideCard: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 24,
};

const pointsLarge: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "#246344",
  margin: 0,
};

const pointsSub: React.CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  margin: "4px 0 0",
};

/* Apply button variants */

const btnBase: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  transition: "background 0.2s",
  textAlign: "center",
};

const btnApply: React.CSSProperties = {
  ...btnBase,
  background: "#246344",
  color: "#ffffff",
};

const btnApplied: React.CSSProperties = {
  ...btnBase,
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
  cursor: "default",
};

const btnFull: React.CSSProperties = {
  ...btnBase,
  background: "#f3f4f6",
  color: "#9ca3af",
  cursor: "default",
};



const spinnerStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  border: "2px solid rgba(255,255,255,0.3)",
  borderTopColor: "#ffffff",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
  flexShrink: 0,
};

/* Gallery */

const galleryRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  marginTop: 16,
  paddingBottom: 4,
};

const galleryThumb: React.CSSProperties = {
  height: 72,
  borderRadius: 8,
  objectFit: "cover",
  flexShrink: 0,
};

/* Skeleton */

const skeletonCover: React.CSSProperties = {
  width: "100%",
  height: 280,
  background: "#e5e7eb",
  borderRadius: "0 0 16px 16px",
  animation: "pulse 1.5s ease-in-out infinite",
};

const skeletonLine: React.CSSProperties = {
  background: "#e5e7eb",
  borderRadius: 6,
  animation: "pulse 1.5s ease-in-out infinite",
};

/* Not found */

const notFoundWrapper: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "120px 20px",
  textAlign: "center",
};
