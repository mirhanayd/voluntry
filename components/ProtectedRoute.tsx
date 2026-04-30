"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!role || !allowedRoles.includes(role)) {
        router.replace("/unauthorized");
      }
    }
  }, [user, role, loading, allowedRoles, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
