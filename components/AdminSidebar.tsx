"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "User Management", href: "/admin/users" },
  { label: "Organizer Management", href: "/admin/organizers" },
  { label: "Event Audit", href: "/admin/events" },
  { label: "Reports", href: "/admin/reports" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingOrgCount, setPendingOrgCount] = useState(0);

  // Fetch pending org request count
  useEffect(() => {
    async function fetchCount() {
      try {
        const snap = await getDocs(
          query(collection(db, "organizer_requests"), where("status", "==", "pending"))
        );
        setPendingOrgCount(snap.size);
      } catch {
        // ignore
      }
    }
    fetchCount();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0d2818 0%, #1a4a32 50%, #246344 100%)",
        padding: "2rem 0",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "0 1.25rem 1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: "1.15rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          Admin Panel
        </span>
      </div>

      {/* Nav Links */}
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin/organizers"
            ? pathname.startsWith("/admin/organizers")
            : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "block",
              padding: "10px 1.25rem",
              color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
              background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
              borderLeft: isActive ? "3px solid #6ee7a0" : "3px solid transparent",
              textDecoration: "none",
              fontSize: "0.88rem",
              fontWeight: isActive ? 600 : 400,
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {item.label}
          </Link>
        );
      })}

      {/* Organization Requests — separate link with badge */}
      <Link
        href="/admin/organizers/requests"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 1.25rem",
          color: pathname === "/admin/organizers/requests" ? "#fff" : "rgba(255,255,255,0.7)",
          background: pathname === "/admin/organizers/requests" ? "rgba(255,255,255,0.12)" : "transparent",
          borderLeft: pathname === "/admin/organizers/requests" ? "3px solid #6ee7a0" : "3px solid transparent",
          textDecoration: "none",
          fontSize: "0.88rem",
          fontWeight: pathname === "/admin/organizers/requests" ? 600 : 400,
          transition: "background 0.2s, color 0.2s",
        }}
      >
        <span>Org Requests</span>
        {pendingOrgCount > 0 && (
          <span
            style={{
              background: "#dc2626",
              color: "#fff",
              fontSize: "0.68rem",
              fontWeight: 700,
              borderRadius: 10,
              padding: "1px 7px",
              minWidth: 18,
              textAlign: "center",
            }}
          >
            {pendingOrgCount}
          </span>
        )}
      </Link>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sign Out */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "0.75rem 1.25rem 0",
          marginTop: "0.5rem",
        }}
      >
        <button
          onClick={handleSignOut}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 0",
            background: "transparent",
            border: "none",
            color: "#fca5a5",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
            borderRadius: 6,
            transition: "background 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.15)";
            e.currentTarget.style.color = "#fecaca";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#fca5a5";
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
