"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import ImageUpload from "@/components/ImageUpload";

interface DashboardStats {
  activeEvents: number | null;
  pendingApplications: number | null;
  completedEvents: number | null;
}

export default function OrganizerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [avatarURL, setAvatarURL] = useState<string | undefined>(undefined);
  const [orgName, setOrgName] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats>({
    activeEvents: null,
    pendingApplications: null,
    completedEvents: null,
  });

  useEffect(() => {
    if (authLoading || !user) return;

    /* Fetch organizer profile (avatar & name) */
    async function fetchProfile() {
      try {
        const userSnap = await getDoc(doc(db, "users", user!.uid));
        if (userSnap.exists()) {
          const u = userSnap.data();
          setAvatarURL(u.avatarURL ?? undefined);
          setOrgName(u.organizationName ?? u.fullName ?? "");
        }
      } catch (err) {
        console.error("Failed to fetch organizer profile:", err);
      }
    }
    fetchProfile();

    async function fetchStats() {
      try {
        // Active events (published)
        const activeSnap = await getDocs(
          query(
            collection(db, "events"),
            where("organizerId", "==", user!.uid),
            where("status", "==", "published")
          )
        );

        // Completed events
        const completedSnap = await getDocs(
          query(
            collection(db, "events"),
            where("organizerId", "==", user!.uid),
            where("status", "==", "completed")
          )
        );

        // All organizer events (to get IDs for participation query)
        const allEventsSnap = await getDocs(
          query(
            collection(db, "events"),
            where("organizerId", "==", user!.uid)
          )
        );
        const eventIds = allEventsSnap.docs.map((d) => d.id);

        // Pending applications
        let pendingCount = 0;
        if (eventIds.length > 0) {
          // Firestore 'in' supports max 30 values — batch if needed
          const batches: string[][] = [];
          for (let i = 0; i < eventIds.length; i += 30) {
            batches.push(eventIds.slice(i, i + 30));
          }
          for (const batch of batches) {
            const partSnap = await getDocs(
              query(
                collection(db, "participations"),
                where("eventId", "in", batch),
                where("status", "==", "applied")
              )
            );
            pendingCount += partSnap.size;
          }
        }

        setStats({
          activeEvents: activeSnap.size,
          pendingApplications: pendingCount,
          completedEvents: completedSnap.size,
        });
      } catch (err) {
        console.error("Failed to fetch organizer stats:", err);
      }
    }

    fetchStats();
  }, [user, authLoading]);

  const cards = [
    { label: "Active Events", value: stats.activeEvents, icon: "📋" },
    { label: "Pending Applications", value: stats.pendingApplications, icon: "⏳" },
    { label: "Completed Events", value: stats.completedEvents, icon: "✅" },
  ];

  return (
    <div style={page}>
      {/* ══════════ Profile Card ══════════ */}
      <div style={{ ...profileCard, marginBottom: 24 }}>
        <ImageUpload
          currentImageURL={avatarURL}
          storagePath={`organizations/${user!.uid}/avatar.jpg`}
          onUploadComplete={async (downloadURL) => {
            try {
              await updateDoc(doc(db, "users", user!.uid), { avatarURL: downloadURL });
              setAvatarURL(downloadURL);
              showToast("Profile photo updated", "success");
            } catch (err) {
              console.error(err);
              showToast("Failed to update profile photo", "error");
            }
          }}
        />
        <div>
          <h1 style={heading}>{orgName || "Dashboard"}</h1>
          <p style={sub}>Overview of your events and applications</p>
        </div>
      </div>

      <div style={grid}>
        {cards.map((card) => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              {card.icon}
            </div>
            <p style={cardLabel}>{card.label}</p>
            {card.value !== null ? (
              <p style={cardValue}>{card.value}</p>
            ) : (
              <p style={loadingValue}>Loading...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Styles ── */

const page: React.CSSProperties = {
  flex: 1,
  padding: "2.5rem 2rem",
  background: "#f9fafb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  minHeight: "100vh",
};

const profileCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 24,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.5rem 2rem",
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

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "1.25rem",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.5rem",
  transition: "box-shadow 0.2s",
};

const cardLabel: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "0 0 0.5rem",
};

const cardValue: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 700,
  color: "#246344",
  margin: 0,
};

const loadingValue: React.CSSProperties = {
  fontSize: "1rem",
  color: "#9ca3af",
  margin: 0,
};
