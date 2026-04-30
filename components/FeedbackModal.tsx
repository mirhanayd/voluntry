"use client";

import React, { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  userId: string;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  userId,
}: FeedbackModalProps) {
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    try {
      // Check for existing feedback
      const q = query(
        collection(db, "feedbacks"),
        where("eventId", "==", eventId),
        where("userId", "==", userId)
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        showToast(
          "You have already submitted feedback for this event.",
          "info"
        );
        handleClose();
        return;
      }

      await addDoc(collection(db, "feedbacks"), {
        eventId,
        userId,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      });

      showToast("Thank you for your feedback! ⭐", "success");
      handleClose();
    } catch (err) {
      console.error("Feedback submit error:", err);
      showToast("Failed to submit feedback. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHovered(0);
    setComment("");
    onClose();
  };

  return (
    <div style={overlay} onClick={handleClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button style={closeBtn} onClick={handleClose} aria-label="Close">
          ✕
        </button>

        {/* Title */}
        <h2 style={titleStyle}>Leave Feedback</h2>
        <p style={eventNameStyle}>{eventTitle}</p>

        {/* Star rating */}
        <label style={labelStyle}>Your Rating</label>
        <div style={starsRow}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hovered || rating);
            return (
              <span
                key={star}
                role="button"
                tabIndex={0}
                style={{
                  ...starStyle,
                  color: isFilled ? "#f59e0b" : "#d1d5db",
                  cursor: "pointer",
                }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setRating(star);
                }}
              >
                {isFilled ? "★" : "☆"}
              </span>
            );
          })}
        </div>
        {rating > 0 && (
          <p style={ratingText}>{rating} / 5</p>
        )}

        {/* Comment */}
        <label style={{ ...labelStyle, marginTop: 16 }}>
          Your Comment (optional)
        </label>
        <textarea
          rows={4}
          maxLength={500}
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={textareaStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#246344";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#d1d5db";
          }}
        />
        <p style={charCounter}>{comment.length} / 500</p>

        {/* Submit */}
        <button
          style={{
            ...submitBtn,
            opacity: rating === 0 || submitting ? 0.6 : 1,
            cursor: rating === 0 || submitting ? "not-allowed" : "pointer",
          }}
          disabled={rating === 0 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                style={{ animation: "fbspin 1s linear infinite" }}
              >
                <circle
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"
                  strokeDasharray="32" strokeDashoffset="16"
                  opacity="0.4"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit Feedback"
          )}
        </button>

        <style>{`@keyframes fbspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const overlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modal: React.CSSProperties = {
  position: "relative",
  background: "#ffffff",
  borderRadius: 12,
  padding: 28,
  width: 440,
  maxWidth: "90vw",
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  background: "none",
  border: "none",
  fontSize: 18,
  color: "#6b7280",
  cursor: "pointer",
  lineHeight: 1,
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 4px 0",
};

const eventNameStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#246344",
  margin: "0 0 20px 0",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const starsRow: React.CSSProperties = {
  display: "flex",
  gap: 4,
};

const starStyle: React.CSSProperties = {
  fontSize: 32,
  lineHeight: 1,
  transition: "color 0.15s",
  userSelect: "none",
};

const ratingText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  margin: "4px 0 0",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: 10,
  fontSize: 14,
  resize: "vertical",
  outline: "none",
  transition: "border-color 0.2s",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const charCounter: React.CSSProperties = {
  textAlign: "right",
  color: "#9ca3af",
  fontSize: 12,
  margin: "4px 0 16px",
};

const submitBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  background: "#246344",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  transition: "opacity 0.2s",
};
