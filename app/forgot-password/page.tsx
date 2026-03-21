"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      switch (err.code) {
        case "auth/user-not-found":
          setError("No account found with this email.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrapper}>
          <img src="/logo.png" alt="VolunTRY" style={styles.logo} />
        </div>

        {sent ? (
          /* ── Success state ── */
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✉️</div>
            <h2 style={styles.successTitle}>Check your email</h2>
            <p style={styles.successText}>
              We sent a password reset link to{" "}
              <strong>{email}</strong>
            </p>
            <Link href="/login" style={styles.backLink}>
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 style={styles.title}>Forgot Password</h1>
            <p style={styles.subtitle}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleReset} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  style={styles.input}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#246344";
                    e.target.style.boxShadow = "0 0 0 3px rgba(36,99,68,0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.65 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = "#1a4a32";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = "#246344";
                }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <p style={styles.bottomText}>
              Remember your password?{" "}
              <Link href="/login" style={styles.signInLink}>
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Inline Styles ── */
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    padding: "1.5rem",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "40px 36px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  },
  logoWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "28px",
  },
  logo: {
    height: "60px",
    objectFit: "contain" as const,
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 6px",
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: "0.88rem",
    color: "#6b7280",
    textAlign: "center" as const,
    margin: "0 0 1.75rem",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.25rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "11px 14px",
    fontSize: "0.9rem",
    border: "1.5px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.25s, box-shadow 0.25s",
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  button: {
    padding: "12px",
    backgroundColor: "#246344",
    color: "#ffffff",
    fontSize: "0.95rem",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    transition: "background-color 0.2s",
    width: "100%",
  },
  bottomText: {
    textAlign: "center" as const,
    fontSize: "0.82rem",
    color: "#6b7280",
    marginTop: "1.5rem",
  },
  signInLink: {
    color: "#246344",
    fontWeight: "600",
    textDecoration: "none",
  },
  /* success state */
  successBox: {
    textAlign: "center" as const,
    padding: "1rem 0",
  },
  successIcon: {
    fontSize: "2.5rem",
    marginBottom: "0.75rem",
  },
  successTitle: {
    fontSize: "1.35rem",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px",
  },
  successText: {
    fontSize: "0.9rem",
    color: "#374151",
    lineHeight: "1.6",
    margin: "0 0 1.5rem",
  },
  backLink: {
    color: "#246344",
    fontWeight: "600",
    textDecoration: "none",
    fontSize: "0.88rem",
  },
};
