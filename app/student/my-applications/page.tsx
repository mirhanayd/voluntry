"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import FeedbackModal from "@/components/FeedbackModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

/* ── Types ───────────────────────────────────────────────────────────────────── */

interface Application {
  participationId: string;
  eventId: string;
  status: string;
  appliedAt: string;
  title: string;
  organizerName: string;
  date: string;
  time: string;
  location: string;
  coverURL: string;
  pointValue: number;
}

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function MyApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    eventId: string;
    eventTitle: string;
  }>({ open: false, eventId: "", eventTitle: "" });

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchApplications() {
      try {
        const q = query(
          collection(db, "participations"),
          where("userId", "==", user!.uid),
          orderBy("appliedAt", "desc")
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setEmpty(true);
          setApps([]);
          setLoading(false);
          return;
        }

        // Fetch event details in parallel
        const items = await Promise.all(
          snap.docs.map(async (d) => {
            const p = d.data();
            let title = "";
            let organizerName = "";
            let date = "";
            let time = "";
            let location = "";
            let coverURL = "";
            let pointValue = 0;

            try {
              const eventSnap = await getDoc(doc(db, "events", p.eventId));
              if (eventSnap.exists()) {
                const e = eventSnap.data();
                title = e.title ?? "";
                organizerName = e.organizerName ?? "";
                date = e.date ?? "";
                time = e.time ?? "";
                location = e.location ?? "";
                coverURL = e.coverURL ?? "";
                pointValue = e.pointValue ?? 0;
              }
            } catch {
              // event may have been deleted — keep defaults
            }

            return {
              participationId: d.id,
              eventId: p.eventId ?? "",
              status: p.status ?? "applied",
              appliedAt: p.appliedAt ?? "",
              title,
              organizerName,
              date,
              time,
              location,
              coverURL,
              pointValue,
            } as Application;
          })
        );

        setApps(items);
        setEmpty(false);

        // Check which completed events already have feedback
        const completedIds = items
          .filter((a) => a.status === "completed")
          .map((a) => a.eventId)
          .filter(Boolean);

        if (completedIds.length > 0) {
          try {
            const fbQuery = query(
              collection(db, "feedbacks"),
              where("userId", "==", user!.uid),
              where("eventId", "in", completedIds.slice(0, 30)) // Firestore "in" cap
            );
            const fbSnap = await getDocs(fbQuery);
            const given = new Set<string>();
            fbSnap.forEach((d) => given.add(d.data().eventId));
            setFeedbackGiven(given);
          } catch {
            // non-critical — keep set empty
          }
        }
      } catch (err) {
        console.error("Applications fetch error:", err);
        showToast("Failed to load applications. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  return (
    <main style={mainArea}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={titleStyle}>My Applications</h1>
        <p style={subtitleStyle}>Track the status of your event applications</p>
      </div>

      {/* Content */}
      <div style={listWrapper}>
        {loading && <LoadingSkeleton type="list" rows={4} />}

        {!loading && empty && (
          <EmptyState
            emoji="📋"
            title="No applications yet."
            subtitle="Discover events and start volunteering!"
            action={{ label: "Discover Events", href: "/student/events" }}
          />
        )}

        {!loading &&
          !empty &&
          apps.map((app) => (
            <ApplicationCard
              key={app.participationId}
              app={app}
              hasFeedback={feedbackGiven.has(app.eventId)}
              onLeaveFeedback={() =>
                setFeedbackModal({ open: true, eventId: app.eventId, eventTitle: app.title })
              }
            />
          ))}
      </div>

      {/* Feedback Modal */}
      {user && (
        <FeedbackModal
          isOpen={feedbackModal.open}
          onClose={() => {
            // Mark as given so button switches immediately
            if (feedbackModal.eventId) {
              setFeedbackGiven((prev) => new Set(prev).add(feedbackModal.eventId));
            }
            setFeedbackModal({ open: false, eventId: "", eventTitle: "" });
          }}
          eventId={feedbackModal.eventId}
          eventTitle={feedbackModal.eventTitle}
          userId={user.uid}
        />
      )}

    </main>
  );
}

/* ── Application Card ────────────────────────────────────────────────────────── */

function ApplicationCard({
  app,
  hasFeedback,
  onLeaveFeedback,
}: {
  app: Application;
  hasFeedback: boolean;
  onLeaveFeedback: () => void;
}) {
  const hasCover = typeof app.coverURL === "string" && app.coverURL.trim() !== "";
  return (
    <Link
      href={`/student/events/${app.eventId}`}
      style={card}
    >
      {/* Cover image */}
      {hasCover ? (
        <img src={app.coverURL} alt={app.title} style={coverImg} />
      ) : (
        <div style={coverPlaceholder}>
          <span style={{ fontSize: 24 }}>📅</span>
        </div>
      )}

      {/* Details */}
      <div style={detailsCol}>
        <p style={eventTitle}>{app.title}</p>
        <p style={organizerText}>{app.organizerName}</p>
        <p style={metaText}>
          📅 {app.date}{app.time ? ` at ${app.time}` : ""} &nbsp;|&nbsp; 📍 {app.location}
        </p>

        {/* Bottom row */}
        <div style={bottomRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusBadge status={app.status} />

            {/* Feedback button / label for completed events */}
            {app.status === "completed" && (
              hasFeedback ? (
                <span style={feedbackDoneStyle}>Feedback Submitted ✓</span>
              ) : (
                <button
                  style={feedbackBtnStyle}
                  onClick={(e) => {
                    e.preventDefault(); // don't navigate the Link
                    e.stopPropagation();
                    onLeaveFeedback();
                  }}
                >
                  Leave Feedback
                </button>
              )
            )}
          </div>

          <span style={pointsBadge}>+{app.pointValue} pts</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const mainArea: React.CSSProperties = {
  flex: 1,
  padding: "2rem 2.5rem",
  background: "#f9fafb",
  overflowY: "auto",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  margin: "4px 0 0",
};

const listWrapper: React.CSSProperties = {
  maxWidth: 720,
};

/* Card */

const card: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  marginBottom: 12,
  textDecoration: "none",
  transition: "box-shadow 0.2s, border-color 0.2s",
  cursor: "pointer",
};

const coverImg: React.CSSProperties = {
  width: 100,
  height: 80,
  objectFit: "cover",
  borderRadius: 8,
  flexShrink: 0,
};

const coverPlaceholder: React.CSSProperties = {
  width: 100,
  height: 80,
  borderRadius: 8,
  background: "#f0faf5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const detailsCol: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
};

const eventTitle: React.CSSProperties = {
  margin: 0,
  fontWeight: 600,
  color: "#111827",
  fontSize: 15,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const organizerText: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: 13,
};

const metaText: React.CSSProperties = {
  margin: "2px 0 0",
  color: "#9ca3af",
  fontSize: 12,
};

const bottomRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 6,
  gap: 8,
};

const pointsBadge: React.CSSProperties = {
  background: "#f0faf5",
  color: "#246344",
  borderRadius: 12,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const feedbackBtnStyle: React.CSSProperties = {
  border: "1px solid #246344",
  color: "#246344",
  background: "#ffffff",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const feedbackDoneStyle: React.CSSProperties = {
  color: "#246344",
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap",
};
