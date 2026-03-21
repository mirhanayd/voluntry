"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/student/dashboard");
    } catch (err: any) {
      switch (err.code) {
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
        <Link href="/register" className={styles.orgButton}>
          Are you an organization?
        </Link>

        <div className={styles.card}>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>Welcome back to VolunTRY</p>

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
              disabled={loading}
              className={styles.button}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className={styles.registerText}>
            You don&apos;t have an account?{" "}
            <Link href="/register" className={styles.registerLink}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}