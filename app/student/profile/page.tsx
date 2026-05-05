"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import ImageUpload from "@/components/ImageUpload";
import FeedCard, { type FeedPost } from "@/components/FeedCard";

interface UserProfile {
  fullName: string;
  email: string;
  universityName: string;
  departmentName: string;
  points: number;
  avatarURL?: string;
}

interface HistoryRow {
  eventId: string;
  title: string;
  date: string;
  organizerName: string;
  pointValue: number;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function timeValue(value?: string) {
  const time = new Date(value ?? "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pointsSpent, setPointsSpent] = useState(0);
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const currentUser = user;
    let active = true;

    async function fetchProfile() {
      setLoading(true);

      try {
        const uid = currentUser.uid;
        const [
          userSnap,
          attendedSnap,
          certsSnap,
          redemptionsSnap,
          feedSnap,
        ] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getDocs(
            query(
              collection(db, "participations"),
              where("userId", "==", uid),
              where("attendanceConfirmed", "==", true)
            )
          ),
          getDocs(query(collection(db, "certificates"), where("uid", "==", uid))),
          getDocs(query(collection(db, "redemptions"), where("uid", "==", uid))),
          getDocs(query(collection(db, "feed-posts"), where("userId", "==", uid))),
        ]);

        if (!active) return;

        if (!userSnap.exists()) {
          setProfile(null);
          return;
        }

        const data = userSnap.data();
        setProfile({
          fullName: asString(data.fullName) || currentUser.email || "Student",
          email: asString(data.email) || currentUser.email || "",
          universityName: asString(data.universityName),
          departmentName: asString(data.departmentName),
          points: typeof data.points === "number" ? data.points : 0,
          avatarURL: asString(data.avatarURL) || undefined,
        });

        setTotalEarned(
          certsSnap.docs.reduce((sum, item) => sum + (item.data().pointValue ?? 0), 0)
        );

        setPointsSpent(
          redemptionsSnap.docs.reduce(
            (sum, item) => sum + (item.data().pointCost ?? 0),
            0
          )
        );

        const eventRows = await Promise.all(
          attendedSnap.docs.map(async (participationDoc) => {
            const eventId = asString(participationDoc.data().eventId);
            if (!eventId) return null;

            try {
              const eventSnap = await getDoc(doc(db, "events", eventId));
              if (!eventSnap.exists()) return null;

              const eventData = eventSnap.data();
              const restrictions = Array.isArray(eventData.departmentRestriction)
                ? eventData.departmentRestriction
                : [];

              return {
                eventId,
                title: asString(eventData.title) || "Untitled",
                date: asString(eventData.date),
                organizerName: asString(eventData.organizerName) || "-",
                pointValue:
                  typeof eventData.pointValue === "number"
                    ? eventData.pointValue
                    : 0,
                restrictions: restrictions.filter(
                  (item): item is string =>
                    typeof item === "string" && item.trim() !== "" && item !== "All"
                ),
              };
            } catch {
              return null;
            }
          })
        );

        if (!active) return;

        const nextCompetencies = new Set<string>();
        const nextHistory: HistoryRow[] = [];

        eventRows.forEach((row) => {
          if (!row) return;
          row.restrictions.forEach((item) => nextCompetencies.add(item));
          nextHistory.push({
            eventId: row.eventId,
            title: row.title,
            date: row.date,
            organizerName: row.organizerName,
            pointValue: row.pointValue,
          });
        });

        setCompetencies([...nextCompetencies].sort());
        setHistory(nextHistory.sort((a, b) => timeValue(b.date) - timeValue(a.date)));
        setMyPosts(
          feedSnap.docs
            .map((item) => ({ id: item.id, ...item.data() } as FeedPost))
            .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
        );
      } catch (err) {
        console.error("Failed to load profile:", err);
        showToast("Failed to load profile.", "error");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, [authLoading, showToast, user]);

  async function handleAvatarUpload(downloadURL: string) {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), { avatarURL: downloadURL });
      setProfile((current) =>
        current ? { ...current, avatarURL: downloadURL } : current
      );
      showToast("Profile photo updated", "success");
    } catch (err) {
      console.error("Failed to update profile photo:", err);
      showToast("Failed to update profile photo", "error");
    }
  }

  if (loading || authLoading) {
    return (
      <main className="profile-page">
        <ProfileStyles />
        <div className="profile-empty">Loading profile...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <ProfileStyles />
        <div className="profile-empty profile-error">Could not load profile data.</div>
      </main>
    );
  }

  const affiliation = [profile.universityName, profile.departmentName]
    .filter(Boolean)
    .join(" - ");

  return (
    <main className="profile-page">
      <ProfileStyles />

      <section className="profile-hero">
        <ImageUpload
          currentImageURL={profile.avatarURL}
          storagePath={`users/${user!.uid}/avatar.jpg`}
          onUploadComplete={handleAvatarUpload}
          size={118}
        />

        <div className="profile-title-block">
          <span className="profile-kicker">Student Profile</span>
          <h1>{profile.fullName}</h1>
          <p>{affiliation || profile.email}</p>
          <div className="profile-pill-row">
            <span>{profile.email}</span>
            <span>{profile.points} available pts</span>
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <ProfilePanel title="Profile Information">
          <div className="profile-field-grid">
            <ProfileField label="Full Name" value={profile.fullName} />
            <ProfileField label="Email" value={profile.email} />
            <ProfileField label="University" value={profile.universityName || "-"} />
            <ProfileField label="Department" value={profile.departmentName || "-"} />
          </div>
        </ProfilePanel>

        <ProfilePanel title="Virtual Wallet">
          <div className="profile-stat-grid">
            <ProfileStat label="Earned" value={totalEarned} tone="green" />
            <ProfileStat label="Spent" value={pointsSpent} tone="red" />
            <ProfileStat label="Balance" value={profile.points} tone="blue" />
          </div>
        </ProfilePanel>

        <ProfilePanel title="Competency Map">
          {competencies.length === 0 ? (
            <p className="profile-muted">No competencies yet.</p>
          ) : (
            <div className="profile-tags">
              {competencies.map((competency) => (
                <span key={competency}>{competency}</span>
              ))}
            </div>
          )}
        </ProfilePanel>

        <ProfilePanel title="Participation History">
          {history.length === 0 ? (
            <p className="profile-muted">No participation history yet.</p>
          ) : (
            <div className="profile-history">
              {history.map((item) => (
                <div key={item.eventId} className="profile-history-row">
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {formatDate(item.date)} - {item.organizerName}
                    </span>
                  </div>
                  <b>+{item.pointValue}</b>
                </div>
              ))}
            </div>
          )}
        </ProfilePanel>

        <ProfilePanel title="My Posts" wide>
          {myPosts.length === 0 ? (
            <p className="profile-muted">No posts yet.</p>
          ) : (
            <div className="profile-posts">
              {myPosts.map((post) => (
                <FeedCard key={post.id} post={post} hideLike />
              ))}
            </div>
          )}
        </ProfilePanel>
      </section>
    </main>
  );
}

function ProfilePanel({
  children,
  title,
  wide = false,
}: {
  children: React.ReactNode;
  title: string;
  wide?: boolean;
}) {
  return (
    <section className={`profile-panel${wide ? " profile-panel-wide" : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "blue";
}) {
  return (
    <div className={`profile-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileStyles() {
  return (
    <style>{`
      .profile-page {
        min-height: 100vh;
        padding: 28px clamp(16px, 4vw, 44px) 44px;
        background:
          linear-gradient(180deg, #ffffff 0, #f9fafb 260px),
          #f9fafb;
        color: #111827;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      }

      .profile-hero,
      .profile-grid {
        width: min(1040px, 100%);
        margin: 0 auto;
      }

      .profile-hero {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 24px;
        padding: 26px 0 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .profile-title-block {
        min-width: 0;
      }

      .profile-kicker {
        display: inline-flex;
        margin-bottom: 8px;
        color: #246344;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .profile-title-block h1 {
        margin: 0;
        color: #111827;
        font-size: clamp(1.9rem, 4vw, 3rem);
        line-height: 1.05;
        letter-spacing: 0;
      }

      .profile-title-block p {
        margin: 8px 0 0;
        color: #6b7280;
        font-size: 0.96rem;
      }

      .profile-pill-row,
      .profile-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .profile-pill-row {
        margin-top: 14px;
      }

      .profile-pill-row span,
      .profile-tags span {
        border: 1px solid #dbeafe;
        border-radius: 999px;
        background: #eff6ff;
        color: #1d4ed8;
        padding: 5px 10px;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .profile-pill-row span:last-child {
        border-color: #d1fae5;
        background: #f0faf5;
        color: #246344;
      }

      .profile-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        padding-top: 18px;
      }

      .profile-panel {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .profile-panel-wide {
        grid-column: 1 / -1;
      }

      .profile-panel h2 {
        margin: 0 0 14px;
        color: #111827;
        font-size: 0.98rem;
        font-weight: 800;
      }

      .profile-field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .profile-field {
        min-width: 0;
        padding: 12px;
        border: 1px solid #eef2f7;
        border-radius: 8px;
        background: #f9fafb;
      }

      .profile-field span,
      .profile-stat span {
        display: block;
        color: #6b7280;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .profile-field strong {
        display: block;
        margin-top: 5px;
        overflow: hidden;
        color: #111827;
        font-size: 0.92rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .profile-stat-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .profile-stat {
        padding: 14px;
        border: 1px solid #eef2f7;
        border-radius: 8px;
        background: #f9fafb;
      }

      .profile-stat strong {
        display: block;
        margin-top: 6px;
        font-size: 1.55rem;
        line-height: 1;
      }

      .profile-stat.green strong { color: #246344; }
      .profile-stat.red strong { color: #b91c1c; }
      .profile-stat.blue strong { color: #1d4ed8; }

      .profile-muted {
        margin: 0;
        color: #6b7280;
        font-size: 0.9rem;
      }

      .profile-history {
        display: grid;
        gap: 10px;
      }

      .profile-history-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border: 1px solid #eef2f7;
        border-radius: 8px;
        background: #f9fafb;
      }

      .profile-history-row div {
        min-width: 0;
      }

      .profile-history-row strong,
      .profile-history-row span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .profile-history-row strong {
        color: #111827;
        font-size: 0.9rem;
      }

      .profile-history-row span {
        margin-top: 3px;
        color: #6b7280;
        font-size: 0.78rem;
      }

      .profile-history-row b {
        flex: 0 0 auto;
        color: #246344;
        font-size: 0.9rem;
      }

      .profile-posts {
        display: grid;
        gap: 0;
      }

      .profile-empty {
        width: min(1040px, 100%);
        margin: 0 auto;
        padding: 22px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #ffffff;
        color: #6b7280;
        font-size: 0.92rem;
      }

      .profile-error {
        color: #b91c1c;
        border-color: #fecaca;
        background: #fef2f2;
      }

      @media (max-width: 760px) {
        .profile-page {
          padding-top: 18px;
        }

        .profile-hero,
        .profile-grid,
        .profile-field-grid,
        .profile-stat-grid {
          grid-template-columns: 1fr;
        }

        .profile-hero {
          justify-items: center;
          text-align: center;
          gap: 14px;
        }

        .profile-pill-row,
        .profile-tags {
          justify-content: center;
        }
      }
    `}</style>
  );
}
