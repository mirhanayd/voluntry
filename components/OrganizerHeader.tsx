"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function OrganizerHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [avatarURL, setAvatarURL] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Fetch profile data */
  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      try {
        const snap = await getDoc(doc(db, "users", user!.uid));
        if (snap.exists()) {
          const data = snap.data();
          setOrgName(data.organizationName ?? data.fullName ?? "");
          setAvatarURL(data.avatarURL ?? null);
        }
      } catch (err) {
        console.error("Organizer header: failed to load profile", err);
      }
    }
    fetchProfile();
  }, [user]);

  /* Close dropdown on outside click */
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

  /* Sign out */
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  /* Initials fallback */
  const initials = orgName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  /* Nav links */
  const navLinks = [
    { label: "Events", href: "/organizer/feed" },
    { label: "My Events", href: "/organizer/events" },
  ];

  /* Dropdown items */
  const dropdownItems = [
    { label: "Dashboard", href: "/organizer/dashboard" },
    { label: "Create Event", href: "/organizer/events/create" },
  ];

  return (
    <>
      <style>{`
        .organizer-header {
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

        /* Logo */
        .oh-logo {
          flex-shrink: 0;
          text-decoration: none;
          line-height: 0;
        }

        .oh-logo img {
          height: 34px;
          object-fit: contain;
          display: block;
        }

        .oh-nav-center {
          display: flex;
          align-items: center;
          gap: 6px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .oh-nav-link {
          text-decoration: none;
          padding: 8px 20px;
          font-size: 0.88rem;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
          color: #6b7280;
          background: transparent;
        }

        .oh-nav-link:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .oh-nav-link.active {
          background: #f0faf5;
          color: #246344;
          font-weight: 600;
        }

        .oh-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          position: relative;
        }

        .oh-avatar-btn {
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

        .oh-avatar-btn:hover,
        .oh-avatar-btn:focus-visible {
          border-color: #246344;
          box-shadow: 0 0 0 3px rgba(36,99,68,0.12);
        }

        .oh-avatar-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .oh-dropdown {
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
          animation: oh-dropdown-in 0.18s ease forwards;
        }

        @keyframes oh-dropdown-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .oh-dropdown-item {
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

        .oh-dropdown-item:hover {
          background: #f9fafb;
        }

        .oh-dropdown-item.active {
          color: #246344;
          font-weight: 600;
          background: #f0faf5;
        }

        .oh-dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
        }

        .oh-dropdown-item.signout {
          color: #dc2626;
          font-weight: 600;
        }

        .oh-dropdown-item.signout:hover {
          background: #fef2f2;
        }

        /* Mobile tweaks */
        @media (max-width: 768px) {
          .organizer-header {
            padding: 0 12px;
          }
          .oh-logo img { height: 28px; }
          .oh-nav-center {
            gap: 2px;
          }
          .oh-nav-link {
            padding: 6px 10px;
            font-size: 0.78rem;
          }
          .oh-avatar-btn {
            width: 34px !important;
            height: 34px !important;
            font-size: 0.75rem !important;
          }
          .oh-avatar-btn img {
            width: 34px !important;
            height: 34px !important;
          }
        }
        @media (max-width: 480px) {
          .organizer-header {
            padding: 0 10px;
          }
          .oh-nav-center {
            gap: 0;
          }
          .oh-nav-link {
            padding: 5px 8px;
            font-size: 0.72rem;
          }
          .oh-logo img { height: 24px; }
        }
      `}</style>

      <header className="organizer-header" id="organizer-header">
        {/* Left - Static Logo */}
        <Link href="/organizer/feed" className="oh-logo">
          <img src="/logo_2.png" alt="VolunTRY" />
        </Link>

        {/* Center - Nav Links */}
        <nav className="oh-nav-center">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`oh-nav-link${isActive ? " active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right - Avatar + Dropdown */}
        <div className="oh-right" ref={dropdownRef}>
          <button
            className="oh-avatar-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label="Profile menu"
            aria-expanded={dropdownOpen}
            id="profile-avatar-btn"
          >
            {avatarURL ? (
              <img src={avatarURL} alt={orgName || "Profile"} />
            ) : (
              <span>{initials || "?"}</span>
            )}
          </button>

          {dropdownOpen && (
            <div className="oh-dropdown" role="menu">
              {/* Name label */}
              {orgName && (
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
                    {orgName}
                  </div>
                  <div className="oh-dropdown-divider" />
                </>
              )}

              {dropdownItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`oh-dropdown-item${isActive ? " active" : ""}`}
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="oh-dropdown-divider" />

              <button
                className="oh-dropdown-item signout"
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
