"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const navItems = [
  { label: "Dashboard", href: "/organizer/dashboard" },
  { label: "My Events", href: "/organizer/events" },
  { label: "Create Event", href: "/organizer/events/create" },
  { label: "Feedbacks", href: "/organizer/feedbacks" },
];

export default function OrganizerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <aside style={sidebar}>
      {/* Brand */}
      <div style={brandBox}>
        <span style={brandText}>Organizer Panel</span>
      </div>

      {/* Nav Links */}
      {navItems.map((item) => {
        const isActive =
          item.href === "/organizer/events/create"
            ? pathname === item.href
            : item.href === "/organizer/events"
              ? pathname === item.href || (pathname.startsWith("/organizer/events") && pathname !== "/organizer/events/create")
              : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...navLink,
              color: isActive ? "#246344" : "#374151",
              background: isActive ? "#f0faf5" : "transparent",
              borderLeft: isActive
                ? "3px solid #246344"
                : "3px solid transparent",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {item.label}
          </Link>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sign Out */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
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
            color: "#dc2626",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
            borderRadius: 6,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fef2f2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const sidebar: React.CSSProperties = {
  width: 240,
  minHeight: "100vh",
  background: "#ffffff",
  borderRight: "1px solid #e5e7eb",
  padding: "2rem 0",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const brandBox: React.CSSProperties = {
  padding: "0 1.25rem 1.5rem",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: "0.5rem",
};

const brandText: React.CSSProperties = {
  color: "#246344",
  fontSize: "1.15rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
};

const navLink: React.CSSProperties = {
  display: "block",
  padding: "10px 1.25rem",
  textDecoration: "none",
  fontSize: "0.88rem",
  transition: "background 0.2s, color 0.2s",
};
