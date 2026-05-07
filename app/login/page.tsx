"use client";

import { useState, Suspense } from "react";
import { FirebaseError } from "firebase/app";
import { signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

function getFirebaseErrorCode(error: unknown) {
  return error instanceof FirebaseError ? error.code : "";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showPendingPopup, setShowPendingPopup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Check user status in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        setError("Account not found. Please register first.");
        return;
      }

      const userData = userDoc.data();

      if (userData.status === "pending") {
        // Sign out immediately — not approved yet
        await signOut(auth);
        setShowPendingPopup(true);
        return;
      }

      // Approved — redirect based on role
      if (userData.role === "admin") {
        router.push("/admin/dashboard");
      } else if (userData.role === "organizer") {
        router.push("/organizer/feed");
      } else {
        router.push("/student/feed");
      }
    } catch (err: unknown) {
      switch (getFirebaseErrorCode(err)) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please wait a moment.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setGuestLoading(true);

    try {
      const { user } = await signInAnonymously(auth);
      const token = await user.getIdToken();
      const response = await fetch("/api/guest-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error("Guest API error:", response.status, body);
        throw new Error(body?.error || "Failed to create guest profile.");
      }

      router.push("/student/feed");
    } catch (err: unknown) {
      console.error("Guest sign-in error:", err);
      await signOut(auth).catch(() => {});
      if (getFirebaseErrorCode(err) === "auth/operation-not-allowed") {
        setError("Guest sign-in is not enabled. Please contact an administrator.");
      } else {
        const msg = err instanceof Error ? err.message : "Guest sign-in failed. Please try again.";
        setError(msg);
      }
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ========== LEFT PANEL — Animated Brand ========== */}
      <div className={styles.leftPanel}>
        {/* floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.particle} />
        ))}

        {/* decorative lines */}
        <div className={styles.diagonalLine} />
        <div className={styles.diagonalLine2} />

        {/* glow rings */}
        <div className={styles.glowRing} />
        <div className={styles.glowRing2} />

        {/* logo + tagline */}
        <div className={styles.logoContainer}>
          <img
            src="/logo_2.png"
            alt="VolunTRY"
            className={styles.logo}
            draggable={false}
          />
          <span className={styles.tagline}>
            Connect &bull; Volunteer &bull; Impact
          </span>
        </div>
      </div>

      {/* ========== RIGHT PANEL — Login Form ========== */}
      <div className={styles.rightPanel}>
        {/* Organization link — top right */}
        <Link href="/register/organization" className={styles.orgButton}>
          Are you an organization?
        </Link>

        <div className={styles.card}>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>Welcome back to VolunTRY</p>

          {/* Timeout Info */}
          {reason === "timeout" && (
            <div style={timeoutStyle}>
              You were signed out due to inactivity.
            </div>
          )}

          {/* Error Alert */}
          {error && <div className={styles.errorBox}>{error}</div>}

          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={styles.input}
              />
            </div>

            {/* Forgot password link */}
            <div className={styles.forgotRow}>
              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || guestLoading}
              className={styles.button}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            disabled={loading || guestLoading}
            className={styles.guestButton}
            onClick={handleGuestLogin}
          >
            {guestLoading ? "Opening guest mode..." : "Guest User"}
          </button>

          <p className={styles.registerText}>
            You don&apos;t have an account?{" "}
            <Link href="/register" className={styles.registerLink}>
              Register
            </Link>
          </p>

          <p style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
            Are you an organization?{" "}
            <Link
              href="/register/organization"
              style={{ color: "#6b7280", textDecoration: "underline", fontWeight: 500 }}
            >
              Register here
            </Link>
          </p>
        </div>
      </div>

      {/* ── Pending Approval Popup ── */}
      {showPendingPopup && (
        <div style={popupStyles.overlay}>
          <div style={popupStyles.popup}>
            <div style={popupStyles.icon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#246344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            <h2 style={popupStyles.title}>Account Pending</h2>

            <p style={popupStyles.text}>
              Your account is still on the Ministry&apos;s{" "}
              <span style={popupStyles.highlight}>pending approval</span> list.
            </p>

            <p style={popupStyles.subtext}>
              An administrator has not yet approved your registration.
              Please check back later.
            </p>

            <button
              onClick={() => setShowPendingPopup(false)}
              style={popupStyles.button}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a4a32")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#246344")}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────────── */

const timeoutStyle: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  color: "#92400e",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "14px",
  marginBottom: "16px",
  textAlign: "center",
};

const popupStyles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  popup: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "40px 36px",
    maxWidth: "420px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  icon: {
    marginBottom: "20px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 12px 0",
  },
  text: {
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.6",
    margin: "0 0 8px 0",
  },
  highlight: {
    display: "inline-block",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  subtext: {
    fontSize: "13px",
    color: "#6b7280",
    lineHeight: "1.5",
    margin: "0 0 24px 0",
  },
  button: {
    padding: "12px 32px",
    backgroundColor: "#246344",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};
