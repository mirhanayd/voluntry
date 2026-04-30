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
  { label: "Rewards", href: "/admin/rewards" },
  { label: "Reports", href: "/admin/reports" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingOrgCount, setPendingOrgCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <>
      {/* Responsive styles */}
      <style>{`
        .admin-sidebar-wrapper {
          position: relative;
          width: 240px;
          min-height: 100vh;
          flex-shrink: 0;
        }
        .admin-hamburger-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .admin-sidebar-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            min-height: unset;
            z-index: 1000;
            transition: transform 0.3s ease;
          }
          .admin-hamburger-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      {/* Hamburger button — mobile only */}
      <button
        className="admin-hamburger-btn"
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
        className="admin-sidebar-wrapper"
        style={{
          transform: mobileOpen ? "translateX(0)" : undefined,
          boxShadow: mobileOpen ? "2px 0 16px rgba(0,0,0,0.15)" : undefined,
        }}
        // On mobile when closed, CSS sets position fixed; we add translateX via media query override
        ref={(el) => {
          if (el) {
            // Apply mobile-closed transform via inline when not open
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
          {/* Logo + Brand */}
          <div
            style={{
              padding: "20px 16px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              marginBottom: "0.5rem",
            }}
          >
            <img src="/logo_2.png" alt="VolunTRY" style={{ height: 36, objectFit: "contain" as const, filter: "brightness(0) invert(1)" }} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>Ministry of Interior</div>
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
                onClick={() => setMobileOpen(false)}
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
            onClick={() => setMobileOpen(false)}
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
      </div>
    </>
  );
}
