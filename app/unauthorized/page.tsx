"use client";

import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_2.png" alt="VolunTRY" style={{ height: 48, marginBottom: 16 }} />

      {/* Lock emoji */}
      <div style={{ fontSize: 64, margin: 24 }}>🔒</div>

      {/* Title */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 8px 0",
        }}
      >
        Access Denied
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 14,
          color: "#6b7280",
          margin: "0 0 32px 0",
        }}
      >
        You don&apos;t have permission to view this page.
      </p>

      {/* Go Back button */}
      <button
        onClick={() => router.back()}
        style={{
          background: "#246344",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "10px 24px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 12,
          transition: "opacity 0.2s",
        }}
      >
        Go Back
      </button>

      {/* Go to Home button */}
      <button
        onClick={() => router.push("/")}
        style={{
          background: "white",
          color: "#246344",
          border: "1px solid #246344",
          borderRadius: 8,
          padding: "10px 24px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
      >
        Go to Home
      </button>
    </div>
  );
}
