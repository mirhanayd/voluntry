"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  getDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import BadgeCard from "@/components/BadgeCard";
import { formatDate } from "@/constants/index";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { resolveOrganizerForEvent } from "@/lib/clientProfiles";
import { asString, isOrganizerNamePlaceholder } from "@/lib/profileNames";

/* ── Types ───────────────────────────────────────────────────────────────────── */

interface Certificate {
  certificateId: string;
  eventId: string;
  eventTitle: string;
  organizerName: string;
  organizerId?: string;
  organizerAvatarURL?: string;
  eventDate: string;
  pointValue: number;
  issuedAt: string;
}

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function CertificatesPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchCerts() {
      try {
        const q = query(
          collection(db, "certificates"),
          where("uid", "==", user!.uid),
          orderBy("issuedAt", "desc")
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          setEmpty(true);
          setCerts([]);
        } else {
          const rawItems: Certificate[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              certificateId: data.certificateId ?? d.id,
              eventId: data.eventId ?? "",
              eventTitle: data.eventTitle ?? "",
              organizerName: data.organizerName ?? "",
              organizerId: data.organizerId ?? "",
              organizerAvatarURL: data.organizerAvatarURL ?? "",
              eventDate: data.eventDate ?? "",
              pointValue: data.pointValue ?? 0,
              issuedAt: data.issuedAt ?? "",
            };
          });
          const items = await Promise.all(
            rawItems.map(async (cert) => {
              if (
                !cert.eventId ||
                (!isOrganizerNamePlaceholder(cert.organizerName) &&
                  cert.organizerId &&
                  cert.organizerAvatarURL)
              ) {
                return {
                  ...cert,
                  organizerName: isOrganizerNamePlaceholder(cert.organizerName)
                    ? "Organization"
                    : cert.organizerName,
                };
              }

              const organizer = await resolveOrganizerForEvent(cert.eventId);
              return {
                ...cert,
                organizerName: isOrganizerNamePlaceholder(cert.organizerName)
                  ? organizer.name
                  : cert.organizerName,
                organizerId: asString(cert.organizerId) || organizer.id,
                organizerAvatarURL:
                  asString(cert.organizerAvatarURL) || organizer.avatarURL,
              };
            })
          );
          setCerts(items);
          setEmpty(false);
        }
      } catch (err) {
        console.error("Certificates fetch error:", err);
        showToast("Failed to load certificates. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchCerts();

    /* ── Fetch confirmed participation count (for badges) ────────────────────── */

    async function fetchConfirmedCount() {
      try {
        const q = query(
          collection(db, "participations"),
          where("userId", "==", user!.uid),
          where("attendanceConfirmed", "==", true)
        );
        const snap = await getDocs(q);
        setConfirmedCount(snap.size);
      } catch (err) {
        console.error("Badge count fetch error:", err);
      }
    }

    fetchConfirmedCount();

    /* ── Check which certificates are already shared ────────────────────── */
    async function fetchSharedPosts() {
      try {
        const snap = await getDocs(
          query(
            collection(db, "feed-posts"),
            where("userId", "==", user!.uid),
            where("type", "==", "certificate_share")
          )
        );
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const cid = d.data().certificateId;
          if (cid) ids.add(cid);
        });
        setSharedIds(ids);
      } catch { /* ignore */ }
    }
    fetchSharedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  /* ── Download handler ──────────────────────────────────────────────────────── */

  const handleDownload = async (certId: string, title: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `/api/generate-certificate?certificateId=${encodeURIComponent(certId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}_certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Certificate download error:", err);
      showToast("Failed to download certificate.", "error");
    }
  };

  /* ── Share to feed handler ───────────────────────────────────────────── */

  const handleShare = async (cert: Certificate) => {
    if (!user || sharingId) return;
    setSharingId(cert.certificateId);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};

      await addDoc(collection(db, "feed-posts"), {
        type: "certificate_share",
        userId: user.uid,
        eventId: cert.eventId,
        eventTitle: cert.eventTitle,
        eventDate: cert.eventDate,
        organizerName: cert.organizerName,
        organizerId: cert.organizerId || "",
        organizerAvatarURL: cert.organizerAvatarURL || "",
        pointValue: cert.pointValue,
        studentName: userData.fullName ?? "",
        universityName: userData.universityName ?? "",
        departmentName: userData.departmentName ?? "",
        avatarURL: userData.avatarURL ?? "",
        certificateId: cert.certificateId,
        isPublic: true,
        createdAt: new Date().toISOString(),
      });

      setSharedIds((prev) => new Set(prev).add(cert.certificateId));
      showToast("Certificate shared to feed!", "success");
    } catch (err) {
      console.error("Share error:", err);
      showToast("Failed to share certificate.", "error");
    } finally {
      setSharingId(null);
    }
  };

  return (
    <>
      <main style={mainArea}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={titleStyle}>My Certificates</h1>
          <p style={subtitleStyle}>Your verified volunteer achievements</p>
        </div>

        {/* Content */}
        {loading && <LoadingSkeleton type="card" rows={6} />}

        {!loading && empty && (
          <EmptyState
            emoji="📜"
            title="No certificates yet."
            subtitle="Complete events and get your attendance confirmed to earn certificates."
          />
        )}

        {!loading && !empty && (
          <div className="cert-grid" style={gridBase}>
            {certs.map((cert) => (
              <CertificateCard
                key={cert.certificateId}
                cert={cert}
                onDownload={handleDownload}
                onShare={handleShare}
                alreadyShared={sharedIds.has(cert.certificateId)}
                sharing={sharingId === cert.certificateId}
                currentTime={currentTime}
              />
            ))}
          </div>
        )}

        {/* ── My Badges ────────────────────────────────────────────────────── */}
        {!loading && (
          <>
            <h2 style={badgesSectionTitle}>My Badges</h2>
            <div style={badgesRow}>
              <BadgeCard badge="starter" earned={confirmedCount >= 1} currentCount={confirmedCount} />
              <BadgeCard badge="active" earned={confirmedCount >= 5} currentCount={confirmedCount} />
              <BadgeCard badge="champion" earned={confirmedCount >= 10} currentCount={confirmedCount} />
            </div>
          </>
        )}
      </main>

      {/* Injected CSS for keyframes + responsive grid */}
      <style>{injectedCSS}</style>
    </>
  );
}

/* ── Certificate Card ────────────────────────────────────────────────────────── */

function CertificateCard({
  cert,
  onDownload,
  onShare,
  alreadyShared,
  sharing,
  currentTime,
}: {
  cert: Certificate;
  onDownload: (id: string, title: string) => void;
  onShare: (cert: Certificate) => void;
  alreadyShared: boolean;
  sharing: boolean;
  currentTime: number | null;
}) {
  const issuedDate = new Date(cert.issuedAt);
  const daysSince =
    currentTime === null
      ? 0
      : (currentTime - issuedDate.getTime()) / (1000 * 60 * 60 * 24);
  const expired = currentTime !== null && daysSince > 3;

  return (
    <div style={cardOuter}>
      {/* Top gradient banner */}
      <div style={cardTop}>
        <p style={brandLabel}>VOLUNTRY</p>
        <p style={certLabelStyle}>Certificate of Participation</p>
        <div style={trophyWrap}>🏆</div>
      </div>

      {/* Bottom details */}
      <div style={cardBottom}>
        <p style={eventTitleStyle}>{cert.eventTitle}</p>
        <p style={organizerStyle}>{cert.organizerName}</p>
        <p style={dateStyle}>{formatDate(cert.eventDate)}</p>

        <span style={pointsBadge}>+{cert.pointValue} pts</span>

        <p style={certIdStyle}>ID: {cert.certificateId.slice(0, 8)}</p>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            style={downloadBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#246344";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.color = "#246344";
            }}
            onClick={() => onDownload(cert.certificateId, cert.eventTitle)}
          >
            Download PDF
          </button>

          {alreadyShared ? (
            <button style={{ ...shareBtn, opacity: 0.5, cursor: "default" }} disabled>
              ✓ Shared
            </button>
          ) : expired ? (
            <button
              style={{ ...shareBtn, opacity: 0.4, cursor: "not-allowed" }}
              disabled
              title="Sharing period expired (3 days after issue)"
            >
              Expired
            </button>
          ) : (
            <button
              style={shareBtn}
              onClick={() => onShare(cert)}
              disabled={sharing}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1d4ed8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#3b82f6";
              }}
            >
              {sharing ? "Sharing…" : "📤 Share"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Injected CSS (keyframes + responsive grid) ──────────────────────────────── */

const injectedCSS = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}

.cert-grid {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 20px !important;
}

@media (max-width: 1100px) {
  .cert-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (max-width: 700px) {
  .cert-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const mainArea: React.CSSProperties = {
  flex: 1,
  padding: "1.5rem 1rem",
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

const gridBase: React.CSSProperties = {
  display: "grid",
  gap: 20,
};

/* ── Card styles ────────────────────────────────────────────────────────────── */

const cardOuter: React.CSSProperties = {
  borderRadius: 10,
  overflow: "hidden",
};

const cardTop: React.CSSProperties = {
  background: "linear-gradient(135deg, #246344, #1a4a32)",
  padding: 20,
  borderRadius: "10px 10px 0 0",
  textAlign: "center",
};

const brandLabel: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 2,
  textAlign: "left",
};

const certLabelStyle: React.CSSProperties = {
  margin: "2px 0 0",
  color: "rgba(255,255,255,0.8)",
  fontSize: 11,
  textAlign: "left",
};

const trophyWrap: React.CSSProperties = {
  fontSize: 36,
  marginTop: 8,
  textAlign: "center",
};

const cardBottom: React.CSSProperties = {
  background: "#ffffff",
  padding: 16,
  borderRadius: "0 0 10px 10px",
  borderLeft: "1px solid #e5e7eb",
  borderRight: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
};

const eventTitleStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 700,
  color: "#111827",
  fontSize: 15,
  marginBottom: 4,
};

const organizerStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: 13,
};

const dateStyle: React.CSSProperties = {
  margin: "4px 0 8px",
  color: "#9ca3af",
  fontSize: 12,
};

const pointsBadge: React.CSSProperties = {
  display: "inline-block",
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  padding: "2px 8px",
};

const certIdStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#d1d5db",
  fontSize: 11,
};

const downloadBtn: React.CSSProperties = {
  flex: 1,
  background: "#ffffff",
  border: "1px solid #246344",
  color: "#246344",
  borderRadius: 8,
  padding: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  transition: "background 0.2s, color 0.2s",
};

const shareBtn: React.CSSProperties = {
  flex: 1,
  background: "#3b82f6",
  border: "none",
  color: "#fff",
  borderRadius: 8,
  padding: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  transition: "background 0.2s",
};

/* ── Badge section ──────────────────────────────────────────────────────────── */

const badgesSectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#111827",
  marginTop: 40,
  marginBottom: 16,
};

const badgesRow: React.CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
};
