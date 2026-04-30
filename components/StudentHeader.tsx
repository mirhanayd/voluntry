"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function StudentHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [avatarURL, setAvatarURL] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── Fetch profile data ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      try {
        const snap = await getDoc(doc(db, "users", user!.uid));
        if (snap.exists()) {
          const data = snap.data();
          setFullName(data.fullName ?? "");
          setAvatarURL(data.avatarURL ?? null);
        }
      } catch (err) {
        console.error("Header: failed to load profile", err);
      }
    }
    fetchProfile();
  }, [user]);

  /* ── Close dropdown on outside click ─────────────────────────────────────── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  /* ── Sign out ────────────────────────────────────────────────────────────── */
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  /* ── Initials fallback ───────────────────────────────────────────────────── */
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  /* ── Nav links ───────────────────────────────────────────────────────────── */
  const navLinks = [
    { label: "Feed", href: "/student/feed" },
    { label: "Events", href: "/student/events" },
    { label: "Rewards", href: "/student/rewards" },
  ];

  /* ── Dropdown items ──────────────────────────────────────────────────────── */
  const dropdownItems = [
    { label: "Profile", href: "/student/profile" },
    { label: "My Applications", href: "/student/my-applications" },
    { label: "Certificates", href: "/student/certificates" },
  ];

  return (
    <>
      <style>{`
        .student-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 1000;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        /* ── Logo Morph Container ── */
        .sh-logo-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          height: 34px;
          text-decoration: none;
          /* Full logo aspect: ~5:1, at 34px height ≈ 170px wide */
          animation: logo-wrap-width 8s ease-in-out infinite;
        }

        @keyframes logo-wrap-width {
          0%, 25%  { width: 150px; }
          40%, 70% { width: 95px; }
          85%, 100% { width: 150px; }
        }

        .sh-logo-full {
          position: absolute;
          left: 0; top: 0;
          height: 100%;
          width: auto;
          object-fit: contain;
          transform-origin: left center;
          animation: logo-full-anim 8s ease-in-out infinite;
        }

        .sh-logo-short {
          position: absolute;
          left: 0; top: 0;
          height: 100%;
          width: auto;
          object-fit: contain;
          transform-origin: left center;
          animation: logo-short-anim 8s ease-in-out infinite;
        }

        /* Full logo: visible first, fades/clips away */
        @keyframes logo-full-anim {
          0%, 20%  { opacity: 1; clip-path: inset(0 0 0 0); }
          30%      { opacity: 0; clip-path: inset(0 60% 0 0); }
          35%, 75% { opacity: 0; clip-path: inset(0 100% 0 0); }
          85%, 100% { opacity: 1; clip-path: inset(0 0 0 0); }
        }

        /* Short logo: hidden first, fades in */
        @keyframes logo-short-anim {
          0%, 25%   { opacity: 0; transform: scale(1.05); }
          35%, 75%  { opacity: 1; transform: scale(1); }
          85%, 100% { opacity: 0; transform: scale(1.05); }
        }

        .sh-nav-center {
          display: flex;
          align-items: center;
          gap: 6px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .sh-nav-link {
          text-decoration: none;
          padding: 8px 20px;
          font-size: 0.88rem;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
          color: #6b7280;
          background: transparent;
        }

        .sh-nav-link:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .sh-nav-link.active {
          background: #f0faf5;
          color: #246344;
          font-weight: 600;
        }

        .sh-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          position: relative;
        }

        .sh-avatar-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid #e5e7eb;
          background: #f0faf5;
          cursor: pointer;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          font-weight: 700;
          color: #246344;
          transition: border-color 0.2s, box-shadow 0.2s;
          padding: 0;
          outline: none;
        }

        .sh-avatar-btn:hover,
        .sh-avatar-btn:focus-visible {
          border-color: #246344;
          box-shadow: 0 0 0 3px rgba(36,99,68,0.12);
        }

        .sh-avatar-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sh-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
          min-width: 200px;
          padding: 6px 0;
          z-index: 1001;
          opacity: 0;
          transform: translateY(-6px);
          animation: sh-dropdown-in 0.18s ease forwards;
        }

        @keyframes sh-dropdown-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sh-dropdown-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 16px;
          font-size: 0.88rem;
          font-weight: 500;
          color: #374151;
          background: transparent;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s;
        }

        .sh-dropdown-item:hover {
          background: #f9fafb;
        }

        .sh-dropdown-item.active {
          color: #246344;
          font-weight: 600;
          background: #f0faf5;
        }

        .sh-dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
        }

        .sh-dropdown-item.signout {
          color: #dc2626;
          font-weight: 600;
        }

        .sh-dropdown-item.signout:hover {
          background: #fef2f2;
        }

        /* ── Mobile tweaks ────────────────────────────────────────────────── */
        @media (max-width: 600px) {
          .student-header {
            padding: 0 14px;
          }
          .sh-nav-link {
            padding: 6px 14px;
            font-size: 0.82rem;
          }
        }
      `}</style>

      <header className="student-header" id="student-header">
        {/* Left — Animated Logo Morph */}
        <Link href="/student/feed" className="sh-logo-wrap">
          <img src="/logo_2.png" alt="VolunTRY" className="sh-logo-full" />
          <img src="/logo.png"   alt="VTRY"     className="sh-logo-short" />
        </Link>

        {/* Center — Nav Links */}
        <nav className="sh-nav-center">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sh-nav-link${isActive ? " active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right — Avatar + Dropdown */}
        <div className="sh-right" ref={dropdownRef}>
          <button
            className="sh-avatar-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label="Profile menu"
            aria-expanded={dropdownOpen}
            id="profile-avatar-btn"
          >
            {avatarURL ? (
              <img src={avatarURL} alt={fullName || "Profile"} />
            ) : (
              <span>{initials || "?"}</span>
            )}
          </button>

          {dropdownOpen && (
            <div className="sh-dropdown" role="menu">
              {/* Name label */}
              {fullName && (
                <>
                  <div
                    style={{
                      padding: "10px 16px 6px",
                      fontSize: "0.82rem",
                      color: "#9ca3af",
                      fontWeight: 500,
                      lineHeight: 1.2,
                    }}
                  >
                    {fullName}
                  </div>
                  <div className="sh-dropdown-divider" />
                </>
              )}

              {dropdownItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sh-dropdown-item${isActive ? " active" : ""}`}
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="sh-dropdown-divider" />

              <button
                className="sh-dropdown-item signout"
                role="menuitem"
                onClick={() => {
                  setDropdownOpen(false);
                  handleSignOut();
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
