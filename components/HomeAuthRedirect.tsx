"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "@/app/login/page";
import { useAuth } from "@/hooks/useAuth";

export default function HomeAuthRedirect() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    switch (role) {
      case "admin":
        router.replace("/admin/dashboard");
        break;
      case "organizer":
        router.replace("/organizer/feed");
        break;
      case "student":
        router.replace("/student/feed");
        break;
      default:
        router.replace("/login");
    }
  }, [user, role, loading, router]);

  return <LoginPage />;
}
