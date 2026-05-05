"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import FeedCard, { type FeedPost } from "@/components/FeedCard";
import { EmptyState } from "@/components/ui/EmptyState";

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function FeedPage() {
  const { loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    async function fetchFeed() {
      try {
        const q = query(
          collection(db, "feed-posts"),
          where("isPublic", "==", true),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          setEmpty(true);
          setPosts([]);
        } else {
          const items: FeedPost[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
            } as FeedPost;
          });
          setPosts(items);
          setEmpty(false);
        }
      } catch (err) {
        console.error("Feed fetch error:", err);
        showToast("Failed to load feed. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  return (
    <>
      <main style={mainArea}>
        {/* Animated Background from Login (Colorful) */}
        <div className="feed-bg-anim">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`f-particle f-p${i + 1}`} />
          ))}
          <div className="f-glowRing" />
          <div className="f-glowRing2" />
        </div>
        <style>{`
          .feed-bg-anim {
            position: fixed;
            top: 0;
            left: 0;
            width: 50%;
            height: 100vh;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
          }
          .f-particle {
            position: absolute;
            border-radius: 50%;
            animation: f-floatUp 8s ease-in-out infinite;
          }
          .f-p1  { background: rgba(36, 99, 68, 0.15);  width: 8px;  height: 8px;  left: 10%; animation-duration: 7s;  animation-delay: 0s;   }
          .f-p2  { background: rgba(249, 115, 22, 0.15); width: 14px; height: 14px; left: 25%; animation-duration: 9s;  animation-delay: 1s;   }
          .f-p3  { background: rgba(59, 130, 246, 0.15); width: 6px;  height: 6px;  left: 40%; animation-duration: 6s;  animation-delay: 2s;   }
          .f-p4  { background: rgba(234, 179, 8, 0.15);  width: 10px; height: 10px; left: 55%; animation-duration: 10s; animation-delay: 0.5s; }
          .f-p5  { background: rgba(139, 92, 246, 0.15); width: 7px;  height: 7px;  left: 70%; animation-duration: 8s;  animation-delay: 3s;   }
          .f-p6  { background: rgba(236, 72, 153, 0.15); width: 16px; height: 16px; left: 85%; animation-duration: 11s; animation-delay: 1.5s; }
          .f-p7  { background: rgba(59, 130, 246, 0.15); width: 9px;  height: 9px;  left: 15%; animation-duration: 7.5s; animation-delay: 4s;  }
          .f-p8  { background: rgba(36, 99, 68, 0.15);  width: 12px; height: 12px; left: 60%; animation-duration: 9.5s; animation-delay: 2.5s; }
          .f-p9  { background: rgba(249, 115, 22, 0.15); width: 5px;  height: 5px;  left: 35%; animation-duration: 6.5s; animation-delay: 5s;  }
          .f-p10 { background: rgba(234, 179, 8, 0.15);  width: 15px; height: 15px; left: 80%; animation-duration: 10.5s; animation-delay: 0.8s;}
          .f-p11 { background: rgba(139, 92, 246, 0.15); width: 8px;  height: 8px;  left: 48%; animation-duration: 8.5s; animation-delay: 3.5s; }
          .f-p12 { background: rgba(236, 72, 153, 0.15); width: 10px; height: 10px; left: 20%; animation-duration: 7s;  animation-delay: 1.8s; }

          @keyframes f-floatUp {
            0%   { transform: translateY(100vh) scale(0); opacity: 0; }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { transform: translateY(-20vh) scale(1); opacity: 0; }
          }

          .f-glowRing {
            position: absolute;
            top: 40%;
            left: 20%;
            width: 380px;
            height: 380px;
            border-radius: 50%;
            border: 2px solid rgba(59, 130, 246, 0.08); /* Blue */
            animation: f-pulseRing 4s ease-in-out infinite;
            transform: translate(-50%, -50%);
          }

          .f-glowRing2 {
            position: absolute;
            top: 40%;
            left: 20%;
            width: 480px;
            height: 480px;
            border-radius: 50%;
            border: 1.5px solid rgba(249, 115, 22, 0.06); /* Orange */
            animation: f-pulseRing 4s ease-in-out infinite 1s;
            transform: translate(-50%, -50%);
          }

          @keyframes f-pulseRing {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            50%      { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
          }

          .feed-content-wrapper {
            position: relative;
            z-index: 1;
          }

          @media (max-width: 768px) {
            .feed-bg-anim { display: none; }
          }
        `}</style>

        <div className="feed-content-wrapper">
          {/* Header */}
        <div style={feedHeaderStyle}>
          <div>
            <h1 style={titleStyle}>Community Feed</h1>
            <p style={subtitleStyle}>
              See new events, achievements, and community updates
            </p>
          </div>
        </div>

        {/* Feed column */}
        <div style={feedColumn}>
          {loading && <Skeletons />}

          {!loading && empty && (
            <EmptyState
              emoji="🌱"
              title="Nothing to see here yet."
              subtitle="Feed posts will appear here soon!"
            />
          )}

          {!loading &&
            !empty &&
            posts.map((post) => (
              <FeedCard key={post.id || post.certificateId || Math.random().toString()} post={post} />
            ))}
        </div>
        </div>
      </main>

    </>
  );
}

/* ── Skeleton loader ─────────────────────────────────────────────────────────── */

function Skeletons() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={skeletonCard} />
      ))}
    </>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const mainArea: React.CSSProperties = {
  flex: 1,
  padding: "2rem 1rem",
  background: "#f9fafb",
  overflowY: "auto",
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

const feedHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 24,
  flexWrap: "wrap",
};

const feedColumn: React.CSSProperties = {
  width: "100%",
  maxWidth: 580,
  margin: "0 auto",
};

const skeletonCard: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  height: 110,
  marginBottom: 12,
  animation: "pulse 1.5s ease-in-out infinite",
};
