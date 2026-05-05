"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import FeedDirectorySearch from "@/components/FeedDirectorySearch";

export default function StudentHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [avatarURL, setAvatarURL] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data();
        setFullName(data?.fullName ?? "");
        setAvatarURL(data?.avatarURL ?? null);
      },
      (err) => console.error("Header: failed to load profile", err)
    );
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const displayName = user ? fullName : "";
  const displayAvatarURL = user ? avatarURL : null;

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const navLinks = [
    { label: "Events", href: "/student/events" },
    { label: "Feed", href: "/student/feed" },
    { label: "Rewards", href: "/student/rewards" },
  ];

  const dropdownItems = [
    { label: "Profile", href: "/student/profile" },
    { label: "My Applications", href: "/student/my-applications" },
    { label: "Certificates", href: "/student/certificates" },
  ];

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  return (
    <>
      <style>{`
        .student-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e5e7eb;
          backdrop-filter: blur(12px);
          z-index: 1000;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .sh-logo {
          flex: 0 0 auto;
          text-decoration: none;
          line-height: 0;
        }

        .sh-logo img {
          height: 34px;
          object-fit: contain;
          display: block;
        }

        .sh-nav-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sh-nav-link {
          text-decoration: none;
          padding: 8px 18px;
          font-size: 0.88rem;
          font-weight: 600;
          border-radius: 8px;
          color: #6b7280;
          transition: background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }

        .sh-nav-link:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .sh-nav-link.active {
          background: #f0faf5;
          color: #246344;
        }

        .sh-actions {
          flex: 0 1 380px;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        .sh-search {
          flex: 1 1 250px;
          min-width: 210px;
          max-width: 320px;
        }

        .sh-menu {
          position: relative;
          flex: 0 0 auto;
        }

        .sh-avatar-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid #e5e7eb;
          background: #f0faf5;
          color: #246344;
          cursor: pointer;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          font-weight: 800;
          transition: border-color 0.15s, box-shadow 0.15s;
          padding: 0;
          outline: none;
        }

        .sh-avatar-btn:hover,
        .sh-avatar-btn:focus-visible {
          border-color: #246344;
          box-shadow: 0 0 0 3px rgba(36, 99, 68, 0.12);
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
          min-width: 210px;
          padding: 6px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
          z-index: 1011;
          animation: sh-dropdown-in 0.16s ease forwards;
        }

        @keyframes sh-dropdown-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sh-menu-name {
          padding: 9px 10px 7px;
          color: #6b7280;
          font-size: 0.82rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sh-dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
        }

        .sh-dropdown-item {
          display: block;
          width: 100%;
          padding: 10px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #374151;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          text-align: left;
          text-decoration: none;
        }

        .sh-dropdown-item:hover,
        .sh-dropdown-item.active {
          background: #f0faf5;
          color: #246344;
        }

        .sh-dropdown-item.signout {
          color: #dc2626;
        }

        .sh-dropdown-item.signout:hover {
          background: #fef2f2;
          color: #b91c1c;
        }

        @media (max-width: 900px) {
          .student-header {
            gap: 12px;
            padding: 0 14px;
          }

          .sh-logo img {
            height: 28px;
          }

          .sh-nav-link {
            padding: 7px 11px;
            font-size: 0.8rem;
          }

          .sh-actions {
            flex-basis: 300px;
          }

          .sh-search {
            min-width: 170px;
          }
        }

        @media (max-width: 620px) {
          .sh-nav-center {
            display: none;
          }

          .sh-actions {
            flex: 1 1 auto;
          }

          .sh-search {
            min-width: 0;
            max-width: none;
          }
        }

        @media (max-width: 420px) {
          .student-header {
            gap: 8px;
            padding: 0 10px;
          }

          .sh-logo img {
            height: 24px;
          }

          .sh-avatar-btn {
            width: 34px;
            height: 34px;
            font-size: 0.74rem;
          }
        }
      `}</style>

      <header className="student-header" id="student-header">
        <Link href="/student/feed" className="sh-logo" aria-label="VolunTRY feed">
          <img src="/logo_2.png" alt="VolunTRY" />
        </Link>

        <nav className="sh-nav-center" aria-label="Student navigation">
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

        <div className="sh-actions">
          <div className="sh-search">
            <FeedDirectorySearch />
          </div>

          <div className="sh-menu" ref={menuRef}>
            <button
              className="sh-avatar-btn"
              type="button"
              onClick={() => setDropdownOpen((value) => !value)}
              aria-label="Profile menu"
              aria-expanded={dropdownOpen}
              id="profile-avatar-btn"
            >
              {displayAvatarURL ? (
                <img src={displayAvatarURL} alt={displayName || "Profile"} />
              ) : (
                <span>{initials}</span>
              )}
            </button>

            {dropdownOpen && (
              <div className="sh-dropdown" role="menu">
                {displayName && (
                  <>
                    <div className="sh-menu-name">{displayName}</div>
                    <div className="sh-dropdown-divider" />
                  </>
                )}

                {dropdownItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");

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
                  type="button"
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
        </div>
      </header>
    </>
  );
}
