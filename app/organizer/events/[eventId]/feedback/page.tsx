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
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface FeedbackRow {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function FeedbackPage() {
  const params  = useParams();
  const eventId = params.eventId as string;

  const [eventTitle, setEventTitle]   = useState("");
  const [feedbacks, setFeedbacks]     = useState<FeedbackRow[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!eventId) return;

    async function fetchFeedbacks() {
      try {
        // Event title
        const eventSnap = await getDoc(doc(db, "events", eventId));
        if (eventSnap.exists()) {
          setEventTitle(eventSnap.data().title ?? "");
        }

        // Feedbacks
        const fbSnap = await getDocs(
          query(
            collection(db, "feedbacks"),
            where("eventId", "==", eventId)
          )
        );

        const rows: FeedbackRow[] = [];

        for (const fbDoc of fbSnap.docs) {
          const f = fbDoc.data();

          let studentName = "Anonymous";
          try {
            const userSnap = await getDoc(doc(db, "users", f.userId));
            if (userSnap.exists()) {
              studentName = userSnap.data().fullName ?? "Anonymous";
            }
          } catch {
            /* ignore */
          }

          rows.push({
            id: fbDoc.id,
            studentName,
            rating:    f.rating    ?? 0,
            comment:   f.comment   ?? "",
            createdAt: f.createdAt ?? "",
          });
        }

        // Sort newest first
        rows.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setFeedbacks(rows);
      } catch (err) {
        console.error("Failed to load feedbacks:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeedbacks();
  }, [eventId]);

  /* ── Computed values ────────────────────────────────────────────────────── */

  const totalReviews = feedbacks.length;
  const averageRating =
    totalReviews > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews
      : 0;

  const renderStars = (rating: number) => {
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
      <span style={{ letterSpacing: 2, fontSize: "1rem" }}>
        {"★".repeat(full)}
        {half ? "⯨" : ""}
        {"☆".repeat(empty)}
      </span>
    );
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={page}>
        <p style={{ color: "#9ca3af" }}>Loading feedback…</p>
      </div>
    );
  }

  return (
    <div style={page}>
      <h1 style={heading}>Feedback</h1>
      <p style={sub}>{eventTitle || "Event"} — Student Reviews</p>

      {/* ── Summary card ──────────────────────────────────────────────────── */}
      <div style={summaryCard}>
        <div style={ratingBig}>
          <span style={{ color: "#f59e0b", fontSize: "2rem", marginRight: 8 }}>
            {renderStars(averageRating)}
          </span>
          <span style={ratingNumber}>
            {averageRating > 0 ? averageRating.toFixed(1) : "—"} / 5
          </span>
        </div>
        <p style={reviewCount}>
          {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
        </p>
      </div>

      {/* ── Feedback list ─────────────────────────────────────────────────── */}
      {totalReviews === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: "#6b7280", margin: 0 }}>
            No feedback received for this event yet.
          </p>
        </div>
      ) : (
        <div style={feedbackList}>
          {feedbacks.map((fb) => (
            <div key={fb.id} style={feedbackCard}>
              <div style={cardHeader}>
                <span style={studentNameStyle}>{fb.studentName}</span>
                <span style={dateStyle}>
                  {fb.createdAt
                    ? new Date(fb.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              <div style={{ margin: "6px 0", color: "#f59e0b" }}>
                {renderStars(fb.rating)}
              </div>

              {fb.comment && (
                <p style={commentStyle}>{fb.comment}</p>
              )}
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
  margin: "0 0 1.5rem",
};

const summaryCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.5rem 2rem",
  marginBottom: "1.5rem",
};

const ratingBig: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const ratingNumber: React.CSSProperties = {
  fontSize: "1.6rem",
  fontWeight: 700,
  color: "#111827",
};

const reviewCount: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#6b7280",
  margin: "6px 0 0",
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "3rem",
  textAlign: "center",
};

const feedbackList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const feedbackCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.25rem 1.5rem",
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const studentNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.92rem",
  color: "#111827",
};

const dateStyle: React.CSSProperties = {
  fontSize: "0.76rem",
  color: "#9ca3af",
};

const commentStyle: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#374151",
  margin: "8px 0 0",
  lineHeight: 1.55,
};
