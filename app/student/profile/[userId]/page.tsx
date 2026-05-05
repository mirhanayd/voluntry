"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import FeedCard, { type FeedPost } from "@/components/FeedCard";

type PublicRole = "student" | "organizer";

interface PublicProfile {
  id: string;
  role: PublicRole;
  name: string;
  email: string;
  avatarURL?: string;
  universityName?: string;
  departmentName?: string;
  organizationType?: string;
  contactName?: string;
  points?: number;
}

interface PublicEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  pointValue: number;
}

type PublicFeedPost = FeedPost & { isPublic?: boolean };

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

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export default function PublicStudentProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    async function fetchPublicProfile() {
      setLoading(true);

      try {
        const userSnap = await getDoc(doc(db, "users", userId));

        if (!active) return;

        if (!userSnap.exists()) {
          setProfile(null);
          return;
        }

        const data = userSnap.data();
        const role = asString(data.role);
        const status = asString(data.status);

        if (status !== "approved" || (role !== "student" && role !== "organizer")) {
          setProfile(null);
          return;
        }

        const fullName =
          asString(data.fullName) ||
          `${asString(data.firstName)} ${asString(data.lastName)}`.trim();
        const name =
          role === "organizer"
            ? asString(data.organizationName) ||
              fullName ||
              asString(data.contactName) ||
              asString(data.email) ||
              "Organization"
            : fullName || asString(data.email) || "Student";

        const nextProfile: PublicProfile = {
          id: userId,
          role,
          name,
          email: asString(data.email),
          avatarURL: asString(data.avatarURL) || undefined,
          universityName: asString(data.universityName) || undefined,
          departmentName: asString(data.departmentName) || undefined,
          organizationType: asString(data.organizationType) || undefined,
          contactName: asString(data.contactName) || undefined,
          points: typeof data.points === "number" ? data.points : undefined,
        };

        setProfile(nextProfile);

        if (role === "student") {
          const feedSnap = await getDocs(
            query(collection(db, "feed-posts"), where("userId", "==", userId))
          );

          if (!active) return;

          setPosts(
            feedSnap.docs
              .map((item) => ({ id: item.id, ...item.data() } as PublicFeedPost))
              .filter((post) => post.isPublic === true)
              .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
          );
          setEvents([]);
          return;
        }

        const eventsSnap = await getDocs(
          query(collection(db, "events"), where("organizerId", "==", userId))
        );

        if (!active) return;

        setEvents(
          eventsSnap.docs
            .map((item) => {
              const eventData = item.data();
              return {
                id: item.id,
                title: asString(eventData.title) || "Untitled",
                date: asString(eventData.date),
                location: asString(eventData.location),
                pointValue:
                  typeof eventData.pointValue === "number"
                    ? eventData.pointValue
                    : 0,
                status: asString(eventData.status),
              };
            })
            .filter((event) => event.status === "published")
            .sort((a, b) => timeValue(b.date) - timeValue(a.date))
        );
        setPosts([]);
      } catch (err) {
        console.error("Failed to load public profile:", err);
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPublicProfile();

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <main className="public-profile-page">
        <PublicProfileStyles />
        <div className="public-profile-empty">Loading profile...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="public-profile-page">
        <PublicProfileStyles />
        <div className="public-profile-empty public-profile-error">
          Profile not found.
        </div>
      </main>
    );
  }

  const subtitle =
    profile.role === "organizer"
      ? [profile.organizationType, profile.contactName].filter(Boolean).join(" - ")
      : [profile.universityName, profile.departmentName].filter(Boolean).join(" - ");

  return (
    <main className="public-profile-page">
      <PublicProfileStyles />

      <section className="public-profile-hero">
        <div className="public-profile-avatar">
          {profile.avatarURL ? (
            <img src={profile.avatarURL} alt={profile.name} />
          ) : (
            <span>{getInitials(profile.name)}</span>
          )}
        </div>

        <div className="public-profile-title">
          <span>{profile.role === "organizer" ? "Organization" : "Student"}</span>
          <h1>{profile.name}</h1>
          <p>{subtitle || profile.email}</p>
          <div className="public-profile-pills">
            {profile.email && <b>{profile.email}</b>}
            {profile.role === "student" && typeof profile.points === "number" && (
              <b>{profile.points} pts</b>
            )}
            {profile.role === "organizer" && <b>{events.length} published events</b>}
          </div>
        </div>
      </section>

      <section className="public-profile-grid">
        <section className="public-profile-panel">
          <h2>Profile Details</h2>
          <div className="public-profile-fields">
            <Detail label="Role" value={profile.role === "organizer" ? "Organizer" : "Student"} />
            <Detail label="Email" value={profile.email || "-"} />
            {profile.role === "student" ? (
              <>
                <Detail label="University" value={profile.universityName || "-"} />
                <Detail label="Department" value={profile.departmentName || "-"} />
              </>
            ) : (
              <>
                <Detail label="Type" value={profile.organizationType || "-"} />
                <Detail label="Contact" value={profile.contactName || "-"} />
              </>
            )}
          </div>
        </section>

        <section className="public-profile-panel public-profile-panel-wide">
          <h2>{profile.role === "organizer" ? "Published Events" : "Public Posts"}</h2>

          {profile.role === "organizer" ? (
            events.length === 0 ? (
              <p className="public-profile-muted">No published events yet.</p>
            ) : (
              <div className="public-profile-events">
                {events.map((event) => (
                  <div key={event.id} className="public-profile-event">
                    <div>
                      <strong>{event.title}</strong>
                      <span>
                        {formatDate(event.date)}
                        {event.location ? ` - ${event.location}` : ""}
                      </span>
                    </div>
                    <b>{event.pointValue} pts</b>
                  </div>
                ))}
              </div>
            )
          ) : posts.length === 0 ? (
            <p className="public-profile-muted">No public posts yet.</p>
          ) : (
            <div className="public-profile-posts">
              {posts.map((post) => (
                <FeedCard key={post.id} post={post} hideLike />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="public-profile-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PublicProfileStyles() {
  return (
    <style>{`
      .public-profile-page {
        min-height: 100vh;
        padding: 28px clamp(16px, 4vw, 44px) 44px;
        background:
          linear-gradient(180deg, #ffffff 0, #f9fafb 260px),
          #f9fafb;
        color: #111827;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      }

      .public-profile-hero,
      .public-profile-grid,
      .public-profile-empty {
        width: min(1040px, 100%);
        margin: 0 auto;
      }

      .public-profile-hero {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 24px;
        padding: 26px 0 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .public-profile-avatar {
        width: 118px;
        height: 118px;
        border: 1px solid #d1fae5;
        border-radius: 50%;
        overflow: hidden;
        background: #f0faf5;
        color: #246344;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        font-weight: 900;
      }

      .public-profile-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .public-profile-title {
        min-width: 0;
      }

      .public-profile-title > span {
        display: inline-flex;
        margin-bottom: 8px;
        color: #246344;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .public-profile-title h1 {
        margin: 0;
        color: #111827;
        font-size: clamp(1.9rem, 4vw, 3rem);
        line-height: 1.05;
        letter-spacing: 0;
      }

      .public-profile-title p {
        margin: 8px 0 0;
        color: #6b7280;
        font-size: 0.96rem;
      }

      .public-profile-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .public-profile-pills b {
        border: 1px solid #dbeafe;
        border-radius: 999px;
        background: #eff6ff;
        color: #1d4ed8;
        padding: 5px 10px;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .public-profile-pills b:last-child {
        border-color: #d1fae5;
        background: #f0faf5;
        color: #246344;
      }

      .public-profile-grid {
        display: grid;
        grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
        gap: 16px;
        padding-top: 18px;
      }

      .public-profile-panel {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .public-profile-panel h2 {
        margin: 0 0 14px;
        color: #111827;
        font-size: 0.98rem;
        font-weight: 800;
      }

      .public-profile-fields,
      .public-profile-events {
        display: grid;
        gap: 10px;
      }

      .public-profile-field,
      .public-profile-event {
        padding: 12px;
        border: 1px solid #eef2f7;
        border-radius: 8px;
        background: #f9fafb;
      }

      .public-profile-field span {
        display: block;
        color: #6b7280;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .public-profile-field strong {
        display: block;
        margin-top: 5px;
        overflow: hidden;
        color: #111827;
        font-size: 0.92rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .public-profile-event {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .public-profile-event div {
        min-width: 0;
      }

      .public-profile-event strong,
      .public-profile-event span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .public-profile-event strong {
        color: #111827;
        font-size: 0.9rem;
      }

      .public-profile-event span {
        margin-top: 3px;
        color: #6b7280;
        font-size: 0.78rem;
      }

      .public-profile-event b {
        flex: 0 0 auto;
        color: #246344;
        font-size: 0.9rem;
      }

      .public-profile-muted {
        margin: 0;
        color: #6b7280;
        font-size: 0.9rem;
      }

      .public-profile-posts {
        display: grid;
        gap: 0;
      }

      .public-profile-empty {
        padding: 22px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #ffffff;
        color: #6b7280;
        font-size: 0.92rem;
      }

      .public-profile-error {
        color: #b91c1c;
        border-color: #fecaca;
        background: #fef2f2;
      }

      @media (max-width: 760px) {
        .public-profile-page {
          padding-top: 18px;
        }

        .public-profile-hero,
        .public-profile-grid {
          grid-template-columns: 1fr;
        }

        .public-profile-hero {
          justify-items: center;
          text-align: center;
          gap: 14px;
        }

        .public-profile-pills {
          justify-content: center;
        }
      }
    `}</style>
  );
}
