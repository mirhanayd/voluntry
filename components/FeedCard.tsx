"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

/* ── Props ───────────────────────────────────────────────────────────────────── */

export interface FeedPost {
  id?: string;
  type?: "achievement" | "new_event" | "event_completed" | "certificate_share";
  userId?: string;
  eventId?: string;
  eventTitle: string;
  eventDate: string;
  organizerName: string;
  pointValue: number;
  studentName?: string;
  universityName?: string;
  departmentName?: string;
  avatarURL?: string;
  createdAt: string;
  certificateId?: string;
  // new_event fields
  coverURL?: string;
  location?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  eventDescription?: string;
  // event_completed fields
  participantCount?: number;
  completionNote?: string;
  photoURLs?: string[];
}

interface FeedCardProps {
  post: FeedPost;
  hideLike?: boolean;
}

/* ── Category → left-border colour mapping ───────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  Engineering:              "#3b82f6",
  Health:                   "#ef4444",
  "Law & Social Sciences":  "#8b5cf6",
  "Architecture & Design":  "#f97316",
  "Business & Economics":   "#eab308",
  Education:                "#06b6d4",
  Communication:            "#ec4899",
  Science:                  "#10b981",
};

function getCategoryColor(department?: string): string {
  if (!department) return "#246344";
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (department.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  return "#246344";
}

/* ── Relative time helper ────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  const weeks   = Math.floor(days / 7);
  const months  = Math.floor(days / 30);
  const years   = Math.floor(days / 365);

  if (seconds < 60)  return "just now";
  if (minutes < 60)  return `${minutes}m ago`;
  if (hours < 24)    return `${hours}h ago`;
  if (days < 7)      return `${days}d ago`;
  if (weeks < 5)     return `${weeks}w ago`;
  if (months < 12)   return `${months}mo ago`;
  return `${years}y ago`;
}

/* ── Format date helper ──────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ── Like Button sub-component ───────────────────────────────────────────────── */

function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const isGuest = auth.currentUser?.isAnonymous ?? false;

  useEffect(() => {
    if (!postId) return;
    // Get total likes count
    getDocs(collection(db, "feed-posts", postId, "likes")).then((snap) => {
      setCount(snap.size);
      // Check if current user liked
      const uid = auth.currentUser?.uid;
      if (uid) {
        const userLiked = snap.docs.some((d) => d.id === uid);
        setLiked(userLiked);
      }
    }).catch(() => {});
  }, [postId]);

  const toggle = async () => {
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid;
    if (!uid || currentUser?.isAnonymous || busy) return;
    setBusy(true);
    const ref = doc(db, "feed-posts", postId, "likes", uid);
    try {
      if (liked) {
        await deleteDoc(ref);
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await setDoc(ref, { likedAt: new Date().toISOString() });
        setLiked(true);
        setCount((c) => c + 1);
      }
    } catch (e) {
      console.error("Like toggle failed:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      style={{
        ...likeBtn,
        color: liked ? "#ef4444" : "#9ca3af",
        cursor: isGuest ? "not-allowed" : likeBtn.cursor,
        opacity: isGuest ? 0.65 : 1,
      }}
      disabled={busy || isGuest}
      title={isGuest ? "Guest users can view posts only." : undefined}
    >
      <span style={{ fontSize: 16, transition: "transform 0.2s", transform: liked ? "scale(1.2)" : "scale(1)" }}>
        {liked ? "❤️" : "🤍"}
      </span>
      {count > 0 && <span style={{ fontSize: 12, fontWeight: 600 }}>{count}</span>}
    </button>
  );
}

/* ── Mini Certificate Preview ────────────────────────────────────────────────── */

function CertificatePreview({ post }: { post: FeedPost }) {
  if (!post.certificateId) return null;
  return (
    <div style={certPreview}>
      <img
        src={`/api/certificate-image?certificateId=${encodeURIComponent(post.certificateId)}`}
        alt={`Certificate for ${post.eventTitle}`}
        style={certImg}
        loading="lazy"
      />
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function FeedCard({ post, hideLike }: FeedCardProps) {
  const postType = post.type || "achievement";
  const isGuest = auth.currentUser?.isAnonymous ?? false;

  const borderColor = useMemo(() => {
    if (postType === "new_event") return "#3b82f6";
    if (postType === "event_completed") return "#f59e0b";
    if (postType === "certificate_share") return "#8b5cf6";
    return getCategoryColor(post.departmentName);
  }, [postType, post.departmentName]);

  const icon = postType === "new_event" ? "📢" : postType === "event_completed" ? "✅" : postType === "certificate_share" ? "🏆" : "🎉";

  /* ── Certificate Share Card ─────────────────────────────────────────── */
  if (postType === "certificate_share") {
    const hasAvatar = typeof post.avatarURL === "string" && post.avatarURL.trim() !== "";
    const initial = post.studentName ? post.studentName.charAt(0).toUpperCase() : "?";

    return (
      <div style={{ ...card, borderLeft: `4px solid ${borderColor}` }}>
        <span style={emojiCorner}>{icon}</span>

        <div style={row}>
          {hasAvatar ? (
            <img src={post.avatarURL} alt={post.studentName || ""} style={avatarImg} />
          ) : (
            <div style={avatarFallback}>{initial}</div>
          )}

          <div style={contentCol}>
            <p style={line}>
              <span style={nameStyle}>{post.studentName}</span>
              <span style={actionStyle}> shared a certificate</span>
            </p>

            <p style={{ ...line, color: "#246344", fontWeight: 600 }}>
              {post.eventTitle}
            </p>

            <p style={{ ...line, color: "#6b7280", fontSize: 13 }}>
              {post.organizerName}
            </p>

            {(post.universityName || post.departmentName) && (
              <p style={{ ...line, color: "#9ca3af", fontSize: 12 }}>
                {[post.universityName, post.departmentName].filter(Boolean).join(" · ")}
              </p>
            )}

            <div style={bottomRow}>
              <div style={badgeGroup}>
                <span style={pointsBadge}>+{post.pointValue} pts</span>
                <span style={{ ...certBadge, background: "#f3e8ff", color: "#7c3aed", border: "1px solid #c4b5fd" }}>🏆 Certificate</span>
              </div>
              <span style={timeStyle}>{relativeTime(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Certificate image preview */}
        {post.certificateId && <CertificatePreview post={post} />}

        {/* Like */}
        {!hideLike && post.id && (
          <div style={likeRow}><LikeButton postId={post.id} /></div>
        )}
      </div>
    );
  }

  /* ── New Event Card ──────────────────────────────────────────────────────── */
  if (postType === "new_event") {
    return (
      <div style={{ ...card, borderLeft: `4px solid ${borderColor}` }}>
        <span style={emojiCorner}>{icon}</span>

        <div style={headerRow}>
          <div style={orgAvatarFallback}>
            {post.organizerName?.charAt(0)?.toUpperCase() || "O"}
          </div>
          <div style={headerContent}>
            <p style={line}>
              <span style={nameStyle}>{post.organizerName}</span>
              <span style={actionStyle}> published a new event</span>
            </p>
            <span style={timeStyle}>{relativeTime(post.createdAt)}</span>
          </div>
        </div>

        <div style={eventPreview}>
          {post.coverURL && (
            <img src={post.coverURL} alt={post.eventTitle} style={eventPreviewImg} />
          )}
          <div style={eventPreviewBody}>
            <h3 style={eventPreviewTitle}>{post.eventTitle}</h3>
            {post.eventDescription && (
              <p style={eventPreviewDesc}>{post.eventDescription}</p>
            )}
            <div style={eventPreviewMeta}>
              <span>📅 {formatDate(post.eventDate)}</span>
              {post.location && <span>📍 {post.location}</span>}
            </div>
            <div style={bottomRow}>
              <div style={badgeGroup}>
                {post.pointValue > 0 && (
                  <span style={pointsBadge}>+{post.pointValue} pts</span>
                )}
                {(post.maxParticipants ?? 0) > 0 && (
                  <span style={spotsBadge}>
                    {post.currentParticipants ?? 0}/{post.maxParticipants} spots
                  </span>
                )}
              </div>
              <Link href={`/student/events/${post.eventId}`} style={applyBtn}>
                {isGuest ? "View Details" : "View & Apply"}
              </Link>
            </div>
          </div>
        </div>

        {/* Like */}
        {!hideLike && post.id && (
          <div style={likeRow}><LikeButton postId={post.id} /></div>
        )}
      </div>
    );
  }

  /* ── Event Completed Card ────────────────────────────────────────────────── */
  if (postType === "event_completed") {
    return (
      <div style={{ ...card, borderLeft: `4px solid ${borderColor}` }}>
        <span style={emojiCorner}>{icon}</span>

        <div style={headerRow}>
          <div style={orgAvatarFallback}>
            {post.organizerName?.charAt(0)?.toUpperCase() || "O"}
          </div>
          <div style={headerContent}>
            <p style={line}>
              <span style={nameStyle}>{post.organizerName}</span>
              <span style={actionStyle}> completed an event</span>
            </p>
            <span style={timeStyle}>{relativeTime(post.createdAt)}</span>
          </div>
        </div>

        <div style={completionContent}>
          <h3 style={{ ...line, color: "#246344", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            {post.eventTitle}
          </h3>

          {post.completionNote && (
            <p style={completionNoteStyle}>{post.completionNote}</p>
          )}

          <div style={completionStats}>
            {(post.participantCount ?? 0) > 0 && (
              <span style={statPill}>
                👥 {post.participantCount} participant{(post.participantCount ?? 0) > 1 ? "s" : ""}
              </span>
            )}
            {post.pointValue > 0 && (
              <span style={pointsBadge}>+{post.pointValue} pts each</span>
            )}
            <span style={datePill}>📅 {formatDate(post.eventDate)}</span>
          </div>

          {post.photoURLs && post.photoURLs.length > 0 && (
            <div style={photoGrid}>
              {post.photoURLs.map((url, i) => (
                <img key={i} src={url} alt={`Event photo ${i + 1}`} style={photoImg} />
              ))}
            </div>
          )}
        </div>

        {/* Like */}
        {!hideLike && post.id && (
          <div style={likeRow}><LikeButton postId={post.id} /></div>
        )}
      </div>
    );
  }

  /* ── Achievement Card (default) ──────────────────────────────────────────── */
  const hasAvatar =
    typeof post.avatarURL === "string" && post.avatarURL.trim() !== "";

  const initial = post.studentName ? post.studentName.charAt(0).toUpperCase() : "?";

  return (
    <div style={{ ...card, borderLeft: `4px solid ${borderColor}` }}>
      <span style={emojiCorner}>{icon}</span>

      <div style={row}>
        {hasAvatar ? (
          <img src={post.avatarURL} alt={post.studentName || ""} style={avatarImg} />
        ) : (
          <div style={avatarFallback}>{initial}</div>
        )}

        <div style={contentCol}>
          <p style={line}>
            <span style={nameStyle}>{post.studentName}</span>
            <span style={actionStyle}> completed an event</span>
          </p>

          <p style={{ ...line, color: "#246344", fontWeight: 600 }}>
            {post.eventTitle}
          </p>

          <p style={{ ...line, color: "#6b7280", fontSize: 13 }}>
            {post.organizerName}
          </p>

          {(post.universityName || post.departmentName) && (
            <p style={{ ...line, color: "#9ca3af", fontSize: 12 }}>
              {[post.universityName, post.departmentName].filter(Boolean).join(" · ")}
            </p>
          )}

          <div style={bottomRow}>
            <div style={badgeGroup}>
              <span style={pointsBadge}>+{post.pointValue} pts</span>
              <span style={certBadge}>🏆 Certificate Earned</span>
            </div>
            <span style={timeStyle}>{relativeTime(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Certificate Preview */}
      {post.certificateId && <CertificatePreview post={post} />}

      {/* Like */}
      {!hideLike && post.id && (
        <div style={likeRow}><LikeButton postId={post.id} /></div>
      )}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const card: React.CSSProperties = {
  position: "relative",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "14px 14px",
  marginBottom: 16,
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  transition: "box-shadow 0.2s",
};

const emojiCorner: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  fontSize: 18,
  lineHeight: 1,
};

const row: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 14,
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const headerContent: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  flex: 1,
};

const avatarBase: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  flexShrink: 0,
};

const avatarImg: React.CSSProperties = {
  ...avatarBase,
  objectFit: "cover",
};

const avatarFallback: React.CSSProperties = {
  ...avatarBase,
  background: "#e5e7eb",
  color: "#374151",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 17,
};

const orgAvatarFallback: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  flexShrink: 0,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
};

const contentCol: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  flex: 1,
  minWidth: 0,
};

const line: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.4,
};

const nameStyle: React.CSSProperties = {
  color: "#111827",
  fontWeight: 700,
};

const actionStyle: React.CSSProperties = {
  color: "#6b7280",
  fontWeight: 400,
};

const bottomRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 8,
  flexWrap: "wrap",
  gap: 8,
};

const badgeGroup: React.CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
};

const badgeBase: React.CSSProperties = {
  borderRadius: 12,
  padding: "3px 10px",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.6,
  whiteSpace: "nowrap",
};

const pointsBadge: React.CSSProperties = {
  ...badgeBase,
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
};

const certBadge: React.CSSProperties = {
  ...badgeBase,
  background: "#fefce8",
  color: "#854d0e",
  border: "1px solid #fcd34d",
};

const spotsBadge: React.CSSProperties = {
  ...badgeBase,
  background: "#f3f4f6",
  color: "#6b7280",
};

const statPill: React.CSSProperties = {
  ...badgeBase,
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};

const datePill: React.CSSProperties = {
  ...badgeBase,
  background: "#f9fafb",
  color: "#6b7280",
  border: "1px solid #e5e7eb",
};

const timeStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 12,
  whiteSpace: "nowrap",
};

/* ── New Event card styles ────────────────────────────────────────────────── */

const eventPreview: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
};

const eventPreviewImg: React.CSSProperties = {
  width: "100%",
  height: 160,
  objectFit: "cover",
  display: "block",
};

const eventPreviewBody: React.CSSProperties = {
  padding: "14px 16px",
};

const eventPreviewTitle: React.CSSProperties = {
  margin: "0 0 6px",
  fontWeight: 700,
  color: "#111827",
  fontSize: 15,
};

const eventPreviewDesc: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 13,
  color: "#6b7280",
  lineHeight: 1.5,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const eventPreviewMeta: React.CSSProperties = {
  display: "flex",
  gap: 16,
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 12,
  flexWrap: "wrap",
};

const applyBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 16px",
  background: "#246344",
  color: "#fff",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  transition: "background 0.2s",
  whiteSpace: "nowrap",
};

/* ── Event Completed card styles ──────────────────────────────────────────── */

const completionContent: React.CSSProperties = {
  paddingLeft: 52,
};

const completionNoteStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 14,
  color: "#374151",
  lineHeight: 1.6,
  fontStyle: "italic",
};

const completionStats: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const photoGrid: React.CSSProperties = {
  display: "flex",
  gap: 8,
  borderRadius: 8,
  overflow: "hidden",
  flexWrap: "wrap",
};

const photoImg: React.CSSProperties = {
  flex: "1 1 120px",
  minWidth: 0,
  maxHeight: 160,
  objectFit: "cover",
  borderRadius: 8,
};

/* ── Like button ─────────────────────────────────────────────────────────── */

const likeRow: React.CSSProperties = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: "1px solid #f3f4f6",
  display: "flex",
  alignItems: "center",
};

const likeBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px 10px",
  borderRadius: 8,
  transition: "background 0.15s",
};

/* ── Certificate Preview ─────────────────────────────────────────────────── */

const certPreview: React.CSSProperties = {
  marginTop: 14,
  borderRadius: 10,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const certImg: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
};
