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
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

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

  if (authLoading || !user) {
    return (
      <div style={page}>
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      </div>
    );
  }

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
        <PageHeader
          title={orgName || "Dashboard"}
          subtitle="Overview of your events and applications"
        />
      </div>

      <div style={grid}>
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value !== null ? card.value : "Loading..."}
            icon={card.icon}
            color={card.value !== null ? "#246344" : "#9ca3af"}
          />
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

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "1.25rem",
};
