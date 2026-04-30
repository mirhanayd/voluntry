"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/feed");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        color: "#9ca3af",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      Redirecting…
    </div>
  );
}
