"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db }      from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import ImageUpload from "@/components/ImageUpload";

/* ── Types ─────────────────────────────────────────────────────────────────── */

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

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [editMode, setEditMode]           = useState(false);
  const [editName, setEditName]           = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState("");

  const [totalEarned, setTotalEarned]     = useState(0);
  const [pointsSpent, setPointsSpent]     = useState(0);

  const [competencies, setCompetencies]   = useState<string[]>([]);
  const [history, setHistory]             = useState<HistoryRow[]>([]);

  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchProfile() {
      try {
        const uid = user!.uid;

        // ── Parallel fetches ────────────────────────────────────────────
        const [userSnap, attendedSnap, certsSnap, redemptionsSnap] =
          await Promise.all([
            getDoc(doc(db, "users", uid)),
            getDocs(
              query(
                collection(db, "participations"),
                where("userId", "==", uid),
                where("attendanceConfirmed", "==", true)
              )
            ),
            getDocs(
              query(
                collection(db, "certificates"),
                where("uid", "==", uid)
              )
            ),
            getDocs(
              query(
                collection(db, "redemptions"),
                where("uid", "==", uid)
              )
            ),
          ]);

        // User profile
        if (userSnap.exists()) {
          const u = userSnap.data();
          const prof: UserProfile = {
            fullName:       u.fullName       ?? "",
            email:          u.email          ?? user!.email ?? "",
            universityName: u.universityName ?? "",
            departmentName: u.departmentName ?? "",
            points:         u.points         ?? 0,
            avatarURL:      u.avatarURL      ?? undefined,
          };
          setProfile(prof);
          setEditName(prof.fullName);
        }

        // Total earned (from certificates)
        let earned = 0;
        certsSnap.docs.forEach((d) => {
          earned += d.data().pointValue ?? 0;
        });
        setTotalEarned(earned);

        // Points spent
        let spent = 0;
        redemptionsSnap.docs.forEach((d) => {
          spent += d.data().pointCost ?? 0;
        });
        setPointsSpent(spent);

        // ── Competency map + history ────────────────────────────────────
        const deptSet = new Set<string>();
        const rows: HistoryRow[] = [];

        for (const pDoc of attendedSnap.docs) {
          const p = pDoc.data();
          try {
            const evSnap = await getDoc(doc(db, "events", p.eventId));
            if (evSnap.exists()) {
              const ev = evSnap.data();

              // Competency departments
              const depts: string[] = ev.departmentRestriction ?? [];
              depts.forEach((d: string) => {
                if (d !== "All") deptSet.add(d);
              });

              rows.push({
                eventId:       p.eventId,
                title:         ev.title         ?? "Untitled",
                date:          ev.date          ?? "",
                organizerName: ev.organizerName ?? "—",
                pointValue:    ev.pointValue    ?? 0,
              });
            }
          } catch {
            /* skip */
          }
        }

        // Sort history by date desc
        rows.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setCompetencies(Array.from(deptSet).sort());
        setHistory(rows);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, authLoading]);

  /* ── Save full name ────────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await updateDoc(doc(db, "users", user.uid), { fullName: editName.trim() });
      setProfile((prev) => (prev ? { ...prev, fullName: editName.trim() } : prev));
      setEditMode(false);
      setSaveMsg("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setSaveMsg("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  if (loading || authLoading) {
    return (
      <div style={page}>
        <p style={{ color: "#9ca3af" }}>Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={page}>
        <p style={{ color: "#b91c1c" }}>Could not load profile data.</p>
      </div>
    );
  }

  const currentBalance = profile.points;

  return (
    <div style={page}>
      <h1 style={heading}>My Profile</h1>
      <p style={sub}>Manage your information, wallet and history</p>

      {/* ══════════ Section 1 — Profile Info ══════════ */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 16 }}>
          <ImageUpload
            currentImageURL={profile.avatarURL}
            storagePath={`users/${user!.uid}/avatar.jpg`}
            onUploadComplete={async (downloadURL) => {
              try {
                await updateDoc(doc(db, "users", user!.uid), { avatarURL: downloadURL });
                setProfile((prev) => prev ? { ...prev, avatarURL: downloadURL } : prev);
                showToast("Profile photo updated", "success");
              } catch (err) {
                console.error(err);
                showToast("Failed to update profile photo", "error");
              }
            }}
          />
          <div>
            <h2 style={{ ...sectionTitle, margin: "0 0 0.25rem" }}>{profile.fullName}</h2>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>{profile.email}</p>
          </div>
        </div>

        <h2 style={sectionTitle}>Profile Information</h2>

        {saveMsg && (
          <div
            style={{
              ...msgBox,
              background: saveMsg.includes("success") ? "#f0faf5" : "#fef2f2",
              borderColor: saveMsg.includes("success") ? "#86efac" : "#fca5a5",
              color: saveMsg.includes("success") ? "#246344" : "#b91c1c",
            }}
          >
            {saveMsg}
          </div>
        )}

        <div style={fieldGrid}>
          {/* Full Name */}
          <div style={fieldGroup}>
            <label style={label}>Full Name</label>
            {editMode ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={input}
              />
            ) : (
              <p style={fieldValue}>{profile.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div style={fieldGroup}>
            <label style={label}>Email</label>
            <p style={fieldValue}>{profile.email}</p>
          </div>

          {/* University */}
          <div style={fieldGroup}>
            <label style={label}>University</label>
            <p style={fieldValue}>{profile.universityName || "—"}</p>
          </div>

          {/* Department */}
          <div style={fieldGroup}>
            <label style={label}>Department</label>
            <p style={fieldValue}>{profile.departmentName || "—"}</p>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          {editMode ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...primaryBtn,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditName(profile.fullName);
                }}
                style={secondaryBtn}
              >
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} style={secondaryBtn}>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ══════════ Section 2 — Virtual Wallet ══════════ */}
      <div style={{ ...card, marginTop: 20 }}>
        <h2 style={sectionTitle}>Virtual Wallet</h2>
        <div style={walletGrid}>
          <div style={walletCard}>
            <p style={walletLabel}>Total Points Earned</p>
            <p style={walletValue}>{totalEarned}</p>
          </div>
          <div style={walletCard}>
            <p style={walletLabel}>Points Spent</p>
            <p style={{ ...walletValue, color: "#b91c1c" }}>{pointsSpent}</p>
          </div>
          <div style={walletCard}>
            <p style={walletLabel}>Current Balance</p>
            <p style={walletValue}>{currentBalance}</p>
          </div>
        </div>
      </div>

      {/* ══════════ Section 3 — Competency Map ══════════ */}
      <div style={{ ...card, marginTop: 20 }}>
        <h2 style={sectionTitle}>Competency Map</h2>
        {competencies.length === 0 ? (
          <p style={{ color: "#6b7280", margin: 0, fontSize: "0.88rem" }}>
            Participate in events to build your competency map.
          </p>
        ) : (
          <div style={tagGrid}>
            {competencies.map((c) => (
              <span key={c} style={tag}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ Section 4 — Participation History ══════════ */}
      <div style={{ ...card, marginTop: 20 }}>
        <h2 style={sectionTitle}>Participation History</h2>

        {history.length === 0 ? (
          <p style={{ color: "#6b7280", margin: 0, fontSize: "0.88rem" }}>
            No participation history yet.
          </p>
        ) : (
          <div style={historyList}>
            {history.map((h) => (
              <div key={h.eventId} style={historyRow}>
                <div>
                  <p style={historyTitle}>{h.title}</p>
                  <p style={historyMeta}>
                    {h.date} · {h.organizerName}
                  </p>
                </div>
                <span style={pointsBadge}>+{h.pointValue} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
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

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "1.5rem 2rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 1rem",
};

const msgBox: React.CSSProperties = {
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: "0.85rem",
  marginBottom: "1rem",
  border: "1px solid",
};

const fieldGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const fieldGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const label: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const fieldValue: React.CSSProperties = {
  fontSize: "0.92rem",
  color: "#111827",
  margin: 0,
};

const input: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: "0.88rem",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  outline: "none",
  color: "#111827",
  backgroundColor: "#ffffff",
  width: "100%",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 20px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "#246344",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "8px 20px",
  fontSize: "0.85rem",
  fontWeight: 600,
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
};

/* ── Wallet ── */

const walletGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 14,
};

const walletCard: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "1.25rem",
};

const walletLabel: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  margin: "0 0 0.4rem",
};

const walletValue: React.CSSProperties = {
  fontSize: "1.6rem",
  fontWeight: 700,
  color: "#246344",
  margin: 0,
};

/* ── Competency ── */

const tagGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const tag: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 14px",
  borderRadius: 20,
  fontSize: "0.82rem",
  fontWeight: 600,
  background: "#f0faf5",
  color: "#246344",
  border: "1px solid #246344",
};

/* ── History ── */

const historyList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const historyRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.75rem 1rem",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
};

const historyTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.9rem",
  color: "#111827",
  margin: "0 0 2px",
};

const historyMeta: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#6b7280",
  margin: 0,
};

const pointsBadge: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "#246344",
  whiteSpace: "nowrap",
};
