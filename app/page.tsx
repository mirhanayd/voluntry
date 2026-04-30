"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    switch (role) {
      case "admin":
        router.replace("/admin/dashboard");
        break;
      case "organizer":
        router.replace("/organizer/dashboard");
        break;
      case "student":
        router.replace("/student/feed");
        break;
      default:
        router.replace("/login");
    }
  }, [user, role, loading, router]);

  // Loading spinner while auth state resolves
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f9fafb",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "4px solid #e5e7eb",
            borderTop: "4px solid #246344",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
          Loading...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
