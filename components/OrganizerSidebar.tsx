"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const navItems = [
  { label: "Dashboard", href: "/organizer/dashboard" },
  { label: "My Events", href: "/organizer/events" },
  { label: "Create Event", href: "/organizer/events/create" },
];

export default function OrganizerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <>
      {/* Responsive styles */}
      <style>{`
        .organizer-sidebar-wrapper {
          position: relative;
          width: 240px;
          min-height: 100vh;
          flex-shrink: 0;
        }
        .organizer-hamburger-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .organizer-sidebar-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            min-height: unset;
            z-index: 1000;
            transition: transform 0.3s ease;
          }
          .organizer-hamburger-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      {/* Hamburger button — mobile only */}
      <button
        className="organizer-hamburger-btn"
        onClick={() => setMobileOpen((v) => !v)}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 1001,
          width: 40,
          height: 40,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          fontSize: "1.25rem",
          cursor: "pointer",
        }}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Dark overlay — mobile only */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className="organizer-sidebar-wrapper"
        style={{
          transform: mobileOpen ? "translateX(0)" : undefined,
          boxShadow: mobileOpen ? "2px 0 16px rgba(0,0,0,0.15)" : undefined,
        }}
        ref={(el) => {
          if (el) {
            const mql = window.matchMedia("(max-width: 768px)");
            const apply = () => {
              if (mql.matches && !mobileOpen) {
                el.style.transform = "translateX(-240px)";
              } else if (mql.matches && mobileOpen) {
                el.style.transform = "translateX(0)";
              } else {
                el.style.transform = "";
              }
            };
            apply();
          }
        }}
      >
        <aside style={sidebar}>
          {/* Logo + Brand */}
          <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #e5e7eb", marginBottom: "0.5rem" }}>
            <img src="/logo_2.png" alt="VolunTRY" style={{ height: 36, objectFit: "contain" as const }} />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Organizer Portal</div>
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
                onClick={() => setMobileOpen(false)}
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
      </div>
    </>
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
